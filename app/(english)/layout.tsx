import type { Metadata } from "next";
import "../globals.css";
import { languageAlternates } from "../site-metadata";
import { SeasonalTheme } from "../seasonal-theme";

export const metadata: Metadata = {
  metadataBase: new URL("https://sibozhou.com/"),
  title: "Meet Sibo Zhou",
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
  alternates: languageAlternates("home", "en"),
  description:
    "Sibo Zhou is a predoctoral scholar and research statistician with interests in health economics, machine learning, and statistics.",
  authors: [{ name: "Sibo Zhou" }],
  creator: "Sibo Zhou",
  openGraph: {
    title: "Meet Sibo Zhou",
    url: "https://sibozhou.com/",
    description:
      "Sibo Zhou’s interests in health economics, machine learning, and statistics, informed by a background in mathematics, economics, and the humanities.",
    type: "profile",
    firstName: "Sibo",
    lastName: "Zhou",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><SeasonalTheme /></head>
      <body>{children}</body>
    </html>
  );
}
