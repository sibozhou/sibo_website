import type { Language } from "../languages";

export type MapView = { x: number; y: number; zoom: number; detail: boolean };
export type MapRoute = { path: string; bounds: number[]; kind: "road" | "rail" | "runway"; level: number; minZoom: number };
export type MapLabel = { id: string; x: number; y: number; names: string[]; kind: "city" | "neighbourhood" | "airport" | "station" | "road"; minZoom: number; priority: number };
export type MapDetailTile = { id: string; bounds: number[]; minZoom: number; version?: string };
export type MapDetailData = { routes: MapRoute[]; labels: MapLabel[]; coverage?: number[]; tiles?: MapDetailTile[] };
type Box = { left: number; top: number; width: number; height: number };

export const mapDetailPath = (language: Language, id: string, version?: string) => `${language === "en" ? "../" : "../../"}map-details/${id}.json${version ? `?v=${version}` : ""}`;
export const routeInView = (route: Pick<MapRoute, "bounds" | "minZoom">, view: MapView) => {
  const [left, top, right, bottom] = route.bounds;
  return view.detail && view.zoom >= route.minZoom && right >= view.x - 500 / view.zoom && left <= view.x + 500 / view.zoom && bottom >= view.y - 270 / view.zoom && top <= view.y + 270 / view.zoom;
};
const overlaps = (a: Box, b: Box) => a.left < b.left + b.width + 4 && a.left + a.width + 4 > b.left && a.top < b.top + b.height + 4 && a.top + a.height + 4 > b.top;

// Keep text screen-sized and fit whole labels, not just their anchor points.
export function layoutMapLabels(labels: MapLabel[], view: MapView, size: { width: number; height: number }, language: Language, reserved: Box[]) {
  const placed: (Box & { id: string; text: string; kind: MapLabel["kind"] })[] = [];
  if (!view.detail || !size.width) return placed;
  const occupied = [...reserved], names = new Set<string>();
  const counts = { city: 0, airport: 0, station: 0, road: 0, neighbourhood: 0 };
  const limits = view.zoom >= 500 ? (size.width < 500
    ? { city: 5, airport: 2, station: 3, road: 4, neighbourhood: 2 }
    : { city: 12, airport: 5, station: 6, road: 8, neighbourhood: 6 }) : null;
  const translation = language === "en" ? 0 : language === "zh" ? 1 : 2;
  // Cull anchors before sorting: only the visible subset needs collision layout.
  const visible = labels.filter(label => view.zoom >= label.minZoom && Math.abs(label.x - view.x) <= 500 / view.zoom && Math.abs(label.y - view.y) <= 270 / view.zoom);
  for (const label of visible.sort((a, b) => b.priority - a.priority)) {
    if (view.zoom < label.minZoom || placed.length >= (size.width < 500 ? 16 : 30)) continue;
    if (limits && counts[label.kind] >= limits[label.kind]) continue;
    const text = label.names[translation] || label.names[0];
    const name = `${label.kind}-${text}`;
    if (!text || names.has(name)) continue;
    const x = ((label.x - view.x) * view.zoom + 500) / 1000 * size.width;
    const y = ((label.y - view.y) * view.zoom + 270) / 540 * size.height;
    if (x < 0 || x > size.width || y < 0 || y > size.height) continue;
    const width = [...text].reduce((sum, character) => sum + (/[^\u0000-\u00ff]/.test(character) ? 12 : 6.4), label.kind === "airport" || label.kind === "station" ? 18 : 6);
    const height = 18;
    for (const [left, top] of [[x + 8, y - 9], [x - width - 8, y - 9], [x - width / 2, y + 8], [x - width / 2, y - height - 8], [x + 32, y - 9], [x - width - 32, y - 9], [x - width / 2, y + 32], [x - width / 2, y - height - 32]]) {
      const box = { left, top, width, height };
      if (left < 4 || left + width > size.width - 4 || top < 4 || top + height > size.height - 4 || occupied.some(other => overlaps(box, other))) continue;
      placed.push({ ...box, id: label.id, text, kind: label.kind });
      occupied.push(box); names.add(name); counts[label.kind]++; break;
    }
  }
  return placed;
}
