# CI/CD 파이프라인 설계 문서

## 개요

이슈 #29에 따른 GitHub Actions 기반 CI/CD 파이프라인 설계입니다.
Next.js 16 / Node.js 20 / Docker 스택을 대상으로 합니다.

---

## 기술 스택 현황

| 항목 | 버전/도구 |
|------|----------|
| 프레임워크 | Next.js 16.1.6 (output: standalone) |
| 런타임 | Node.js 20 |
| 패키지 관리 | npm (package-lock.json) |
| 컨테이너 | Docker (multi-stage build: deps → builder → runner) |
| 오케스트레이션 | docker-compose |
| DB/Auth | Supabase (supabase-js, drizzle-orm) |
| 인증 | 카카오 OAuth |

---

## 아키텍처 결정사항 (ADR)

### ADR-1: Docker 레지스트리 — GitHub Container Registry (GHCR) 채택

**이유**
- GitHub 저장소와 동일한 인증 체계 (`GITHUB_TOKEN`) → 별도 Secrets 최소화
- 이미지가 저장소와 동일한 조직/사용자 아래 패키지로 관리
- Docker Hub 대비 private 이미지 무료 제공

**이미지 명**: `ghcr.io/<owner>/blue`

### ADR-2: 이미지 태그 전략

| 태그 | 값 | 목적 |
|------|----|------|
| `latest` | 항상 최신 main | 서버에서 `pull always` 기본 타깃 |
| `sha-<7자리>` | `github.sha` 앞 7자리 | 특정 커밋 버전 롤백 |

### ADR-3: Next.js standalone 빌드 시 환경변수 처리

Next.js의 `NEXT_PUBLIC_*` 변수는 **빌드 타임에 번들**에 내장됩니다.
따라서 CI/CD에서 `docker build` 시 `--build-arg`로 주입해야 합니다.

```
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=${{ secrets.NEXT_PUBLIC_SUPABASE_URL }} \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }} \
  ...
```

Dockerfile에서는 `ARG` 선언 후 `ENV`로 전환합니다.

> **주의**: `NEXT_PUBLIC_*` 변수는 클라이언트 번들에 노출됩니다. 서비스 롤 키 등 서버 전용 시크릿은 런타임 환경변수(docker-compose env_file)로만 주입해야 합니다.

---

## CI 파이프라인 설계 (`.github/workflows/ci.yml`)

### 트리거

```yaml
on:
  pull_request:
    branches: ["**"]
```

### 단계 정의

| 단계 | 작업 | 비고 |
|------|------|------|
| 1. 환경 셋업 | checkout, setup-node@v4 (Node 20) | |
| 2. 캐시 복원 | actions/cache (node_modules, key: package-lock.json 해시) | CI 시간 단축 |
| 3. 의존성 설치 | `npm ci` | 캐시 히트 시 스킵 가능 |
| 4. TypeScript 빌드 | `npm run build` | 빌드 실패 시 PR 차단 |
| 5. ESLint 린트 | `npm run lint` | 린트 실패 시 PR 차단 |
| 6. Docker 빌드 테스트 | `docker build .` (push 없음) | Dockerfile 유효성 확인 |

### 실패 시 동작

- 각 단계 실패 → GitHub PR 상태 체크 `❌` → 머지 차단
- 수정 커밋 push 시 워크플로우 자동 재실행

### Next.js 빌드 환경변수 처리 (CI)

CI 빌드 검증 단계에서 `NEXT_PUBLIC_*` 변수가 없으면 빌드가 실패할 수 있습니다.
GitHub Secrets에 등록된 값을 `--build-arg`로 전달합니다.
빌드 품질 검사(4단계)에서는 `secrets.*`를 env로 노출하여 처리합니다.

---

## CD 파이프라인 설계 (`.github/workflows/cd.yml`)

### 트리거

```yaml
on:
  push:
    branches: ["main"]
```

### 단계 정의

| 단계 | 작업 | 비고 |
|------|------|------|
| 1. 환경 셋업 | checkout, GHCR 로그인 | `GITHUB_TOKEN` 사용 |
| 2. 이미지 빌드 & 푸시 | `docker build + push` | `latest` + `sha-<7자리>` 태그 |
| 3. 서버 배포 | `appleboy/ssh-action` | SSH → `docker compose pull + up -d` |
| 4. 헬스 체크 | `curl -f http://localhost:3000` (서버 내) | 실패 시 알림 |

### 배포 서버 요구사항

- Docker, Docker Compose v2 설치
- GHCR 이미지 pull 권한 (서버에서 `docker login ghcr.io` 또는 SSH 액션에서 처리)
- `.env.local` 파일 서버에 사전 배치 (런타임 시크릿: Supabase 서비스 롤 키, 카카오 시크릿 등)

### docker-compose.yml 수정 필요사항

현재 `docker-compose.yml`은 `build: .`를 사용합니다.
CD에서는 이미 빌드된 이미지를 pull하므로 `image:` 필드로 교체해야 합니다.

```yaml
services:
  app:
    image: ghcr.io/<owner>/blue:latest  # build 대신 image 사용
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

---

## GitHub Repository Secrets 목록

| Secret 키 | 사용 단계 | 용도 |
|-----------|---------|------|
| `GITHUB_TOKEN` | CI/CD | GHCR 로그인 (자동 제공) |
| `SSH_HOST` | CD | 배포 서버 IP/도메인 |
| `SSH_USER` | CD | SSH 접속 사용자명 |
| `SSH_PRIVATE_KEY` | CD | SSH 개인키 |
| `NEXT_PUBLIC_SUPABASE_URL` | CI/CD (빌드 ARG) | Supabase URL (빌드 타임 번들) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | CI/CD (빌드 ARG) | Supabase 익명 키 (빌드 타임 번들) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 `.env.local` | 서비스 롤 키 (런타임 전용) |
| `KAKAO_CLIENT_ID` | 서버 `.env.local` | 카카오 OAuth ID (런타임 전용) |
| `KAKAO_CLIENT_SECRET` | 서버 `.env.local` | 카카오 OAuth 시크릿 (런타임 전용) |

> `SUPABASE_SERVICE_ROLE_KEY`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`은 서버 사이드 전용으로, Docker 이미지에 포함되어서는 안 됩니다. 배포 서버의 `.env.local`에만 존재해야 합니다.

---

## Dockerfile 수정 필요사항

현재 Dockerfile은 `ARG` 선언이 없어 `NEXT_PUBLIC_*` 빌드 인자를 받을 수 없습니다.
빌드 단계에 다음을 추가해야 합니다.

```dockerfile
# ---- builder ---- 단계에 추가
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 예상 워크플로우 파일 구조

```
.github/
└── workflows/
    ├── ci.yml   # PR 품질 검사
    └── cd.yml   # main 브랜치 자동 배포
```

---

## 미확정 항목 (팀 결정 필요)

| 항목 | 옵션 | 권장 |
|------|------|------|
| 배포 서버 환경 | AWS EC2 / GCP CE / 자체 서버 | 미정 |
| 알림 채널 | Slack / 이메일 / GitHub only | GitHub Actions 상태로 최소화 권장 |
| Branch Protection Rule | CI 통과 필수 설정 | 활성화 강력 권장 |
| PR 브랜치 린트 전략 | eslint strict / warn | 현재 `eslint` 설정 확인 후 결정 |

---

## 리스크 및 고려사항

1. **Next.js 빌드 타임 환경변수 노출**: `NEXT_PUBLIC_*` 값은 클라이언트 번들에 포함 → 민감 정보 절대 불가
2. **이미지 빌드 시간**: multi-stage Dockerfile + node_modules → 캐시 미스 시 5~10분 예상. `actions/cache`로 npm 캐시 활용 필요
3. **서버 다운타임**: `docker compose up -d`는 컨테이너 재시작 중 수초 다운타임 발생. 무중단이 필요하면 blue/green 또는 Nginx 앞단 구성 필요
4. **롤백 전략**: `sha-<7자리>` 태그로 특정 버전 지정 후 서버에서 `docker compose pull + up` 수동 실행

---

## 추정 복잡도

- CI 구현: **Low** (표준 패턴, 1~2시간)
- CD 구현: **Medium** (서버 환경 구성 및 Secrets 설정 필요, 2~4시간)
- Dockerfile ARG 수정: **Low** (30분 이내)
- 전체: **Medium**
