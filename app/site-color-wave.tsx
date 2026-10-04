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
    const home = pageKey.endsWith("/home");
    // Normal to a 75-degree boundary in the first quadrant (CSS 105deg).
    const horizontal = Math.cos(15 * Math.PI / 180);
    const vertical = Math.sin(15 * Math.PI / 180);
    let initialized = false;
    let viewportWidth = 0;
    const align = () => {
      // Treat only painted surfaces as one continuous strip. Expanded content
      // must not stretch the animation endpoint or shift the other bars' phases.
      let paintedHeight = 0;
      surfaces.forEach((surface) => {
        const rect = surface.getBoundingClientRect();
        const top = paintedHeight;
        if (home) {
          surface.style.setProperty("--wave-left", `${surface === footer ? 0 : rect.left}px`);
          surface.style.setProperty("--wave-top", `${top}px`);
        }
        // Footer paint bleeds to the viewport edge, one pixel over its divider.
        const origin = surface === footer ? (top - 1) * vertical : rect.left * horizontal + top * vertical;
        surface.style.setProperty("--wave-origin", `${home ? 0 : origin}px`);
        labels.forEach((label) => {
          if (!surface.contains(label)) return;
          const labelRect = label.getBoundingClientRect();
          label.style.setProperty("--wave-origin", `${home ? 0 : labelRect.left * horizontal + (top + labelRect.top - rect.top) * vertical}px`);
          if (home) {
            label.style.setProperty("--wave-left", `${labelRect.left}px`);
            label.style.setProperty("--wave-top", `${top + labelRect.top - rect.top}px`);
          }
        });
        paintedHeight += rect.height;
      });
      root.style.setProperty("--wave-width", `${root.clientWidth}px`);
      // Freeze the curved field across disclosures and mobile toolbar resizing.
      if (home && window.innerWidth !== viewportWidth) {
        root.style.setProperty("--wave-height", `${Math.max(352, paintedHeight)}px`);
        viewportWidth = window.innerWidth;
      }
      // Seed the opening phase from the photo's midpoint.
      // Ignore intervening prose on stacked layouts; it has no painted surface.
      if (!initialized) {
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
        // A small desktop-only leftward offset; responsive layouts keep their phase.
        center -= parseFloat(style.getPropertyValue("--wave-entry-shift")) * root.clientWidth * horizontal;
        // One repeating period: 51 units black, 51 white, and two equal fades.
        const phase = ((center + 76.5 * unit) / (204 * unit)) % 1;
        root.style.setProperty("--wave-delay", `${-duration * phase}s`);
        initialized = true;
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
      root.style.removeProperty("--wave-delay");
      root.style.removeProperty("--wave-width");
      if (home) {
        root.style.removeProperty("--wave-height");
        [...surfaces, ...labels].forEach((element) => {
          element.style.removeProperty("--wave-left");
          element.style.removeProperty("--wave-top");
        });
      }
    };
  }, [pageKey]);

  return null;
}
