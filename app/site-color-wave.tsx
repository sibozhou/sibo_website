"use client";

import { useEffect } from "react";

export function SiteColorWave({ pageKey }: { pageKey: string }) {
  useEffect(() => {
    if (!("registerProperty" in CSS) || !CSS.supports("background", "linear-gradient(135deg in oklab, black, white)")) return;
    const root = document.documentElement;
    const footer = document.querySelector<HTMLElement>(".site-footer");
    if (!footer) return;
    const surfaces = document.querySelectorAll<HTMLElement>(".disclosure-toggle, .site-footer");
    const labels = document.querySelectorAll<HTMLElement>(".disclosure-toggle .section-label, .site-footer p, .language-switch");
    let previousWidth = 0;
    const align = () => {
      // Treat only painted surfaces as one continuous strip. Expanded content
      // must not stretch the animation endpoint or shift the other bars' phases.
      let paintedHeight = 0;
      surfaces.forEach((surface) => {
        const rect = surface.getBoundingClientRect();
        const top = paintedHeight;
        // Footer paint bleeds to the viewport edge, one pixel over its divider.
        const origin = surface === footer ? top - 1 : rect.left + top;
        surface.style.setProperty("--wave-origin", `${origin / Math.SQRT2}px`);
        labels.forEach((label) => {
          if (!surface.contains(label)) return;
          const labelRect = label.getBoundingClientRect();
          label.style.setProperty("--wave-origin", `${(labelRect.left + top + labelRect.top - rect.top) / Math.SQRT2}px`);
        });
        paintedHeight += rect.height;
      });
      const travel = (root.clientWidth + paintedHeight) / Math.SQRT2;
      root.style.setProperty("--wave-travel", `${travel}px`);
      root.style.setProperty("--wave-width", `${root.clientWidth}px`);
      // Enter one-quarter into the leading fade at every responsive width.
      if (previousWidth !== root.clientWidth) {
        const style = getComputedStyle(root);
        const unit = parseFloat(style.getPropertyValue("--wave-unit")) * window.innerWidth / 100;
        const duration = parseFloat(style.getPropertyValue("--wave-duration"));
        root.style.setProperty("--wave-delay", `${-duration * 12.75 * unit / (travel + 153 * unit)}s`);
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
