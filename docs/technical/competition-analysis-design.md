# 공고별 경쟁 분석 설계 (#89)

## 문제
`getScoreTierLabel(tier)`가 공고와 무관하게 가점 등급만으로 "경쟁 어려울 수 있음"을 표시했다.
특별공급 여부는 상세 API에 없는 필드(`NWWDS_SUPLY_HSHLDCO` 등)를 읽어 항상 `false`였다.

## 데이터
| 출처 | 필드 | 용도 |
|------|------|------|
| `getAPTLttotPblancDetail` | `HOUSE_DTL_SECD_NM` | 민영(가점제) / 국민(납입횟수 순차제) |
| | `SPECLT_RDN_EARTH_AT`, `MDAT_TRGET_AREA_SECD` | 투기과열지구 / 조정대상지역 |
| | `PARCPRC_ULS_AT` | 분양가상한제 |
| `getAPTLttotPblancMdl` (공고별 병렬, 6시간 캐시) | `NWWDS_HSHLDCO`, `LFE_FRST_HSHLDCO`, `MNYCH_HSHLDCO`, `NWBB_HSHLDCO`, `YGMN_HSHLDCO`, `OLD_PARNTS_SUPORT_HSHLDCO`, `INSTT_RECOMEND_HSHLDCO`, `TRANSR_INSTT_ENFSN_HSHLDCO`, `ETC_HSHLDCO`, `SUPLY_HSHLDCO` | 특공 유형별·일반공급 세대수 합산 |

주택형별 API 조회 실패 시 `specialSupplyCounts`는 비워 두고 UI에서 칩을 숨긴다.

## 판단 로직 `getCompetitionAnalysis`
1. **신혼희망타운**: 신혼부부 자격 없으면 `신혼부부 전용 공고`, 있으면 `도전해볼 만함`
2. **국민주택**: 납입 횟수 120회↑ 쉬움 / 60회↑ 보통 / 그 외 어려움
3. **민영주택**: 난이도 = 등급(S0·A1·B2·C3)
   - 투기과열/조정 +1, 분양가상한제 +1, 비규제 & B·C등급 −1
   - ≤1 경쟁력 높음 / 2 도전해볼 만함 / ≥3 경쟁 어려울 수 있음
4. 공통: 일반공급 자격 미충족 시 해당 특공이 없으면 `신청 대상 아님`, 있으면 `도전해볼 만함`. 내 조건의 특공이 있으면 "어려움" → "도전해볼 만함"

규제 여부(`SPECLT_RDN_EARTH_AT`, `MDAT_TRGET_AREA_SECD`)가 Y/N이 아니면 `regulation`을 비워 두어 "비규제지역" 안내를 하지 않는다 (필드명 미검증 상태에서 잘못된 안내 방지).

각 단계에서 이유(`plus`/`minus`/`info`)를 쌓아 라벨과 함께 반환한다.
납입 횟수 기준(60·120회)은 법정 기준이 아닌 참고용 근사치다.

## UI
`components/announcements/CompetitionInsight.tsx`
- `SpecialSupplyChips`: 특공 유형별 세대수, 내 자격 유형 강조
- `CompetitionSummary`: 라벨 + 이유 (`maxReasons`로 카드에서는 2개만)
