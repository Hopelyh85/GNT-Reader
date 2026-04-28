import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";

export const metadata: Metadata = {
  title: "K-GNT 말씀 나눔 | 헬라어 신약 성경 연구",
  description: "SBLGNT 헬라어 신약 성경 원문 연구와 동역자들의 묵상을 나누는 공간입니다. 구절별 사역 노트와 커뮤니티 피드를 통해 깊은 성경 연구를 함께하세요.",
  keywords: ["헬라어", "신약성경", "SBLGNT", "성경원어", "묵상", "K-GNT", "그리스어"],
  authors: [{ name: "K-GNT 말씀 나눔" }],
  openGraph: {
    title: "K-GNT 말씀 나눔",
    description: "헬라어 신약 성경 원문 연구와 동역자들의 묵상을 나누는 공간",
    type: "website",
    locale: "ko_KR",
    siteName: "K-GNT 말씀 나눔",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "K-GNT 말씀 나눔",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "K-GNT 말씀 나눔",
    description: "헬라어 신약 성경 원문 연구와 동역자들의 묵상을 나누는 공간",
    images: ["/og-image.png"],
  },
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
