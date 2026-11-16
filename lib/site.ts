/**
 * 서비스 대표 주소. 도메인이 바뀌면 Vercel 환경변수 NEXT_PUBLIC_SITE_URL만 바꾸면 된다.
 * robots.txt, sitemap.xml, 메타데이터(OG 링크 등)의 절대 주소 기준으로 쓴다.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cheongyak.kro.kr').replace(/\/+$/, '');
