import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '청약 매칭 가이드',
    short_name: '청약 가이드',
    description: '복잡한 청약 가점을 자동으로 계산하고, 내 상황에 맞는 청약 공고를 추천해 드립니다.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    lang: 'ko',
    categories: ['finance', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: '가점 계산하기',
        short_name: '가점 계산',
        description: '청약 가점을 바로 계산합니다',
        url: '/calculator',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
      },
      {
        name: '청약 공고 보기',
        short_name: '공고 보기',
        description: '최신 청약 공고를 확인합니다',
        url: '/announcements',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
      },
    ],
    screenshots: [
      {
        src: '/screenshots/screenshot-home.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: '홈 화면',
      },
      {
        src: '/screenshots/screenshot-calculator.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: '가점 계산기',
      },
    ],
  };
}
