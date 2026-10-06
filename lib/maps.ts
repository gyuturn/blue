// 지도 서비스 바로가기 링크 생성
// 웹 검색 URL을 사용해 API 키 없이 동작하며, 모바일에서는 앱이 설치돼 있으면 앱으로 연결된다.

export type MapProvider = 'naver' | 'kakao';

export function getMapSearchUrl(provider: MapProvider, address: string): string | null {
  const query = address.trim();
  if (!query) return null;

  const encoded = encodeURIComponent(query);
  switch (provider) {
    case 'naver':
      return `https://map.naver.com/p/search/${encoded}`;
    case 'kakao':
      return `https://map.kakao.com/link/search/${encoded}`;
  }
}
