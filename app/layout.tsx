import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sibozhou.github.io/sibo_website/"),
  title: "Sibo Zhou — Health Economics & Statistics",
  alternates: { canonical: "https://sibozhou.github.io/sibo_website/" },
  description:
    "Sibo Zhou is a predoctoral scholar and research statistician with interests in health economics, machine learning, and statistics.",
  authors: [{ name: "Sibo Zhou" }],
  creator: "Sibo Zhou",
  openGraph: {
    title: "Sibo Zhou — Health Economics & Statistics",
    url: "https://sibozhou.github.io/sibo_website/",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
