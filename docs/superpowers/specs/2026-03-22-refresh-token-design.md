# Refresh Token 자동 갱신 설계

## 개요

카카오 로그인 후 발급된 access_token의 만료를 감지하고, Next.js Middleware에서 자동으로 refresh_token을 이용해 갱신하는 기능을 구현한다.

## 배경

현재 세션은 사용자 정보(id, nickname, profileImage)만 쿠키에 저장한다. access_token이 만료되면 세션 쿠키는 살아있지만 카카오 API 호출이 불가능하다. 사용자가 재로그인하지 않으면 세션이 유효하지 않은 상태로 유지된다.

## 데이터 모델

기존 `blue_session` 쿠키(사용자 정보)는 그대로 유지하고, 토큰 정보는 별도 httpOnly 쿠키로 분리한다.

| 쿠키명 | 내용 | maxAge | 비고 |
|--------|------|--------|------|
| `blue_session` | `{id, nickname, profileImage}` JSON | 7일 | 기존 유지 |
| `blue_access_token` | access_token 문자열 | `expires_in`(초) | 신규 |
| `blue_refresh_token` | refresh_token 문자열 | `refresh_token_expires_in`(초) | 신규 |
| `blue_token_expires_at` | 만료 Unix timestamp (초) | `refresh_token_expires_in`(초) | 신규 |

모두 `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`로 설정한다.

> **Note**: `blue_token_expires_at`도 `httpOnly: true`로 설정한다. 만료 시각을 클라이언트 JavaScript에서 읽어 UI 처리를 할 필요가 없으며, Middleware에서만 접근하면 충분하기 때문이다. Next.js Edge Middleware는 `request.cookies`로 httpOnly 쿠키도 정상적으로 읽을 수 있다. `maxAge`를 `refresh_token_expires_in`으로 설정하는 이유는 access_token 만료 시점에 쿠키가 사라지는 edge case를 방지하기 위해서다. 쿠키 내부에 저장된 `expiresAt` 타임스탬프가 실제 만료 판단의 근거이므로 더 긴 수명을 부여해도 보안 문제가 없다.

## 타입 정의

`types/auth.ts`에 `TokenData` 인터페이스를 추가한다:

```typescript
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (초)
}

export interface KakaoTokenResponse {
  access_token: string;
  refresh_token?: string;       // 카카오는 rotation 시에만 포함
  expires_in: number;
  refresh_token_expires_in?: number;
}
```

## 아키텍처

### Middleware 동작 흐름

```
요청 들어옴
  ↓
blue_token_expires_at 확인 (request.cookies로 직접 읽음)
  ├─ 쿠키 없음 (비로그인) → 그대로 통과
  ├─ 유효 (현재 시각 + 5분 이상 남음) → 그대로 통과
  └─ 만료 임박 or 만료
       ↓
       blue_refresh_token으로 카카오 갱신 API 호출
         ├─ 성공 → NextResponse에 새 쿠키 설정 (access_token, expires_at 필수 / refresh_token은 응답에 포함된 경우에만 갱신) → 통과
         └─ 실패 또는 네트워크 오류
              ├─ 토큰 만료/무효: 모든 세션/토큰 쿠키 삭제 → 통과 (로그아웃 처리)
              └─ 네트워크 오류: 쿠키 변경 없이 요청 그대로 통과 (서비스 중단 방지)
```

**중요**: Middleware는 `next/headers`를 사용할 수 없다. 쿠키 읽기는 `request.cookies`, 쓰기는 `NextResponse`를 통해 직접 처리한다. `lib/auth/session.ts`의 헬퍼 함수는 Middleware에서 호출하지 않는다.

### Middleware matcher 설정

```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
```

### 카카오 토큰 갱신 API

```
POST https://kauth.kakao.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
client_id={NEXT_PUBLIC_KAKAO_CLIENT_ID}
client_secret={KAKAO_CLIENT_SECRET}
refresh_token={저장된 refresh_token}
```

응답: `access_token`, `expires_in`, (선택적) `refresh_token`, `refresh_token_expires_in`
→ 응답에 `refresh_token`이 포함된 경우 `blue_refresh_token` 쿠키도 함께 갱신한다.

### 동시 요청 처리

토큰 만료 시점에 여러 요청이 동시에 들어오면 각각 독립적으로 refresh를 시도한다. 카카오의 refresh API는 동일한 refresh_token으로 중복 호출에도 유효한 응답을 반환하므로 현재 규모에서는 허용 가능한 동작이다. 향후 트래픽이 증가하면 별도 락 메커니즘을 고려한다.

## 변경 파일

### `types/auth.ts`
- `TokenData` 인터페이스 추가: `{ accessToken, refreshToken, expiresAt }`
- `KakaoTokenResponse` 인터페이스 추가: 토큰 교환/갱신 응답 타입

### `lib/auth/kakao.ts`
- `exchangeCodeForToken(code)` 반환 타입 변경: `string` → `KakaoTokenResponse`(전체 토큰 응답 반환)
- `refreshAccessToken(refreshToken)` 추가: 카카오 갱신 API 호출, `KakaoTokenResponse` 반환

### `lib/auth/session.ts`
- `setSession(user, tokens)` 수정: 토큰 쿠키도 함께 저장하도록 시그니처 변경
- `clearSession()` 수정: 토큰 쿠키(`blue_access_token`, `blue_refresh_token`, `blue_token_expires_at`)도 함께 삭제

### `app/api/auth/kakao/callback/route.ts`
- `exchangeCodeForToken` 응답에서 refresh_token, expires_in, refresh_token_expires_in도 저장
- `setSession(user, tokens)` 호출로 변경

### `middleware.ts` (신규)
- `config.matcher` 설정
- `request.cookies`로 `blue_token_expires_at` 읽어 만료 판단
- `refreshAccessToken()` 호출
- `NextResponse`로 직접 쿠키 업데이트

## 에러 처리

| 상황 | 처리 |
|------|------|
| refresh_token 만료/무효 | 모든 쿠키 삭제 → 요청 통과 (다음 인증 필요 페이지에서 재로그인 유도) |
| 카카오 API 4xx 에러 | 모든 쿠키 삭제 → 요청 통과 |
| 카카오 API 네트워크 오류 | 쿠키 변경 없이 요청 통과 (서비스 중단 방지) |

## 테스트 계획

- access_token 만료 임박(5분 이내) 상태에서 페이지 접근 시 자동 갱신 확인
- 갱신 후 새 access_token, expires_at 쿠키 업데이트 확인
- 카카오가 새 refresh_token을 응답에 포함한 경우 blue_refresh_token도 갱신 확인
- 잘못된 refresh_token 사용 시 모든 세션/토큰 쿠키 삭제 확인
- 카카오 API 네트워크 오류 시 쿠키 변경 없이 요청 통과 확인
- `/api/auth/*`, `/_next/static`, `/_next/image` 경로에서 Middleware 미적용 확인
- 로그아웃 시 토큰 쿠키 포함 전체 삭제 확인
