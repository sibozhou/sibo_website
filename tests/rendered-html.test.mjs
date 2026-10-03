import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { gzipSync, inflateSync } from "node:zlib";
import ts from "typescript";
import { cityDetailAreas, detailAreas } from "../scripts/map-detail-areas.mjs";

const output = new URL("../dist/client/", import.meta.url);
const site = process.env.PAGES_SITE_URL ?? "https://sibozhou.com/";
const basePath = new URL(site).pathname;
const pathSegments = path => new Set(path.split("M").filter(Boolean).flatMap(ring => {
  const points = [...ring.matchAll(/(?:^|L)(-?[\d.]+),(-?[\d.]+)/g)].map(([, x, y]) => `${Number(x)},${Number(y)}`);
  if (ring.endsWith("Z") && points.at(-1) !== points[0]) points.push(points[0]);
  return points.slice(1).map((point, index) => [points[index], point].sort().join("|"));
}));
const detailRoutes = async (id, data) => (await Promise.all((data.tiles ?? []).map(async tile => {
  const chunk = JSON.parse(await readFile(new URL(`../public/map-details/${id}/${tile.id}.json`, import.meta.url), "utf8"));
  return chunk.routes;
}))).flat();

test("zoomable map details are local, compact, and cover all five places", async () => {
  const context = JSON.parse(await readFile(new URL("../public/map-details/context.json", import.meta.url), "utf8"));
  const contextRoutes = await detailRoutes("context", context);
  assert.ok(context.labels.some(label => label.names[0] === "Beijing"));
  assert.ok(context.labels.some(label => label.names[0] === "San Francisco"));
  assert.ok(context.labels.some(label => label.kind === "airport" && label.names[0] === "LAX"));
  assert.ok(contextRoutes.some(route => route.kind === "road"));
  assert.ok(contextRoutes.some(route => route.kind === "rail"));
  assert.ok(Buffer.byteLength(JSON.stringify(context)) < 3_000_000);
  for (const id of ["haikou", "elmhurst", "los-angeles", "providence", "berkeley"]) {
    const data = JSON.parse(await readFile(new URL(`../public/map-details/${id}.json`, import.meta.url), "utf8"));
    const routes = await detailRoutes(id, data);
    assert.equal(data.source, "© OpenStreetMap contributors · ODbL 1.0");
    assert.ok(data.timestamp, "Keep the source date for reproducible extracts");
    assert.equal(data.coverage.length, 4);
    assert.ok(data.coverage.every(Number.isFinite));
    assert.ok(routes.some(route => route.kind === "road"));
    assert.ok(routes.some(route => route.kind === "rail"));
    assert.ok(data.labels.some(label => label.kind === "station"));
    // Greater Los Angeles is denser; keep an explicit budget for its wider extract.
    assert.ok(Buffer.byteLength(JSON.stringify(data)) < (id === "los-angeles" ? 6_500_000 : 3_000_000));
    assert.ok(gzipSync(JSON.stringify(data)).byteLength < (id === "los-angeles" ? 1_800_000 : 800_000));
    for (const route of routes) {
      assert.ok(route.bounds.every(Number.isFinite));
      assert.match(route.path, /^M[\d.-]+,[\d.-]+l/);
      assert.doesNotMatch(route.path, /NaN|Infinity|Z/);
    }
  }
});

test("zoom details include real geography across a wider surrounding area", async () => {
  const previousAreas = {
    haikou: [19.85, 110, 20.1, 110.6],
    elmhurst: [41.79, -88.08, 42.02, -87.78],
    "los-angeles": [33.86, -118.55, 34.3, -118.1],
    providence: [41.66, -71.53, 41.97, -71.29],
    berkeley: [37.73, -122.45, 38.02, -122.08],
  };
  const projection = {};
  runInNewContext(ts.transpileModule(await readFile(new URL("../app/map/projection.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: projection });
  const point = (longitude, latitude) => {
    const { x, y } = projection.projectDetailLocation(longitude, latitude);
    return [Number(x.toFixed(6)), Number(y.toFixed(6))];
  };
  for (const [id, [south, west, north, east]] of Object.entries(detailAreas)) {
    const [oldSouth, oldWest, oldNorth, oldEast] = previousAreas[id];
    assert.ok(north - south >= (oldNorth - oldSouth) * 1.9, `${id}: expand north/south coverage`);
    assert.ok(east - west >= (oldEast - oldWest) * 1.9, `${id}: expand east/west coverage`);
    const data = JSON.parse(await readFile(new URL(`../public/map-details/${id}.json`, import.meta.url), "utf8"));
    assert.deepEqual(data.coverage, [...point(west, north), ...point(east, south)]);
    const [left, top] = point(oldWest, oldNorth), [right, bottom] = point(oldEast, oldSouth);
    const outerLabels = data.labels.filter(({ x, y }) => x < left || x > right || y < top || y > bottom);
    assert.ok(outerLabels.filter(label => label.kind === "city").length >= 10, `${id}: load surrounding towns, not just enlarge the coverage rectangle`);
    assert.ok(outerLabels.some(label => label.kind === "road"), `${id}: include roads outside the old extract`);
  }
});

test("street coverage contains the whole municipal boundary of every city", async () => {
  const geography = JSON.parse(await readFile(new URL("../app/map/world-land.json", import.meta.url), "utf8"));
  for (const [id, city] of Object.entries(geography.closeup.cities)) {
    const data = JSON.parse(await readFile(new URL(`../public/map-details/${id}.json`, import.meta.url), "utf8"));
    const [left, top, right, bottom] = data.coverage;
    const [cityLeft, cityTop, cityRight, cityBottom] = city.bounds;
    assert.ok(left < cityLeft && top < cityTop && right > cityRight && bottom > cityBottom, `${id}: include the full municipality and a surrounding buffer`);
    const streetTiles = data.tiles.filter(tile => tile.minZoom >= 700);
    assert.ok(streetTiles.length > 0, `${id}: include local streets, not only arterial roads`);
    for (const tile of streetTiles) {
      const streets = JSON.parse(await readFile(new URL(`../public/map-details/${id}/${tile.id}.json`, import.meta.url), "utf8"));
      assert.ok(streets.routes.some(route => route.kind === "road" && route.level >= 4));
      assert.ok(gzipSync(JSON.stringify(streets)).byteLength < 200_000, `${id}/${tile.id}: keep each street download small`);
    }
  }
});

test("changing detail coverage cannot reuse a smaller cached source", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sibo-map-detail-cache-"));
  for (const name of ["populated_places", "airports", "roads", "railroads"]) {
    await writeFile(join(directory, `ne-${name}.geojson`), JSON.stringify({ features: [] }));
  }
  for (const id of Object.keys(detailAreas)) await writeFile(join(directory, `osm-${id}.json`), "{}");
  execFileSync(process.execPath, ["--input-type=module", "-e", `
    process.argv[2] = ${JSON.stringify(directory)};
    const queries = [];
    globalThis.fetch = async (url, options) => {
      queries.push(options.body.get("data"));
      return { ok: true, json: async () => ({ osm3s: { timestamp_osm_base: "2026-10-02T00:00:00Z" }, elements: [] }) };
    };
    await import(${JSON.stringify(new URL("../scripts/download-map-details.mjs", import.meta.url).href)});
    const assert = (await import("node:assert/strict")).default;
    assert.equal(queries.length, 10, "Each city needs both arterial and local street sources");
    assert.equal(queries.filter(query => query.includes("residential|unclassified|living_street|service")).length, 5);
    process.argv[3] = ${JSON.stringify(join(directory, "output"))};
    await import(${JSON.stringify(new URL("../scripts/generate-map-details.mjs", import.meta.url).href)});
  `]);
  for (const [id, bounds] of Object.entries(detailAreas)) {
    await access(join(directory, `osm-${id}-${bounds.join("_")}.json`));
    await access(join(directory, `osm-streets-${id}-${cityDetailAreas[id].join("_")}.json`));
    const generated = JSON.parse(await readFile(join(directory, "output", `${id}.json`), "utf8"));
    assert.equal(generated.timestamp, "2026-10-02T00:00:00Z");
  }
});

test("detail labels reveal progressively, stay readable, and avoid pins and one another", async () => {
  const details = {}, projection = {};
  runInNewContext(ts.transpileModule(await readFile(new URL("../app/map/projection.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: projection });
  runInNewContext(ts.transpileModule(await readFile(new URL("../app/map/details.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: details, require: () => projection });
  const labels = [
    { id: "city", names: ["Berkeley", "伯克利", "柏克萊"], kind: "city", x: 500, y: 270, minZoom: 2, priority: 100 },
    { id: "nearby", names: ["Oakland", "奥克兰", "奧克蘭"], kind: "city", x: 500.01, y: 270, minZoom: 2, priority: 90 },
    { id: "station", names: ["Downtown Berkeley", "Downtown Berkeley", "Downtown Berkeley"], kind: "station", x: 501, y: 270, minZoom: 500, priority: 60 },
  ];
  const view = { x: 500, y: 270, zoom: 100, detail: true };
  const size = { width: 800, height: 432 };
  const overlap = (a, b) => a.left < b.left + b.width + 4 && a.left + a.width + 4 > b.left && a.top < b.top + b.height + 4 && a.top + a.height + 4 > b.top;
  assert.equal(details.layoutMapLabels(labels, { ...view, detail: false }, size, "en", []).length, 0);
  const visible = details.layoutMapLabels(labels, view, size, "en", []);
  assert.equal(visible[0].text, "Berkeley");
  assert.equal(visible.some(label => label.id === "station"), false);
  for (const a of visible) for (const b of visible) if (a !== b) assert.equal(overlap(a, b), false);
  const reserved = [{ left: 378, top: 190, width: 44, height: 44 }];
  const pinned = details.layoutMapLabels(labels, view, size, "zh-hant", reserved);
  assert.equal(pinned[0].text, "柏克萊");
  for (const label of pinned) assert.equal(overlap(label, reserved[0]), false);
  for (const width of [320, 820, 1000]) {
    const placed = details.layoutMapLabels(labels, { ...view, zoom: 1000 }, { width, height: width * .54 }, "en", []);
    for (const label of placed) {
      assert.ok(label.left >= 4 && label.left + label.width <= width - 4);
      assert.ok(label.top >= 4 && label.top + label.height <= width * .54 - 4);
      assert.equal(label.height, 18, "Labels must remain screen-sized, not grow with geography");
    }
  }
  const dense = Array.from({ length: 40 }, (_, i) => ({ ...labels[0], id: `city-${i}`, names: [`City ${i}`, `City ${i}`, `City ${i}`], x: 500 + (i % 10 * 85 + 50 - 500) / 1000, y: 270 + (Math.floor(i / 10) * 90 + 50 - 270) / 1000 }));
  const mixed = details.layoutMapLabels([...dense, { ...labels[2], x: 500, y: 270.18 }, { ...labels[2], id: "street", kind: "road", names: ["Ashby Avenue", "Ashby Avenue", "Ashby Avenue"], priority: 45, x: 500.2, y: 270.18 }], { ...view, zoom: 1000 }, size, "en", []);
  assert.ok(mixed.some(label => label.kind === "station"), "City names must leave room for station detail");
  assert.ok(mixed.some(label => label.kind === "road"), "Dense cities must leave room for key street names");
  assert.ok(mixed.filter(label => label.kind === "city").length <= 12);
  for (const [language, route] of [["en", "map/"], ["zh", "zh/map/"], ["zh-hant", "zh-hant/map/"]]) {
    const path = details.mapDetailPath(language, "berkeley");
    for (const base of ["https://sibozhou.com/", "https://sibozhou.github.io/sibo_website/"]) {
      assert.equal(new URL(path, base + route).href, base + "map-details/berkeley.json");
    }
  }
});

test("map details load only on zoom, reuse downloads, and ignore stale city responses", async () => {
  const projection = {}, details = {}, exports = {}, hooks = [], requests = new Map();
  const downloads = new Map(), frames = new Map(), signals = new Map();
  let frameId = 0;
  const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compile(await readFile(new URL("../app/map/projection.ts", import.meta.url), "utf8")), { exports: projection });
  runInNewContext(compile(await readFile(new URL("../app/map/details.ts", import.meta.url), "utf8")), { exports: details, require: () => projection });
  let cursor = 0, pending = [], disconnects = 0;
  const root = { getBoundingClientRect: () => ({ width: 800, height: 432 }) };
  runInNewContext(compile(await readFile(new URL("../app/map/map-details.tsx", import.meta.url), "utf8")), {
    exports,
    AbortController,
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class { observe() {} disconnect() { disconnects++; } },
    require: name => name === "react" ? {
      useState: initial => { const index = cursor++; if (!(index in hooks)) hooks[index] = initial; return [hooks[index], value => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }]; },
      useRef: initial => { const index = cursor++; return hooks[index] ??= { current: initial }; },
      useEffect: (effect, dependencies) => {
        const index = cursor++;
        if (!hooks[index] || dependencies.some((value, i) => value !== hooks[index].dependencies[i])) {
          pending.push(() => { hooks[index]?.cleanup?.(); hooks[index] = { dependencies, cleanup: effect() }; });
        }
      },
    } : name.includes("projection") ? projection : name.includes("load-asset") ? {
      loadMapAsset: (path, signal) => {
        signals.set(path, signal);
        if (!downloads.has(path)) downloads.set(path, new Promise(resolve => requests.set(path, value => resolve(value.json()))));
        return downloads.get(path);
      },
    } : name.includes("details") ? details : {
      jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
    },
  });
  const flatten = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  const view = { x: 500, y: 270, zoom: 100, detail: true };
  const props = { language: "en", placeId: "haikou", view, locations: [] };
  const render = overrides => {
    Object.assign(props, overrides); cursor = 0;
    const nodes = flatten(exports.MapDetails(props));
    nodes.find(node => node.props?.className === "map-details").props.ref.current = root;
    pending.forEach(effect => effect()); pending = [];
    return nodes;
  };
  const flush = () => { for (const [id, callback] of [...frames]) { frames.delete(id); callback(); } };
  const data = text => ({ coverage: [499, 269, 503, 271], tiles: [{ id: "near", bounds: [499.8, 269.8, 500.2, 270.2], minZoom: 700 }, { id: "far", bounds: [501.8, 269.8, 502.2, 270.2], minZoom: 700 }, { id: "overlap", bounds: [499, 269, 503, 271], minZoom: 700 }], routes: [{ kind: "road", level: 0, minZoom: 60, bounds: [499, 269, 501, 271], path: "M499,269l2,2" }], labels: [{ id: text, names: [text, text, text], kind: "city", x: 500, y: 270, minZoom: 60, priority: 100 }] });
  const resolve = async (path, value) => {
    requests.get(path)({ ok: true, json: async () => value });
    await new Promise(done => setImmediate(done));
    flush();
  };
  render({ view: { ...view, zoom: 1, detail: false } });
  assert.equal(requests.size, 0);
  render({ view: { ...view, zoom: 10 } });
  assert.deepEqual([...requests.keys()], ["../map-details/context.json"]);
  await resolve("../map-details/context.json", data("context"));
  render({ view });
  assert.equal(requests.has("../map-details/haikou.json"), true);
  render({ placeId: "berkeley" });
  await resolve("../map-details/berkeley.json", data("Berkeley"));
  await resolve("../map-details/haikou.json", data("Haikou"));
  const nodes = render();
  const words = nodes.filter(node => node.props?.className === "map-detail-label").map(node => node.props.children.at(-1));
  assert.ok(words.includes("Berkeley"));
  assert.equal(words.includes("Haikou"), false, "Late old-city data cannot replace the selected place");
  assert.equal(nodes.find(node => node.props?.className === "map-geography").props.style.transform, "translate(-49500px, -26730px) scale(100)");
  assert.ok(nodes.some(node => node.props?.mask === "url(#map-context-coverage)"));
  assert.ok(nodes.some(node => node.props?.clipPath === "url(#map-local-coverage)"));
  const downloadsBeforeWrap = requests.size;
  const wrapped = render({ view: { ...view, x: view.x + 3 * projection.detailWorldWidth } });
  assert.deepEqual(wrapped.filter(node => node.props?.className === "map-detail-label").map(node => node.props.style), nodes.filter(node => node.props?.className === "map-detail-label").map(node => node.props.style));
  assert.equal(requests.size, downloadsBeforeWrap, "Returning around the world must reuse the same detail downloads");
  assert.ok(wrapped.some(node => node.type === "use" && node.props.href === "#map-base-details" && node.props.x === 3 * projection.detailWorldWidth), "The existing road and coverage layers must travel with the wrapped world");
  render({ view: { ...view, detail: false, zoom: 1 } });
  const before = requests.size;
  render({ view });
  render({ placeId: "haikou" });
  await new Promise(done => setImmediate(done));
  flush();
  assert.equal(requests.size, before);
  assert.ok(render().some(node => node.props?.className === "map-detail-label" && node.props.children.at(-1) === "Haikou"));
  assert.equal([...requests.keys()].some(path => path.includes("/haikou/")), false, "Local street tiles should not load at overview zoom");
  render({ view: { ...view, zoom: 1000 } });
  assert.equal(requests.has("../map-details/haikou/near.json"), true);
  assert.equal(requests.has("../map-details/haikou/far.json"), false, "Only visible street tiles should download");
  const street = { kind: "road", level: 4, minZoom: 700, bounds: [499.8, 269.8, 500.2, 270.2], path: "M499.8,269.8l.4,.4" };
  await resolve("../map-details/haikou/near.json", { routes: [street], labels: [] });
  assert.ok(render().some(node => node.props?.d === street.path));
  const overlapSignal = signals.get("../map-details/haikou/overlap.json");
  render({ view: { ...view, x: 502, zoom: 1000 } });
  assert.equal(signals.get("../map-details/haikou/overlap.json"), overlapSignal, "Panning must not restart a download that is still visible");
  assert.equal(overlapSignal.aborted, false);
  assert.equal(requests.has("../map-details/haikou/far.json"), true, "Panning should reveal detail across the rest of the city");
  render({ placeId: "berkeley" });
  await resolve("../map-details/haikou/far.json", { routes: [{ ...street, bounds: [501.8, 269.8, 502.2, 270.2], path: "M501.8,269.8l.4,.4" }], labels: [] });
  assert.equal(render().some(node => node.props?.d === "M501.8,269.8l.4,.4"), false, "Late street downloads cannot leak into another city");
  const downloaded = requests.size;
  render({ placeId: "haikou", view: { ...view, zoom: 1000 } });
  await new Promise(done => setImmediate(done));
  render(); // React rerenders after the cached manifest restores localData.
  await new Promise(done => setImmediate(done));
  flush();
  assert.equal(requests.size, downloaded, "Returning to an already visited tile must reuse its download");
  assert.ok(render().some(node => node.props?.d === street.path));
  assert.equal(disconnects, 0, "Zooming should not reset the resize observer or page");
});

for (const route of ["", "research/", "notes/", "map/", "zh/", "zh/research/", "zh/notes/", "zh/map/", "zh-hant/", "zh-hant/research/", "zh-hant/notes/", "zh-hant/map/"]) {
  test(`static ${route || "home"} page and every local link resolve on GitHub Pages`, async () => {
    const html = await readFile(new URL(route + "index.html", output), "utf8");
    assert.doesNotMatch(html, /id="seasonal-theme"/);
    const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    assert.equal((markup.match(/<h1\b/g) ?? []).length, route.endsWith("map/") ? 0 : 1);
    const primaryNav = markup.match(/<nav class="site-nav"[^]*?<\/nav>/)?.[0] ?? "";
    assert.equal((primaryNav.match(/<a\b/g) ?? []).length, 3);
    assert.doesNotMatch(primaryNav, /notes\/|随记|隨記/);
    if (!route.endsWith("notes/")) assert.match(primaryNav, /aria-current="page"/);
    assert.match(markup, /id="main-content"/);
    assert.doesNotMatch(markup, /class="header-color"/);
    const favicon = markup.match(/<link\b(?=[^>]*rel="icon")[^>]*>/)?.[0] ?? "";
    assert.match(favicon, /type="image\/svg\+xml"/);
    assert.equal(new URL(favicon.match(/href="([^"]+)"/)?.[1] ?? "", site + route).href, "https://sibozhou.com/favicon.svg");
    assert.ok(markup.includes('href="https://sibozhou.com/' + route + '"'));
    assert.doesNotMatch(markup, /codex-preview|Building your site|213-910-6886|We investigated whether/i);
    const traditional = route.startsWith("zh-hant/");
    const chinese = traditional || route.startsWith("zh/");
    const research = route.endsWith("research/");
    const notes = route.endsWith("notes/");
    const map = route.endsWith("map/");
    const title = research
      ? chinese ? "研究 — 周思博" : "research — sibo zhou"
      : notes
      ? traditional ? "隨記 — 周思博" : chinese ? "随记 — 周思博" : "notes — sibo zhou"
      : map
      ? traditional ? "地圖 — 周思博" : chinese ? "地图 — 周思博" : "map — sibo zhou"
      : traditional ? "認識周思博" : chinese ? "认识周思博" : "Meet sibo zhou";
    assert.match(markup, new RegExp(`class="site-shell site-shell-${research ? "research" : notes ? "notes" : map ? "map" : "home"}"`));
    assert.ok(markup.includes(`<title>${title}</title>`));
    assert.ok(markup.includes(`property="og:title" content="${title}"`));
    const arrowLinks = [...markup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>[^]*?<\/a>/g)]
      .filter(([link]) => /[↗↓→]/.test(link));
    assert.deepEqual(arrowLinks.map(([, href]) => href), research || notes || map ? [] : ["mailto:sibozhou@berkeley.edu", "https://www.linkedin.com/in/sibo-zhou88"]);
    for (const [link] of arrowLinks) {
      assert.match(link, /<span class="link-label"/);
      assert.match(link, /<span class="link-arrow" aria-hidden="true">↗<\/span>/);
    }
    const languageTag = traditional ? "zh-Hant" : chinese ? "zh-Hans" : "en";
    assert.ok(markup.includes(`<html lang="${languageTag}"`));
    const suffix = research ? "research/" : notes ? "notes/" : map ? "map/" : "";
    const alternateRoute = chinese ? suffix : "zh/" + suffix;
    for (const className of ["wordmark"]) {
      const link = markup.match(new RegExp(`<a class="${className}[^\"]*"[^>]*href="([^\"]+)"[^>]*>([\\s\\S]*?)<\\/a>`));
      assert.ok(link, `Missing ${className}`);
      assert.equal(new URL(link[1], site + route).href, site + alternateRoute);
      assert.equal(link[2].replace(/<[^>]*>/g, ""), chinese ? "siboEN" : "思博中");
      assert.ok(link[2].includes(`<span class="wordmark-language" lang="${chinese ? "en" : "zh-Hans"}" aria-hidden="true">${chinese ? "EN" : "中"}</span>`));
      assert.doesNotMatch(link[2], /link-arrow|↗/);
    }
    const switches = [...markup.matchAll(/<a class="language-switch"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
    const alternatives = [
      { tag: "en", path: "", label: "English" },
      { tag: "zh-Hans", path: "zh/", label: "简体中文" },
      { tag: "zh-Hant", path: "zh-hant/", label: "繁體中文" },
    ].filter((option) => option.tag !== languageTag);
    assert.equal(switches.length, 2);
    switches.forEach(([, href, label], index) => {
      assert.equal(new URL(href, site + route).href, site + alternatives[index].path + suffix);
      assert.equal(label, alternatives[index].label);
    });
    assert.match(markup, /hrefLang="en"|hreflang="en"/);
    assert.match(markup, /hrefLang="zh-Hans"|hreflang="zh-Hans"/);
    assert.match(markup, /hrefLang="zh-Hant"|hreflang="zh-Hant"/);
    if (traditional) {
      const main = markup.match(/<main\b[^]*?<\/main>/)?.[0] ?? "";
      assert.doesNotMatch(main, /[学与书国体奖联数经机习统员发论报网获协]/);
      assert.match(main, research ? /工作論文/ : notes ? /一些正在想、正在學/ : map ? /家鄉/ : /資料科學/);
    }
    if (research) {
      assert.doesNotMatch(markup, /section-jumps|href="#working-papers"|href="#publications"/);
      assert.match(markup, /class="research-description"/);
      if (chinese) {
        assert.match(markup, /id="research-title"[^]*?class="calligraphy-research"/);
      } else {
        assert.doesNotMatch(markup, /calligraphy-research|calligraphy-yan|calligraphy-jiu/);
      }
      assert.equal((markup.match(/class="disclosure-toggle"/g) ?? []).length, 2);
      assert.doesNotMatch(markup, /class="section-count"/);
      for (const id of ["working-papers", "publications"]) {
        const section = markup.match(new RegExp(`<section[^>]*id="${id}"[^]*?<\\/section>`))?.[0] ?? "";
        assert.match(section, /class="editorial-section home-disclosure"/);
        assert.match(section, /data-open="false"/);
        assert.match(section, /aria-expanded="false"/);
        assert.ok(section.includes(`aria-controls="${id}-content"`));
        assert.match(section, /class="disclosure-panel"[^>]*inert=""[^>]*aria-hidden="true"/);
      }
      assert.ok(markup.includes(chinese ? "研究 — 周思博" : "research — sibo zhou"));
      assert.match(markup, traditional ? /我的研究興趣圍繞公共衛生以及健康經濟學/ : chinese ? /我的研究兴趣围绕公共卫生以及健康经济学/ : /My research interests center on public health and health economics/);
      assert.doesNotMatch(markup, /machine learning, and statistics|机器学习与统计学|機器學習與統計學/);
      assert.match(markup, /Education selectively improves TB and HIV knowledge/);
      assert.equal((markup.match(/class="paper"/g) ?? []).length, 4);
      assert.match(markup, /id="publications"/);
      const workingPapers = markup.match(/<section[^>]*id="working-papers"[\s\S]*?<\/section>/)?.[0] ?? "";
      const publications = markup.match(/<section[^>]*id="publications"[\s\S]*?<\/section>/)?.[0] ?? "";
      assert.equal((workingPapers.match(/class="paper"/g) ?? []).length, 3);
      assert.doesNotMatch(workingPapers, /Diagnostic Considerations for Neurolymphomatosis/);
      assert.match(publications, /Diagnostic Considerations for Neurolymphomatosis/);
      assert.match(publications, /https:\/\/doi.org\/10.3390\/cancers18132068/);
      if (chinese) {
        assert.match(markup, /共同第一作者/);
        assert.doesNotMatch(markup, /同等贡献|同等貢獻/);
      } else {
        assert.match(markup, /Equal contribution/);
      }
    } else if (notes) {
      assert.match(markup, /id="notes-title"/);
      assert.match(markup, /class="notes-description"/);
      if (chinese) {
        assert.match(markup, /id="notes-title"[^]*?class="calligraphy-notes"/);
      } else {
        assert.doesNotMatch(markup, /calligraphy-notes|calligraphy-sui|calligraphy-ji/);
      }
      assert.match(markup, traditional ? /一些正在想、正在學的事。/ : chinese ? /一些正在想、正在学的事。/ : /A loose collection of things I’m thinking about or learning/);
      assert.doesNotMatch(markup, /偶然留意到|simply want to remember/);
      assert.equal((markup.match(/class="disclosure-toggle"/g) ?? []).length, 0);
      assert.doesNotMatch(markup, /calligraphy-name|calligraphy-research/);
    } else if (map) {
      assert.equal(/map-hint|map-mouse-hint|Choose a place\.|Scroll to zoom\.|选择一个地点|選擇一個地點|滚轮缩放|滾輪縮放/.test(markup), false, "Map instruction text must be absent in every language");
      assert.doesNotMatch(markup, /map-title|map-intro|map-description|From Haikou, a few places along the way\.|从海口出发，走过的一些地方。|從海口出發，走過的一些地方。/);
      assert.match(markup, /<main\b[^>]*>\s*<section class="personal-map" aria-label="[^"]+">/);
      assert.equal((markup.match(/class="map-place"/g) ?? []).length, 5);
      assert.equal((markup.match(/class="map-pin"/g) ?? []).length, 5);
      const placeNumbers = [...markup.matchAll(/class="map-place-number" aria-hidden="true">(\d+)<\/span>/g)].map(match => match[1]);
      const pinNumbers = (markup.match(/class="map-pin"[^]*?<\/button>/g) ?? []).map(pin => pin.match(/<span aria-hidden="true">(\d+)<\/span>/)?.[1]);
      assert.deepEqual(placeNumbers, ["1", "2", "3", "4", "5"]);
      assert.deepEqual(pinNumbers, ["1", "2", "3", "4", "5"]);
      assert.match(markup, /class="map-land"/);
      for (const layer of ["country", "region", "city", "lakes"]) assert.match(markup, new RegExp(`class="map-${layer}"`));
      assert.match(markup, /class="map-maritime"/);
      assert.equal(/China-POV boundaries;|中国边界采用 Natural Earth 中国视角|中國邊界採用 Natural Earth 中國視角|maritime lines indicate disputed claims|海上虚线表示有争议的主张|海上虛線表示有爭議的主張/.test(markup), false, "Remove the boundary convention note in every language");
      assert.match(markup, traditional ? /行政邊界包含水域。/ : chinese ? /行政边界包含水域。/ : /Administrative boundaries, including water areas\./);
      assert.equal((markup.match(/class="map-scale"/g) ?? []).length, 3);
      assert.doesNotMatch(markup, /map-coordinates|° [NSEW]/);
      assert.match(markup, chinese ? /海南省/ : /Hainan, China/);
      assert.doesNotMatch(markup, /state\s*\/\s*province|省\s*\/\s*州/);
      assert.match(markup, /https:\/\/www.openstreetmap.org\/copyright/);
      assert.match(markup, /class="map-caption" aria-live="polite" aria-atomic="true"/);
      assert.match(markup, traditional ? /家鄉/ : chinese ? /家乡/ : /home/);
      assert.match(markup, traditional ? /柏克萊/ : chinese ? /伯克利/ : /Berkeley/);
      assert.equal((markup.match(/class="disclosure-toggle"/g) ?? []).length, 0);
    } else {
      assert.equal((markup.match(/class="disclosure-toggle"/g) ?? []).length, 3);
      assert.doesNotMatch(markup, /disclosure-indicator/);
      for (const id of ["background", "news", "contact"]) {
        const section = markup.match(new RegExp(`<section[^>]*aria-labelledby="${id}-title"[^]*?<\\/section>`))?.[0] ?? "";
        assert.match(section, /data-open="false"/);
        const labels = traditional ? ["經歷", "相關報導", "聯絡我"] : chinese ? ["经历", "相关报道", "联系我"] : ["background", "recognition &amp; media", "get in touch"];
        assert.ok(section.includes(`<span class="section-label">${labels[["background", "news", "contact"].indexOf(id)]}</span>`));
        const button = section.match(/<button\b[^>]*>/)?.[0] ?? "";
        assert.match(button, /type="button"/);
        assert.match(button, /aria-expanded="false"/);
        assert.ok(button.includes(`aria-controls="${id}-content"`));
        const panel = section.match(/<div class="disclosure-panel"[^>]*>/)?.[0] ?? "";
        assert.ok(panel.includes(`id="${id}-content"`));
        assert.match(panel, /inert=""/);
        assert.match(panel, /aria-hidden="true"/);
      }
      assert.match(markup, /Sibo Zhou/);
      const intro = markup.match(/<section[^>]*aria-labelledby="intro-title"[^]*?<\/section>/)?.[0] ?? "";
      if (chinese) {
        assert.match(intro, /class="calligraphy-name"/);
      } else {
        assert.doesNotMatch(intro, /calligraphy-name/);
      }
      assert.doesNotMatch(intro, /calligraphy-link|digitalarchive\.npm\.gov\.tw/);
      const heading = intro.indexOf('class="hero-heading"');
      const portrait = intro.indexOf('class="hero-art"');
      const biography = intro.indexOf('class="hero-content"');
      assert.ok(heading >= 0 && heading < portrait && portrait < biography, "Identity must precede the mobile portrait and biography");
      assert.match(intro, /sibo-zhou-coast\.jpg/);
      assert.match(intro, /<span class="photo-caption" lang="en">newport, <strong>rhode island<\/strong><\/span>/);
      assert.doesNotMatch(intro, /natural-history|自然病程|My interests span|我的研究兴趣|我的研究興趣/);
      const copy = intro.match(/<div class="intro-copy">[^]*?<\/div>/)?.[0] ?? "";
      const paragraphs = [...copy.matchAll(/<p>([^]*?)<\/p>/g)].map(([, paragraph]) => paragraph.replace(/<[^>]*>/g, ""));
      assert.equal(paragraphs.length, 2);
      if (!chinese) {
        assert.deepEqual(paragraphs, [
          "I am a Predoctoral Scholar and Junior Specialist at UC Berkeley Haas, working with Prof. David Chan on health economics research.",
          "I also collaborate with Prof. Eric T. Wong at Brown on neuro-oncology studies.",
        ]);
      } else {
        assert.doesNotMatch(paragraphs[0], /目前/);
        assert.match(paragraphs[0], /David Chan/);
        assert.match(paragraphs[1], /Eric T. Wong/);
      }
      assert.ok(markup.includes(traditional ? "加州大學柏克萊分校哈斯商學院" : chinese ? "加州大学伯克利分校哈斯商学院" : "UC Berkeley Haas"));
      assert.ok(markup.includes("https://mp.weixin.qq.com/s/MTZ60leYEtZBZ_XnhVgJxw"));
      assert.match(markup, /Steven and Kathryn Sample Renaissance Scholar Prize/);
      assert.match(markup, /USC Dornsife Scholar Prize/);
      const background = markup.match(/<section[^>]*aria-labelledby="background-title"[^]*?<\/section>/)?.[0] ?? "";
      assert.match(background, /href="https:\/\/haas.berkeley.edu\/"/);
      assert.doesNotMatch(html, /Research Statistician|research statistician|研究统计师|研究統計師|退伍|www\.va\.gov/);
      if (!chinese) assert.match(background, /Before joining <a href="https:\/\/haas.berkeley.edu\/">Haas<\/a>, I worked with/);
      assert.match(background, chinese ? traditional ? /取得四個學士學位/ : /获得四个学士学位/ : /four bachelor’s degrees/);
      assert.equal((background.match(/<p>/g) ?? []).length, 3, "Education, academic experience, and industry experience remain distinct paragraphs");
      for (const program of ["graduate-program/data-science-scm", "catoid=22&amp;poid=31855", "catoid=22&amp;poid=32704", "catoid=22&amp;poid=31917", "catoid=22&amp;poid=31701"]) {
        assert.ok(background.includes(program), `Missing program link: ${program}`);
      }
      const social = markup.match(/<ul class="social-links"[^]*?<\/ul>/)?.[0] ?? "";
      assert.equal((social.match(/<a /g) ?? []).length, chinese ? 4 : 5);
      assert.equal(social.includes("social-icon-wechat"), !chinese);
      if (!chinese) {
        const icons = [...social.matchAll(/social-icon social-icon-([a-z]+)/g)].map((match) => match[1]);
        assert.deepEqual(icons, ["x", "instagram", "linkedin", "facebook", "wechat"]);
        assert.ok(social.includes("https://mp.weixin.qq.com/s/MTZ60leYEtZBZ_XnhVgJxw"));
      }
      for (const platform of ["x", "instagram", "linkedin", "facebook"]) {
        assert.ok(social.includes("social-icon-" + platform));
      }
      assert.equal(social.includes("838944394937168"), traditional);
      assert.equal(social.includes("973889751412532"), !traditional);
      assert.match(social, /1787955243994726820/);
      assert.match(social, /C72E_FaSwvP/);
      assert.match(social, /7192238670182014976-9dWk/);
      assert.equal(social.replace(/<[^>]*>/g, "").trim(), "");
      assert.equal((social.match(/aria-label="[^"]+"/g) ?? []).length, chinese ? 5 : 6);
      assert.doesNotMatch(markup, /news-reprint|We Are SC|School of Religion/);
      if (chinese) {
        assert.match(markup, traditional ? /擔任研究專員/ : /担任研究专员/);
        assert.doesNotMatch(markup, /初级研究专员/);
        assert.match(markup, traditional ? /南加州大學 · / : /南加州大学 · /);
        assert.doesNotMatch(markup, /官方网站|官方網站/);
        assert.match(markup, traditional ? /南加州大學 Dornsife 文理學院/ : /南加州大学 Dornsife 文理学院/);
        const articles = markup.match(/<article class="news-story">[^]*?<\/article>/g) ?? [];
        assert.equal(articles.length, 2);
        assert.ok(markup.indexOf(articles[0]) < markup.indexOf(articles[1]));
        assert.ok(markup.indexOf(articles[1]) < markup.indexOf(social));
        assert.match(articles[1], traditional ? /USC南加大中國 微信公眾號/ : /USC南加大中国 微信公众号/);
        assert.match(articles[1], /dateTime="2024-05-14"|datetime="2024-05-14"/);
        assert.match(articles[1], traditional ? /「我只是想不斷探索」/ : /“我只是想不断探索”/);
      }
      for (const href of ["https://haas.berkeley.edu/", "https://haas.berkeley.edu/faculty/david-chan/", "https://neurosurgery.med.brown.edu/people/eric-t-wong-md", "https://home.watson.brown.edu/people/faculty/watson-faculty/robert-blair", "https://dornsife.usc.edu/profile/yuehao-bai/"]) {
        const link = markup.split(`href="${href}"`)[1]?.split("</a>")[0];
        assert.ok(link, `Missing biography link: ${href}`);
        assert.doesNotMatch(link, /link-arrow|↗/);
      }
      assert.match(html, /application\/ld\+json/);
    }

    for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(value.replaceAll("&amp;", "&"), site + route);
      if (url.origin !== new URL(site).origin || !["https:", "http:"].includes(url.protocol)) continue;
      assert.ok(url.pathname.startsWith(basePath), `Incorrect base path: ${value}`);
      const path = url.pathname.slice(basePath.length);
      const target = path.endsWith("/") ? path + "index.html" : path;
      await access(new URL(target, output));
      if (url.hash && target.endsWith(".html")) {
        const linkedHtml = await readFile(new URL(target, output), "utf8");
        assert.ok(linkedHtml.includes('id="' + url.hash.slice(1) + '"'), `Missing anchor: ${value}`);
      }
    }
  });
}

test("wordmark language labels retain the small top-aligned treatment and footer fonts", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--type-arrow: 12px/);
  assert.match(css, /\.wordmark \{[^}]*align-items: flex-start; column-gap: 6px/);
  assert.match(css, /\.wordmark \.link-label, \.wordmark-language \{[^}]*text-box-trim: trim-both; text-box-edge: cap alphabetic/);
  assert.match(css, /\.wordmark-language \{[^}]*font-family: var\(--sans\); font-size: var\(--type-arrow\); font-weight: 400; letter-spacing: 0/);
  assert.match(css, /\.language-switch:lang\(zh-Hans\), \.wordmark-language:lang\(zh-Hans\) \{ font-family: "Noto Sans SC", var\(--sans\)/);
  assert.match(css, /a\.wordmark:is\(:hover, :focus-visible\) \{ text-decoration-line: none/);
  assert.match(css, /a\.wordmark:is\(:hover, :focus-visible\) \.link-label \{ text-decoration-line: underline/);
  assert.match(css, /\.site-shell \.site-header a\.wordmark:is\(:hover, :focus-visible\) \{ text-decoration-line: none/);
  assert.doesNotMatch(css, /\.wordmark \{ column-gap: 0; \}/);
  assert.match(css, /\.wordmark:not\(\.wordmark-english\) \.link-label \{ letter-spacing: 0; \}/);
});

test("English contact arrows use the Chinese pages' system-font fallback", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const systemFont = css.match(/:root \{[^}]*--sans: ([^;]+);/)[1];
  const arrowRule = css.match(/html\[lang="en"\] \.contact-link \.link-arrow \{([^}]+)\}/)?.[1] ?? "";
  assert.equal(arrowRule.match(/font-family: ([^;]+);/)?.[1], systemFont);
  assert.match(css, /\.link-arrow \{[^}]*font-size: var\(--type-arrow\); font-weight: 400; line-height: 1;/);
  assert.match(css, /\.contact-link \.link-arrow \{ margin-left: \.25em; \}/);
  assert.match(css, /html\[lang="en"\] :is\(h1, \.news-story h3, \.paper h3, \.contact-link\) \{ font-family: var\(--sans\); \}/);
});

test("tablet introduction uses a compact portrait and measured reading width", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const tablet = css.slice(css.indexOf("/* Tablet widths"), css.indexOf("@media (max-width: 540px)"));
  assert.match(tablet, /\.intro \{ padding: 32px 0 40px/);
  assert.match(tablet, /grid-row: 1 \/ 3; inset: 0 [^;]+ -40px 0; width: auto; height: auto/);
  assert.match(tablet, /\.hero-content \{ grid-column: 1; grid-row: 2/);
  assert.match(tablet, /\.home-intro \.intro-copy \{ max-width: 64ch/);
  assert.match(tablet, /\.lead \{ font-size: 20px; max-width: 32ch/);
  assert.match(tablet, /min-width: 541px\) and \(max-width: 700px/);
});

test("portrait iPad fade adjustment changes only the mask", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media screen and \(min-width: 760px\) and \(max-width: 900px\) and \(orientation: portrait\) and \(hover: none\) and \(pointer: coarse\) \{\s*\.hero-photo \{ mask-size: calc\(100% \+ 20px\) 100%; mask-position: -20px bottom; \}\s*\}/);
});

test("square favicon uses the site palette and the name's serif S", async () => {
  const icon = await readFile(new URL("favicon.svg", output), "utf8");
  assert.match(icon, /<rect width="32" height="32" fill="#242622"/);
  assert.match(icon, /<text[^>]*fill="#f7f6f2"[^>]*font-family="'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif"[^>]*font-size="24"[^>]*text-anchor="middle">S<\/text>/);
  assert.doesNotMatch(icon, /linearGradient|<circle|\brx=/);
});

test("animated footer fills the screen, with short secondary pages aligned to the bottom", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.site-shell \{[^}]*min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column/);
  assert.match(css, /\.site-footer \{[^}]*flex-grow: 1;[^}]*align-content: flex-start/);
  assert.match(css, /\.site-shell-research \.site-footer, \.site-shell-notes \.site-footer \{ align-content: flex-end; \}/);
  assert.equal((css.match(/\.site-shell-research \.site-footer, \.site-shell-notes \.site-footer/g) ?? []).length, 1);
  assert.match(css, /\.disclosure-toggle \.section-label \{ display: block; width: fit-content/);
  assert.match(css, /\.site-shell \{ width: 100%; min-height: 0; display: block/);
});

test("introductory copy uses one typographic role across Home, Research, and Notes", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.intro-copy, \.research-description, \.notes-description \{ color: var\(--ink\); font-family: var\(--sans\); font-size: var\(--type-body\); line-height: 1\.7; \}/);
  assert.match(css, /html:lang\(zh\) \.intro-copy, html:lang\(zh\) \.section-body, html:lang\(zh\) \.research-description, html:lang\(zh\) \.notes-description \{ font-size: 17px; line-height: 1\.75; \}/);
});

test("neutral palette and static accessible fallbacks replace seasonal colors", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--ink: #242622/);
  assert.match(css, /--accent: var\(--ink\)/);
  assert.match(css, /--accent-surface: var\(--ink\)/);
  assert.doesNotMatch(css, /data-season|#754c47|#9aafa6|header-color/);
  assert.doesNotMatch(css, /prefers-reduced-motion: no-preference/);
  assert.match(css, /@media screen and \(forced-colors: none\) \{[^]*?animation: site-color-wave/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*html \{ scroll-behavior: auto; \}/);
  assert.match(css, /forced-colors: none/);
  assert.match(css, /\.disclosure-toggle::before \{[^}]*background: var\(--paper\)/);
  assert.match(css, /\.disclosure-toggle:hover::before \{ opacity: 0; \}/);
  assert.match(css, /\.disclosure-toggle, \.disclosure-toggle::before, \.disclosure-panel \{ transition: none; \}/);
});

test("downloadable CV is a PDF", async () => {
  const pdf = await readFile(new URL("Sibo_Zhou_CV.pdf", output));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
});

test("one diagonal ink wave covers bars and footer while the header stays static", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal((css.match(/animation: site-color-wave/g) ?? []).length, 1);
  assert.doesNotMatch(css, /:root\[data-color-wave="ready"\] \.site-header/);
  assert.match(css, /:is\(#main-content, \.site-footer\) \{ animation: site-color-wave/);
  const inverse = css.match(/--inverse-paint: repeating-linear-gradient\([^]*?\);/)?.[0] ?? "";
  assert.doesNotMatch(inverse, /var\(--(?:paper|ink)\) 0/);
  assert.ok(inverse.includes("- 53.2 * var(--wave-unit)"));
  assert.ok(inverse.includes("- 47.2 * var(--wave-unit)"));
  assert.match(css, /--wave-paint: repeating-linear-gradient\(105deg in oklab/);
  assert.match(css, /--inverse-paint: repeating-linear-gradient\(105deg/);
  assert.match(css, /\.disclosure-toggle \.section-label, \.site-footer p, \.language-switch/);
  assert.doesNotMatch(css, /--wave-travel/);
  assert.ok(css.includes("to { --wave-x: calc(127.5 * var(--wave-unit)); }"));
  assert.match(css, /data-open="true"[^]*?-webkit-text-fill-color: var\(--ink\)/);
  assert.match(css, /:focus-visible \.section-label/);
  assert.match(css, /:hover \.section-label/);
  assert.match(css, /--disclosure-space: 44px/);
  assert.match(css, /--disclosure-space: 38px/);
  assert.match(css, /--disclosure-space: 30px/);
  const profiles = [...css.matchAll(/--wave-unit: ([\d.]+)vw;\s*--wave-duration: ([\d.]+)s;/g)];
  assert.deepEqual(profiles.map(([, unit, duration]) => [+unit, +duration]), [[1,92],[.9,86],[.75,77]]);
  assert.equal((css.match(/--wave-paint: repeating-linear-gradient/g) ?? []).length, 1);
  const curve = css.match(/--wave-paint: repeating-linear-gradient\([^]*?\n    \);/)?.[0] ?? "";
  assert.equal((curve.match(/calc\(var\(--wave-x\)/g) ?? []).length, 131);
  // Equal 51-unit plateaus and mirrored 51-unit fades. The loop moves exactly
  // one 204-unit repeat, so its final frame and first frame are identical.
  assert.equal(127.5 - 76.5, 25.5 - (-25.5));
  assert.equal(127.5 - (-76.5), 4 * 51);
});

test("wave position stays stable during repeated toggles, scrolling, and mobile resize events", async () => {
  const source = await readFile(new URL("../app/site-color-wave.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const horizontal = Math.cos(15 * Math.PI / 180), vertical = Math.sin(15 * Math.PI / 180);
  for (const [width, unit, duration] of [[1440,1,92],[834,.9,86],[390,.75,77]]) {
    let resize, cleanup, observedResize;
    const observed = [];
    const make = (left, top, bottom = top + 30) => ({
      rect: { left, top, bottom }, values: {},
      getBoundingClientRect() { return { ...this.rect, height: this.rect.bottom - this.rect.top }; },
      contains(label) { return this.label === label; },
      style: { setProperty(name, value) { this.owner.values[name] = value; } },
    });
    const bar = make(0,600,700), footer = make(20,900,1000), label = make(20,640), footerLabel = make(20,930);
    const photo = make(width / 2,200,500);
    const header = make(20,0,72), headerLabel = make(20,25,45);
    header.style.owner = header; headerLabel.style.owner = headerLabel;
    photo.rect.width = width / 2;
    const midpoint = width === 390 ? NaN : width === 834 ? .14 : .3084760577;
    bar.label = label; footer.label = footerLabel;
    const elements = [bar,footer,label,footerLabel];
    elements.forEach(el => { el.style.owner = el; });
    const root = { clientWidth: width, dataset: {}, values: {} };
    root.style = { setProperty: (k,v) => { root.values[k] = v; }, removeProperty: k => { delete root.values[k]; } };
    const exports = {};
    runInNewContext(compiled, {
      exports, require: () => ({ useEffect: fn => { cleanup = fn(); } }),
      CSS: { registerProperty() {}, supports: () => true },
      document: { documentElement: root,
        querySelector: selector => selector === ".site-footer" ? footer : selector === ".hero-art" ? photo : selector === ".site-header" ? header : null,
        querySelectorAll: selector => selector === ".disclosure-toggle, .site-footer" ? [bar,footer] : selector.startsWith(".site-header") ? [headerLabel] : [label,footerLabel],
      },
      window: { innerWidth: width, addEventListener: (_,fn) => { resize = fn; }, removeEventListener() {} },
      ResizeObserver: class { constructor(fn) { observedResize = fn; } observe(el) { observed.push(el); } disconnect() {} },
      getComputedStyle: () => ({ getPropertyValue: name => name === "--wave-unit" ? unit + "vw" : name === "--wave-entry-shift" ? (width === 1440 ? ".03" : "0") : name === "--photo-fade-midpoint" ? String(midpoint) : duration + "s" }),
    });
    exports.SiteColorWave({ pageKey: "en/home" });
    assert.equal(root.dataset.colorWave, "ready");
    assert.deepEqual(header.values, {});
    assert.deepEqual(headerLabel.values, {});
    assert.equal(parseFloat(bar.values["--wave-origin"]), 0);
    assert.equal(parseFloat(label.values["--wave-origin"]), 20 * horizontal + 40 * vertical);
    assert.equal(parseFloat(footer.values["--wave-origin"]), 99 * vertical);
    assert.equal(root.values["--wave-travel"], undefined);
    const delay = root.values["--wave-delay"];
    const distance = 204 * unit * width / 100;
    const center = -76.5 * unit * width / 100 - parseFloat(delay) / duration * distance;
    const photoBoundary = (photo.rect.left + midpoint * photo.rect.width) * horizontal;
    if (Number.isFinite(midpoint)) {
      const delta = center - 51 * unit * width / 100 - photoBoundary + (width === 1440 ? .03 * width * horizontal : 0);
      assert.ok(Math.abs(delta / distance - Math.round(delta / distance)) < 1e-10, "Opening wave midpoint must continue the photo fade modulo its repeat");
    } else {
      assert.ok(Math.abs(center + 63.75 * unit * width / 100) < 1e-10, "Mobile without a side fade retains a finite opening phase");
    }
    const origins = elements.map(el => el.values["--wave-origin"]);
    assert.deepEqual(observed, elements, "Do not observe the static header or expanding content");
    for (const shift of [20,80,100,400,-400,-100,-80,-20,900,-900]) {
      footer.rect.top += shift; footer.rect.bottom += shift;
      footerLabel.rect.top += shift; footerLabel.rect.bottom += shift;
      observedResize();
      resize(); // Mobile browser chrome also emits height-only resize events.
      assert.equal(root.values["--wave-travel"], undefined, "Toggling must not introduce a layout-dependent endpoint");
      assert.deepEqual(elements.map(el => el.values["--wave-origin"]), origins);
      assert.equal(root.values["--wave-delay"], delay, "Toggling must not reset the animation phase");
    }
    for (const el of elements) { el.rect.top -= 300; el.rect.bottom -= 300; }
    resize();
    assert.deepEqual(elements.map(el => el.values["--wave-origin"]), origins, "Scrolling must not shift wave coordinates");
    root.clientWidth += 200;
    resize();
    assert.equal(root.values["--wave-width"], `${width + 200}px`);
    assert.equal(root.values["--wave-delay"], delay, "A width change must not recalculate the running animation's starting phase");
    cleanup();
    assert.equal(root.dataset.colorWave, undefined);
  }
});

test("shared research disclosures toggle counts and reset on a fresh mount", async () => {
  const source = await readFile(new URL("../app/home-disclosure.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  let state;
  runInNewContext(compiled, {
    exports,
    require: name => name === "react" ? {
      useState: initial => { state ??= initial; return [state, value => { state = value; }]; },
    } : { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  });
  const render = () => exports.HomeDisclosure({ id: "working-papers", label: "工作论文", count: "01—03", children: "Papers" });
  const check = open => {
    const section = render();
    assert.equal(section.props["data-open"], open);
    const [heading, panel] = section.props.children;
    const button = heading.props.children;
    assert.equal(button.props["aria-expanded"], open);
    assert.equal(panel.props.inert, !open);
    assert.equal(panel.props["aria-hidden"], !open);
    const count = button.props.children.props.children[1];
    assert.equal(count && count.props.children, open ? "01—03" : false);
    return button.props.onClick;
  };
  check(false)();
  check(true)();
  check(false)();
  check(true);
  state = undefined; // A fresh mount starts collapsed, without persisted state.
  check(false);
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(css.includes('#main-content:has(> .home-disclosure:last-of-type[data-open="false"]) + .site-footer { border-top: 0; }'));
  assert.match(css, /\.disclosure-toggle \.section-count \{ display: inline-block; margin-top: 0; margin-inline-start: 12px/);
});

test("map close-ups are flat and north-up, without converging meridians", async () => {
  const source = await readFile(new URL("../app/map/projection.ts", import.meta.url), "utf8");
  const projection = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: projection });
  assert.equal(typeof projection.projectDetailLocation, "function");
  for (const longitude of [-122.273, -87.9403, -71.4128, 110.1999]) {
    assert.equal(projection.projectDetailLocation(longitude, 20).x, projection.projectDetailLocation(longitude, 45).x);
    assert.ok(projection.projectDetailLocation(longitude, 45).y < projection.projectDetailLocation(longitude, 20).y);
  }
  assert.equal(projection.projectDetailLocation(-120, 40).y, projection.projectDetailLocation(110, 40).y);
  for (const latitude of [-90, 0, 90]) {
    const point = projection.projectDetailLocation(0, latitude);
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  for (const longitude of [-180, -87.9403, 0, 110.1999, 180]) {
    for (const latitude of [-80, -40, 0, 40, 80]) {
      const converted = projection.detailFromOverview(projection.projectOverviewLocation(longitude, latitude));
      const expected = projection.projectDetailLocation(longitude, latitude);
      assert.ok(Math.abs(projection.nearestWorldX(converted.x, expected.x) - expected.x) < 1e-8 && Math.abs(converted.y - expected.y) < 1e-8, "Zooming out of the overview must preserve the geographic cursor anchor");
    }
  }
});

test("the overview is Pacific-centered, with an Atlantic seam and subdued geographic markings", async () => {
  const projection = {};
  runInNewContext(ts.transpileModule(await readFile(new URL("../app/map/projection.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: projection });
  assert.equal(projection.projectOverviewLocation(150, 0).x, 500);
  assert.ok(projection.projectOverviewLocation(2.35, 48.85).x < 500, "Europe belongs on the left");
  assert.ok(projection.projectOverviewLocation(18.4, -33.9).x < 500, "Africa belongs on the left");
  assert.ok(projection.projectOverviewLocation(-118.2859, 34.0219).x > 500, "The Americas belong on the right");
  assert.ok(projection.projectOverviewLocation(-29.99, 0).x < 100);
  assert.ok(projection.projectOverviewLocation(-30.01, 0).x > 900);
  const overview = JSON.parse(await readFile(new URL("../app/map/overview.json", import.meta.url), "utf8"));
  for (const data of [overview, overview.preview]) {
    assert.equal(data.tropics.length, 2);
    assert.deepEqual(data.tropics.map(line => line.latitude), [23.5, -23.5]);
    assert.ok(data.tropics.every(line => line.path.startsWith("M") && !line.path.includes("Z")), "The Tropics are open parallels, not filled outlines");
  }
  const source = await readFile(new URL("../app/personal-map.tsx", import.meta.url), "utf8");
  assert.match(source, /className="map-tropic"/);
  assert.match(source, /className="map-coordinate"/);
  assert.match(source, /aria-hidden="true"/);
  // Multi-part SVG <title> children caused a server/client hydration mismatch.
  assert.doesNotMatch(source, /<title>/);
  for (const route of ["map", "zh/map", "zh-hant/map"]) {
    const html = await readFile(new URL(`../dist/client/${route}/index.html`, import.meta.url), "utf8");
    assert.equal((html.match(/class="map-tropic"/g) ?? []).length, 2);
    assert.match(html, /data-latitude="23.5"/);
    assert.match(html, /data-latitude="-23.5"/);
    assert.doesNotMatch(html, /class="map-coordinate"/, "The initial world view must not show coordinate numbers");
  }
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.map-tropic \{[^}]*stroke-dasharray:/);
  assert.match(css, /\.map-coordinate \{[^}]*pointer-events: none/);
});

test("China-POV extent includes Taiwan, Hong Kong, Macau and open maritime claim indicators", async () => {
  const geography = JSON.parse(await readFile(new URL("../app/map/world-land.json", import.meta.url), "utf8"));
  const source = await readFile(new URL("../app/map/projection.ts", import.meta.url), "utf8");
  const projection = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: projection });
  for (const [data, project] of [[geography, projection.projectLocation], [geography.closeup, projection.projectDetailLocation]]) {
    assert.ok(data);
    const country = data.countries.CHN;
    const rings = country.path.split("Z").filter(Boolean).map(ring => [...ring.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)]));
    const contains = ({ x, y }) => rings.reduce((inside, ring) => ring.reduce((inside, [a, b], index) => {
      const [c, d] = ring[(index + 1) % ring.length];
      return (b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a ? !inside : inside;
    }, inside), false);
    for (const [longitude, latitude] of [[121.5654, 25.033], [114.17, 22.3], [113.54, 22.19], [110.1999, 20.044]]) {
      assert.ok(contains(project(longitude, latitude)), "China-POV highlight must include every requested land area");
    }
    assert.equal((country.maritime.match(/M/g) ?? []).length, 9);
    assert.doesNotMatch(country.maritime, /Z/); // Indicators are lines, not a filled sea polygon.
    const southernClaim = project(111.544476, 3.401132);
    assert.ok(country.bounds[3] >= southernClaim.y, "Country framing must include the southern maritime indicators");
    assert.equal(data.countries.USA.maritime, "");
  }
});

test("map layers reuse identical shared boundary segments in both projections", async () => {
  const geography = JSON.parse(await readFile(new URL("../app/map/world-land.json", import.meta.url), "utf8"));
  for (const data of [geography, geography.closeup]) {
    for (const [region, country] of [["CN-HI", "CHN"], ["US-CA", "USA"], ["US-IL", "USA"], ["US-RI", "USA"]]) {
      const divisions = pathSegments(data.countries[country].divisions);
      const coast = pathSegments(data.countries[country].path);
      const edges = [...pathSegments(data.regions[region].path)];
      assert.ok(edges.every(segment => divisions.has(segment) || coast.has(segment)), `${region}: country-level borders and the selected region must use exactly the same segments`);
      if (country === "USA") assert.ok([...divisions].every(segment => !coast.has(segment)), "Internal divisions must not redraw a coastline");
      if (region !== "US-IL") {
        assert.ok(edges.filter(segment => coast.has(segment)).length > 100, `${region}: shared coastlines must remain coincident, including at city zoom`);
      }
    }
  }
});

test("map generator preserves shared city arcs and does not trim municipal water limits", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sibo-map-alignment-"));
  const polygon = ring => ({ type: "Polygon", coordinates: [[...ring, ring[0]]] });
  const rectangle = (x, y, width, height) => polygon([[x, y], [x + width, y], [x + width, y + height], [x, y + height]]);
  const coast = [[-120, 35], [-119.9998, 35.2], [-120.0001, 35.4], [-119.9998, 35.6], [-120, 35.8], [-120, 36]];
  const usa = polygon([...coast, [-117, 36], [-117, 35]]);
  const california = polygon([...coast, [-119, 36], [-119, 35]]);
  const china = rectangle(110, 20, 1, 1);
  const feature = (geometry, properties) => ({ type: "Feature", geometry, properties });
  const collection = features => ({ type: "FeatureCollection", features });
  const countrySource = collection([feature(usa, { ADM0_A3: "USA" }), feature(china, { ADM0_A3: "CHN" })]);
  const sources = {
    "countries.geojson": countrySource,
    "countries-china-pov.geojson": countrySource,
    "states.geojson": collection([
      feature(california, { adm0_a3: "USA", iso_3166_2: "US-CA" }),
      feature(rectangle(-119, 35, 1, 1), { adm0_a3: "USA", iso_3166_2: "US-IL" }),
      feature(rectangle(-118, 35, 1, 1), { adm0_a3: "USA", iso_3166_2: "US-RI" }),
      feature(china, { adm0_a3: "CHN", iso_3166_2: "CN-HI" }),
    ]),
    "us-cities.geojson": collection([
      feature(polygon([...coast.slice(2, 5).reverse(), [-119.5, 35.4], [-119.5, 35.8]]), { BASENAME: "Berkeley" }),
      feature(rectangle(-118.8, 35.1, .05, .05), { BASENAME: "Elmhurst" }),
      feature(rectangle(-117.8, 35.1, .05, .05), { BASENAME: "Providence" }),
      feature(rectangle(-119.6, 35.1, .05, .05), { BASENAME: "Los Angeles" }),
    ]),
    "haikou-osm.json": [{ geojson: rectangle(110.2, 20.8, .4, .4) }],
    "lakes.geojson": collection([]),
    "china-maritime.geojson": collection([]),
  };
  await Promise.all(Object.entries(sources).map(([name, data]) => writeFile(join(directory, name), JSON.stringify(data))));
  const generated = join(directory, "aligned.json");
  execFileSync(process.execPath, [new URL("../scripts/generate-world-map.mjs", import.meta.url).pathname, directory, generated]);
  const geography = JSON.parse(await readFile(generated, "utf8"));
  for (const data of [geography, geography.closeup]) {
    const country = pathSegments(data.countries.USA.path);
    const region = pathSegments(data.regions["US-CA"].path);
    const common = [...pathSegments(data.cities.berkeley.path)].filter(segment => country.has(segment));
    assert.ok(common.length >= 2, "Fine city vertices on the common coast must survive country-level simplification");
    assert.ok(common.every(segment => region.has(segment)), "Country, state and city must reuse the same city-detail segments, regardless of ring orientation");
    assert.ok(data.cities.haikou.bounds[1] < data.regions["CN-HI"].bounds[1], "Municipal limits beyond a land coastline must not be clipped away to fake alignment");
  }
});

test("map selection reveals boundaries and zoom buttons center on the selected marker", async () => {
  const geography = JSON.parse(await readFile(new URL("../app/map/world-land.json", import.meta.url), "utf8"));
  const overview = JSON.parse(await readFile(new URL("../app/map/overview.json", import.meta.url), "utf8"));
  const projectionSource = await readFile(new URL("../app/map/projection.ts", import.meta.url), "utf8");
  const projection = {};
  runInNewContext(ts.transpileModule(projectionSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: projection });
  const source = await readFile(new URL("../app/personal-map.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  const states = [];
  let cursor = 0;
  runInNewContext(compiled, {
    exports,
    window: { matchMedia: () => ({ matches: false }) },
    require: name => name === "react" ? {
      useState: initial => { const index = cursor++; states[index] ??= index === 4 ? geography.closeup : initial; return [states[index], value => { states[index] = value; }]; },
      useRef: () => ({ current: null }),
      useEffect: () => {},
    } : name.includes("projection") ? projection : name.includes("overview") ? { default: overview } : {
      jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
    },
  });
  const flatten = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  const render = (language = "en") => { cursor = 0; return flatten(exports.PersonalMap({ language })); };
  const find = (nodes, className) => nodes.find(node => node.props?.className === className);
  const checkWorldOutlines = (nodes, data) => {
    for (const id of ["CHN", "USA"]) {
      assert.equal(nodes.find(node => node.props?.className === "map-land" && node.props["data-country"] === id)?.props.d, data.countries[id].path, `${id}: world and country layers must reuse the identical path`);
    }
  };
  // Haikou stays at its city center; academic pins use the verified main campuses.
  const coordinates = [[110.1999, 20.044], [-87.942, 41.8953], [-118.2859, 34.0219], [-71.4038, 41.8261], [-122.2578, 37.8721]];
  const countries = ["CHN", "USA", "USA", "USA", "USA"];
  const regions = ["CN-HI", "US-IL", "US-CA", "US-RI", "US-CA"];
  const cities = ["haikou", "elmhurst", "los-angeles", "providence", "berkeley"];
  const framing = ([left, top, right, bottom]) => ({ x: (left + right) / 2, y: (top + bottom) / 2, zoom: Math.min(800 / (right - left), 400 / (bottom - top)) });
  const transform = ({ x, y, zoom }) => `translate(${500 - x * zoom}px, ${270 - y * zoom}px) scale(${zoom})`;
  assert.equal(find(render(), "map-reset").props.disabled, true);
  assert.equal(find(render(), "map-land").props.d, overview.land);
  checkWorldOutlines(render(), overview);
  assert.equal(render().filter(node => node.props?.className === "map-coordinate").length, 0);
  render().find(node => node.props?.["aria-label"] === "Zoom in").props.onClick();
  assert.ok(render().some(node => node.props?.className === "map-coordinate"), "Coordinate numbers should appear only after zooming in");
  find(render(), "map-reset").props.onClick();
  for (const language of ["en", "zh", "zh-hant"]) {
    const points = render(language).filter(node => node.props?.className === "map-point");
    coordinates.forEach(([longitude, latitude], index) => {
      const point = projection.projectOverviewLocation(longitude, latitude);
      assert.equal(points[index].props.style.left, `${point.x / 10}%`);
      assert.equal(points[index].props.style.top, `${point.y / 5.4}%`);
    });
  }
  const detail = geography.closeup;
  coordinates.forEach(([longitude, latitude], index) => {
    render().filter(node => node.props?.className === "map-place")[index].props.onClick();
    const nodes = render();
    assert.equal(nodes.filter(node => node.props?.className === "map-place")[index].props["aria-pressed"], true);
    assert.equal(find(nodes, "map-geography").props.style.transform, transform(framing(detail.regions[regions[index]].bounds)));
    assert.equal(find(nodes, "map-land").props.d, detail.land);
    checkWorldOutlines(nodes, detail);
    assert.equal(find(nodes, "map-country").props.d, detail.countries[countries[index]].path);
    assert.equal(find(nodes, "map-maritime").props.d, detail.countries[countries[index]].maritime);
    assert.equal(find(nodes, "map-region").props.d, detail.regions[regions[index]].path);
    assert.equal(find(nodes, "map-city").props.d, detail.cities[cities[index]].path);
    for (const language of ["en", "zh", "zh-hant"]) {
      render(language).filter(node => node.props?.className === (language === "en" ? "map-place" : "map-pin"))[index].props.onClick();
      for (let step = 0; step < 3; step++) {
        render(language).find(node => node.props?.["aria-label"] === (language === "en" ? "Zoom in" : "放大")).props.onClick();
        const marker = render(language).find(node => node.props?.className === "map-point" && node.props["data-selected"]);
        assert.equal(marker.props.style.left, "50%", `${language}, ${cities[index]}: zoom must center on the selected location`);
        assert.equal(marker.props.style.top, "50%");
      }
      render(language).find(node => node.props?.["aria-label"] === (language === "en" ? "Zoom out" : language === "zh" ? "缩小" : "縮小")).props.onClick();
      const marker = render(language).find(node => node.props?.className === "map-point" && node.props["data-selected"]);
      assert.equal(marker.props.style.left, "50%");
      assert.equal(marker.props.style.top, "50%", "Zooming back out must keep the same marker-centered camera");
    }
    const point = projection.projectDetailLocation(longitude, latitude);
    for (const [boundary, geometry] of [["country", detail.countries[countries[index]]], ["region", detail.regions[regions[index]]], ["city", detail.cities[cities[index]]]]) {
      render().find(node => node.props?.className === "map-scale" && node.props["data-boundary"] === boundary).props.onClick();
      const focused = render();
      const frame = framing(geometry.bounds);
      assert.equal(find(focused, "map-geography").props.style.transform, transform(frame));
      assert.equal(focused.find(node => node.props?.className === "map-scale" && node.props["data-boundary"] === boundary).props["aria-pressed"], true);
      const selectedPin = focused.find(node => node.props?.className === "map-point" && node.props["data-selected"]);
      assert.equal(selectedPin.props.hidden, false);
      assert.equal(selectedPin.props.style.left, `${((point.x - frame.x) * frame.zoom + 500) / 10}%`);
      assert.equal(selectedPin.props.style.top, `${((point.y - frame.y) * frame.zoom + 270) / 5.4}%`);
    }
    assert.ok((geography.cities[cities[index]].path.match(/L/g) ?? []).length > 100, "A municipal boundary must be a detailed polygon, not a box around the marker");
    if (["haikou", "los-angeles"].includes(cities[index])) {
      for (let step = 0; step < 8; step++) render().find(node => node.props?.["aria-label"] === "Zoom in").props.onClick();
      const level = Number(find(render(), "map-geography").props.style.transform.match(/scale\(([^)]+)\)/)[1]);
      assert.ok(level >= 2000, "Large municipalities must allow close enough zoom to reveal streets and stations");
    }
  });
  for (let index = 0; index < 10; index++) render().find(node => node.props?.["aria-label"] === "Zoom in").props.onClick();
  assert.equal(render().find(node => node.props?.["aria-label"] === "Zoom in").props.disabled, true);
  find(render(), "map-reset").props.onClick();
  assert.equal(find(render(), "map-geography").props.style.transform, "translate(0px, 0px) scale(1)");
  assert.equal(find(render(), "map-land").props.d, overview.land);
  const worldPoint = projection.projectOverviewLocation(...coordinates[4]);
  const pin = render().find(node => node.props?.className === "map-point" && node.props["data-selected"]);
  assert.equal(pin.props.style.left, `${worldPoint.x / 10}%`);
  assert.equal(pin.props.style.top, `${worldPoint.y / 5.4}%`);
  assert.equal(render().find(node => node.props?.["aria-label"] === "Zoom out").props.disabled, true);
  assert.equal(render().filter(node => node.props?.className === "map-scale" && node.props["aria-pressed"]).length, 0);
  for (const [language, province, state] of [["en", "province", "state"], ["zh", "省", "州"], ["zh-hant", "省", "州"]]) {
    for (let index = 0; index < 5; index++) {
      render(language).filter(node => node.props?.className === "map-place")[index].props.onClick();
      const nodes = render(language);
      const regionControl = nodes.find(node => node.props?.className === "map-scale" && node.props["data-boundary"] === "region");
      assert.equal(regionControl.props.children.at(-1), index === 0 ? province : state);
      if (index === 0 && language !== "en") {
        assert.equal(find(nodes, "map-caption-region").props.children, language === "zh" ? "中国 · 海南省" : "中國 · 海南省");
        assert.match(nodes.find(node => node.props?.className === "map-pin" && node.props["aria-pressed"]).props["aria-label"], /海南省/);
      }
    }
    render(language).filter(node => node.props?.className === "map-place")[0].props.onClick();
    assert.equal(render(language).find(node => node.props?.className === "map-scale" && node.props["data-boundary"] === "region").props.children.at(-1), province, "Returning to Haikou must restore the province label");
  }
  assert.ok(geography.lakes.length > 1000);
  assert.ok(Buffer.byteLength(JSON.stringify(geography)) < 4_000_000, "Both projections must stay within the local asset budget");
});

test("map wheel, mouse and touch gestures preserve their anchors and selected city", async () => {
  const geography = JSON.parse(await readFile(new URL("../app/map/world-land.json", import.meta.url), "utf8"));
  const overviewData = JSON.parse(await readFile(new URL("../app/map/overview.json", import.meta.url), "utf8"));
  const projection = {};
  runInNewContext(ts.transpileModule(await readFile(new URL("../app/map/projection.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: projection });
  const source = await readFile(new URL("../app/personal-map.tsx", import.meta.url), "utf8");
  const exports = {}, hooks = [], listeners = new Map(), captured = new Set();
  let cursor = 0, pending = [];
  const box = { left: 100, top: 50, width: 800, height: 432 };
  const canvas = {
    getBoundingClientRect: () => ({ ...box }),
    addEventListener: (type, handler, options) => listeners.set(type, { handler, options }),
    removeEventListener: (type, handler) => { if (listeners.get(type)?.handler === handler) listeners.delete(type); },
    setPointerCapture: id => captured.add(id),
    releasePointerCapture: id => captured.delete(id),
    hasPointerCapture: id => captured.has(id),
  };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, window: { matchMedia: () => ({ matches: false }) },
    require: name => name === "react" ? {
      useState: initial => { const index = cursor++; hooks[index] ??= index === 4 ? geography.closeup : initial; return [hooks[index], value => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }]; },
      useRef: initial => { const index = cursor++; return hooks[index] ??= { current: initial }; },
      useEffect: (effect, dependencies) => {
        const index = cursor++;
        if (!hooks[index] || dependencies.some((value, i) => value !== hooks[index].dependencies[i])) {
          pending.push(() => { hooks[index]?.cleanup?.(); hooks[index] = { dependencies, cleanup: effect() }; });
        }
      },
    } : name.includes("projection") ? projection : name.includes("overview") ? { default: overviewData } : {
      jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
    },
  });
  const flatten = node => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  const render = () => {
    cursor = 0;
    const nodes = flatten(exports.PersonalMap({ language: "en" }));
    const canvasNode = nodes.find(node => node.props?.className === "map-canvas");
    if (canvasNode.props.ref) canvasNode.props.ref.current = canvas;
    pending.forEach(effect => effect()); pending = [];
    return nodes;
  };
  const find = className => render().find(node => node.props?.className === className);
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} should equal ${expected}`);
  render();
  assert.ok(listeners.has("wheel"), "Wheel zoom must have a canvas-local listener");
  assert.equal(listeners.get("wheel").options.passive, false, "The native wheel listener must be able to prevent page scrolling");
  const overview = projection.projectOverviewLocation(-87.942, 41.8953);
  const wheel = (deltaY, deltaMode = 0) => {
    let prevented = false;
    listeners.get("wheel").handler({ clientX: 100 + overview.x * .8, clientY: 50 + overview.y * .8, deltaY, deltaMode, ctrlKey: false, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    const point = render().filter(node => node.props?.className === "map-point")[1];
    if (deltaY < 0) {
      close(parseFloat(point.props.style.left), overview.x / 10);
      close(parseFloat(point.props.style.top), overview.y / 5.4);
    }
  };
  wheel(-120); wheel(-3, 1); wheel(-.1, 2);
  assert.equal(find("map-canvas").props["data-direct"], true);
  for (let i = 0; i < 8; i++) wheel(1000);
  assert.equal(find("map-geography").props.style.transform, "translate(0px, 0px) scale(1)");
  render().find(node => node.props?.className === "map-place" && node.props.children[0].props.children === 2).props.onClick();
  const pointer = (x, y, extra = {}) => ({ clientX: x, clientY: y, pointerId: 7, pointerType: "mouse", button: 0, currentTarget: canvas, target: { closest: () => null }, ...extra });
  find("map-canvas").props.onPointerDown(pointer(400, 200));
  find("map-canvas").props.onPointerMove(pointer(400, 200));
  find("map-canvas").props.onPointerUp(pointer(400, 200));
  assert.equal(render().find(node => node.props?.className === "map-scale" && node.props["data-boundary"] === "region").props["aria-pressed"], true, "A pointer gesture without movement must preserve the selected boundary and zoom target");
  const transform = find("map-geography").props.style.transform;
  const zoom = Number(transform.match(/scale\(([^)]+)\)/)[1]);
  find("map-canvas").props.onPointerDown(pointer(400, 200));
  assert.equal(captured.has(7), true);
  find("map-canvas").props.onPointerMove(pointer(520, 248));
  assert.equal(find("map-canvas").props["data-dragging"], true);
  const moved = find("map-geography").props.style.transform;
  const translations = value => value.match(/translate\(([^p]+)px, ([^p]+)px\)/).slice(1).map(Number);
  const before = translations(transform), after = translations(moved);
  close(after[0] - before[0], 150); close(after[1] - before[1], 60);
  assert.equal(Number(moved.match(/scale\(([^)]+)\)/)[1]), zoom);
  assert.equal(render().filter(node => node.props?.className === "map-place")[1].props["aria-pressed"], true);
  find("map-canvas").props.onPointerUp(pointer(520, 248));
  assert.equal(captured.size, 0);
  assert.equal(find("map-canvas").props["data-dragging"], false);
  render().find(node => node.props?.["aria-label"] === "Zoom in").props.onClick();
  const zoomedAfterDrag = find("map-geography").props.style.transform;
  const afterDragZoom = Number(zoomedAfterDrag.match(/scale\(([^)]+)\)/)[1]);
  const afterDragTranslation = translations(zoomedAfterDrag);
  close((500 - afterDragTranslation[0]) / afterDragZoom, (500 - after[0]) / zoom);
  close((270 - afterDragTranslation[1]) / afterDragZoom, (270 - after[1]) / zoom);
  find("map-canvas").props.onPointerDown(pointer(400, 200, { pointerType: "touch" }));
  assert.equal(captured.size, 1, "A finger drag inside the map must capture its pointer");
  find("map-canvas").props.onPointerUp(pointer(400, 200, { pointerType: "touch" }));
  find("map-canvas").props.onPointerDown(pointer(400, 200, { target: { closest: () => ({ tagName: "BUTTON" }) } }));
  assert.equal(captured.size, 0, "A pin click must not start a map drag");
  find("map-canvas").props.onPointerDown(pointer(400, 200));
  find("map-canvas").props.onPointerCancel(pointer(400, 200));
  assert.equal(captured.size, 0);
  find("map-reset").props.onClick();
  find("map-canvas").props.onPointerDown(pointer(400, 200));
  find("map-canvas").props.onPointerMove(pointer(440, 220));
  assert.equal(find("map-reset").props.disabled, false, "World view must reset a panned overview, even at zoom 1");
  find("map-canvas").props.onLostPointerCapture(pointer(440, 220));
  assert.equal(find("map-canvas").props["data-dragging"], false);
  find("map-reset").props.onClick();
  assert.equal(find("map-geography").props.style.transform, "translate(0px, 0px) scale(1)");
  assert.equal(find("map-canvas").props["data-direct"], false);
  const touch = (x, y, id) => pointer(x, y, { pointerType: "touch", pointerId: id });
  const gestureView = () => {
    const transform = find("map-geography").props.style.transform;
    const [x, y] = translations(transform);
    return { x, y, zoom: Number(transform.match(/scale\(([^)]+)\)/)[1]) };
  };
  for (const width of [390, 820]) {
    box.width = width; box.height = width * .54;
    render().filter(node => node.props?.className === "map-place")[1].props.onClick();
    const before = gestureView();
    const first = { x: box.left + width * .35, y: box.top + box.height * .5 };
    const second = { x: box.left + width * .65, y: first.y };
    find("map-canvas").props.onPointerDown(touch(first.x, first.y, 11));
    const movedFirst = { x: first.x + 24, y: first.y + 18 };
    find("map-canvas").props.onPointerMove(touch(movedFirst.x, movedFirst.y, 11));
    const panned = gestureView();
    close(panned.x - before.x, 24 / width * 1000);
    close(panned.y - before.y, 18 / box.height * 540);
    close(panned.zoom, before.zoom);
    find("map-canvas").props.onPointerDown(touch(second.x, second.y, 12));
    assert.equal(captured.size, 2);
    assert.deepEqual(gestureView(), panned, "Adding a second finger must not jump the map");
    const anchor = { x: ((movedFirst.x + second.x) / 2 - box.left) / width * 1000, y: ((movedFirst.y + second.y) / 2 - box.top) / box.height * 540 };
    const location = { x: (anchor.x - panned.x) / panned.zoom, y: (anchor.y - panned.y) / panned.zoom };
    const startDistance = Math.hypot(second.x - movedFirst.x, second.y - movedFirst.y);
    // Both events may arrive before React renders; neither movement may be lost.
    const handlers = find("map-canvas").props;
    handlers.onPointerMove(touch(movedFirst.x - 32, movedFirst.y - 12, 11));
    handlers.onPointerMove(touch(second.x + 32, second.y + 12, 12));
    const pinched = gestureView();
    close(pinched.zoom, panned.zoom * Math.hypot(second.x - movedFirst.x + 64, second.y - movedFirst.y + 24) / startDistance);
    close(pinched.x + location.x * pinched.zoom, anchor.x);
    close(pinched.y + location.y * pinched.zoom, anchor.y);
    assert.equal(find("map-canvas").props["data-direct"], true);
    handlers.onPointerMove(touch(movedFirst.x, movedFirst.y, 11));
    handlers.onPointerMove(touch(second.x, second.y, 12));
    const contracted = gestureView();
    close(contracted.zoom, panned.zoom); close(contracted.x, panned.x); close(contracted.y, panned.y);
    handlers.onPointerMove(touch(movedFirst.x + 12, movedFirst.y + 6, 11));
    handlers.onPointerMove(touch(second.x + 12, second.y + 6, 12));
    const carried = gestureView();
    close(carried.zoom, contracted.zoom);
    close(carried.x + location.x * carried.zoom, anchor.x + 12 / width * 1000);
    close(carried.y + location.y * carried.zoom, anchor.y + 6 / box.height * 540);
    listeners.get("wheel").handler({ clientX: 400, clientY: 250, deltaY: -120, deltaMode: 0, preventDefault: () => {} });
    assert.deepEqual(gestureView(), carried, "Wheel events must not interrupt an active touch gesture");
    find("map-canvas").props.onPointerCancel(touch(second.x + 12, second.y + 6, 12));
    assert.equal(captured.size, 1);
    assert.equal(find("map-canvas").props["data-dragging"], true);
    find("map-canvas").props.onLostPointerCapture(touch(second.x + 12, second.y + 6, 12));
    assert.equal(find("map-canvas").props["data-dragging"], true, "Losing the finished pointer must not interrupt the remaining finger");
    find("map-canvas").props.onPointerMove(touch(movedFirst.x + 28, movedFirst.y + 14, 11));
    const resumed = gestureView();
    close(resumed.x - carried.x, 16 / width * 1000);
    close(resumed.y - carried.y, 8 / box.height * 540);
    close(resumed.zoom, carried.zoom);
    find("map-canvas").props.onPointerUp(touch(movedFirst.x + 28, movedFirst.y + 14, 11));
    assert.equal(captured.size, 0);
    assert.equal(find("map-canvas").props["data-dragging"], false);
    find("map-canvas").props.onPointerMove(touch(movedFirst.x + 80, movedFirst.y, 11));
    assert.deepEqual(gestureView(), resumed, "A released pointer must not keep moving the map");
    assert.equal(render().filter(node => node.props?.className === "map-place")[1].props["aria-pressed"], true);
    find("map-reset").props.onClick();
  }
  box.width = 800; box.height = 432;
  const anchorX = box.left + overview.x * .8, anchorY = box.top + overview.y * .8;
  find("map-canvas").props.onPointerDown(touch(anchorX - 40, anchorY, 21));
  find("map-canvas").props.onPointerDown(touch(anchorX + 40, anchorY, 22));
  find("map-canvas").props.onPointerMove(touch(anchorX - 60, anchorY, 21));
  find("map-canvas").props.onPointerMove(touch(anchorX + 60, anchorY, 22));
  close(gestureView().zoom, 1.5);
  const anchoredPin = render().filter(node => node.props?.className === "map-point")[1];
  close(parseFloat(anchoredPin.props.style.left), overview.x / 10);
  close(parseFloat(anchoredPin.props.style.top), overview.y / 5.4);
  find("map-canvas").props.onPointerMove(touch(anchorX - 1, anchorY, 21));
  find("map-canvas").props.onPointerMove(touch(anchorX + 1, anchorY, 22));
  assert.equal(find("map-geography").props.style.transform, "translate(0px, 0px) scale(1)", "Pinching out must respect the world-view minimum");
  find("map-canvas").props.onPointerUp(touch(anchorX - 1, anchorY, 21));
  find("map-canvas").props.onPointerUp(touch(anchorX + 1, anchorY, 22));
  for (let i = 0; i < 50; i++) listeners.get("wheel").handler({ clientX: 500, clientY: 266, deltaY: -1000, deltaMode: 0, ctrlKey: false, preventDefault: () => {} });
  assert.equal(render().find(node => node.props?.["aria-label"] === "Zoom in").props.disabled, true, "Wheel zoom must respect the same upper limit as the zoom buttons");
  const maximum = gestureView().zoom;
  find("map-canvas").props.onPointerDown(touch(400, 250, 31));
  find("map-canvas").props.onPointerDown(touch(600, 250, 32));
  find("map-canvas").props.onPointerMove(touch(650, 250, 32));
  close(gestureView().zoom, maximum);
  find("map-canvas").props.onPointerUp(touch(400, 250, 31));
  find("map-canvas").props.onLostPointerCapture(touch(650, 250, 32));
  assert.equal(captured.size, 0);
  for (const width of [390, 820, 1200]) {
    box.width = width; box.height = width * .54;
    find("map-reset").props.onClick();
    const type = width === 1200 ? "mouse" : "touch";
    const start = box.left + width / 2;
    find("map-canvas").props.onPointerDown(pointer(start, box.top + box.height / 2, { pointerType: type }));
    find("map-canvas").props.onPointerMove(pointer(start + 20, box.top + box.height / 2, { pointerType: type }));
    find("map-canvas").props.onPointerUp(pointer(start + 20, box.top + box.height / 2, { pointerType: type }));
    const before = gestureView();
    const markerPositions = () => render().filter(node => node.props?.className === "map-point").map(node => [parseFloat(node.props.style.left), parseFloat(node.props.style.top)]);
    const markers = markerPositions();
    let repeatedPin = false;
    assert.equal(render().find(node => node.props?.placeId)?.props.view.detail, true, "Panning the overview must enter the seamless north-up world");
    for (const direction of [-1, 1]) {
      find("map-canvas").props.onPointerDown(pointer(start, box.top + box.height / 2, { pointerType: type }));
      for (let step = 1; step <= 48; step++) {
        const x = start + direction * 3 * projection.detailWorldWidth * width / 1000 * step / 48;
        find("map-canvas").props.onPointerMove(pointer(x, box.top + box.height / 2, { pointerType: type }));
        const frame = render().find(node => node.props?.placeId)?.props.view;
        assert.ok(frame.x >= 500 - projection.detailWorldWidth / 2 && frame.x <= 500 + projection.detailWorldWidth / 2);
        const copies = render().filter(node => node.type === "use" && node.props.href === "#map-base-geography");
        assert.ok(copies.length >= 2 && copies.length <= 3, "Every world-scale pan must keep adjoining geography in the viewport");
        repeatedPin ||= render().filter(node => node.props?.className === "map-point" && !node.props.hidden).length > 5;
      }
      find("map-canvas").props.onPointerUp(pointer(start + direction * 3 * projection.detailWorldWidth * width / 1000, box.top + box.height / 2, { pointerType: type }));
      close(gestureView().x, before.x); close(gestureView().y, before.y);
      markerPositions().forEach((position, index) => position.forEach((value, axis) => close(value, markers[index][axis])));
    }
    assert.ok(repeatedPin, "When a place appears in two visible world copies, both must have a marker");
    find("map-reset").props.onClick();
    assert.equal(find("map-geography").props.style.transform, "translate(0px, 0px) scale(1)");
  }
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.map-canvas \{[^}]*touch-action: none;/, "Only the map canvas should take over browser touch gestures");
  assert.equal((css.match(/touch-action: none/g) ?? []).length, 1, "Native page gestures outside the map must remain unchanged");
  hooks.forEach(hook => hook?.cleanup?.());
  assert.equal(listeners.size, 0, "Unmount must remove the wheel listener");
});

test("the world wraps at the date line without gaps or detached detail layers", async () => {
  const projection = {}, details = {};
  const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compile(await readFile(new URL("../app/map/projection.ts", import.meta.url), "utf8")), { exports: projection });
  runInNewContext(compile(await readFile(new URL("../app/map/details.ts", import.meta.url), "utf8")), { exports: details, require: () => projection });
  const width = projection.projectDetailLocation(180, 0).x - projection.projectDetailLocation(-180, 0).x;
  assert.equal(projection.detailWorldWidth, width);
  const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} should equal ${b}`);
  for (const lap of [-12, -1, 0, 1, 12]) {
    const view = { x: 930 + lap * width, y: 270, zoom: 2, detail: true };
    close(projection.nearestWorldX(70, view.x), 70 + (lap + 1) * width);
    const offsets = projection.mapWorldOffsets(view);
    const left = 500 - width / 2, right = 500 + width / 2;
    assert.ok(left + offsets[0] <= view.x - 500 / view.zoom);
    assert.ok(right + offsets.at(-1) >= view.x + 500 / view.zoom);
    for (let i = 1; i < offsets.length; i++) close(right + offsets[i - 1], left + offsets[i]);
    assert.ok(offsets.length <= 3, "Keep wrapping bounded to three reused world copies");
    const route = { bounds: [69, 269, 71, 271], minZoom: 2 };
    assert.equal(details.routeInView(route, view), true, "Detail on the opposite side of the date line must remain visible");
    const labels = [{ id: "across-date-line", x: 70, y: 270, names: ["Island"], kind: "city", minZoom: 2, priority: 100 }];
    const words = details.layoutMapLabels(labels, view, { width: 800, height: 432 }, "en", []);
    assert.equal(words.length, 1);
    close(words[0].left, ((70 + (lap + 1) * width - view.x) * view.zoom + 500) * .8 + 8);
  }
  assert.deepEqual(Array.from(projection.mapWorldOffsets({ x: 500, y: 270, zoom: 1, detail: false })), [0], "The original overview should remain unchanged");
});

test("desktop and tablet align the first place label with the map canvas", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const sideBySide = css.match(/@media \(min-width: 701px\) \{([^]*?)\n\}/)?.[1] ?? "";
  assert.match(sideBySide, /\.map-places \{ margin-top: 32px; \}/);
  assert.match(sideBySide, /\.map-stage \{ align-items: start; \}/);
  const stacked = css.match(/@media \(max-width: 700px\) \{([^]*?)\n\}/)?.[1] ?? "";
  assert.match(stacked, /\.map-places \{ margin-top: 0; \}/, "The mobile list must stay below the map with its original spacing");
});

test("the mobile map canvas reaches both screen edges without widening the rest of the page", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const mobile = css.match(/@media \(max-width: 540px\) \{([^]*?)\n\}/)?.[1] ?? "";
  assert.match(mobile, /\.site-shell \{ width: calc\(100% - 40px\); \}/);
  assert.match(mobile, /\.map-canvas \{ width: calc\(100% \+ 40px\); max-width: none; margin-inline: -20px; \}/);
  assert.equal((css.match(/\.map-canvas \{/g) ?? []).length, 2, "Only the mobile breakpoint should override the existing canvas width");
});

test("wave lifecycle has no reload, navigation, or iteration handler", async () => {
  const wave = await readFile(new URL("../app/site-color-wave.tsx", import.meta.url), "utf8");
  const disclosure = await readFile(new URL("../app/home-disclosure.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(wave + disclosure, /location\.|reload\(|router\.refresh|animationiteration|animationend|setInterval/);
  assert.match(disclosure, /type="button"/);
});

test("Chinese research preserves English paper titles and authors", async () => {
  const english = await readFile(new URL("research/index.html", output), "utf8");
  for (const route of ["zh/", "zh-hant/"]) {
    const chinese = await readFile(new URL(route + "research/index.html", output), "utf8");
    for (const pattern of [/<h3\b[^>]*>[\s\S]*?<\/h3>/g, /<p class="authors"[^>]*>[\s\S]*?<\/p>/g]) {
      assert.deepEqual(chinese.match(pattern), english.match(pattern));
    }
  }
});

test("photo masks follow the bar diagonal with dithered, feathered left edges", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const name of ["desktop","tablet","mobile"]) {
    assert.ok(css.includes('url("./masks/photo-' + name + '.png")'));
    const png = await readFile(new URL("../app/masks/photo-" + name + ".png", import.meta.url));
    assert.equal(png.subarray(1,4).toString(), "PNG");
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.deepEqual([width,height,png[24],png[25]], [1536,name === "mobile" ? 1024 : 4096,8,4]);
    const parts = [];
    for (let offset=8; offset<png.length;) {
      const length=png.readUInt32BE(offset);
      if (png.toString("ascii",offset+4,offset+8)==="IDAT") parts.push(png.subarray(offset+8,offset+8+length));
      offset+=length+12;
    }
    const raw=inflateSync(Buffer.concat(parts));
    const alpha=(x,y)=>raw[y*(width*2+1)+2+x*2];
    if(name==="mobile") {
      assert.equal(alpha(500,0),0); assert.equal(alpha(500,height-1),0);
      assert.equal(alpha(500,Math.round(height*.5)),255);
      for (const x of [0, width-1]) {
        for (const y of [.2,.5,.7]) assert.equal(alpha(x,Math.round(height*y)),255, "Mobile side edges must remain opaque");
      }
      assert.ok(new Set(Array.from({length:100},(_,x)=>alpha(x,50))).size>1);
    } else {
      for (const y of [0,500,height-1]) assert.equal(alpha(0,y),0);
      assert.equal(alpha(width-1,height-1),255);
      const boundary=name==="desktop"?.4368:.28;
      assert.equal(alpha(Math.ceil(width*boundary),height-1),255);
      const midpoint=name==="desktop"?.3084760577:.14;
      assert.ok(css.includes(`--photo-fade-midpoint: ${String(midpoint).slice(1)}`));
      assert.ok(Math.abs(alpha(Math.round((width-1)*midpoint),height-1)-127.5)<=3, "Opening wave anchor must match the actual photo mask midpoint");
      if (name === "tablet") {
        for (const x of [50,150,250,350,450]) {
          for (const y of [0,500,2000,height-1]) {
            assert.ok(Math.abs(alpha(x,y)-alpha(x,height-1))<=4, "Tablet fade must be vertical, with only sub-percent dithering between rows");
          }
        }
      } else {
      // A 75-degree boundary has normal (cos15, sin15), starting at bottom-left.
      assert.ok(Math.abs(alpha(350,height-101)-alpha(323,height-1)) <= 4);
      for (const y of [height-1000,height-600,height-200,height-1]) {
        const x = Math.round(250 + (height-1-y) * Math.tan(15*Math.PI/180));
        assert.ok(Math.abs(alpha(x,y)-alpha(250,height-1)) <= 4, "Fade must continue through the full visible height");
      }
      assert.ok(alpha(220,height-1) > alpha(220,height-500));
      }
      assert.ok(new Set(Array.from({length:100},(_,y)=>alpha(400,height-1-y))).size>1);
    }
  }
  assert.match(css, /mask-size: 100% auto; mask-position: left bottom/);
  const mobile = css.slice(css.indexOf("@media (max-width: 540px)"));
  assert.match(mobile, /left: -20px; width: calc\(100% \+ 40px\)/);
  assert.match(mobile, /mask-image: url\("\.\/masks\/photo-mobile.png"\); mask-size: 100% 100%/);
  assert.doesNotMatch(mobile, /photo-desktop.png|mask-composite/);
});
