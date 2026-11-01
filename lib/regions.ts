export const ALL_REGION = '전체';

export const REGION_OPTIONS = [
  ALL_REGION,
  '서울특별시',
  '경기도',
  '인천광역시',
  '부산광역시',
  '대구광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
];

// 공고 화면은 전체 공고로 시작한다 (#113). 위치를 확인하면 내 시/도로 바꾼다 (#137)
export const INITIAL_REGION = ALL_REGION;

// 예전에 지역 선택을 저장하던 키. 남아 있는 값은 진입 시 지운다
export const LEGACY_REGION_KEY = 'preferred_region';

export function getRegionQuery(region: string): string {
  return region === ALL_REGION ? '' : `?region=${encodeURIComponent(region)}`;
}

// 카카오 등에서 받은 시/도 이름(정식·옛 명칭·약칭)을 지역 필터 값으로 맞춘다. 모르면 null.
const REGION_ALIASES: Record<string, string> = {
  서울: '서울특별시',
  경기: '경기도',
  인천: '인천광역시',
  부산: '부산광역시',
  대구: '대구광역시',
  광주: '광주광역시',
  대전: '대전광역시',
  울산: '울산광역시',
  세종: '세종특별자치시',
  강원: '강원특별자치도',
  강원도: '강원특별자치도',
  충북: '충청북도',
  충남: '충청남도',
  전북: '전북특별자치도',
  전라북도: '전북특별자치도',
  전남: '전라남도',
  경북: '경상북도',
  경남: '경상남도',
  제주: '제주특별자치도',
  제주도: '제주특별자치도',
};

export function toRegionOption(sido: string | null | undefined): string | null {
  const name = sido?.trim();
  if (!name || name === ALL_REGION) return null;
  if (REGION_OPTIONS.includes(name)) return name;
  return REGION_ALIASES[name] ?? null;
}
