import type { Language } from "./languages";
import { SiteFrame } from "./site-frame";

export function NotesPage({ language = "en" }: { language?: Language }) {
  const title = language === "zh-hant" ? "隨記" : language === "zh" ? "随记" : "Notes";
  const description = language === "zh-hant"
    ? "一些正在想、正在學、偶然留意到，或只是想記下來的事。"
    : language === "zh"
    ? "一些正在想、正在学、偶然留意到，或只是想记下来的事。"
    : "A loose collection of things I’m thinking about, learning, noticing, or simply want to remember.";

  return (
    <SiteFrame page="notes" language={language}>
      <section className="intro notes-intro" aria-labelledby="notes-title">
        <h1 id="notes-title">{title}</h1>
        <p className="notes-description">{description}</p>
      </section>
    </SiteFrame>
  );
}
