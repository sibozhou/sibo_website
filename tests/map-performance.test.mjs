import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

test("the initial map uses a small overview and defers unchanged close-up boundaries", async () => {
  const source = await readFile(new URL("../app/personal-map.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /import geography from .*world-land/);
  const original = await read("../app/map/world-land.json");
  const overview = await read("../app/map/overview.json");
  // Both immediate projections, including exact local outlines, fit this budget.
  assert.ok(gzipSync(JSON.stringify(overview)).length < 350_000);
  const closeup = await read(`../public/map-geography/${overview.closeupFile}`);
  assert.deepEqual(closeup, original.closeup, "Delivery must not alter any detailed boundary coordinate");
  assert.deepEqual(await read(`../dist/client/map-geography/${overview.closeupFile}`), closeup, "The export must include the deferred geometry");
  for (const kind of ["countries", "regions", "cities"]) {
    for (const [id, shape] of Object.entries(closeup[kind])) assert.deepEqual(overview.closeupBounds[kind][id], shape.bounds);
  }
});

test("the production map's initial HTML and module stay within the transfer budget", async () => {
  const html = await readFile(new URL("../dist/client/map/index.html", import.meta.url), "utf8");
  const file = html.match(/href="[^"]*\/assets\/(personal-map-[^"]+\.js)"/)[1];
  const script = await readFile(new URL(`../dist/client/assets/${file}`, import.meta.url));
  assert.ok(gzipSync(html).length + gzipSync(script).length < 550_000, "Do not regress to the old ~2 MB compressed initial map payload");
  assert.doesNotMatch(html, /rel="preload"[^>]*map-geography/);
});

test("large road datasets are manifests with independently loadable, versioned tiles", async () => {
  for (const id of ["context", "haikou", "elmhurst", "los-angeles", "providence", "berkeley"]) {
    const data = await read(`../public/map-details/${id}.json`);
    assert.equal(data.routes.length, 0, `${id}: do not download every road before exploring`);
    assert.ok(data.tiles.length > 0);
    assert.ok(gzipSync(JSON.stringify(data)).length < 400_000);
    for (const tile of data.tiles) {
      assert.match(tile.version, /^[a-f0-9]{12}$/);
      const payload = await readFile(new URL(`../public/map-details/${id}/${tile.id}.json`, import.meta.url), "utf8");
      const chunk = JSON.parse(payload);
      assert.equal(tile.version, createHash("sha256").update(payload).digest("hex").slice(0, 12));
      assert.equal(await readFile(new URL(`../dist/client/map-details/${id}/${tile.id}.json`, import.meta.url), "utf8"), payload, "Every referenced tile must be exported for GitHub Pages");
      assert.ok(gzipSync(JSON.stringify(chunk)).length < 200_000);
      assert.ok(chunk.routes.length > 0);
    }
  }
});

test("map asset downloads are deduplicated, concurrency-limited, cancellable, and bounded", async () => {
  const source = await readFile(new URL("../app/map/load-asset.ts", import.meta.url), "utf8");
  const exports = {}, requests = [], waiting = new Map();
  let active = 0, peak = 0;
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, AbortController, DOMException, TextEncoder, URL,
    window: { location: { href: "https://sibozhou.com/map/" } },
    fetch: (path, { signal }) => new Promise((resolve, reject) => {
      active++; peak = Math.max(peak, active); requests.push(path);
      const abort = () => { active--; waiting.delete(path); reject(new DOMException("Aborted", "AbortError")); };
      signal.addEventListener("abort", abort, { once: true });
      waiting.set(path, value => { active--; signal.removeEventListener("abort", abort); resolve({ ok: value !== null, text: async () => JSON.stringify(value) }); });
    }),
  });
  const tick = () => new Promise(done => setImmediate(done));
  const first = exports.loadMapAsset("../map-details/one.json");
  const duplicate = exports.loadMapAsset("https://sibozhou.com/map-details/one.json");
  await tick();
  assert.equal(requests.length, 1);
  waiting.get(requests[0])({ value: 1 });
  waiting.delete(requests[0]);
  assert.deepEqual(await first, await duplicate);
  const jobs = Array.from({ length: 10 }, (_, i) => exports.loadMapAsset(`../map-details/tile-${i}.json`));
  await tick();
  assert.equal(active, 4);
  const controller = new AbortController();
  const cancelled = exports.loadMapAsset("../map-details/cancelled.json", controller.signal).catch(error => error.name);
  controller.abort();
  assert.equal(await cancelled, "AbortError");
  while (active) {
    for (const [path, resolve] of [...waiting]) { waiting.delete(path); resolve({ value: path }); }
    await tick();
  }
  await Promise.all(jobs);
  assert.equal(peak, 4);
  assert.equal(requests.some(path => path.includes("cancelled")), false, "Abandoned queued tiles must not download");
  const before = requests.length;
  await exports.loadMapAsset("../map-details/one.json");
  assert.equal(requests.length, before);
  const sharedController = new AbortController();
  const cancelledUser = exports.loadMapAsset("../map-details/shared.json", sharedController.signal).catch(error => error.name);
  const remainingUser = exports.loadMapAsset("../map-details/shared.json");
  await tick();
  sharedController.abort();
  assert.equal(await cancelledUser, "AbortError");
  assert.equal(active, 1, "One cancelled subscriber must not abort another subscriber's download");
  waiting.get(requests.at(-1))({ value: 2 }); waiting.delete(requests.at(-1));
  assert.equal((await remainingUser).value, 2);
  const failed = exports.loadMapAsset("../map-details/failure.json");
  await tick();
  waiting.get(requests.at(-1))(null); waiting.delete(requests.at(-1));
  await assert.rejects(failed, /Map asset unavailable/);
  await tick();
  const retry = exports.loadMapAsset("../map-details/failure.json");
  await tick();
  assert.equal(requests.filter(path => path.endsWith("failure.json")).length, 2, "A failed request must not poison the cache");
  waiting.get(requests.at(-1))({ value: 3 }); waiting.delete(requests.at(-1));
  assert.equal((await retry).value, 3);
  for (let i = 0; i < 4; i++) {
    const job = exports.loadMapAsset(`../map-details/large-${i}.json`);
    await tick();
    waiting.get(requests.at(-1))({ text: "x".repeat(3_000_000) });
    waiting.delete(requests.at(-1));
    await job;
  }
  const again = exports.loadMapAsset("../map-details/one.json");
  await tick();
  assert.equal(requests.at(-1), "https://sibozhou.com/map-details/one.json", "Older entries must be evicted once the byte budget is exceeded");
  waiting.get(requests.at(-1))({ value: 1 });
  await again;
});
