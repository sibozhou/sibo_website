import type { ReactNode } from "react";

export function SiteFrame({ page, language = "en", children }: { page: "home" | "research"; language?: "en" | "zh"; children: ReactNode }) {
  const root = page === "home" ? "./" : "../";
  const zh = language === "zh";
  const siteRoot = zh ? root + "../" : root;
  const alternate = siteRoot + (zh ? "" : "zh/") + (page === "research" ? "research/" : "");
  return (
    <>
      <a className="skip-link" href="#main-content">{zh ? "跳至正文" : "Skip to content"}</a>
      <div className="site-shell">
        <header className="site-header">
          <a className={zh ? "wordmark wordmark-english" : "wordmark"} href={alternate} hrefLang={zh ? "en" : "zh-Hans"} aria-label={zh ? "Sibo Zhou — Switch to English" : "周思博 — 切换至中文"} title={zh ? "Switch to English" : "切换至中文"}><span lang={zh ? "en" : "zh-Hans"}>{zh ? "Sibo Zhou" : "周思博"}</span></a>
          <nav className="site-nav" aria-label={zh ? "主导航" : "Primary navigation"}>
            <a href={root} aria-current={page === "home" ? "page" : undefined}>{zh ? "首页" : "Home"}</a>
            <a href={root + "research/"} aria-current={page === "research" ? "page" : undefined}>{zh ? "研究" : "Research"}</a>
          </nav>
        </header>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="site-footer">
          <p>© {new Date().getFullYear()} {zh ? "周思博" : "Sibo Zhou"}</p>
          <a className="language-switch" href={alternate} hrefLang={zh ? "en" : "zh-Hans"} lang={zh ? "en" : "zh-Hans"}>{zh ? "Switch to English" : "中文版"}</a>
        </footer>
      </div>
    </>
  );
}
