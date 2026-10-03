import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { projectDetailLocation } from "../app/map/projection.ts";
import { cityDetailAreas, detailAreas } from "./map-detail-areas.mjs";

// Usage: node scripts/generate-map-details.mjs /path/to/source-directory [output-directory]
// Cached real geography, projected identically to the existing boundary layers.
const read = async name => JSON.parse(await readFile(join(process.argv[2], name), "utf8"));
const output = process.argv[3] ?? "public/map-details";
await mkdir(output, { recursive: true });
const point = ([longitude, latitude]) => {
  const { x, y } = projectDetailLocation(longitude, latitude);
  return [Number(x.toFixed(6)), Number(y.toFixed(6))];
};
const bounds = points => [Math.min(...points.map(([x]) => x)), Math.min(...points.map(([, y]) => y)), Math.max(...points.map(([x]) => x)), Math.max(...points.map(([, y]) => y))];
const simplify = (points, tolerance) => {
  const keep = new Set([0, points.length - 1]), pending = [[0, points.length - 1]];
  while (pending.length) {
    const [start, end] = pending.pop(), [x, y] = points[start];
    const [dx, dy] = [points[end][0] - x, points[end][1] - y];
    let farthest = -1, distance = tolerance ** 2;
    for (let index = start + 1; index < end; index++) {
      const [px, py] = points[index];
      const ratio = dx || dy ? Math.max(0, Math.min(1, ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy))) : 0;
      const squared = (px - x - ratio * dx) ** 2 + (py - y - ratio * dy) ** 2;
      if (squared > distance) { distance = squared; farthest = index; }
    }
    if (farthest !== -1) { keep.add(farthest); pending.push([start, farthest], [farthest, end]); }
  }
  return points.filter((_, index) => keep.has(index));
};
// Spatial batches keep the SVG small; culling a batch never changes its coordinates.
const addRoute = (groups, coordinates, kind, level, minZoom, local, tile = local ? .5 : 24) => {
  if (coordinates.length < 2) return;
  const precision = local ? 5 : 4;
  const points = simplify(coordinates.map(point), local ? .00012 : .02).map(p => p.map(value => Number(value.toFixed(precision)))), box = bounds(points);
  const key = `${kind}-${level}-${Math.floor(box[0] / tile)}-${Math.floor(box[1] / tile)}`;
  const route = groups.get(key) ?? { kind, level, minZoom, bounds: box, path: "" };
  route.bounds = [Math.min(route.bounds[0], box[0]), Math.min(route.bounds[1], box[1]), Math.max(route.bounds[2], box[2]), Math.max(route.bounds[3], box[3])];
  const number = value => String(Number(value.toFixed(precision))).replace(/^(-?)0\./, "$1.");
  route.path += points.map(([x, y], index) => index ? `l${number(x - points[index - 1][0])},${number(y - points[index - 1][1])}` : `M${number(x)},${number(y)}`).join("");
  groups.set(key, route);
  return key;
};
const label = (id, coordinates, names, kind, minZoom, priority) => {
  const [x, y] = point(coordinates);
  return { id, x, y, names, kind, minZoom, priority };
};
const writeTiles = async (id, groups, source, timestamp, labelsByTile = new Map()) => {
  const tiles = [];
  await mkdir(join(output, id), { recursive: true });
  for (const [tileId, route] of groups) {
    const payload = JSON.stringify({ source, timestamp, routes: [route], labels: labelsByTile.get(tileId) ?? [] }) + "\n";
    const version = createHash("sha256").update(payload).digest("hex").slice(0, 12);
    tiles.push({ id: tileId, bounds: route.bounds, minZoom: route.minZoom, version });
    await writeFile(join(output, id, `${tileId}.json`), payload);
  }
  return tiles;
};
const cities = await read("ne-populated_places.geojson"), airports = await read("ne-airports.geojson");
const labels = cities.features.map(({ geometry, properties: p }) => label(`ne-${p.NE_ID}`, geometry.coordinates,
  [p.NAME_EN || p.NAME, p.NAME_ZH || p.NAME_EN || p.NAME, p.NAME_ZHT || p.NAME_EN || p.NAME],
  "city", Math.max(2, Math.round(.3 * 2 ** p.MIN_ZOOM)), 100 - p.SCALERANK * 3));
labels.push(...airports.features.filter(({ properties }) => properties.iata_code).map(({ geometry, properties: p }) => label(`airport-${p.iata_code}`, geometry.coordinates,
  [p.iata_code, p.iata_code, p.iata_code], "airport", p.type.includes("major") ? 25 : 80, p.type.includes("major") ? 95 : 85)));
const regional = ([x, y]) => (x >= 73 && x <= 135 && y >= 18 && y <= 54) || (x >= -125 && x <= -66 && y >= 24 && y <= 50);
const routes = new Map();
for (const { geometry, properties: p } of (await read("ne-roads.geojson")).features) {
  if (!geometry.coordinates.some(regional)) continue;
  const level = p.type === "Major Highway" || p.expressway ? 0 : 1;
  if (level === 0) addRoute(routes, geometry.coordinates, "road", 0, 8, false);
}
for (const { geometry } of (await read("ne-railroads.geojson")).features) {
  if (geometry.coordinates.some(regional)) addRoute(routes, geometry.coordinates, "rail", 0, 20, false);
}
const contextSource = "Natural Earth · public domain";
const contextTiles = await writeTiles("context", routes, contextSource);
await writeFile(join(output, "context.json"), JSON.stringify({ source: contextSource, labels, routes: [], tiles: contextTiles }) + "\n");

for (const [id, area] of Object.entries(detailAreas)) {
  const [south, west, north, east] = area;
  const data = await read(`osm-${id}-${area.join("_")}.json`), groups = new Map(), labels = [], namedRoads = new Map();
  for (const element of data.elements) {
    const tags = element.tags ?? {}, name = tags.name;
    const names = [tags["name:en"] || tags.int_name || name, tags["name:zh-Hans"] || tags["name:zh"] || name, tags["name:zh-Hant"] || tags["name:en"] || tags.int_name || tags.ref || name];
    const coordinates = element.geometry?.map(({ lon, lat }) => [lon, lat]);
    if (coordinates && tags.highway) {
      const level = /^(motorway|trunk)/.test(tags.highway) ? 0 : tags.highway.startsWith("primary") ? 1 : tags.highway.startsWith("secondary") ? 2 : 3;
      addRoute(groups, coordinates, "road", level, [60, 100, 180, 400][level], true);
      const roadName = level === 0 && tags.ref ? tags.ref.split(";")[0] : name;
      if (roadName && !tags.highway.endsWith("_link")) {
        const length = coordinates.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - coordinates[i][0], y - coordinates[i][1]), 0);
        if (length > (namedRoads.get(roadName)?.length ?? 0)) namedRoads.set(roadName, { length, coordinates, names: level === 0 && tags.ref ? [roadName, roadName, roadName] : names, level });
      }
    }
    if (coordinates && tags.railway) addRoute(groups, coordinates, "rail", 0, 80, true);
    if (coordinates && tags.aeroway === "runway") addRoute(groups, coordinates, "runway", 0, 120, true);
    if (element.type === "node" && name) {
      if (tags.place) labels.push(label(`osm-${element.id}`, [element.lon, element.lat], names, tags.place === "neighbourhood" ? "neighbourhood" : "city", { city: 80, town: 120, village: 240, suburb: 300, neighbourhood: 700 }[tags.place], { city: 110, town: 90, village: 70, suburb: 70, neighbourhood: 30 }[tags.place]));
      if (/^(station|halt)$/.test(tags.railway)) labels.push(label(`osm-${element.id}`, [element.lon, element.lat], names, "station", 500, 85));
    }
    if (tags.aeroway === "aerodrome" && tags.iata) {
      const geometry = coordinates ?? element.members?.flatMap(member => (member.geometry ?? []).map(({ lon, lat }) => [lon, lat]));
      const box = geometry?.length ? bounds(geometry) : null;
      const center = element.type === "node" ? [element.lon, element.lat] : box && [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
      if (center) labels.push(label(`airport-${tags.iata}`, center, [tags.iata, tags.iata, tags.iata], "airport", 60, tags.aerodrome === "international" ? 125 : 90));
    }
  }
  for (const [name, road] of namedRoads) {
    labels.push(label(`road-${name}`, road.coordinates[Math.floor(road.coordinates.length / 2)], road.names, "road", road.level === 0 ? 180 : road.level === 1 ? 600 : road.level === 2 ? 900 : 1400, [68, 45, 25, 15][road.level]));
  }
  const streets = await read(`osm-streets-${id}-${cityDetailAreas[id].join("_")}.json`), streetGroups = new Map(), streetNames = new Map();
  for (const element of streets.elements) {
    const tags = element.tags ?? {}, coordinates = element.geometry?.map(({ lon, lat }) => [lon, lat]);
    if (!coordinates || /^(private|no)$/.test(tags.access ?? "")) continue;
    const level = tags.highway === "service" ? 5 : 4;
    const tileId = addRoute(streetGroups, coordinates, "road", level, level === 4 ? 700 : 1200, true, .12);
    if (tileId && tags.name && level === 4) {
      const key = `${tileId}-${tags.name}`;
      const length = coordinates.slice(1).reduce((sum, [x, y], index) => sum + Math.hypot(x - coordinates[index][0], y - coordinates[index][1]), 0);
      if (length > (streetNames.get(key)?.length ?? 0)) streetNames.set(key, { tileId, length, label: label(`street-${element.id}`, coordinates[Math.floor(coordinates.length / 2)],
        [tags["name:en"] || tags.int_name || tags.name, tags["name:zh-Hans"] || tags["name:zh"] || tags.name, tags["name:zh-Hant"] || tags["name:en"] || tags.int_name || tags.name], "road", 1400, 15) });
    }
  }
  const labelsByTile = new Map();
  for (const street of streetNames.values()) {
    if (!labelsByTile.has(street.tileId)) labelsByTile.set(street.tileId, []);
    labelsByTile.get(street.tileId).push(street.label);
  }
  const source = "© OpenStreetMap contributors · ODbL 1.0";
  const tiles = [
    ...await writeTiles(id, groups, source, data.osm3s.timestamp_osm_base),
    ...await writeTiles(id, streetGroups, source, streets.osm3s.timestamp_osm_base, labelsByTile),
  ];
  await writeFile(join(output, `${id}.json`), JSON.stringify({ source, timestamp: data.osm3s.timestamp_osm_base, streetTimestamp: streets.osm3s.timestamp_osm_base, tiles, coverage: [...point([west, north]), ...point([east, south])], routes: [], labels }) + "\n");
}
