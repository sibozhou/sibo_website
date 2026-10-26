import type { Metadata } from "next";
import "../globals.css";
import { languageAlternates } from "../site-metadata";

export const metadata: Metadata = {
  metadataBase: new URL("https://sibozhou.com/"),
  title: "Sibo Zhou",
  icons: { icon: { url: "/favicon.svg", type: "image/svg+xml" } },
  alternates: languageAlternates("home", "en"),
  description: "Sibo Zhou’s personal website.",
  authors: [{ name: "Sibo Zhou" }],
  creator: "Sibo Zhou",
  openGraph: {
    title: "Sibo Zhou",
    url: "https://sibozhou.com/",
    description: "Sibo Zhou’s personal website.",
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
      <body>{children}</body>
    </html>
  );
}
