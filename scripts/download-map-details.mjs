import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cityDetailAreas, detailAreas } from "./map-detail-areas.mjs";

// One-time, cached source downloads. Never run this from a website build or browser.
// Usage: node scripts/download-map-details.mjs /path/to/source-directory [overpass-endpoint]
const directory = process.argv[2];
const endpoint = process.argv[3] ?? "https://maps.mail.ru/osm/tools/overpass/api/interpreter";
await mkdir(directory, { recursive: true });
const download = async (name, url, options = {}) => {
  const path = join(directory, name);
  try { JSON.parse(await readFile(path, "utf8")); return; } catch (error) { if (error.code !== "ENOENT") throw error; }
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(120_000), headers: { "User-Agent": "SiboZhouPersonalMap/1.0 (https://sibozhou.com; cached cartography)", ...options.headers } });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}; wait before retrying Overpass requests`);
  const data = await response.json();
  if (data.remark) throw new Error(`${name}: ${data.remark}`);
  await writeFile(path, JSON.stringify(data));
  console.log(`Cached ${name}`);
};
for (const name of ["populated_places", "airports", "roads", "railroads"]) {
  await download(`ne-${name}.geojson`, `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_${name}.geojson`);
}

// Modest regional extracts, requested sequentially in accordance with Overpass's
// usage policy. No full-world scrape or live API calls.
for (const [id, bounds] of Object.entries(detailAreas)) {
  const bbox = bounds.join(",");
  const query = `[out:json][timeout:60];(
    way["highway"~"^(motorway|trunk|primary|secondary|tertiary)(_link)?$"](${bbox});
    way["railway"~"^(rail|light_rail|subway|tram)$"]["service"!~"."](${bbox});
    way["aeroway"="runway"](${bbox});
    ${id === "haikou" ? `nwr["aeroway"="aerodrome"]["iata"](${bbox});` : ""}
    node["place"~"^(city|town|village|suburb|neighbourhood)$"](${bbox});
    node["railway"~"^(station|halt)$"](${bbox});
  );out geom;`;
  await download(`osm-${id}-${bounds.join("_")}.json`, endpoint, { method: "POST", body: new URLSearchParams({ data: query }) });
  const cityBounds = cityDetailAreas[id];
  const streets = `[out:json][timeout:60];way["highway"~"^(residential|unclassified|living_street|service)$"]["access"!~"^(private|no)$"](${cityBounds.join(",")});out geom;`;
  await download(`osm-streets-${id}-${cityBounds.join("_")}.json`, endpoint, { method: "POST", body: new URLSearchParams({ data: streets }) });
}
