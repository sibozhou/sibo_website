import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sibozhou.github.io/sibo_website/"),
  title: "Sibo Zhou — Health Economics & Data Science",
  alternates: { canonical: "https://sibozhou.github.io/sibo_website/" },
  description:
    "Sibo Zhou is a predoctoral scholar and research statistician studying physician decision-making, patient outcomes, and health care data.",
  authors: [{ name: "Sibo Zhou" }],
  creator: "Sibo Zhou",
  openGraph: {
    title: "Sibo Zhou — Health Economics & Data Science",
    url: "https://sibozhou.github.io/sibo_website/",
    description:
      "Research on physician decision-making, patient outcomes, and health care data.",
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
