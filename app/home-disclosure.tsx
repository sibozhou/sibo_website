"use client";

import { useEffect, useState, type ReactNode } from "react";

export function HomeDisclosure({ id, label, count, children }: { id: string; label: string; count?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>(`a[href="#${id}"]`);
    const expand = () => setOpen(true);
    links.forEach((link) => link.addEventListener("click", expand));
    return () => links.forEach((link) => link.removeEventListener("click", expand));
  }, [id]);

  return (
    <section className="editorial-section home-disclosure" id={id} aria-labelledby={`${id}-title`} data-open={open}>
      <h2 id={`${id}-title`}>
        <button className="disclosure-toggle" type="button" aria-expanded={open} aria-controls={`${id}-content`} onClick={() => setOpen(!open)}>
          <span className="section-label">{label}{open && count && <span className="section-count">{count}</span>}</span>
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
