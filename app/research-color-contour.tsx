"use client";

import { useEffect } from "react";

export function ResearchColorContour({ pageKey }: { pageKey: string }) {
  useEffect(() => {
    if (!("registerProperty" in CSS) || !CSS.supports("background", "radial-gradient(ellipse 100px 100px at 0px 0px in srgb-linear, black, white)")) return;
    const root = document.documentElement;
    const shell = document.querySelector<HTMLElement>(".site-shell-research");
    const footer = shell?.querySelector<HTMLElement>(".site-footer");
    if (!shell || !footer) return;
    const surfaces = shell.querySelectorAll<HTMLElement>(".disclosure-toggle, .site-footer");
    const labels = shell.querySelectorAll<HTMLElement>(".site-footer .language-switch");
    let viewportWidth = 0;
    const align = () => {
      root.style.setProperty("--contour-width", `${root.clientWidth}px`);
      // Freeze the reference height across disclosures and mobile toolbar resizes.
      // Only a genuine width change establishes a new responsive composition.
      if (window.innerWidth !== viewportWidth) {
        const start = surfaces[0].getBoundingClientRect().top + window.scrollY;
        root.style.setProperty("--contour-height", `${Math.max(352, window.innerHeight - start)}px`);
        viewportWidth = window.innerWidth;
      }
      let paintedHeight = 0;
      surfaces.forEach((surface) => {
        const rect = surface.getBoundingClientRect();
        surface.style.setProperty("--contour-left", `${surface === footer ? 0 : rect.left}px`);
        surface.style.setProperty("--contour-top", `${paintedHeight - (surface === footer ? 1 : 0)}px`);
        labels.forEach((label) => {
          if (!surface.contains(label)) return;
          const labelRect = label.getBoundingClientRect();
          label.style.setProperty("--contour-left", `${labelRect.left}px`);
          label.style.setProperty("--contour-top", `${paintedHeight + labelRect.top - rect.top}px`);
        });
        // Expanded paper content is deliberately excluded from the shared field.
        paintedHeight += rect.height;
      });
    };
    const observer = new ResizeObserver(align);
    surfaces.forEach((surface) => observer.observe(surface));
    labels.forEach((label) => observer.observe(label));
    window.addEventListener("resize", align);
    align();
    root.dataset.researchContour = "ready";
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", align);
      delete root.dataset.researchContour;
      root.style.removeProperty("--contour-width");
      root.style.removeProperty("--contour-height");
      [...surfaces, ...labels].forEach((element) => {
        element.style.removeProperty("--contour-left");
        element.style.removeProperty("--contour-top");
      });
    };
  }, [pageKey]);

  return null;
}
