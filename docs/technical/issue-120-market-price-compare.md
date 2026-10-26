# #120 주변 아파트 실거래가 비교 — 기술 설계

## 목표
공고 상세의 주택형별 분양가 옆에 "주변 시세(실거래가 기반)"와 차이를 보여준다.

## 데이터 소스
- 국토교통부_아파트 매매 실거래가 상세 자료 (data.go.kr, XML)
  - `GET https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev`
  - 파라미터: `serviceKey`(인코딩 키 그대로 URL 삽입), `LAWD_CD`(시군구 5자리), `DEAL_YMD`(YYYYMM), `numOfRows`, `pageNo`
  - 사용 필드: `aptNm`, `umdNm`(법정동), `excluUseAr`(전용㎡), `dealAmount`(만원, 콤마), `buildYear`, `dealYear/Month/Day`, `cdealType`(값이 있으면 해제 거래 → 제외)
  - 개발계정 일일 트래픽 10,000건
- 인증키: `RTMS_API_KEY` → 없으면 `PUBLIC_DATA_API_KEY` (같은 data.go.kr 계정 키, 활용신청만 별도)

## 흐름
```
클라이언트(공고 상세) ─ GET /api/announcements/market-price?address=&region=&areas=84.98,59.99
  → 카카오 주소 검색(기존 geocodeAddress, 30일 캐시) → 좌표
  → 카카오 coord2regioncode(region_type=B) → 법정동코드 10자리 앞 5자리 = LAWD_CD, 동 이름
  → 최근 6개월 × RTMS 호출 (병렬, 월별 Next 데이터 캐시: 지난 달 24h / 이번 달 6h)
  → 주택형 면적별 비교군 선정 + 추정 시세 계산 → JSON
```

## 비교 로직 (`lib/marketPrice.ts`, 순수 함수 + 단위 테스트)
1. 해제 거래 제외, 전용면적 |거래면적 − 주택형면적| ≤ 5㎡
2. 비교군 단계(3건 이상인 첫 단계 사용)
   1. 같은 법정동 + 10년 이내 준공
   2. 같은 법정동
   3. 같은 시군구 + 10년 이내 준공
   4. 같은 시군구
3. 추정 시세 = (거래가/전용면적) 중위값 × 주택형 전용면적, 만원 단위 반올림
4. 3건 미만이면 `null` → "비교할 거래 부족"

## API 응답
```json
{ "enabled": true,
  "data": { "84.98": { "estimate": 85000, "count": 7, "dong": "홍파동", "newOnly": true, "months": 6 } | null } }
```
- 키 없음 → `{ enabled: false }` (화면 숨김)
- 주소→법정동 실패 → `{ enabled: true, data: {} }`
- 입력 검증: 주소 ≤ 200자, 면적 최대 10개(10~300㎡). 응답 `Cache-Control: s-maxage=21600`

## 리스크
- 신규 택지지구: 시군구 단계까지 내려가도 거래 부족 가능 → null 처리
- 최근 1개월은 신고 기한(30일) 때문에 덜 채워짐 → 6개월 범위로 완화
- 분양가(옵션·확장비 별도)와 실거래가는 기준이 다름 → "참고용" 문구
