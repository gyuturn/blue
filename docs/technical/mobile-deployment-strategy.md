# 모바일 앱 배포 전략 (Android / iOS)

> 관련 이슈: #59

---

## 현재 상태 분석

| 항목 | 현재 설정 | 모바일 배포 시 필요한 변경 |
|------|----------|--------------------------|
| `next.config.ts` | `output: "standalone"` | `output: "export"` 로 변경 필요 |
| API Routes | `app/api/` (4개: announcements, auth, favorites, scores) | 제거 후 클라이언트 직접 호출로 대체 |
| 인증 | Kakao OAuth (서버 사이드 세션) | 클라이언트 사이드 인증으로 전환 필요 |
| DB | Supabase + Drizzle ORM (서버에서 호출) | Supabase 클라이언트 SDK 직접 사용 |

---

## 배포 방식 비교

### Option A — PWA (Progressive Web App)

**적합성: 낮음**

- 홈 화면에 설치 가능하지만 앱스토어 배포 불가
- iOS에서 푸시 알림 불가, 기기 API 제한적
- API Routes 유지 가능 (서버 필요)
- 코드 변경 최소 (manifest.json + service worker 추가)

**장점:** 빠른 구현 (1~2일), 코드 변경 없음
**단점:** 앱스토어 배포 불가, iOS 기능 제한

---

### Option B — Capacitor (권장)

**적합성: 높음**

Ionic의 Capacitor는 기존 웹 앱을 WebView로 감싸 네이티브 앱으로 빌드한다.
App Router + Static Export와 호환되며, 앱스토어 정식 배포 가능.

**흐름:**
```
Next.js Build (output: export) → out/ 폴더
  → Capacitor Sync → iOS 프로젝트 (Xcode)
                   → Android 프로젝트 (Android Studio)
  → 앱스토어 배포
```

**장점:** 앱스토어 배포 가능, 기기 API 접근, 기존 코드 최대 재사용
**단점:** API Routes 제거 필요, 빌드 환경 구성 필요 (Xcode 등)

---

## 권장 방향: Capacitor + Static Export

### 핵심 제약사항

`output: "export"` 전환 시 아래 기능이 동작하지 않는다:

| 기능 | 현재 | 정적 export 시 |
|------|------|----------------|
| `app/api/announcements` | ✅ | ❌ (API 라우트 불가) |
| `app/api/auth` (Kakao OAuth) | ✅ | ❌ (서버 세션 불가) |
| `app/api/favorites` | ✅ | ❌ |
| `app/api/scores` | ✅ | ❌ |

### API Routes 대체 방안

| 현재 API | 대체 방안 |
|----------|----------|
| `/api/announcements` | 한국부동산원 API 직접 클라이언트 호출 또는 Supabase Edge Function |
| `/api/auth/kakao` | Supabase Auth (Kakao provider 지원) 또는 Kakao JS SDK |
| `/api/favorites` | Supabase 클라이언트 SDK 직접 호출 |
| `/api/scores` | Supabase 클라이언트 SDK 직접 호출 |

### 인증 전환 방안

현재 Kakao OAuth는 서버 사이드 세션 기반. 두 가지 옵션:

**옵션 1 — Supabase Auth + Kakao Provider**
- Supabase에서 Kakao OAuth provider 설정
- `@supabase/supabase-js` 클라이언트에서 `signInWithOAuth({ provider: 'kakao' })` 호출
- 세션은 Supabase JWT로 관리 (클라이언트 저장)

**옵션 2 — Kakao JavaScript SDK**
- 카카오 JS SDK를 직접 사용
- 토큰을 클라이언트에 저장 후 Supabase에 custom JWT로 연동

→ **Supabase Auth + Kakao Provider 권장** (관리 편의성)

---

## 구현 로드맵

### Phase 1: 사전 검증 (1주)
- [ ] `output: "export"` 로 전환 후 빌드 오류 목록 파악
- [ ] API Routes 중 Supabase 직접 호출 가능 여부 확인 (favorites, scores)
- [ ] Kakao OAuth → Supabase Auth 전환 PoC

### Phase 2: API 마이그레이션 (1~2주)
- [ ] `app/api/favorites` → `@supabase/supabase-js` 직접 호출
- [ ] `app/api/scores` → Supabase 직접 호출
- [ ] `app/api/announcements` → 외부 API 직접 호출 or Supabase Edge Function
- [ ] `app/api/auth` → Supabase Auth + Kakao provider

### Phase 3: Capacitor 통합 (1주)
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "청약매칭가이드" "com.blue.cheongyak"
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```
- `next.config.ts` 수정:
  ```ts
  const nextConfig = {
    output: "export",
    images: { unoptimized: true },
  };
  ```
- `npx cap sync` 로 정적 빌드 동기화

### Phase 4: 앱스토어 배포 준비 (1~2주)
- [ ] 앱 아이콘 / 스플래시 스크린 제작
- [ ] iOS: Apple Developer Program ($99/년) 가입 + Xcode 빌드
- [ ] Android: Google Play Console ($25 일회성) 가입 + Android Studio 빌드
- [ ] 앱 심사 제출

---

## 예상 일정

| 단계 | 기간 |
|------|------|
| Phase 1: 사전 검증 | 1주 |
| Phase 2: API 마이그레이션 | 1~2주 |
| Phase 3: Capacitor 통합 | 1주 |
| Phase 4: 앱스토어 배포 | 1~2주 |
| **총 합계** | **4~6주** |

---

## 빠른 시작: PWA (단기 옵션)

앱스토어 배포가 급하지 않고 모바일 사용성을 빠르게 개선하고 싶다면 PWA를 먼저 적용 가능.

**구현 소요: 1~2일**

1. `app/manifest.ts` 추가
2. `public/` 에 앱 아이콘 추가
3. `app/layout.tsx` 에 메타데이터 추가
4. (선택) `Serwist` 라이브러리로 서비스 워커 추가

PWA 적용 후 → Capacitor 마이그레이션 순서로 진행하는 것도 가능.

---

## 참고

- [Capacitor 공식 문서](https://capacitorjs.com/)
- [Next.js Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- [Supabase Auth - Kakao Provider](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Next.js PWA (Serwist)](https://serwist.pages.dev/)
