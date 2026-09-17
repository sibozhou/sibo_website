import type { Metadata } from "next";

export function languageAlternates(page: "home" | "research", language: "en" | "zh") {
  const path = page === "research" ? "research/" : "";
  const en = "https://sibozhou.com/" + path;
  const zh = "https://sibozhou.com/zh/" + path;
  return { canonical: language === "zh" ? zh : en, languages: { en, "zh-Hans": zh, "x-default": en } };
}

export function researchMetadata(language: "en" | "zh"): Metadata {
  const zh = language === "zh";
  const title = zh ? "研究 — 周思博" : "Research — Sibo Zhou";
  const description = zh
    ? "周思博的已发表论文与工作论文，涉及教育与健康及神经肿瘤学合作研究。"
    : "Publications and working papers by Sibo Zhou on health, education, and clinical outcomes.";
  const alternates = languageAlternates("research", language);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical, locale: zh ? "zh_CN" : "en_US" } };
}
