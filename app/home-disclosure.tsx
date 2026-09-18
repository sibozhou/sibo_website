"use client";

import { useState, type ReactNode } from "react";

export function HomeDisclosure({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="editorial-section home-disclosure" aria-labelledby={`${id}-title`} data-open={open}>
      <h2 id={`${id}-title`}>
        <button className="disclosure-toggle" type="button" aria-expanded={open} aria-controls={`${id}-content`} onClick={() => setOpen(!open)}>
          <span className="section-label">{label}</span>
        </button>
      </h2>
      <div className="disclosure-panel" id={`${id}-content`} inert={!open} aria-hidden={!open}>
        <div className="disclosure-clip">
          <div className="disclosure-content">{children}</div>
        </div>
      </div>
    </section>
  );
}
