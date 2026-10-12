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

// 공고 화면은 진입할 때마다 필터 없이 전체 공고로 시작한다 (#113)
export const INITIAL_REGION = ALL_REGION;

// 예전에 지역 선택을 저장하던 키. 남아 있는 값은 진입 시 지운다
export const LEGACY_REGION_KEY = 'preferred_region';

export function getRegionQuery(region: string): string {
  return region === ALL_REGION ? '' : `?region=${encodeURIComponent(region)}`;
}
