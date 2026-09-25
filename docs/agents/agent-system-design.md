# Claude 에이전트/명령어 구성 설계

Blue의 `.claude/` 구성은 개인 프로젝트 [`gyuturn/stock`](https://github.com/gyuturn/stock)에서 검증된 구조를 이식한 것이다. stock에서는 원래 `.claude/agents/*.md`에 YAML frontmatter가 없어 실제 서브에이전트로 등록되지 않았고, `/pm`·`/cto`·`/feature`가 메인 모델 하나가 단일 컨텍스트에서 4개 역할을 역할극(role-play)하는 것에 불과했다(Blue도 최초 도입 당시 이와 동일한 구성이었고, 심지어 tech stack 표기가 Blue가 아닌 다른 프로젝트(Java/Spring/Vue) 값으로 잘못 채워져 있었다). 아래 원칙에 따라 재구성했다.

## 핵심 원칙: 에이전트 사용 결정 규칙

> **서브에이전트는 아래 4개 이점 중 1개 이상을 만족할 때만 쓴다. 아니면 인라인.**

| 이점 | 설명 | 예 |
|------|------|-----|
| 🔀 병렬성(fan-out) | 독립 작업을 동시에 → 벽시계 단축 | `lib/`·`app/api`·`app/*/page.tsx` 등 여러 영역 동시 영향분석 |
| 🔎 독립 검증 | fresh context가 작성자 맹점 포착 | 구현 후 코드 리뷰 |
| 🧯 컨텍스트 격리 | 대량 파일 읽고 결론만 반환 | 대규모 코드 조사 |
| 🔒 도구 스코핑 | read-only 등 권한 제한으로 안전 | 리뷰어가 코드 수정 불가 |

이 중 아무것도 해당 안 되면(단일 파일·대화형·순차 편집) **인라인이 더 빠르고 정확하며 저렴**하다.

## 구조

### 오케스트레이터 (인라인, playbook)
`pm` / `planner` / `cto` / `developer` — `.claude/commands/*.md`가 slash command 본체이고, `.claude/agents/*.md`는 동일 내용에 frontmatter와 Agent Use Policy를 더한 참조용 사본이다. 메인 루프가 인라인 수행하며 위임하지 않는다.

### 진짜 서브에이전트 (frontmatter + 위임)
| 에이전트 | 도구 | 이점 | 호출 지점 |
|----------|------|------|-----------|
| **code-reviewer** | Read/Grep/Glob/Bash (read-only) | 독립 검증 + 도구 스코핑 | Developer 구현 완료 후 push 전 |
| **impact-analyst** | Read/Grep/Glob/Bash (read-only) | 병렬 fan-out + 컨텍스트 격리 | CTO 설계 / Planner 기획 시 영향분석 |
| **deploy-checker** | Bash (read-only, 이슈 생성만 예외) | 독립 검증 + 도구 스코핑 | Developer PR 머지 후, 파이프라인 마지막 단계 |

## 파이프라인 배선

```
PM(인라인) → Planner(인라인, 필요시 impact-analyst 병렬)
   → CTO(인라인 설계, 영향분석은 impact-analyst 병렬 fan-out)
   → Developer(인라인 구현)
   → 🟢 code-reviewer 게이트(독립 검증, 🔴치명 수정 후 재검)
   → PR → CI(ci.yml) 통과 대기 → squash merge
   → 🟢 deploy-checker 게이트(배포 검증, 실패 시 이슈 자동 생성)
```

### 리뷰 게이트 상세
- Developer가 구현·로컬 검증(`npm run lint && npm run build`) 후 **push 전** `Task(subagent_type="code-reviewer")` 호출
- 리뷰어는 `git diff origin/main...HEAD`를 fresh context로 검증 → [🔴치명/🟡권고/⚪무시] 요약 반환
- 🔴치명 있으면 수정 후 재검, 통과 시 push→PR
- Blue 특성상 **청약 가점 계산 정확도·특별공급 자격 판정 회귀·표시(포맷) vs 계산 로직 분리**를 최우선 점검 (과거 #72/#73, #56에서 실제로 발생한 버그 유형)

### PR 머지 & 배포 검증 상세
- PR 생성 후 **CI(`ci.yml`) 통과를 폴링으로 대기**한 뒤에만 squash merge (CI 실패 시 머지하지 않고 PR 오픈 상태로 원인 보고)
- 머지 커밋 SHA로 `Task(subagent_type="deploy-checker")` 호출 → `cd.yml`(Deploy to Vercel) run 완료까지 폴링
- 배포 성공 시 결과만 보고, **배포 실패 시 실패 job 로그를 근거로 GitHub 이슈를 자동 생성**(`deploy-failure` 라벨)
- 머지 성공 ≠ 배포 성공(env 동기화 실패·빌드 실패로 `cd.yml`이 별도로 실패 가능)이라는 점이 이 게이트의 존재 이유

## 남은 정리 (도입 시점 기준)
- 존재하지 않던 `dashboard.sh` 신규 작성 (`/dashboard`가 참조하는 스크립트가 저장소에 없었음)
- `settings.json`: 실제 Blue 스택(Next.js/Tailwind/Supabase/Drizzle/Kakao/Vercel)으로 정정, orchestrators/subagents 구분 표기
- 테스트 러너 미도입 상태를 명시 — 계산 로직 변경 시 code-reviewer 게이트에서 수동 검증 근거로 대체, 필요 시 별도 이슈로 테스트 프레임워크 도입 제안

## 기대 효과
"에이전트 = 프롬프트 템플릿"에서 → **이점이 검증된 지점에만 진짜 서브에이전트가 뜨는 구조**로. 리뷰 게이트로 가점 계산 회귀를 push 전에 잡고, 영향분석 병렬화로 설계 근거를 빠르게 확보한다. 나머지는 인라인이라 토큰·속도 낭비가 없다.
