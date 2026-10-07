# 로그인 없이 청약 점수 기억하기 (Guest Score Persistence)

**Issue:** [#79] 로그인 없이도 내 청약 점수 기억하기
**Date:** 2026-09-27
**Status:** Implemented

---

## 1. 결정

로그인은 **필수 → 선택**. 계산 결과는 로그인 여부와 관계없이 브라우저 `localStorage`에 저장하고, 카카오 로그인은 "다른 기기에서도 보기" 용도로만 남긴다. 서버/DB 스키마 변경 없음.

## 2. 저장 스키마

| 키 | 값 | 쓰는 곳 | 지우는 곳 |
|---|---|---|---|
| `blue_last_score_v1` | `{ v: 1, input: EligibilityInput, savedAt: number }` | `/result` 진입 시 | 홈 카드 "지우기" |
| `blue_calc_draft_v2` | `{ v: 1, input, step, savedAt }` | 계산기 입력/단계 변경 시 | 결과 진입, "처음부터" |

- **입력값만 저장하고 점수는 읽을 때 다시 계산**한다 (`toStoredScoreData`). 가점 규칙이 바뀌면(#82) 저장된 기록도 자동으로 새 규칙을 따른다. 입력 시점에 계산돼 저장되는 `homelessYears`도 `refreshInput`으로 오늘 기준 재계산한다(통장·혼인 기간과 같은 기준).
- 파싱 시 `EligibilityInput`의 모든 필드 타입을 검사(`isEligibilityInput`)하고, 하나라도 다르면 "기록 없음"으로 처리한다.
- 스키마나 단계 구성이 바뀌면 키 버전을 올린다. #78에서 계산기가 6단계가 되어 draft 키를 `_v2`로 올렸다(v1 draft는 무시).

## 3. 구성

```
hooks/useLocalStorage.ts   useSyncExternalStore 기반 구독 훅 (#81)
                           - 서버 스냅샷 null → hydration mismatch 없음
                           - storage 이벤트로 탭 간 동기화
                           - 저장소 예외(사파리 개인정보 보호 모드 등)는 null/무시
lib/scoreStorage.ts        키, 파싱/검증, 직렬화, 결과 URL 생성
components/home/LastScoreCard.tsx  홈 "내 마지막 청약 가점" 카드 (client)
```

## 4. 흐름

- **결과 페이지**: `?from=saved`가 아니고 입력값이 스키마 검증을 통과하면 draft 삭제 + 마지막 점수 저장. 로그인 사용자의 `POST /api/scores`도 `from=saved`일 때는 건너뛴다(다시 볼 때마다 DB 행이 쌓이던 문제 방지). 필드가 빠진 예전 링크는 보여주기만 하고 저장하지 않는다.
- **홈**: 서버 컴포넌트가 로그인 사용자의 최신 DB 기록을 `{ input, savedAt }`로 내려주고, 카드는 이 기기 기록과 비교해 **더 최근 것**을 보여준다. 날짜는 `Asia/Seoul`로 고정해 서버(UTC)와 브라우저의 hydration 불일치를 막는다. "지우기"는 이 기기 기록과 같은 탭의 `sessionStorage` 캐시를 함께 지운다.
- **로그인 후 동기화**: 결과 화면의 "다른 기기에서도 보기"를 누른 경우에만(`sessionStorage` 플래그, 10분 후 만료) 로그인 후 홈에서 이 기기 기록을 계정에 올린다. 공용 기기에서 다른 사람의 기록이 내 계정으로 올라가지 않도록 자동 업로드는 하지 않는다.
- **계산기**: draft가 있으면 "이어서 하기 / 처음부터" 배너. 사용자가 고르거나 입력을 시작하기 전에는 draft를 덮어쓰지 않는다. 초기 상태(1단계, 기본값)는 저장하지 않는다.
- **공고 목록/상세**: 같은 탭 `sessionStorage` 캐시가 있으면 사용, 없으면 이 기기 기록과 (로그인 시) DB 기록 중 더 최근 것.

## 5. 보안/개인정보

- 저장 값에 이름·연락처·주민번호 등 식별정보 없음 (생년월, 지역, 가족 수, 통장 정보 수준).
- 공용 PC 대비 홈 카드에 "지우기" 제공.

## 6. 알려진 한계

- 공고 상세(`/announcements/[id]`)는 서버 조회 없이 `sessionStorage` → 이 기기 기록 순으로만 읽는다(목록에서 들어오므로 보통 목록이 채운 캐시를 쓴다).
- 브라우저 데이터 삭제 시 기록도 사라진다(로그인 사용자는 서버 기록 유지).
