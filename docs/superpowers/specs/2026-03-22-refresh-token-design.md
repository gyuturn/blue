# Refresh Token 자동 갱신 설계

## 개요

카카오 로그인 후 발급된 access_token의 만료를 감지하고, Next.js Middleware에서 자동으로 refresh_token을 이용해 갱신하는 기능을 구현한다.

## 배경

현재 세션은 사용자 정보(id, nickname, profileImage)만 쿠키에 저장한다. access_token이 만료되면 세션 쿠키는 살아있지만 카카오 API 호출이 불가능하다. 사용자가 재로그인하지 않으면 세션이 유효하지 않은 상태로 유지된다.

## 데이터 모델

기존 `blue_session` 쿠키(사용자 정보)는 그대로 유지하고, 토큰 정보는 별도 httpOnly 쿠키로 분리한다.

| 쿠키명 | 내용 | 비고 |
|--------|------|------|
| `blue_session` | `{id, nickname, profileImage}` JSON | 기존 유지 |
| `blue_access_token` | access_token 문자열 | 신규 |
| `blue_refresh_token` | refresh_token 문자열 | 신규 |
| `blue_token_expires_at` | 만료 Unix timestamp (초) | 신규 |

모두 `httpOnly: true`, `sameSite: 'lax'`로 설정한다.

## 아키텍처

### Middleware 동작 흐름

```
요청 들어옴
  ↓
blue_token_expires_at 확인
  ├─ 쿠키 없음 (비로그인) → 그대로 통과
  ├─ 유효 (현재 시각 + 5분 이상 남음) → 그대로 통과
  └─ 만료 임박 or 만료
       ↓
       blue_refresh_token으로 카카오 갱신 API 호출
         ├─ 성공 → 새 access_token / expires_at 쿠키 업데이트 → 통과
         └─ 실패 → 모든 세션/토큰 쿠키 삭제 → 통과 (로그아웃 처리)
```

Middleware는 `/api/auth/*` 경로는 제외하고 적용한다.

### 카카오 토큰 갱신 API

```
POST https://kauth.kakao.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
client_id={KAKAO_CLIENT_ID}
client_secret={KAKAO_CLIENT_SECRET}
refresh_token={저장된 refresh_token}
```

응답: `access_token`, `expires_in`, (선택적) `refresh_token`, `refresh_token_expires_in`

## 변경 파일

### `lib/auth/session.ts`
- `setTokens(tokens)` 추가 — access_token, refresh_token, expires_at 쿠키 저장
- `getTokens()` 추가 — 토큰 쿠키 조회
- `clearSession()` 수정 — 토큰 쿠키도 함께 삭제

### `lib/auth/kakao.ts`
- `refreshAccessToken(refreshToken)` 추가 — 카카오 토큰 갱신 API 호출, 새 토큰 반환

### `app/api/auth/kakao/callback/route.ts`
- 토큰 교환 후 access_token뿐 아니라 refresh_token, expires_in도 저장

### `app/api/auth/logout/route.ts`
- `clearSession()` 호출 시 토큰 쿠키도 함께 삭제 (session.ts 수정으로 자동 처리)

### `middleware.ts` (신규)
- `config.matcher`에서 `/api/auth/*` 제외
- `blue_token_expires_at` 읽어 만료 여부 판단 (5분 버퍼)
- 만료 시 `refreshAccessToken()` 호출
- 성공 시 응답에 새 쿠키 설정
- 실패 시 모든 세션/토큰 쿠키 삭제

## 에러 처리

- refresh_token 만료 또는 카카오 API 오류 → 모든 쿠키 삭제 → 사용자는 로그인 페이지에서 재인증
- Middleware에서 네트워크 오류 발생 시 → 에러를 삼키고 요청 그대로 통과 (서비스 중단 방지)

## 테스트 계획

- access_token 만료 임박(5분 이내) 상태에서 페이지 접근 시 자동 갱신 확인
- refresh_token으로 새 access_token 발급 후 쿠키 업데이트 확인
- 잘못된 refresh_token 사용 시 로그아웃 처리 확인
- `/api/auth/*` 경로는 Middleware 제외 확인
- 로그아웃 시 토큰 쿠키 포함 전체 삭제 확인
