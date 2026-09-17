import type { Metadata } from "next";
import { type Language } from "./languages";

export function languageAlternates(page: "home" | "research", language: Language) {
  const path = page === "research" ? "research/" : "";
  const en = "https://sibozhou.com/" + path;
  const zh = "https://sibozhou.com/zh/" + path;
  const traditional = "https://sibozhou.com/zh-hant/" + path;
  return { canonical: language === "zh-hant" ? traditional : language === "zh" ? zh : en, languages: { en, "zh-Hans": zh, "zh-Hant": traditional, "x-default": en } };
}

export function researchMetadata(language: Language): Metadata {
  const zh = language !== "en";
  const title = zh ? "研究 — 周思博" : "Research — Sibo Zhou";
  const description = language === "zh-hant"
    ? "周思博的已發表論文與工作論文，涵蓋教育與健康，以及神經腫瘤學合作研究。"
    : zh
    ? "周思博的已发表论文与工作论文，涉及教育与健康及神经肿瘤学合作研究。"
    : "Publications and working papers by Sibo Zhou on health, education, and clinical outcomes.";
  const alternates = languageAlternates("research", language);
  return { title, description, alternates, openGraph: { title, description, url: alternates.canonical, locale: language === "zh-hant" ? "zh_TW" : zh ? "zh_CN" : "en_US" } };
}
