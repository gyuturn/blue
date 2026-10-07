// 공급위치 주소 → 좌표 변환 (카카오 Local API, 서버 전용)

export interface LatLng {
  lat: number;
  lng: number;
}

const CACHE_SECONDS = 60 * 60 * 24 * 30; // 같은 주소는 30일간 Next 데이터 캐시 재사용
const REQUEST_TIMEOUT_MS = 3000;

// 시/도 정식 명칭 → 카카오 주소 표기(약칭)
const SIDO_SHORT: Record<string, string> = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 광주광역시: '광주',
  대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종', 경기도: '경기', 강원도: '강원',
  강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남', 전라북도: '전북', 전북특별자치도: '전북',
  전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주',
};

// 공고 지역(정식 명칭 또는 약칭)과 카카오 주소의 시/도가 같은지 확인한다.
export function isSameSido(region: string, kakaoAddress: string): boolean {
  const toShort = (s: string) => SIDO_SHORT[s] ?? s;
  const target = toShort(region.trim());
  const actual = toShort(kakaoAddress.trim().split(/\s+/)[0] ?? '');
  return !target || target === actual;
}

// 키 오류·쿼터 초과는 다른 검색어로 재시도해도 실패하므로 전체를 중단한다.
class KakaoAuthError extends Error {}

// 청약홈 공급위치는 "○○동 일원 (○○지구 B-1블록)"처럼 검색이 안 되는 표기가 많아
// 원문 → 괄호 제거 → "일원"/"외 N필지" 이후 제거 순으로 검색어 후보를 만든다.
export function buildGeocodeQueries(address: string): string[] {
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  const original = normalize(address);
  const noParens = normalize(original.replace(/\([^)]*\)|\[[^\]]*\]/g, ' '));
  const trimmed = normalize(noParens.replace(/\s+(일원|일대|외\s*\d+\s*필지)(\s.*)?$/, ''));

  return [...new Set([original, noParens, trimmed])].filter(Boolean);
}

export function getKakaoRestKey(): string | undefined {
  return process.env.KAKAO_REST_API_KEY || process.env.KAKAO_CLIENT_ID || undefined;
}

interface KakaoLocalDocument {
  x: string; // 경도
  y: string; // 위도
  address_name?: string;
}

async function searchKakao(
  kind: 'address' | 'keyword',
  query: string,
  restKey: string,
  region?: string,
): Promise<LatLng | null> {
  const url = `https://dapi.kakao.com/v2/local/search/${kind}.json?query=${encodeURIComponent(query)}&size=1`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${restKey}` },
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      throw new KakaoAuthError(`kakao local ${res.status}`);
    }
    if (!res.ok) {
      console.warn(`[geocode] ${kind} ${res.status} for "${query}"`);
      return null;
    }
    const json = (await res.json()) as { documents?: KakaoLocalDocument[] };
    const doc = json.documents?.[0];
    if (!doc) return null;
    // 키워드 검색은 전국에서 찾으므로 다른 시/도의 같은 이름 장소는 버린다
    if (region && doc.address_name && !isSameSido(region, doc.address_name)) return null;
    const lat = Number(doc.y);
    const lng = Number(doc.x);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch (error) {
    if (error instanceof KakaoAuthError) throw error;
    console.warn('[geocode] request failed', error);
    return null;
  }
}

export async function geocodeAddress(address: string, restKey: string, region?: string): Promise<LatLng | null> {
  const queries = buildGeocodeQueries(address);
  for (const query of queries) {
    const found = await searchKakao('address', query, restKey);
    if (found) return found;
  }
  // 주소 검색이 모두 실패하면 가장 짧은 후보로 키워드(장소) 검색
  const last = queries[queries.length - 1];
  return last ? searchKakao('keyword', last, restKey, region) : null;
}

// 공고 여러 건을 동시 요청 수를 제한해 변환한다.
export async function geocodeMany<T extends { id: string; address?: string; region?: string }>(
  items: T[],
  restKey: string,
  concurrency = 5,
): Promise<Record<string, LatLng>> {
  const result: Record<string, LatLng> = {};
  const targets = items.filter((item) => item.address);
  try {
    for (let i = 0; i < targets.length; i += concurrency) {
      const chunk = targets.slice(i, i + concurrency);
      const coords = await Promise.all(chunk.map((item) => geocodeAddress(item.address!, restKey, item.region)));
      chunk.forEach((item, idx) => {
        const c = coords[idx];
        if (c) result[item.id] = c;
      });
    }
  } catch (error) {
    if (!(error instanceof KakaoAuthError)) throw error;
    console.error('[geocode] 카카오 키 오류 또는 쿼터 초과로 중단:', error.message);
  }
  return result;
}
