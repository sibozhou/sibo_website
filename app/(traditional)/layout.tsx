import type { Metadata } from "next";
import "../globals.css";
import { languageAlternates } from "../site-metadata";

export const metadata: Metadata = {
  metadataBase: new URL("https://sibozhou.com/"),
  title: "認識周思博",
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
  description: "周思博的個人網站。研究興趣涵蓋健康經濟學、機器學習與統計學。",
  alternates: languageAlternates("home", "zh-hant"),
  authors: [{ name: "Sibo Zhou" }],
  creator: "Sibo Zhou",
  openGraph: {
    title: "認識周思博",
    description: "以經濟學與資料，理解人的行為與健康。",
    url: "https://sibozhou.com/zh-hant/",
    locale: "zh_TW",
    type: "profile",
    firstName: "Sibo",
    lastName: "Zhou",
  },
  robots: { index: true, follow: true },
};

export default function TraditionalLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-Hant" suppressHydrationWarning><body>{children}</body></html>;
}
