"use client";

import { useEffect } from "react";

export function SiteColorWave() {
  useEffect(() => {
    if (!("registerProperty" in CSS)) return;
    const root = document.documentElement;
    const labels = document.querySelectorAll<HTMLElement>(".header-color");
    const align = () => labels.forEach((label) => {
      label.style.setProperty("--wave-origin", `${label.getBoundingClientRect().left}px`);
    });
    const observer = new ResizeObserver(align);
    labels.forEach((label) => observer.observe(label));
    window.addEventListener("resize", align);
    align();
    root.dataset.colorWave = "ready";
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", align);
      delete root.dataset.colorWave;
    };
  }, []);

  return null;
}
