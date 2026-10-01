import { readFile } from "node:fs/promises";
import { projectLocation } from "../app/map/projection.ts";

// Usage: node scripts/generate-world-map.mjs /path/to/ne_110m_land.geojson
// Prints the generated asset; commit it so the website has no remote map dependency.
const source = JSON.parse(await readFile(process.argv[2], "utf8"));
const path = (coordinates) => coordinates.map(([longitude, latitude], index) => {
  const { x, y } = projectLocation(longitude, latitude);
  return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
}).join("");
const land = source.features.map(({ geometry }) => {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((polygon) => polygon.map((ring) => path(ring) + "Z").join("")).join("");
}).join("");
const lines = [];
for (let longitude = -120; longitude <= 120; longitude += 60) {
  lines.push(Array.from({ length: 91 }, (_, index) => [longitude, index * 2 - 90]));
}
for (let latitude = -60; latitude <= 60; latitude += 30) {
  lines.push(Array.from({ length: 181 }, (_, index) => [index * 2 - 180, latitude]));
}
console.log(JSON.stringify({ land, graticule: lines.map(path).join("") }));
