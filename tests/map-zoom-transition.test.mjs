import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

test("the overview zoom crossfades an inert snapshot without delaying the live camera", async () => {
  const source = await readFile(new URL("../app/map/zoom-transition.ts", import.meta.url), "utf8");
  const exports = {}, animations = [], attributes = {};
  let reducedMotion = false, removed = 0, completed = 0, clones = 0;
  const definition = { id: "map-base-geography" };
  const use = { setAttribute: (name, value) => { attributes[name] = value; } };
  const animate = (frames, options) => {
    const animation = { frames, options, cancelled: 0, cancel() { this.cancelled++; } };
    animations.push(animation);
    return animation;
  };
  const snapshot = { classList: { add: name => { attributes.class = name; } }, style: {}, setAttribute: (name, value) => { attributes[name] = value; }, querySelector: () => definition, querySelectorAll: () => [use], animate, remove: () => { removed++; } };
  const drawing = { cloneNode: () => { clones++; return snapshot; }, getBoundingClientRect: () => ({ left: -180, top: 172, width: 750, height: 405 }), animate };
  const canvas = { dataset: { overview: "true" }, append: element => assert.equal(element, snapshot) };
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, window: { matchMedia: () => ({ matches: reducedMotion }) }, getComputedStyle: () => ({ transform: "matrix(1, 0, 0, 1, -375, 0)" }),
  });
  const finish = exports.animateOverviewZoom(canvas, drawing, { clientX: 195, clientY: 350 }, () => { completed++; });
  assert.equal(canvas.dataset.zoomTransition, "true");
  assert.equal(snapshot.inert, true);
  assert.equal(attributes["aria-hidden"], "true");
  assert.equal(definition.id, "map-zoom-geography");
  assert.equal(attributes.href, "#map-zoom-geography", "The snapshot must use its own frozen paths, not the new projection's definitions");
  assert.equal(snapshot.style.transformOrigin, "375px 178px");
  assert.equal(animations.length, 2);
  assert.ok(animations.every(animation => animation.options.duration === 560 && animation.options.easing === "cubic-bezier(.4, 0, .2, 1)"));
  assert.equal(animations[0].frames[0].opacity, 1);
  assert.equal(animations[0].frames.at(-1).opacity, 0);
  assert.match(animations[0].frames.at(-1).transform, /scale\(1\.08\)$/);
  assert.equal(animations[1].frames[0].opacity, 0);
  assert.equal(animations[1].frames.at(-1).opacity, 1);
  assert.equal(exports.animateOverviewZoom(canvas, drawing, undefined, () => {}), null, "Repeated wheel events must not stack snapshots or restart the fade");
  assert.equal(clones, 1);
  animations[0].onfinish();
  finish();
  assert.equal(removed, 1);
  assert.equal(completed, 1);
  assert.equal(canvas.dataset.zoomTransition, undefined);
  assert.ok(animations.every(animation => animation.cancelled === 1));
  reducedMotion = true;
  assert.equal(exports.animateOverviewZoom(canvas, drawing, undefined, () => {}), null);
  reducedMotion = false;
  canvas.dataset.overview = "false";
  assert.equal(exports.animateOverviewZoom(canvas, drawing, undefined, () => {}), null, "Ordinary close-up zoom must remain direct and responsive");
  assert.equal(clones, 1);
  canvas.dataset.overview = "true";
  exports.animateOverviewZoom(canvas, drawing, undefined, () => {})();
  assert.equal(removed, 2, "Reset, drag and unmount can cancel the handoff immediately");
});
