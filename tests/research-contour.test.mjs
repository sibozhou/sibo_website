import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

test("Research uses Soft contour independently of Home's drifting ribbon", async () => {
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

test("Home's curved ribbon reuses the silky feather without changing other pages", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const tide = css.match(/\/\* Home: a softly curved[^]*?(?=\n\/\* Research:)/)?.[0] ?? "";
  assert.match(tide, /0%, 100% \{ --tide-bend: 1; --tide-drift: 0; \}/);
  assert.match(tide, /50% \{ --tide-bend: 1\.12; --tide-drift: \.08; \}/);
  assert.match(tide, /\.site-shell-home \{ animation: home-ink-tide var\(--wave-duration\) ease-in-out var\(--wave-delay\) infinite; \}/);
  assert.match(tide, /\.site-shell-home :is\(\.disclosure-toggle, \.site-footer\)::before/);
  assert.match(tide, /--wave-origin: 0px;/);
  assert.match(tide, /--tide-geometry: ellipse[^]*?var\(--wave-left\)[^]*?var\(--wave-top\)/);
  assert.match(tide, /repeating-radial-gradient\(var\(--tide-geometry\) in oklab, var\(--wave-stops\)\)/);
  assert.match(tide, /repeating-radial-gradient\(var\(--tide-geometry\) in oklab, var\(--inverse-stops\)\)/);
  assert.doesNotMatch(tide, /site-shell-research|site-shell-map|site-header|hero-photo|filter:|animationiteration/);
  assert.match(css, /--wave-paint: repeating-linear-gradient\(105deg in oklab, var\(--wave-stops\)\)/);
});

test("Research uses white lettering on dark ink while Map retains its light wash", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const wash = css.match(/\/\* Pale ink wash[^]*?\n\}/)?.[0] ?? "";
  assert.match(wash, /@media screen and \(forced-colors: none\)/);
  assert.match(wash, /\.site-shell-research \{ --bar-strength: \.70; \}/);
  assert.match(wash, /\.site-shell-map \{ --bar-strength: \.24; \}/);
  assert.match(css, /--bar-strength: 1;/);
  assert.doesNotMatch(wash, /site-shell-home[^\n]*\{ --bar-strength:/);
  assert.match(wash, /\.site-footer::before \{ top: 0; opacity: var\(--bar-strength\); \}/, "Translucent surfaces must not overlap and create a dark seam");
  assert.match(wash, /data-color-wave="ready"\] \.site-shell-map :is\(\.site-footer p, \.language-switch\)/);
  assert.doesNotMatch(wash, /data-research-contour/);
  assert.match(css, /data-research-contour="ready"\] \.site-shell-research :is\(\.section-label, \.site-footer p, \.language-switch\) \{[^]*?var\(--paper\) 46%, var\(--ink\) 48%\);[^]*?-webkit-text-fill-color: transparent;/);
  assert.match(css, /data-research-contour="ready"[^\n]*\.home-disclosure\[data-open="true"\] \.section-label/);
  assert.match(css, /data-research-contour="ready"[^\n]*\.disclosure-toggle:hover \.section-label/);
  assert.match(wash, /color: var\(--ink\); background-image: none; -webkit-text-fill-color: var\(--ink\);/);
  assert.match(wash, /\.language-switch:is\(:hover, :focus-visible\)::after \{ background: var\(--ink\); \}/);
  assert.doesNotMatch(wash, /site-shell-notes|site-header|hero-photo|animation:/);
  const color = name => css.match(new RegExp(`--${name}: #([\\da-f]{6})`))[1].match(/../g).map(channel => parseInt(channel, 16) / 255);
  const luminance = rgb => rgb.map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const ink = color("ink"), paper = color("paper");
  const darkField = paper.map((channel, index) => channel * .30 + ink[index] * .70);
  assert.ok((luminance(paper) + .05) / (luminance(darkField) + .05) > 5, "White lettering must stay readable on Research's darker core");
  for (let step = 0; step <= 100; step++) {
    const opacity = .24 * step / 100;
    const background = paper.map((channel, index) => channel * (1 - opacity) + ink[index] * opacity);
    const contrast = (luminance(background) + .05) / (luminance(ink) + .05);
    assert.ok(contrast > 8, "Map footer text must stay legible across its light wash");
  }
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
    const firstLabel = element(20, 340, 24), secondLabel = element(20, 436, 24);
    const copyright = element(20, 820, 24), language = element(width - 130, 820, 44);
    first.labels = [firstLabel];
    second.labels = [secondLabel];
    footer.labels = [copyright, language];
    const labels = [firstLabel, secondLabel, copyright, language];
    const elements = [first, second, footer, ...labels];
    elements.forEach(el => { el.style.owner = el; });
    const root = element(0, 0, 900);
    root.style.owner = root;
    root.clientWidth = width;
    root.dataset = {};
    const shell = {
      querySelector: () => footer,
      querySelectorAll: selector => selector === ".disclosure-toggle, .site-footer" ? [first, second, footer] : labels,
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
    assert.equal(footer.values["--contour-top"], "192px");
    assert.equal(firstLabel.values["--contour-top"], "40px");
    assert.equal(secondLabel.values["--contour-top"], "136px");
    assert.equal(copyright.values["--contour-top"], "520px");
    assert.equal(language.values["--contour-top"], "520px");
    const origins = elements.map(el => ({ ...el.values }));
    for (const shift of [300, -300, 600, -600]) {
      second.rect.top += shift;
      secondLabel.rect.top += shift;
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
    assert.deepEqual(observed, [first, second, footer, ...labels]);
    cleanup();
    assert.equal(root.dataset.researchContour, undefined);
    assert.equal(root.values["--contour-height"], undefined);
    assert.ok(elements.every(el => Object.keys(el.values).length === 0));
  }
});
