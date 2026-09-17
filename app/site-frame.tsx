import type { ReactNode } from "react";

export function SiteFrame({ page, children }: { page: "home" | "research"; children: ReactNode }) {
  const root = page === "home" ? "./" : "../";
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="site-shell">
        <header className="site-header">
          <a className="wordmark" href={root} aria-label="周思博 — Sibo Zhou, home"><span lang="zh-Hans">周思博</span></a>
          <nav className="site-nav" aria-label="Primary navigation">
            <a href={root} aria-current={page === "home" ? "page" : undefined}>Home</a>
            <a href={root + "research/"} aria-current={page === "research" ? "page" : undefined}>Research</a>
          </nav>
        </header>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="site-footer">
          <p>© {new Date().getFullYear()} Sibo Zhou</p>
        </footer>
      </div>
    </>
  );
}
