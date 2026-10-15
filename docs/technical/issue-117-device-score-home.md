# 기기 저장 점수 사용자도 메인 = 공고목록 설계

**Issue:** [#117] 이 기기(localStorage)에 저장된 점수가 있어도 메인을 공고목록으로
**Date:** 2026-10-15
**Status:** Implemented
**선행:** [#111] `home-announcements-redirect-design.md` (로그인 + 계정 점수 → 서버 `redirect`)

## 1. 문제
#111은 서버가 볼 수 있는 계정 점수만 판정한다. 비로그인으로 계산해 **이 기기 localStorage(`blue_last_score_v1`)에만**
점수가 있는 사용자는 여전히 소개 화면을 본다. localStorage는 서버에서 읽을 수 없다.

## 2. 결정: 두 경로로 클라이언트 판정

| 진입 방식 | 처리 | 이유 |
|---|---|---|
| 문서 새로 받기 (주소 입력, 새로고침, PWA `start_url`) | 루트 레이아웃 `<head>` 인라인 스크립트가 `location.replace('/announcements')` | body 파싱 전에 실행 → 소개 화면 깜빡임 없음 |
| 앱 내 이동 (헤더 로고, 계산기 1단계 뒤로가기) | `/`의 `DeviceScoreRedirect`(client)가 `router.replace` | 레이아웃은 재렌더되지 않아 인라인 스크립트가 다시 돌지 않음 |
| 계정 점수 | 기존 서버 `redirect` 유지 (#111) | — |

| 대안 | 채택 | 이유 |
|---|---|---|
| localStorage 상태를 쿠키로 미러링 후 서버 `redirect` | ❌ | 저장/삭제 지점마다 동기화 필요, 어긋나면 소개 화면 접근 불가 |
| 클라이언트 `router.replace`만 | ❌ | 첫 진입 시 소개 화면이 그려졌다 사라짐 |
| `next/script beforeInteractive` | ❌ | 실행 시점이 첫 페인트 이전으로 보장되지 않음 |

인라인 스크립트를 페이지가 아닌 **루트 레이아웃**에 두는 이유: 레이아웃은 앱 내 이동 시 클라이언트에서 다시 그려지지 않으므로
React의 "클라이언트 렌더 script는 실행되지 않음" 경고가 생기지 않는다. 스크립트는 `pathname === '/'`일 때만 동작한다.

## 3. 판정 규칙 (`lib/home.ts`)
- `hasDeviceScore(raw)`: JSON 파싱 성공 && `v === 1` && `savedAt`이 number && `input`이 객체
- `deviceScoreRedirectScript(key)`: 같은 규칙의 인라인 JS 문자열 (localStorage 접근 예외는 무시하고 메인 표시)
- 두 구현이 어긋나지 않도록 `tests/home.test.ts`가 같은 케이스 표로 TS 함수와 스크립트(가짜 `localStorage`/`location`으로 실행)를 함께 검증

## 4. 공고목록 "홈으로" 버튼
메인이 공고목록인 사용자에게는 제자리 이동이 된다. `scoreData`가 있거나 `hasDeviceScore`면 숨긴다.
같은 판정 함수를 써서, 기기 기록 형태는 맞지만 입력값이 깨져 점수를 못 읽는 경우에도 루프가 생기지 않는다.

## 5. 트레이드오프
- 메인의 `LastScoreCard`(이 기기 점수 지우기, 기기 점수 → 계정 저장 제안)는 점수가 있는 사용자에게 보이지 않게 된다.
  공고목록은 기기/계정 중 최신 점수를 그대로 쓰고, 로그인 상태로 다시 계산하면 계정에 저장된다.
  기기 점수 삭제·계정 저장 제안을 공고목록으로 옮기는 것은 후속 과제.
