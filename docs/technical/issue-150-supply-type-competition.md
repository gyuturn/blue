# #150 공급 유형별 경쟁률 — 기술 설계

## 문제
'과거 당첨선으로 본 내 가능성' 카드의 경쟁률은 **일반공급 1순위 해당지역** 값인데 화면에 기준이 없어
바로 위 특별공급 칩(신혼부부·생애최초…)의 경쟁률로 오해된다. 특별공급 경쟁률은 조회하지 않았다.

## 데이터 (`ApplyhomeInfoCmpetRtSvc/getAPTSpsplyReqstStus`, 같은 활용신청 15098905)
조건: `cond[HOUSE_MANAGE_NO::EQ]`. 주택형(`HOUSE_TY`) 행 단위.

| 유형 | 배정 세대수 | 접수 (해당지역 / 기타경기 / 기타지역) |
|---|---|---|
| 생애최초 | `LFE_FRST_HSHLDCO` | `CRSPAREA_/CTPRVN_/ETC_AREA_LFE_FRST_CNT` |
| 신혼부부 | `NWWDS_NMTW_HSHLDCO` | `…_NWWDS_NMTW_CNT` |
| 다자녀 | `MNYCH_HSHLDCO` | `…_MNYCH_CNT` |
| 신생아 | `NWBB_NWBBSHR_HSHLDCO` | `…_NWBB_NWBBSHR_CNT` |
| 청년 | `YGMN_HSHLDCO` | `…_YGMN_CNT` |
| 노부모부양 | `OLD_PARNTS_SUPORT_HSHLDCO` | `…_OPS_CNT` |
| 기관추천 | `INSTT_RECOMEND_HSHLDCO` | `INSTT_RECOMEND_DCSN_CNT` (예비자 `_PREPAR_CNT` 제외, 지역 구분 없음) |

필드명은 공공데이터포털 Swagger 정의 기준. 값은 숫자/문자열("1,000") 모두 허용(`num`).

## 로직 (`lib/competitionHistory.ts`, 순수 함수)
- `buildSpecialResults(rows)` → 유형별 `{ supply, requests(전체 접수), localRequests, rate, units[] }` (배정 > 0인 유형·주택형만)
- 특별공급 경쟁률 = 전체 접수 ÷ 배정 세대수 (접수 0 → `null`, 1 미만은 내림해 `미달` 표시)
- `buildSpecialStats(complexes)` → 유형별 단지 경쟁률 중앙값·최소·최대·단지 수 (배정·접수가 있는 단지만)
- `defaultSupplyTab(available, specialSupply)` → 내 자격(생애최초·신혼부부·다자녀) 중 데이터가 있는 첫 유형, 없으면 `general`

## API (`/api/announcements/competition`) 응답 추가 필드
```json
{ "special": [{ "type": "firstHome", "supply": 6, "requests": 1088, "localRequests": 1060, "rate": 181.3,
                "units": [{ "houseType": "084.9800A", "supply": 4, "requests": 88, "rate": 22 }] }],
  "specialComplexCount": 14,
  "specialStats": [{ "type": "firstHome", "complexCount": 12, "rateMedian": 14.2, "rateMin": 0.6, "rateMax": 210 }] }
```
- 이 공고 특공 조회는 별도 `Promise.allSettled` 항목 — 실패해도 일반공급 응답 유지. 특공 실패는 캐시 판단(`complete`)에서 제외해 특공 API 장애 시 5분 캐시로 호출이 몰리지 않게 한다
- 지역 이력: 단지별 일반공급 + 특공을 병렬 조회. 콜드 캐시 기준 공고 목록 1 + 단지 15×3 + 이 공고 3 ≈ 49회 (기존 ≈ 33회), 공고별 결과는 24h fetch 캐시
- 접수 0건(접수 전) 유형은 탭에서 제외, 기관추천은 경쟁률 대신 세대·추천 건수만 표시

## UI (`components/announcements/CompetitionHistory.tsx`)
- 상단 탭(가로 스크롤): `일반공급 | 생애최초 | 신혼부부 | …` — 데이터 있는 유형만, 내 자격 유형은 ✓·보라색
- 일반공급 탭: 기존 막대·판정·제안 + "경쟁률은 1순위 해당지역, 당첨선은 가점제 기준" 문구, 라벨 `1순위 경쟁률`
- 특별공급 탭: 가점 막대 없음. 선정 방식 한 줄, 이 단지 결과(세대·접수·해당지역 접수·경쟁률·주택형별), 지역 경쟁률 중앙값(범위)
- 이전 캐시 응답(`special` 없음)도 그대로 동작

## 리스크
- 실제 응답 필드가 Swagger와 다르면 특공 탭이 안 보일 뿐(일반공급 영향 없음)
- 지역 이력은 공고 시점 기준이라 특공 비율 제도 변경(신생아 신설 등) 전후 단지가 섞일 수 있음 → 참고용 문구
