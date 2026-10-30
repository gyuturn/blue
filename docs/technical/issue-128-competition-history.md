# #128 과거 경쟁률·당첨가점으로 본 내 가능성 — 기술 설계

## 목표
공고 상세에서 "같은 지역 최근 1년 민영 단지의 실제 당첨선"과 내 가점을 비교해
면적대별 당첨 가능성을 추정하고 제안을 보여준다. 마감 공고는 그 단지의 실제 결과도 보여준다.

## 데이터 소스 (공공데이터 15098905, `PUBLIC_DATA_API_KEY` 재사용 — 활용신청 별도 필요)
Base: `https://api.odcloud.kr/api/ApplyhomeInfoCmpetRtSvc/v1`

| 오퍼레이션 | 사용 필드 | 비고 |
|---|---|---|
| `getAPTLttotPblancCmpet` (경쟁률) | `HOUSE_TY`, `SUBSCRPT_RANK_CODE`, `RESIDE_SECD`/`RESIDE_SENM`, `SUPLY_HSHLDCO`, `REQ_CNT`, `CMPET_RATE` | 주택형×순위×거주지역 행. `CMPET_RATE`는 문자열: `"7.28"`, `"1,234.5"`, `"(△1)"`(미달), `"-"`(미산정) |
| `getAptLttotPblancScore` (당첨가점) | `HOUSE_TY`, `RESIDE_SECD`/`RESIDE_SENM`, `LWET_SCORE`, `AVRG_SCORE`, `TOP_SCORE` | `"0"` = 추첨·미달·미집계 → 제외 |

- 조회 조건: `cond[HOUSE_MANAGE_NO::EQ]` (공고별)
- 거주지역 필드는 구현마다 `RESIDE_SECD`(`01`=해당지역) / `RESIDE_SENM`(`해당지역`)로 달라 둘 다 인식
- **지역·기간 필터가 없다** → 분양정보 API(`getAPTLttotPblancDetail`)에서
  `cond[SUBSCRPT_AREA_CODE_NM::EQ]` + `cond[RCRIT_PBLANC_DE::GTE/LTE]`로 과거 공고를 먼저 찾는다.
  기간 조건이 거부되면 기간 조건 없이 다시 조회해 로컬에서 날짜로 거른다.

## 흐름
```
클라이언트(공고 상세) ─ GET /api/announcements/competition?houseManageNo=&region=서울
  ├ 이 공고 결과: 경쟁률 + 당첨가점 (병렬)
  └ 지역 이력: 분양정보 API (지역, 모집공고일 12개월 전 ~ 35일 전, 민영만)
      → 최신순 최대 15개 단지 × (경쟁률 + 당첨가점) 병렬 조회 (공고별 fetch 캐시 24h)
      → 면적대별 집계 → JSON (Cache-Control s-maxage=21600)
클라이언트: 내 가점으로 면적대별 판정 + 제안 문구 생성 (가점은 서버로 보내지 않는다)
```

## 순수 로직 (`lib/competitionHistory.ts`, 단위 테스트)
1. `parseCompetitionRate` / `parseWinningScore` — 문자열 정규화 (가점은 1~84만 유효)
2. `buildUnitResults` — 주택형별: 1순위 해당지역 경쟁률(없으면 1순위 아무 지역), 해당지역 당첨가점(없으면 기타지역)
3. 면적대: 전용 60㎡ 이하 / 60~85㎡ / 85㎡ 초과 (`parseUnitArea` 재사용)
4. `buildBucketStats` — 단지별·면적대별 대표값
   - 단지 최저 당첨가점 = 그 면적대 주택형들의 최저 당첨가점 중 최솟값 ("그 단지에서 가장 낮았던 당첨선")
   - 단지 경쟁률 = 1순위 해당지역 신청 합 ÷ 공급 합
   - 면적대 통계: 표본 단지 수, 최저 당첨가점 중앙값·최솟값·최댓값, 경쟁률 중앙값
5. `judgeChance(myScore, stats)` — 내 가점 ≥ 단지 최저 당첨가점인 단지 비율
   - 표본 < 3 → `unknown`(표본 부족)
   - ≥ 70% 가능성 높음 / ≥ 40% 도전해볼 만함 / > 0 쉽지 않음 / 0 가점제로는 어려움
   - 법정 기준 아님 → 참고용 문구 필수
6. `getChanceSuggestions` — 판정·특공 자격·면적대별 결과로 제안 문구 (85㎡ 초과 추첨 물량, 특별공급, 비규제지역 등)

## API 응답
```json
{ "enabled": true, "region": "서울", "months": 12, "complexCount": 12,
  "own": [{ "houseType": "084.9800A", "area": 84.98, "supply": 120, "requests": 3400,
            "rate": 28.3, "shortfall": null, "lowest": 64, "average": 68.2, "top": 79 }],
  "stats": [{ "bucket": "mid", "complexCount": 9, "lowestMedian": 62, "lowestMin": 45, "lowestMax": 72,
              "rateMedian": 18.4, "lowestScores": [45, 58, ...] }] }
```
- 키 없음·인증 실패(활용신청 전 401) → `{ enabled: false }` → 화면 숨김
- 입력 검증: `houseManageNo` 숫자 1~20자리, `region`은 `REGION_MAP` 단축명만

## 호출량
지역당 최대 1 + 30회, 공고별 결과는 바뀌지 않으므로 fetch 캐시 24h, 응답 CDN 캐시 6h.
지역 이력은 지역 단위로 같은 URL이라 같은 지역 공고끼리 캐시를 공유한다.

## 리스크
- 활용신청 미승인 시 섹션이 보이지 않음 (운영 키에 15098905 활용신청 필요)
- 국민주택은 가점제가 아님 → 판정 대신 안내, 지역 이력은 민영만 집계
- 최저 당첨가점은 가점제 물량 기준. 추첨제 당첨자는 반영되지 않음
- 단지 대표값이 '가장 낮았던 주택형'이라 판정은 낙관적인 편 → 문구에 "당첨권인 주택형이 있었어요"로 명시
- 개별 단지 조회가 일부 실패하면 응답을 짧게(5분)만 캐시
- 과거 단지와 입지·분양가가 달라 실제 당첨선과 차이가 클 수 있음 → "참고용" 명시
