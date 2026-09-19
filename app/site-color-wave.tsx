"use client";

import { useEffect } from "react";

export function SiteColorWave({ pageKey }: { pageKey: string }) {
  useEffect(() => {
    if (!("registerProperty" in CSS) || !CSS.supports("background", "linear-gradient(135deg in oklab, black, white)")) return;
    const root = document.documentElement;
    const footer = document.querySelector<HTMLElement>(".site-footer");
    const firstBar = document.querySelector<HTMLElement>(".disclosure-toggle") ?? footer;
    if (!footer || !firstBar) return;
    const surfaces = document.querySelectorAll<HTMLElement>(".disclosure-toggle, .site-footer");
    const labels = document.querySelectorAll<HTMLElement>(".disclosure-toggle .section-label, .site-footer p, .language-switch");
    let previousWidth = 0;
    const align = () => {
      const top = firstBar.getBoundingClientRect().top;
      const bottom = footer.getBoundingClientRect().bottom;
      root.style.setProperty("--wave-travel", `${(root.clientWidth + bottom - top) / Math.SQRT2}px`);
      root.style.setProperty("--wave-width", `${root.clientWidth}px`);
      surfaces.forEach((surface) => {
        const rect = surface.getBoundingClientRect();
        // Footer paint bleeds to the viewport edge, one pixel over its divider.
        const origin = surface === footer ? rect.top - top - 1 : rect.left + rect.top - top;
        surface.style.setProperty("--wave-origin", `${origin / Math.SQRT2}px`);
      });
      labels.forEach((label) => {
        const rect = label.getBoundingClientRect();
        label.style.setProperty("--wave-origin", `${(rect.left + rect.top - top) / Math.SQRT2}px`);
      });
      // Enter one-quarter into the leading fade at every responsive width.
      if (previousWidth !== root.clientWidth) {
        const style = getComputedStyle(root);
        const unit = parseFloat(style.getPropertyValue("--wave-unit")) * window.innerWidth / 100;
        const duration = parseFloat(style.getPropertyValue("--wave-duration"));
        const travel = (root.clientWidth + bottom - top) / Math.SQRT2;
        root.style.setProperty("--wave-delay", `${-duration * 12.75 * unit / (travel + 153 * unit)}s`);
        previousWidth = root.clientWidth;
      }
    };
    const observer = new ResizeObserver(align);
    surfaces.forEach((surface) => observer.observe(surface));
    labels.forEach((label) => observer.observe(label));
    document.querySelectorAll(".disclosure-panel").forEach((panel) => observer.observe(panel));
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
