import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { topology } from "topojson-server";
import { feature, merge, mergeArcs, mesh } from "topojson-client";
import { projectLocation, projectDetailLocation } from "../app/map/projection.ts";

// Usage: node scripts/generate-world-map.mjs /path/to/downloaded-sources [output.json]
// Generates a local asset: no map service, token, or runtime network requests.
const read = async (name) => JSON.parse(await readFile(join(process.argv[2], name), "utf8"));
const [countries, states, lakes, cities, haikou, chinaPOV, maritime] = await Promise.all([
  read("countries.geojson"), read("states.geojson"), read("lakes.geojson"), read("us-cities.geojson"), read("haikou-osm.json"),
  read("countries-china-pov.geojson"), read("china-maritime.geojson"),
]);
// Douglas–Peucker in projected units, applied once per shared arc, not per polygon.
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
// Frame the largest landmass, without distant islands making the view too wide.
const mainland = (geometry) => {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const area = (ring) => Math.abs(ring.reduce((sum, [x, y], index) => {
    const next = ring[(index + 1) % ring.length];
    return sum + x * next[1] - next[0] * y;
  }, 0));
  return { type: "Polygon", coordinates: polygons.reduce((largest, polygon) => area(polygon[0]) > area(largest[0]) ? polygon : largest) };
};
// The China-POV CHN feature includes Taiwan; Hong Kong and Macau are separate
// admin-1 features in that source, so include them in the highlighted extent.
const chinaIds = ["CHN", "HKG", "MAC", "TWN"];
const chinaTopology = topology({ land: { type: "FeatureCollection", features: chinaPOV.features.filter(({ properties }) => ["CHN", "HKG", "MAC"].includes(properties.ADM0_A3)) } });
const chinaGeometry = merge(chinaTopology, chinaTopology.objects.land.geometries);
const worldCountries = [...countries.features.filter(({ properties }) => !chinaIds.includes(properties.ADM0_A3)), { properties: { ADM0_A3: "CHN" }, geometry: chinaGeometry }];
const regionIds = ["CN-HI", "US-CA", "US-IL", "US-RI"];
const collection = (features) => ({ type: "FeatureCollection", features });
const shared = topology({
  countries: collection(worldCountries.map(({ geometry, properties }) => ({ type: "Feature", id: properties.ADM0_A3, properties: {}, geometry }))),
  states: collection(states.features.filter(({ properties }) => [...chinaIds, "USA"].includes(properties.adm0_a3)).map(({ geometry, properties }) => ({ type: "Feature", properties: { country: properties.adm0_a3, region: properties.iso_3166_2 }, geometry }))),
  cities: collection([
    { type: "Feature", id: "haikou", properties: {}, geometry: haikou[0].geojson },
    ...cities.features.map(({ geometry, properties }) => ({ type: "Feature", id: properties.BASENAME.toLowerCase().replaceAll(" ", "-"), properties: {}, geometry })),
  ]),
});
// Dissolve the same state polygons into the U.S. outline so its coast and
// divisions cannot drift. Keep China's selected POV extent intact.
const usa = shared.objects.countries.geometries.find(geometry => geometry.id === "USA");
Object.assign(usa, mergeArcs(shared, shared.objects.states.geometries.filter(({ properties }) => properties.country === "USA")));
const lines = [];
for (let longitude = -120; longitude <= 120; longitude += 60) {
  lines.push(Array.from({ length: 91 }, (_, index) => [longitude, index * 2 - 90]));
}
for (let latitude = -60; latitude <= 60; latitude += 30) {
  lines.push(Array.from({ length: 181 }, (_, index) => [index * 2 - 180, latitude]));
}
const generate = (projectLocation, contextTolerance = .1) => {
  const project = (coordinates) => coordinates.map(([longitude, latitude]) => {
    const { x, y } = projectLocation(longitude, latitude);
    return [x, y];
  });
  const shape = (geometry) => polygons(geometry).map((polygon) => polygon.map((points) => {
    return points.length > 3 ? line(points) + "Z" : "";
  }).join("")).join("");
  const tolerances = shared.arcs.map(() => contextTolerance);
  const precisions = shared.arcs.map(() => 2);
  const retain = (geometry, tolerance, precision) => geometry.arcs.flat(Infinity).forEach((arc) => {
    const index = arc < 0 ? ~arc : arc;
    tolerances[index] = Math.min(tolerances[index], tolerance);
    precisions[index] = Math.max(precisions[index], precision);
  });
  shared.objects.countries.geometries.forEach((geometry) => retain(geometry, ["CHN", "USA"].includes(geometry.id) ? .015 : contextTolerance, ["CHN", "USA"].includes(geometry.id) ? 4 : 2));
  shared.objects.states.geometries.forEach((geometry) => retain(geometry, regionIds.includes(geometry.properties.region) ? .0005 : .04, regionIds.includes(geometry.properties.region) ? 5 : 3));
  shared.objects.cities.geometries.forEach((geometry) => retain(geometry, .00008, 5));
  // Junctions always use the finest precision, even between differently detailed
  // arcs; stitching a neighbouring arc must not replace an endpoint with a rounded
  // offset. Every layer then receives identical segments, including in reverse.
  const projected = { ...shared, arcs: shared.arcs.map((arc, index) => {
    const points = simplify(project(arc), tolerances[index]);
    return points.map((point, vertex) => point.map(value => Number(value.toFixed(vertex === 0 || vertex === points.length - 1 ? 5 : precisions[index]))));
  }) };
  const geometryOf = (object) => feature(projected, object).geometry;
  const lakeShape = (geometry, tolerance) => shape({ type: "MultiPolygon", coordinates: polygons(geometry).map(polygon => polygon.map(ring => simplify(project(ring), tolerance))) });
  const boundsOf = (points) => [Math.min(...points.map(([x]) => x)), Math.min(...points.map(([, y]) => y)), Math.max(...points.map(([x]) => x)), Math.max(...points.map(([, y]) => y))];
  const bounds = (geometry) => boundsOf(polygons(geometry).flatMap((polygon) => project(polygon[0])));
  const countryData = Object.fromEntries(["CHN", "USA"].map((id) => {
    const object = shared.objects.countries.geometries.find(geometry => geometry.id === id);
    const geometry = feature(shared, object).geometry;
    const divisions = { type: "GeometryCollection", geometries: shared.objects.states.geometries.filter(({ properties }) => id === "CHN" ? chinaIds.includes(properties.country) : properties.country === id) };
    return [id, {
      path: shape(geometryOf(object)),
      bounds: id === "CHN" ? boundsOf([...polygons(geometry).flatMap((polygon) => project(polygon[0])), ...maritime.features.flatMap(({ geometry }) => project(geometry.coordinates))]) : bounds(mainland(geometry)),
      divisions: mesh(projected, divisions, (a, b) => a !== b).coordinates.map(points => line(points)).join(""),
      maritime: id === "CHN" ? maritime.features.map(({ geometry }) => line(project(geometry.coordinates), 4)).join("") : "",
    }];
  }));
  const regionData = Object.fromEntries(regionIds.map((id) => {
    const geometry = states.features.find(({ properties }) => properties.iso_3166_2 === id).geometry;
    const box = bounds(mainland(geometry));
    const nearbyLakes = lakes.features.filter(({ geometry }) => {
      const [left, top, right, bottom] = bounds(geometry);
      return right >= box[0] - 3 && left <= box[2] + 3 && bottom >= box[1] - 3 && top <= box[3] + 3;
    });
    const object = shared.objects.states.geometries.find(({ properties }) => properties.region === id);
    return [id, { path: shape(geometryOf(object)), bounds: box, lakes: nearbyLakes.map(({ geometry }) => lakeShape(geometry, .0005)).join("") }];
  }));
  const cityData = Object.fromEntries(shared.objects.cities.geometries.map((object) => {
    const geometry = geometryOf(object);
    return [object.id, { path: shape(geometry), bounds: boundsOf(polygons(geometry).flatMap(polygon => polygon[0])) }];
  }));
  return {
    // The world renders CHN/USA directly from countryData; do not duplicate their
    // detailed paths or cancel overlapping POV areas in a single even-odd fill.
    land: shared.objects.countries.geometries.filter(object => !["CHN", "USA"].includes(object.id)).map(object => shape(geometryOf(object))).join(""),
    lakes: lakes.features.filter(({ properties }) => properties.scalerank <= 3).map(({ geometry }) => lakeShape(geometry, .04)).join(""),
    graticule: lines.map((coordinates) => line(project(coordinates), 3)).join(""),
    countries: countryData, regions: regionData, cities: cityData,
  };
};
// Close-up background is context only; the selected boundaries retain full detail.
const output = JSON.stringify({ ...generate(projectLocation), closeup: generate(projectDetailLocation, .2) });
if (process.argv[3]) await writeFile(process.argv[3], output + "\n");
else console.log(output);
