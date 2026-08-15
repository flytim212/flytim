import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Nav from "@/components/nav";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "flytim · 内容工作台",
    template: "%s · flytim",
  },
  description: "单人内容创作工作台：选题、写稿、发布排期、数据回收",
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}
      >
        <Nav />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
