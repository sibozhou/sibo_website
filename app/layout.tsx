import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sibozhou.github.io/sibo_website/"),
  title: "Sibo Zhou — Health Economics & Data Science",
  alternates: { canonical: "https://sibozhou.github.io/sibo_website/" },
  description:
    "Sibo Zhou studies how education shapes health knowledge, disease-related stigma, and health behaviors using natural experiments and causal inference.",
  authors: [{ name: "Sibo Zhou" }],
  creator: "Sibo Zhou",
  openGraph: {
    title: "Sibo Zhou — Health Economics & Data Science",
    url: "https://sibozhou.github.io/sibo_website/",
    description:
      "Research on education, health knowledge, stigma, and health behaviors using natural experiments and causal inference.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
