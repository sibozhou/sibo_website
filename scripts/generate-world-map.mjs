import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { projectLocation } from "../app/map/projection.ts";

// Usage: node scripts/generate-world-map.mjs /path/to/downloaded-sources [output.json]
// Generates a local asset: no map service, token, or runtime network requests.
const read = async (name) => JSON.parse(await readFile(join(process.argv[2], name), "utf8"));
const [countries, states, lakes, cities, haikou] = await Promise.all([
  read("countries.geojson"), read("states.geojson"), read("lakes.geojson"), read("us-cities.geojson"), read("haikou-osm.json"),
]);
const project = (coordinates) => coordinates.map(([longitude, latitude]) => {
  const { x, y } = projectLocation(longitude, latitude);
  return [x, y];
});
// Douglas–Peucker in projected units. Keep city detail much finer than the overview.
const simplify = (points, tolerance) => {
  const keep = new Set([0, points.length - 1]);
  const pending = [[0, points.length - 1]];
  while (pending.length) {
    const [start, end] = pending.pop();
    const [x, y] = points[start], [dx, dy] = [points[end][0] - x, points[end][1] - y];
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
const line = (points, precision = 5) => points.map(([x, y], index) => `${index ? "L" : "M"}${Number(x.toFixed(precision))},${Number(y.toFixed(precision))}`).join("");
const polygons = (geometry) => geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
const shape = (geometry, tolerance, precision = 5) => polygons(geometry).map((polygon) => polygon.map((ring) => {
  const points = simplify(project(ring), tolerance);
  return points.length > 3 ? line(points, precision) + "Z" : "";
}).join("")).join("");
const bounds = (geometry) => {
  const points = polygons(geometry).flatMap((polygon) => project(polygon[0]));
  return [Math.min(...points.map(([x]) => x)), Math.min(...points.map(([, y]) => y)), Math.max(...points.map(([x]) => x)), Math.max(...points.map(([, y]) => y))];
};
// Frame the largest landmass, without distant islands making the view too wide.
const mainland = (geometry) => {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const area = (ring) => Math.abs(ring.reduce((sum, [x, y], index) => {
    const next = ring[(index + 1) % ring.length];
    return sum + x * next[1] - next[0] * y;
  }, 0));
  return { type: "Polygon", coordinates: polygons.reduce((largest, polygon) => area(polygon[0]) > area(largest[0]) ? polygon : largest) };
};
const countryData = Object.fromEntries(["CHN", "USA"].map((id) => {
  const geometry = countries.features.find(({ properties }) => properties.ADM0_A3 === id).geometry;
  return [id, {
    path: shape(geometry, .015, 4), bounds: bounds(mainland(geometry)),
    divisions: states.features.filter(({ properties }) => properties.adm0_a3 === id).map(({ geometry }) => shape(geometry, .04, 3)).join(""),
  }];
}));
const regionData = Object.fromEntries(["CN-HI", "US-CA", "US-IL", "US-RI"].map((id) => {
  const geometry = states.features.find(({ properties }) => properties.iso_3166_2 === id).geometry;
  const box = bounds(mainland(geometry));
  const nearbyLakes = lakes.features.filter(({ geometry }) => {
    const [left, top, right, bottom] = bounds(geometry);
    return right >= box[0] - 3 && left <= box[2] + 3 && bottom >= box[1] - 3 && top <= box[3] + 3;
  });
  return [id, { path: shape(geometry, .0005), bounds: box, lakes: nearbyLakes.map(({ geometry }) => shape(geometry, .0005)).join("") }];
}));
const cityData = Object.fromEntries([
  ["haikou", haikou[0].geojson],
  ...cities.features.map(({ geometry, properties }) => [properties.BASENAME.toLowerCase().replaceAll(" ", "-"), geometry]),
].map(([id, geometry]) => [id, { path: shape(geometry, .00008), bounds: bounds(geometry) }]));
const lines = [];
for (let longitude = -120; longitude <= 120; longitude += 60) {
  lines.push(Array.from({ length: 91 }, (_, index) => [longitude, index * 2 - 90]));
}
for (let latitude = -60; latitude <= 60; latitude += 30) {
  lines.push(Array.from({ length: 181 }, (_, index) => [index * 2 - 180, latitude]));
}
const output = JSON.stringify({
  land: countries.features.map(({ geometry }) => shape(geometry, .1, 2)).join(""),
  lakes: lakes.features.filter(({ properties }) => properties.scalerank <= 3).map(({ geometry }) => shape(geometry, .04, 3)).join(""),
  graticule: lines.map((coordinates) => line(project(coordinates), 3)).join(""),
  countries: countryData, regions: regionData, cities: cityData,
});
if (process.argv[3]) await writeFile(process.argv[3], output + "\n");
else console.log(output);
