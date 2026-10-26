import type { Metadata } from "next";
import "../globals.css";
import { languageAlternates } from "../site-metadata";

export const metadata: Metadata = {
  metadataBase: new URL("https://sibozhou.com/"),
  title: "周思博",
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
  description: "周思博的个人网站。",
  alternates: languageAlternates("home", "zh"),
  authors: [{ name: "Sibo Zhou" }],
  creator: "Sibo Zhou",
  openGraph: {
    title: "周思博",
    description: "周思博的个人网站。",
    url: "https://sibozhou.com/zh/",
    locale: "zh_CN",
    type: "profile",
    firstName: "Sibo",
    lastName: "Zhou",
  },
  robots: { index: true, follow: true },
};

export default function ChineseLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-Hans" suppressHydrationWarning><body>{children}</body></html>;
}
