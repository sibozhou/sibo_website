import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Delivery assets only. The canonical, shared-edge boundary data stays untouched.
const source = JSON.parse(await readFile(new URL("../app/map/world-land.json", import.meta.url), "utf8"));
const simplify = (points, tolerance) => {
  const keep = new Set([0, points.length - 1]), pending = [[0, points.length - 1]];
  while (pending.length) {
    const [start, end] = pending.pop(), [x, y] = points[start];
    const [dx, dy] = [points[end][0] - x, points[end][1] - y];
    let farthest = -1, distance = tolerance ** 2;
    for (let i = start + 1; i < end; i++) {
      const [px, py] = points[i], ratio = dx || dy ? Math.max(0, Math.min(1, ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy))) : 0;
      const squared = (px - x - ratio * dx) ** 2 + (py - y - ratio * dy) ** 2;
      if (squared > distance) { distance = squared; farthest = i; }
    }
    if (farthest !== -1) { keep.add(farthest); pending.push([start, farthest], [farthest, end]); }
  }
  return points.filter((_, i) => keep.has(i));
};
const smallPath = (path, tolerance = .3) => path.split("M").filter(Boolean).map(ring => {
  const points = [...ring.matchAll(/(?:^|L)(-?[\d.]+),(-?[\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)]);
  if (ring.endsWith("Z") && Math.max(Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[1])) - Math.min(...points.map(p => p[1]))) < .4) return "";
  return simplify(points, tolerance).map(([x, y], i) => `${i ? "L" : "M"}${Number(x.toFixed(2))},${Number(y.toFixed(2))}`).join("") + (ring.endsWith("Z") ? "Z" : "");
}).join("");
const compact = (data, keepLocal) => ({
  land: smallPath(data.land, keepLocal ? .7 : .3), lakes: smallPath(data.lakes), graticule: data.graticule,
  countries: Object.fromEntries(Object.entries(data.countries).map(([id, shape]) => [id, { ...shape, path: smallPath(shape.path), divisions: smallPath(shape.divisions), maritime: shape.maritime }])),
  regions: Object.fromEntries(Object.entries(data.regions).map(([id, shape]) => [id, keepLocal ? shape : { ...shape, path: smallPath(shape.path), lakes: smallPath(shape.lakes) }])),
  cities: Object.fromEntries(Object.entries(data.cities).map(([id, shape]) => [id, keepLocal ? shape : { ...shape, path: smallPath(shape.path) }])),
});
const payload = JSON.stringify(source.closeup) + "\n";
const closeupFile = `closeup.${createHash("sha256").update(payload).digest("hex").slice(0, 12)}.json`;
await mkdir(new URL("../public/map-geography/", import.meta.url), { recursive: true });
await writeFile(new URL(`../public/map-geography/${closeupFile}`, import.meta.url), payload);
await writeFile(new URL("../app/map/overview.json", import.meta.url), JSON.stringify({
  ...compact(source, false), preview: compact(source.closeup, true), closeupFile,
  closeupBounds: Object.fromEntries(["countries", "regions", "cities"].map(kind => [kind, Object.fromEntries(Object.entries(source.closeup[kind]).map(([id, shape]) => [id, shape.bounds]))])),
}) + "\n");
