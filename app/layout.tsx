import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "@/components/layout/Header";

const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: '청약 매칭 가이드',
    template: '%s | 청약 매칭 가이드',
  },
  description: '복잡한 청약 가점을 자동으로 계산하고, 내 상황에 맞는 청약 공고를 추천해 드립니다.',
  keywords: ['청약', '청약 가점', '청약 계산기', '특별공급', '청약 공고', '무주택'],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '청약 가이드',
    startupImage: '/apple-touch-icon.png',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${pretendard.variable} font-sans antialiased`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
