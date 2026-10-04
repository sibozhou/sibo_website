import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

test("Research uses Soft contour independently of Home's diagonal wave", async () => {
  const frame = await readFile(new URL("../app/site-frame.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(frame, /page === "research" \? <ResearchColorContour/);
  assert.match(css, /animation: research-soft-contour 72s ease-in-out -18s infinite/);
  assert.match(css, /radial-gradient\(ellipse[^]*?in srgb-linear/);
  assert.doesNotMatch(css, /research-study-rail|contour-rail/);
  assert.doesNotMatch(css, /data-research-contour[^\n]*\.site-header/);
  assert.match(css, /:root\[data-color-wave="ready"\] :is\(#main-content, \.site-footer\)/);
  const feather = css.match(/\/\* A broad, zero-slope feather[^]*?var\(--paper\) 98%\);/)[0];
  const blends = [...feather.matchAll(/color-mix\(in srgb-linear, var\(--paper\) ([\d.]+)%/g)].map(match => Number(match[1]));
  assert.equal(blends.length, 63);
  assert.ok(blends.every((blend, index) => index === 0 || blend > blends[index - 1]));
  assert.ok(blends[0] < .001 && blends.at(-1) > 99.99);
});

test("Soft contour keeps its phase and reference height stable when papers expand", async () => {
  const source = await readFile(new URL("../app/research-color-contour.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  assert.doesNotMatch(source, /location\.|reload\(|router\.refresh|animationiteration|animationend|setInterval|requestAnimationFrame/);
  for (const width of [1440, 834, 390]) {
    let cleanup, resize, observedResize;
    const observed = [];
    const element = (left, top, height) => ({
      rect: { left, top, height }, values: {},
      getBoundingClientRect() { return this.rect; },
      contains(label) { return this.labels?.includes(label); },
      style: {
        setProperty(name, value) { this.owner.values[name] = value; },
        removeProperty(name) { delete this.owner.values[name]; },
      },
    });
    const first = element(0, 300, 96), second = element(0, 396, 96), footer = element(20, 492, 408);
    const copyright = element(20, 820, 24), language = element(width - 130, 820, 44);
    footer.labels = [copyright, language];
    const elements = [first, second, footer, copyright, language];
    elements.forEach(el => { el.style.owner = el; });
    const root = element(0, 0, 900);
    root.style.owner = root;
    root.clientWidth = width;
    root.dataset = {};
    const shell = {
      querySelector: () => footer,
      querySelectorAll: selector => selector === ".disclosure-toggle, .site-footer" ? [first, second, footer] : [language],
    };
    const window = { innerWidth: width, innerHeight: 900, scrollY: 0,
      addEventListener: (_, fn) => { resize = fn; }, removeEventListener() {},
    };
    const exports = {};
    runInNewContext(compiled, {
      exports, require: () => ({ useEffect: fn => { cleanup = fn(); } }), window,
      CSS: { registerProperty() {}, supports: () => true },
      document: { documentElement: root, querySelector: () => shell },
      ResizeObserver: class { constructor(fn) { observedResize = fn; } observe(el) { observed.push(el); } disconnect() {} },
    });
    exports.ResearchColorContour({ pageKey: "en/research" });
    assert.equal(root.dataset.researchContour, "ready");
    assert.equal(root.values["--contour-height"], "600px");
    assert.equal(root.values["--contour-width"], `${width}px`);
    assert.equal(second.values["--contour-top"], "96px");
    assert.equal(footer.values["--contour-top"], "191px");
    assert.equal(language.values["--contour-top"], "520px");
    const origins = elements.map(el => ({ ...el.values }));
    for (const shift of [300, -300, 600, -600]) {
      second.rect.top += shift;
      footer.rect.top += shift;
      copyright.rect.top += shift;
      language.rect.top += shift;
      footer.rect.height = 90;
      window.innerHeight += 30; // Mobile browser chrome must not restart the field.
      observedResize();
      resize();
      assert.deepEqual(elements.map(el => ({ ...el.values })), origins);
      assert.equal(root.values["--contour-height"], "600px");
    }
    elements.forEach(el => { el.rect.top -= 250; });
    window.scrollY = 250;
    resize();
    assert.deepEqual(elements.map(el => ({ ...el.values })), origins);
    root.clientWidth -= 15; // A desktop scrollbar is not a new viewport layout.
    resize();
    assert.equal(root.values["--contour-height"], "600px");
    window.innerWidth += 200;
    root.clientWidth += 200;
    resize();
    assert.equal(root.values["--contour-height"], "720px");
    assert.deepEqual(observed, [first, second, footer, language]);
    cleanup();
    assert.equal(root.dataset.researchContour, undefined);
    assert.equal(root.values["--contour-height"], undefined);
    assert.ok(elements.every(el => Object.keys(el.values).length === 0));
  }
});
