import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 榴莲挑选助手",
  description: "上传照片，获得榴莲购买建议。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
