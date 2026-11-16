import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// 로그인·개인 결과 화면(agree, result, withdraw)은 검색 대상이 아니라서 넣지 않는다.
const PUBLIC_PATHS = ['/', '/calculator', '/announcements', '/guide', '/terms', '/privacy'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    changeFrequency: path === '/announcements' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
