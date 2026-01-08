import type { Metadata } from "next";
import { Lora, Nunito_Sans } from "next/font/google";
import "./globals.css";

const display = Lora({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Nunito_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Just Tell Me What To Cook",
  description:
    "Snap your supplies or say them out loud, then get a few doable meals that match your energy.",
  applicationName: "Just Tell Me What To Cook",
  themeColor: "#faf8f4",
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
