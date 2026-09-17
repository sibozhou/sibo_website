import type { ReactNode } from "react";

export function SiteFrame({ page, children }: { page: "home" | "research"; children: ReactNode }) {
  const root = page === "home" ? "./" : "../";
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="site-shell">
        <header className="site-header">
          <a className="wordmark" href={root} aria-label="Sibo Zhou, home">Sibo Zhou</a>
          <nav className="site-nav" aria-label="Primary navigation">
            <a href={root} aria-current={page === "home" ? "page" : undefined}>Home</a>
            <a href={root + "research/"} aria-current={page === "research" ? "page" : undefined}>Research</a>
          </nav>
        </header>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="site-footer">
          <p>© {new Date().getFullYear()} Sibo Zhou</p>
          <a href={root + "Sibo_Zhou_CV.pdf"}>Curriculum vitae <span className="file-label">PDF</span></a>
        </footer>
      </div>
    </>
  );
}
