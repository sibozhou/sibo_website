import type { ReactNode } from "react";
import { languages, type Language } from "./languages";
import { SiteColorWave } from "./site-color-wave";

export function SiteFrame({ page, language = "en", children }: { page: "home" | "research"; language?: Language; children: ReactNode }) {
  const root = page === "home" ? "./" : "../";
  const zh = language !== "en";
  const traditional = language === "zh-hant";
  const siteRoot = zh ? root + "../" : root;
  const alternate = siteRoot + (zh ? "" : "zh/") + (page === "research" ? "research/" : "");
  return (
    <>
      <SiteColorWave />
      <a className="skip-link" href="#main-content">{zh ? "跳至正文" : "Skip to content"}</a>
      <div className="site-shell">
        <header className="site-header">
          <a className={zh ? "wordmark wordmark-english" : "wordmark"} href={alternate} hrefLang={zh ? "en" : "zh-Hans"} aria-label={zh ? "Sibo — Switch to English" : "思博 — 切换至中文"} title={zh ? "Switch to English" : "切换至中文"}><span className="header-color" lang={zh ? "en" : "zh-Hans"}>{zh ? "Sibo" : "思博"}</span></a>
          <nav className="site-nav" aria-label={traditional ? "主要導覽" : zh ? "主导航" : "Primary navigation"}>
            <a href={root} aria-current={page === "home" ? "page" : undefined}><span className="header-color">{traditional ? "首頁" : zh ? "首页" : "Home"}</span></a>
            <a href={root + "research/"} aria-current={page === "research" ? "page" : undefined}><span className="header-color">{zh ? "研究" : "Research"}</span></a>
          </nav>
        </header>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="site-footer">
          <p>© {new Date().getFullYear()} {zh ? "周思博" : "Sibo Zhou"}</p>
          <nav className="language-options" aria-label={traditional ? "語言選擇" : zh ? "语言选择" : "Languages"}>
            {languages.filter((option) => option.id !== language).map((option) => (
              <a key={option.id} className="language-switch" href={siteRoot + option.path + (page === "research" ? "research/" : "")} hrefLang={option.tag} lang={option.tag}>{option.label}</a>
            ))}
          </nav>
        </footer>
      </div>
    </>
  );
}
