import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";

export const metadata: Metadata = {
  title: "성경 원어 연구소",
  description: "SBLGNT 헬라어 신약 성경을 공부하고 동역자들과 묵상을 나누는 공간입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#faf9f7]" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
