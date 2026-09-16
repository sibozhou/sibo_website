import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sibo Zhou — Research",
  description:
    "Sibo Zhou is a predoctoral scholar and research statistician studying physician decision-making, patient outcomes, and health care data.",
  authors: [{ name: "Sibo Zhou" }],
  creator: "Sibo Zhou",
  openGraph: {
    title: "Sibo Zhou — Research",
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
