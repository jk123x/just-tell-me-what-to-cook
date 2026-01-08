import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Just Tell Me What To Cook",
  description:
    "Snap your supplies or say them out loud, then get a few doable meals that match your energy.",
  applicationName: "Just Tell Me What To Cook",
  themeColor: "#f7f3ea",
  appleWebApp: {
    capable: true,
    title: "Just Tell Me What To Cook",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
