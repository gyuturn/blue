# Issue #104 기술 설계: 청약통장 가입기간 직접 입력

## 배경

- 청약 가점의 통장 점수는 **가입기간** 기준이다 (주택공급에 관한 규칙 별표1). 납입 횟수는 가점과 무관하며 1순위 요건(수도권 12회, 투기과열지구 등 24회) 판정에 쓰인다.
- 토스 등 은행 앱은 가입기간을 "10년 1개월"처럼 보여주지만, 앱은 가입 시작월만 받았다.
- 납입 횟수 힌트("약 2년 10개월 동안 냈어요")가 가입기간처럼 읽혀 혼동을 일으켰다.
- 가입기간·무주택기간 점수 공식 자체는 #82(#86)에서 법령 기준으로 이미 수정됨.

## 설계

### 데이터 모델
- `EligibilityInput.subscriptionStartDate`(YYYY-MM)를 단일 소스로 유지 → 저장/API 변경 없음.
- "N년 M개월" 입력은 UI에서 `startDateFromMonths()`로 시작월로 변환해 저장.

### `lib/calculator.ts`
| 함수 | 설명 |
|---|---|
| `getSubscriptionMonths(startDate, now?)` | 시작월 → 경과 개월 수 (달력 월). 잘못된 값이면 `null` |
| `startDateFromMonths(months, now?)` | 경과 개월 수 → 시작월(YYYY-MM) |
| `formatMonthsAsPeriod(months)` | "10년 1개월" 형식 문자열 |
| `calculateSubscriptionScore` | `getSubscriptionMonths` 재사용 (동작 동일) |

### UI
- 계산기 통장 단계: 가입기간(년/개월) 입력 + 가입 시작월 입력 양방향 동기화, "가입 N년 M개월 → N점" 표시.
- 납입 횟수 힌트를 1순위 납입 횟수 요건 충족 여부로 변경.
- 결과 페이지: "YYYY년 M월에 가입 (가입 N년 M개월)".

### 테스트
- Node 내장 테스트 러너 + `--experimental-strip-types` 로 `tests/calculator.test.ts` 실행 (`npm test`). 추가 의존성 없음.
- `tests/`는 Next 타입체크 대상에서 제외(`.ts` 확장자 import 때문).
