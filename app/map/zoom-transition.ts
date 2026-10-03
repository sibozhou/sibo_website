// Keep the old projection visible briefly while the live camera enters Mercator.
// Native opacity/transform animations add no React frame loop or gesture delay.
export function animateOverviewZoom(canvas: HTMLDivElement | null, drawing: HTMLDivElement | null, anchor: { clientX: number; clientY: number } | undefined, onFinish: () => void) {
  if (!canvas || !drawing || canvas.dataset.overview !== "true" || canvas.dataset.zoomTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const box = drawing.getBoundingClientRect();
  const transform = getComputedStyle(drawing).transform;
  const snapshot = drawing.cloneNode(true) as HTMLDivElement;
  snapshot.classList.add("map-zoom-snapshot");
  snapshot.setAttribute("aria-hidden", "true");
  snapshot.inert = true;
  snapshot.style.transformOrigin = `${anchor ? anchor.clientX - box.left : box.width / 2}px ${anchor ? anchor.clientY - box.top : box.height / 2}px`;
  // SVG <use> must not resolve to the live projection after React updates it.
  snapshot.querySelector("#map-base-geography")!.id = "map-zoom-geography";
  snapshot.querySelectorAll('use[href="#map-base-geography"]').forEach(use => use.setAttribute("href", "#map-zoom-geography"));
  canvas.append(snapshot);
  canvas.dataset.zoomTransition = "true";
  const timing: KeyframeAnimationOptions = { duration: 560, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" };
  const leaving = snapshot.animate([{ opacity: 1, transform }, { opacity: 0, transform: `${transform} scale(1.08)` }], timing);
  const entering = drawing.animate([{ opacity: 0 }, { opacity: 1 }], timing);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    snapshot.remove();
    leaving.cancel();
    entering.cancel();
    delete canvas.dataset.zoomTransition;
    onFinish();
  };
  leaving.onfinish = finish;
  return finish;
}
