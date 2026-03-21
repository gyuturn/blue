# Refresh Token 자동 갱신 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카카오 access_token 만료 시 Next.js Middleware에서 refresh_token으로 자동 갱신하여 사용자가 재로그인 없이 세션을 유지한다.

**Architecture:** 토큰 정보(access_token, refresh_token, expires_at)를 별도 httpOnly 쿠키로 저장. Middleware가 모든 페이지 요청 전에 expires_at을 확인하고, 만료 5분 전부터 갱신을 시도. 갱신 실패 시 세션 전체를 삭제해 로그아웃 처리.

**Tech Stack:** Next.js 16 App Router, TypeScript, Kakao OAuth2.0, Next.js Middleware (Edge Runtime), httpOnly cookies

**Spec:** `docs/superpowers/specs/2026-03-22-refresh-token-design.md`

---

## File Map

| 파일 | 역할 | 변경 |
|------|------|------|
| `types/auth.ts` | TokenData, KakaoTokenResponse 타입 | 수정 |
| `lib/auth/kakao.ts` | 카카오 API 유틸 | 수정 |
| `lib/auth/session.ts` | 세션/토큰 쿠키 관리 | 수정 |
| `app/api/auth/kakao/callback/route.ts` | 로그인 콜백, 토큰 저장 | 수정 |
| `app/api/auth/logout/route.ts` | 로그아웃 (clearSession 호출만) | 확인만 |
| `middleware.ts` | 만료 감지 + 자동 갱신 | 신규 |

---

## Task 1: 타입 정의 추가

**Files:**
- Modify: `types/auth.ts`

현재 `types/auth.ts` 내용:
```typescript
export interface KakaoUser { ... }
export interface SessionUser { id: string; nickname: string; profileImage: string; }
```

- [ ] **Step 1: `types/auth.ts`에 타입 추가**

기존 내용 아래에 다음을 추가한다:

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

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add types/auth.ts
git commit -m "feat: TokenData, KakaoTokenResponse 타입 추가"
```

---

## Task 2: `lib/auth/kakao.ts` 수정

**Files:**
- Modify: `lib/auth/kakao.ts`

**변경 사항:**
- `exchangeCodeForToken`: 반환 타입 `string` → `KakaoTokenResponse` (전체 응답 반환)
- `refreshAccessToken` 신규 추가

- [ ] **Step 1: `exchangeCodeForToken` 수정**

`lib/auth/kakao.ts`의 `exchangeCodeForToken` 함수를 아래로 교체한다:

```typescript
export async function exchangeCodeForToken(code: string): Promise<KakaoTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!,
    client_secret: process.env.KAKAO_CLIENT_SECRET!,
    redirect_uri: process.env.KAKAO_REDIRECT_URI!,
    code,
  });

  const res = await fetch(KAKAO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) throw new Error('카카오 토큰 교환 실패');
  return res.json() as Promise<KakaoTokenResponse>;
}
```

import 라인에 `KakaoTokenResponse` 추가:
```typescript
import type { KakaoUser, SessionUser, KakaoTokenResponse } from '@/types/auth';
```

- [ ] **Step 2: `refreshAccessToken` 추가**

파일 끝에 추가한다:

```typescript
export async function refreshAccessToken(refreshToken: string): Promise<KakaoTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!,
    client_secret: process.env.KAKAO_CLIENT_SECRET!,
    refresh_token: refreshToken,
  });

  const res = await fetch(KAKAO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) throw new Error('카카오 토큰 갱신 실패');
  return res.json() as Promise<KakaoTokenResponse>;
}
```

- [ ] **Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음. 단, `callback/route.ts`에서 `exchangeCodeForToken` 반환값이 `string`으로 사용되는 부분이 타입 에러로 나타남 — Task 4에서 수정할 예정.

- [ ] **Step 4: 커밋**

```bash
git add lib/auth/kakao.ts
git commit -m "feat: exchangeCodeForToken 전체 토큰 응답 반환, refreshAccessToken 추가"
```

---

## Task 3: `lib/auth/session.ts` 수정

**Files:**
- Modify: `lib/auth/session.ts`

**변경 사항:**
- `setSession(user, tokens)` — 토큰 쿠키 3개도 함께 저장
- `clearSession()` — 토큰 쿠키 3개도 함께 삭제

쿠키 상수:
```
blue_session       → 기존 유지
blue_access_token  → 신규
blue_refresh_token → 신규
blue_token_expires_at → 신규
```

- [ ] **Step 1: `lib/auth/session.ts` 전체 교체**

```typescript
import { cookies } from 'next/headers';
import type { SessionUser, TokenData } from '@/types/auth';

const SESSION_COOKIE = 'blue_session';
const ACCESS_TOKEN_COOKIE = 'blue_access_token';
const REFRESH_TOKEN_COOKIE = 'blue_refresh_token';
const EXPIRES_AT_COOKIE = 'blue_token_expires_at';

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7일

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function setSession(user: SessionUser, tokens: TokenData): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, JSON.stringify(user), {
    ...BASE_COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });

  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: Math.max(0, tokens.expiresAt - Math.floor(Date.now() / 1000)),
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE, // refresh_token_expires_in을 TokenData에 저장하지 않으므로 7일로 대체
  });

  cookieStore.set(EXPIRES_AT_COOKIE, String(tokens.expiresAt), {
    ...BASE_COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(EXPIRES_AT_COOKIE);
}
```

> **Note — 스펙과의 의도적 차이**: 스펙의 데이터 모델 표에서는 `blue_token_expires_at`의 maxAge를 `refresh_token_expires_in`으로 명시했지만, `TokenData`에 `refresh_token_expires_in`을 별도 필드로 저장하지 않아 직접 참조가 불가능하다. 따라서 `blue_refresh_token`과 `blue_token_expires_at` 모두 `SESSION_MAX_AGE`(7일)로 고정한다. 카카오의 실제 refresh_token 유효기간은 2개월이므로, 이 방식은 쿠키가 실제 토큰보다 먼저 만료되어 불필요한 재로그인이 발생할 수 있다. 그러나 7일마다 재로그인하는 것은 보안상 적절한 수준으로 판단해 이대로 진행한다.

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: `callback/route.ts`에서 `setSession(user)` → `setSession(user, tokens)` 호출부 타입 에러 표시 — Task 4에서 수정.

- [ ] **Step 3: 커밋**

```bash
git add lib/auth/session.ts
git commit -m "feat: setSession 토큰 쿠키 저장, clearSession 토큰 쿠키 삭제 포함"
```

---

## Task 4: `app/api/auth/kakao/callback/route.ts` 수정

**Files:**
- Modify: `app/api/auth/kakao/callback/route.ts`

`exchangeCodeForToken`이 이제 `KakaoTokenResponse`를 반환하므로, access_token 추출 방식과 `setSession` 호출을 업데이트한다.

- [ ] **Step 1: `callback/route.ts` 수정**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getKakaoUser } from '@/lib/auth/kakao';
import { setSession } from '@/lib/auth/session';
import type { TokenData } from '@/types/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?login=failed', request.url));
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const user = await getKakaoUser(tokenResponse.access_token);

    // 초기 authorization_code 교환에서 카카오는 항상 refresh_token을 반환한다.
    // 없다면 비정상 응답이므로 명시적으로 실패 처리한다.
    if (!tokenResponse.refresh_token) {
      throw new Error('카카오 초기 토큰에 refresh_token 없음');
    }

    const tokens: TokenData = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokenResponse.expires_in,
    };

    await setSession(user, tokens);
    return NextResponse.redirect(new URL('/', request.url));
  } catch {
    return NextResponse.redirect(new URL('/?login=failed', request.url));
  }
}
```

- [ ] **Step 2: 타입 체크 — 에러 없는지 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add app/api/auth/kakao/callback/route.ts
git commit -m "feat: 콜백에서 refresh_token, expires_at 포함 세션 저장"
```

---

## Task 5: `middleware.ts` 생성

**Files:**
- Create: `middleware.ts` (프로젝트 루트, `next.config.ts`와 같은 위치)

Middleware는 Edge Runtime에서 동작한다. `next/headers` 사용 불가 — 반드시 `request.cookies`와 `NextResponse`로 직접 쿠키 처리.

- [ ] **Step 1: `middleware.ts` 생성**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth/kakao';

const ACCESS_TOKEN_COOKIE = 'blue_access_token';
const REFRESH_TOKEN_COOKIE = 'blue_refresh_token';
const EXPIRES_AT_COOKIE = 'blue_token_expires_at';
const SESSION_COOKIE = 'blue_session';

const REFRESH_BUFFER_SECONDS = 5 * 60; // 5분 전부터 갱신 시도

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function clearAllCookies(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
  response.cookies.delete(EXPIRES_AT_COOKIE);
}

export async function middleware(request: NextRequest) {
  const expiresAtRaw = request.cookies.get(EXPIRES_AT_COOKIE)?.value;

  // 비로그인 상태 — 통과
  if (!expiresAtRaw) {
    return NextResponse.next();
  }

  const expiresAt = parseInt(expiresAtRaw, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);

  // 유효 (5분 이상 남음) — 통과
  if (expiresAt - nowSeconds > REFRESH_BUFFER_SECONDS) {
    return NextResponse.next();
  }

  // 만료 임박 or 만료 — 갱신 시도
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    const response = NextResponse.next();
    clearAllCookies(response);
    return response;
  }

  try {
    const tokenResponse = await refreshAccessToken(refreshToken);
    const newExpiresAt = nowSeconds + tokenResponse.expires_in;
    const response = NextResponse.next();

    response.cookies.set(ACCESS_TOKEN_COOKIE, tokenResponse.access_token, {
      ...BASE_COOKIE_OPTIONS,
      maxAge: tokenResponse.expires_in,
    });

    response.cookies.set(EXPIRES_AT_COOKIE, String(newExpiresAt), {
      ...BASE_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 7,
    });

    // 카카오가 새 refresh_token을 포함한 경우에만 갱신
    if (tokenResponse.refresh_token) {
      response.cookies.set(REFRESH_TOKEN_COOKIE, tokenResponse.refresh_token, {
        ...BASE_COOKIE_OPTIONS,
        maxAge: tokenResponse.refresh_token_expires_in ?? 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error) {
    const response = NextResponse.next();

    // 에러 분류 계약:
    // - TypeError: fetch() 자체의 네트워크 실패 (DNS 오류, 연결 거부 등)
    //   → 쿠키 변경 없이 통과 (카카오 서버 일시 장애로 서비스 중단 방지)
    // - Error('카카오 토큰 갱신 실패'): 카카오가 4xx 응답 반환 (토큰 무효/만료)
    //   → 세션 전체 삭제 (로그아웃)
    // 주의: refreshAccessToken 내부에서 Error 타입을 변경하면 이 분기 로직도 함께 수정해야 한다.
    if (error instanceof TypeError) {
      return response;
    }

    // 카카오 API 4xx 등 토큰 무효 — 로그아웃 처리
    clearAllCookies(response);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
```

- [ ] **Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add middleware.ts
git commit -m "feat: Middleware 기반 access_token 자동 갱신 구현"
```

---

## Task 6: 수동 통합 테스트

환경변수가 설정된 상태에서 실제 카카오 OAuth 플로우로 동작 확인.

- [ ] **Step 1: dev 서버 실행**

```bash
npm run dev
```

- [ ] **Step 2: 정상 로그인 + 토큰 쿠키 저장 확인**

1. `http://localhost:3001` 접속
2. "카카오로 로그인" 클릭 → 카카오 인증 → 콜백
3. 브라우저 DevTools → Application → Cookies에서 확인:
   - `blue_session` 존재
   - `blue_access_token` 존재
   - `blue_refresh_token` 존재
   - `blue_token_expires_at` 존재 (Unix timestamp 값)

- [ ] **Step 3: 만료 임박 시 자동 갱신 확인**

브라우저 DevTools → Application → Cookies에서 `blue_token_expires_at` 값을 현재 시각 + 3분으로 직접 수정 후 페이지 새로고침.

Expected: 새 `blue_access_token`과 갱신된 `blue_token_expires_at`으로 업데이트됨.

- [ ] **Step 4: 로그아웃 후 쿠키 전체 삭제 확인**

드롭다운 → "로그아웃" 클릭.

Expected: `blue_session`, `blue_access_token`, `blue_refresh_token`, `blue_token_expires_at` 모두 삭제됨.

- [ ] **Step 5: 최종 커밋 및 PR 업데이트**

```bash
git push origin feature/issue-22-kakao-login
```

PR #23에 "refresh_token 자동 갱신 구현 완료" 코멘트 추가.
