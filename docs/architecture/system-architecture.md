# 시스템 아키텍처 설계

## 개요

청약 매칭 가이드는 Next.js 14 App Router 기반의 풀스택 웹 애플리케이션으로, 사용자가 청약 자격 여부를 판정받고, 가점을 계산하며, 공공데이터 API를 통해 실시간 청약 공고를 확인할 수 있는 서비스입니다.

---

## 시스템 전체 아키텍처

```
┌────────────────────────────────────────────────────────────────────────┐
│                           Vercel Edge Network                          │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js 14 App (App Router)                   │  │
│  │                                                                  │  │
│  │  ┌──────────────────────┐    ┌──────────────────────────────┐  │  │
│  │  │   Server Components  │    │      Route Handlers (API)     │  │  │
│  │  │  (RSC - SSR/ISR)     │    │  /api/announcements          │  │  │
│  │  │                      │    │  /api/announcements/[id]      │  │  │
│  │  │  - 청약공고 목록 페이지  │    └────────────┬─────────────────┘  │  │
│  │  │  - 공고 상세 페이지    │                 │                      │  │
│  │  │  - 결과 리포트 페이지  │                 ▼                      │  │
│  │  └──────────────────────┘    ┌──────────────────────────────┐  │  │
│  │                              │    공공데이터포털 API           │  │  │
│  │  ┌──────────────────────┐    │  (한국부동산원 청약홈)          │  │  │
│  │  │   Client Components  │    └──────────────────────────────┘  │  │
│  │  │  (Interactive UI)    │                                       │  │
│  │  │                      │    ┌──────────────────────────────┐  │  │
│  │  │  - Step-by-Step 입력  │    │    Vercel KV (Edge Cache)    │  │  │
│  │  │  - 가점 계산 폼       │    │   (공고 데이터 캐싱)           │  │  │
│  │  │  - 결과 시각화        │    └──────────────────────────────┘  │  │
│  │  └──────────────────────┘                                       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 디렉토리 구조

```
blue/
├── app/                              # Next.js App Router 루트
│   ├── layout.tsx                    # 루트 레이아웃 (공통 헤더/푸터)
│   ├── page.tsx                      # 메인 랜딩 페이지
│   ├── eligibility/                  # 청약 자격 판정 플로우
│   │   ├── page.tsx                  # 자격 판정 Step-by-Step UI 진입점
│   │   └── result/
│   │       └── page.tsx              # 자격 판정 결과 페이지
│   ├── score/                        # 청약 가점 계산
│   │   ├── page.tsx                  # 가점 계산 입력 페이지
│   │   └── result/
│   │       └── page.tsx              # 가점 결과 리포트 페이지
│   ├── announcements/                # 청약 공고 목록/상세
│   │   ├── page.tsx                  # 공고 목록 페이지 (ISR)
│   │   └── [id]/
│   │       └── page.tsx              # 공고 상세 페이지 (ISR)
│   └── api/                          # Route Handlers
│       └── announcements/
│           ├── route.ts              # GET /api/announcements
│           └── [id]/
│               └── route.ts          # GET /api/announcements/[id]
│
├── components/                       # 재사용 가능한 UI 컴포넌트
│   ├── ui/                           # 공통 기반 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── ProgressBar.tsx
│   ├── eligibility/                  # 자격 판정 전용 컴포넌트
│   │   ├── StepIndicator.tsx
│   │   ├── StepForm.tsx
│   │   └── EligibilityResult.tsx
│   ├── score/                        # 가점 계산 전용 컴포넌트
│   │   ├── ScoreForm.tsx
│   │   ├── ScoreBreakdown.tsx
│   │   └── ScoreReport.tsx
│   ├── announcements/                # 공고 관련 컴포넌트
│   │   ├── AnnouncementCard.tsx
│   │   ├── AnnouncementFilter.tsx
│   │   └── AnnouncementDetail.tsx
│   └── common/                       # 법적 컴플라이언스 공통 컴포넌트
│       ├── Disclaimer.tsx
│       └── LegalNotice.tsx
│
├── lib/                              # 비즈니스 로직 및 유틸리티
│   ├── eligibility/
│   │   ├── calculator.ts             # 자격 판정 핵심 로직
│   │   └── rules.ts                  # 청약 자격 규칙 정의
│   ├── score/
│   │   ├── calculator.ts             # 가점 계산 핵심 로직
│   │   └── constants.ts              # 가점 상수 정의
│   ├── api/
│   │   ├── announcements.ts          # 공공데이터 API 클라이언트
│   │   └── transform.ts              # API 응답 데이터 변환
│   └── utils/
│       ├── date.ts                   # 날짜 계산 유틸리티
│       └── format.ts                 # 데이터 포매팅 유틸리티
│
├── types/                            # TypeScript 타입 정의
│   ├── eligibility.ts                # 자격 판정 관련 타입
│   ├── score.ts                      # 가점 계산 관련 타입
│   └── announcement.ts              # 공고 데이터 타입
│
├── hooks/                            # 커스텀 React Hooks
│   ├── useEligibilityForm.ts         # 자격 판정 폼 상태 관리
│   └── useScoreCalculator.ts         # 가점 계산 상태 관리
│
├── constants/                        # 애플리케이션 상수
│   ├── eligibility.ts
│   └── regions.ts                    # 지역 코드 상수
│
├── docs/                             # 기술 문서
│   ├── architecture/
│   │   ├── system-architecture.md   # (현재 파일)
│   │   └── api-design.md
│   └── technical/
│       └── tech-stack.md
│
├── public/                           # 정적 에셋
├── .env.local                        # 로컬 환경변수 (git ignore)
├── .env.example                      # 환경변수 예시
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 데이터 흐름도

### 1. 청약 자격 판정 플로우

```
사용자 입력
    │
    ▼
[Client Component: StepForm]
 - 혼인 상태, 자녀 수, 주택 보유 이력 등 입력
    │
    ▼ (로컬 상태 관리 - useEligibilityForm)
[lib/eligibility/calculator.ts]
 - 입력값 검증
 - 일반공급 / 특별공급(신혼부부, 생애최초, 다자녀) 자격 판정
    │
    ▼
[eligibility/result/page.tsx]
 - 자격 유형별 결과 렌더링
 - 맞춤형 공고 추천 링크 제공
```

### 2. 청약 가점 계산 플로우

```
사용자 입력
    │
    ▼
[Client Component: ScoreForm]
 - 무주택 기간, 부양가족 수, 청약통장 가입 기간 입력
    │
    ▼ (로컬 상태 관리 - useScoreCalculator)
[lib/score/calculator.ts]
 - 각 항목별 점수 계산 (최대 84점)
 - 구간별 점수 매핑
    │
    ▼
[score/result/page.tsx]
 - 항목별 점수 시각화 (ScoreBreakdown)
 - 전체 점수 및 경쟁력 분석 (ScoreReport)
```

### 3. 공고 조회 플로우

```
사용자 요청 (공고 목록/상세 페이지)
    │
    ▼
[Next.js ISR Cache 확인]
    │
    ├── Cache HIT ──────────────────────▶ 캐시된 HTML 즉시 반환
    │
    └── Cache MISS
           │
           ▼
[app/api/announcements/route.ts]
 - 공공데이터 API 호출
 - 응답 데이터 정제 및 변환
 - Next.js revalidate 설정 (3600초)
           │
           ▼
[공공데이터포털 API]
 - 한국부동산원 청약홈 분양공고 서비스
           │
           ▼
[응답 데이터 캐싱 및 페이지 렌더링]
```

---

## Vercel 배포 구성

### 배포 아키텍처

```
GitHub (main branch)
    │
    │  push / PR merge
    ▼
Vercel CI/CD Pipeline
    ├── Build: next build
    ├── Type Check: tsc --noEmit
    └── Deploy to Vercel Edge Network
           │
           ├── Edge Functions (Middleware)
           │   - 접근 제어, 지역 기반 라우팅
           │
           ├── Serverless Functions (Route Handlers)
           │   - /api/announcements
           │   - /api/announcements/[id]
           │
           └── Static Assets (CDN)
               - ISR 캐시된 페이지
               - 공통 UI 에셋
```

### 환경 변수 구성

| 변수명 | 용도 | 범위 |
|--------|------|------|
| `PUBLIC_DATA_API_KEY` | 공공데이터포털 API 인증 키 | Server Only |
| `NEXT_PUBLIC_APP_URL` | 앱 기본 URL | Client + Server |
| `REVALIDATE_TOKEN` | ISR 수동 재검증 토큰 | Server Only |

### 배포 환경 분리

| 환경 | 브랜치 | 용도 |
|------|--------|------|
| Production | `main` | 실 서비스 운영 |
| Preview | `feature/*`, PR | 기능 검토 및 QA |
| Development | 로컬 | 개발 및 테스트 |

### ISR 재검증 전략

```typescript
// app/announcements/page.tsx
export const revalidate = 3600; // 1시간마다 재검증

// 수동 재검증 (공고 데이터 갱신 시)
// POST /api/revalidate?token=REVALIDATE_TOKEN&path=/announcements
```

---

## 보안 고려사항

1. **API 키 보호**: 모든 공공데이터 API 호출은 서버 사이드(Route Handlers)에서만 수행. 클라이언트에 API 키 노출 없음.
2. **환경변수 분리**: `.env.local`은 `.gitignore`에 포함. Vercel 대시보드에서 환경변수 관리.
3. **Rate Limiting**: 공공데이터 API 호출 횟수 제한 대비 ISR 캐싱으로 API 호출 최소화.
4. **입력값 검증**: 서버 사이드 Route Handler에서 쿼리 파라미터 유효성 검증.

---

## 성능 최적화 전략

1. **ISR 활용**: 청약 공고 데이터는 1시간 단위 ISR로 캐싱하여 API 호출 최소화 및 페이지 로딩 성능 향상.
2. **React Server Components**: 데이터 조회가 필요한 페이지는 RSC로 구현하여 클라이언트 번들 크기 최소화.
3. **Code Splitting**: Next.js 자동 코드 분할로 초기 로딩 최적화.
4. **Image Optimization**: Next.js `<Image>` 컴포넌트를 통한 이미지 최적화.
