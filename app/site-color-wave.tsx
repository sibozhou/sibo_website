"use client";

import { useEffect } from "react";

export function SiteColorWave({ pageKey }: { pageKey: string }) {
  useEffect(() => {
    if (!("registerProperty" in CSS) || !CSS.supports("background", "linear-gradient(105deg in oklab, black, white)")) return;
    const root = document.documentElement;
    const footer = document.querySelector<HTMLElement>(".site-footer");
    if (!footer) return;
    const surfaces = document.querySelectorAll<HTMLElement>(".disclosure-toggle, .site-footer");
    const labels = document.querySelectorAll<HTMLElement>(".disclosure-toggle .section-label, .site-footer p, .language-switch");
    const photo = document.querySelector<HTMLElement>(".hero-art");
    // Normal to a 75-degree boundary in the first quadrant (CSS 105deg).
    const horizontal = Math.cos(15 * Math.PI / 180);
    const vertical = Math.sin(15 * Math.PI / 180);
    let previousWidth = 0;
    const align = () => {
      // Treat only painted surfaces as one continuous strip. Expanded content
      // must not stretch the animation endpoint or shift the other bars' phases.
      let paintedHeight = 0;
      surfaces.forEach((surface) => {
        const rect = surface.getBoundingClientRect();
        const top = paintedHeight;
        // Footer paint bleeds to the viewport edge, one pixel over its divider.
        const origin = surface === footer ? (top - 1) * vertical : rect.left * horizontal + top * vertical;
        surface.style.setProperty("--wave-origin", `${origin}px`);
        labels.forEach((label) => {
          if (!surface.contains(label)) return;
          const labelRect = label.getBoundingClientRect();
          label.style.setProperty("--wave-origin", `${labelRect.left * horizontal + (top + labelRect.top - rect.top) * vertical}px`);
        });
        paintedHeight += rect.height;
      });
      const travel = root.clientWidth * horizontal + paintedHeight * vertical;
      root.style.setProperty("--wave-travel", `${travel}px`);
      root.style.setProperty("--wave-width", `${root.clientWidth}px`);
      // Join the photo's midpoint to the rising half of the opening wave.
      // Ignore intervening prose on stacked layouts; it has no painted surface.
      if (previousWidth !== root.clientWidth) {
        const style = getComputedStyle(root);
        const unit = parseFloat(style.getPropertyValue("--wave-unit")) * window.innerWidth / 100;
        const duration = parseFloat(style.getPropertyValue("--wave-duration"));
        let center = -63.75 * unit;
        if (photo) {
          const rect = photo.getBoundingClientRect();
          const midpoint = parseFloat(getComputedStyle(photo).getPropertyValue("--photo-fade-midpoint"));
          // Mobile has only top/bottom photo fades, so retain its normal entry phase.
          if (Number.isFinite(midpoint)) {
            const anchor = (rect.left + midpoint * rect.width) * horizontal;
            center = anchor + 51 * unit;
          }
        }
        const phase = Math.max(0, Math.min(1, (center + 76.5 * unit) / (travel + 153 * unit)));
        root.style.setProperty("--wave-delay", `${-duration * phase}s`);
        previousWidth = root.clientWidth;
      }
    };
    const observer = new ResizeObserver(align);
    surfaces.forEach((surface) => observer.observe(surface));
    labels.forEach((label) => observer.observe(label));
    window.addEventListener("resize", align);
    align();
    root.dataset.colorWave = "ready";
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", align);
      delete root.dataset.colorWave;
      root.style.removeProperty("--wave-travel");
      root.style.removeProperty("--wave-delay");
      root.style.removeProperty("--wave-width");
    };
  }, [pageKey]);

  return null;
}
