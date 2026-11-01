# #136 회원탈퇴 (약관 동의·계정 정보 삭제) 설계

## 목적
개인정보 처리방침의 "회원 탈퇴 시까지 보유"를 실제로 지킬 수 있게, 이용자가 서비스 안에서 탈퇴하고
보유 중인 개인정보를 지체 없이 파기할 수 있게 한다 (개인정보 보호법 제21·36·37조).

## 삭제 대상
| 위치 | 데이터 | 방법 |
|---|---|---|
| DB `subscription_scores` | 가점 계산 이력 | `DELETE WHERE user_id = :kakaoId` |
| DB `favorites` | 즐겨찾기 | `DELETE WHERE user_id = :kakaoId` |
| 쿠키 `blue_terms_agreed` | 약관·처리방침 동의 기록 | 응답에서 삭제 |
| 쿠키 `blue_session` 외 토큰 3종 | 세션·카카오 토큰 | 응답에서 삭제 |
| 카카오 | 앱 연결 | `POST https://kapi.kakao.com/v1/user/unlink` |
| 브라우저 localStorage | `blue_last_score_v1`, `blue_calc_draft_v2`, `blue_sync_dismissed_v1`, `blue_favorites`, `preferred_region` | 클라이언트에서 성공 응답 후 삭제 |

## API — `POST /api/auth/withdraw`
`/api/auth/*`는 middleware 토큰 갱신 대상에서 빠져 있으므로 라우트 안에서 직접 갱신한다.

1. 세션 쿠키 없음 → 401
2. **본인 확인**: `blue_session` 쿠키는 서명되지 않은 JSON이라 위조 가능하다. 그래서 DB 삭제 대상 ID는
   쿠키가 아니라 카카오 `/v2/user/me`가 돌려준 ID를 쓴다.
   - access token이 만료(임박)됐으면 refresh token으로 갱신
   - 카카오 ID ≠ 세션 ID → 403
   - 토큰 검증 불가(만료·무효) → 401 `reauth` (다시 로그인 후 탈퇴 안내)
   - 카카오 네트워크 오류 → 503
3. DB 삭제는 **트랜잭션**으로 두 테이블 함께. 실패하면 500, 쿠키는 건드리지 않는다 (반쯤 탈퇴 방지).
4. 카카오 unlink — 실패해도 우리 쪽 데이터는 이미 지웠으므로 탈퇴는 성공 처리하고 로그만 남긴다
   (`kakaoUnlinked: false`). 이용자는 카카오 계정 설정 → 연결된 서비스 관리에서 직접 끊을 수 있다.
5. 세션 쿠키 4종 + `blue_terms_agreed` 삭제 후 `{ ok: true, kakaoUnlinked }`.

순서를 DB 삭제 → unlink로 둔 이유: unlink를 먼저 하면 토큰이 무효화되어 DB 삭제 실패 시 재시도할 수 없다.

## 화면
- `app/withdraw/page.tsx` (서버) — 세션 없으면 `/`로 redirect, 있으면 `WithdrawForm` 렌더
- `components/auth/WithdrawForm.tsx` (클라이언트) — 삭제 항목 안내, 확인 체크, 탈퇴 버튼
- `UserProfileDropdown` — `회원탈퇴` 링크 추가
- 개인정보 처리방침 — 탈퇴 방법·파기 절차 문구 갱신

## 비고 / 후속
- DB 스키마 변경 없음 (마이그레이션 불필요)
- 서명되지 않은 `blue_session` 쿠키는 `/api/scores`, `/api/favorites`에도 같은 위조 위험이 있다 → 별도 이슈로 다룰 것 (세션 서명 또는 토큰 검증)
