import type { Metadata } from "next";
import "../globals.css";
import { languageAlternates } from "../site-metadata";

export const metadata: Metadata = {
  metadataBase: new URL("https://sibozhou.com/"),
  title: "周思博 — 健康经济学、机器学习与统计学",
  description: "周思博的个人网站。研究兴趣涵盖健康经济学、机器学习与统计学。",
  alternates: languageAlternates("home", "zh"),
  authors: [{ name: "Sibo Zhou" }],
  creator: "Sibo Zhou",
  openGraph: {
    title: "周思博 — 健康经济学、机器学习与统计学",
    description: "以经济学与数据，理解人的行为与健康。",
    url: "https://sibozhou.com/zh/",
    locale: "zh_CN",
    type: "profile",
    firstName: "Sibo",
    lastName: "Zhou",
  },
  robots: { index: true, follow: true },
};

export default function ChineseLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-Hans"><body>{children}</body></html>;
}
