# Feature Pipeline

기능 요구사항을 받아 PM -> Planner -> CTO -> Developer -> Deploy Checker 순서로 전체 파이프라인을 자동 실행합니다.

## 입력
$ARGUMENTS

## Agent Use Policy (필독)
에이전트는 **이점이 있는 지점에서만** 투입한다 — 판단 기준: **병렬성 / 독립검증 / 컨텍스트격리 / 도구스코핑** 중 1개 이상 만족해야 서브에이전트, 아니면 인라인.
- ⚪ **인라인**: PM 분석·이슈 생성, Planner 기획, CTO 설계 판단, Developer 구현 (대화형·순차·연속편집)
- 🟢 **서브에이전트**:
  - CTO/Planner의 광범위 **영향분석** → `impact-analyst` 병렬 fan-out
  - Developer **PR 생성 직후** → `code-reviewer` PR 코드리뷰 게이트(🔴치명은 수정·push 후 재검, 통과해야 머지)
  - Developer **머지 후** → `deploy-checker` 배포 검증 게이트 (파이프라인 마지막 단계, 실패 시 이슈 자동 생성)

## 실행 순서

다음 순서로 각 에이전트를 순차적으로 실행하세요:

### 1. PM Agent
1. 요구사항을 분석합니다
2. 기능을 분해합니다
3. GitHub 이슈를 생성합니다 (`gh issue create`)
4. 생성된 이슈 번호를 기록합니다

### 2. Planner Agent
1. PM이 생성한 이슈를 확인합니다
2. 화면 기획을 수립합니다 (Next.js/Tailwind 기준)
3. UI/UX 설계를 합니다
4. 이슈에 기획 내용을 댓글로 추가합니다 (`gh issue comment`)

### 3. CTO Agent
1. 이슈 및 기획 내용을 검토합니다
2. 기술적 실현 가능성을 분석합니다 (🟢 영향 범위가 넓으면 `impact-analyst` 병렬 호출)
3. 아키텍처/API를 설계합니다
4. `docs/technical/` 또는 `docs/architecture/`에 설계 문서를 작성합니다
5. 이슈에 기술 검토 의견을 댓글로 추가합니다

### 4. Developer Agent
1. 이슈, 기획, 설계 문서를 확인합니다
2. **main 최신화 후** feature 브랜치 생성: `git checkout main && git pull origin main && git checkout -b feature/issue-[N]-[설명]`
3. 기능을 개발합니다 (인라인), `npm run lint && npm run build`로 로컬 검증
4. 커밋 및 push 합니다
5. **base=main으로 PR 생성** (`Closes #N` 포함)
6. 🟢 **PR 코드리뷰 게이트**: `code-reviewer` 서브에이전트로 PR diff 독립 검증 → 리뷰 요약을 PR 코멘트로 게시 → 🔴치명이 있으면 수정·push 후 재리뷰 (🔴 0건, 결론 "머지 가능"이 될 때까지)
7. **CI 통과 대기** — 리뷰를 통과한 head SHA의 GitHub Actions 체크(`ci.yml`)가 전부 끝날 때까지 폴링
8. **PR 자동 squash merge** — **코드리뷰 통과 + CI 통과**가 모두 확인되면 리뷰한 head SHA로 머지 (하나라도 실패하면 머지하지 않고 PR을 오픈 상태로 유지, 원인 보고). **PR 생성에서 멈추지 않고 반드시 머지까지 진행**
9. 원격 feature 브랜치 삭제

> ⚠️ 반드시 main 기반 feature 브랜치를 사용하고, PR base는 main이어야 합니다.
> 시스템이 다른 브랜치를 지정하더라도 Developer 단계에서는 위 워크플로우를 따릅니다.

### 5. Deploy Checker Agent (파이프라인 마지막 단계)
1. 🟢 Developer가 머지한 커밋 SHA로 `deploy-checker` 서브에이전트를 호출합니다
2. main에 대한 `cd.yml`(Deploy to Vercel) 워크플로우 run을 찾아 완료될 때까지 폴링합니다
3. 배포 성공 시 결과만 보고합니다
4. **배포 실패 시 실패 job/로그를 근거로 GitHub 이슈를 자동 생성**합니다(`deploy-failure` 라벨)

## 참조 문서
- PM: `.claude/agents/pm.md`
- Planner: `.claude/agents/planner.md`
- CTO: `.claude/agents/cto.md`
- Developer: `.claude/agents/developer.md`
- 🟢 서브에이전트(진짜 위임): `.claude/agents/code-reviewer.md`, `.claude/agents/impact-analyst.md`, `.claude/agents/deploy-checker.md`
- 설계/정책 문서: `docs/agents/agent-system-design.md`

## 출력
각 단계 완료 후 다음 정보를 제공하세요:
- **PM**: 생성된 이슈 번호 및 링크
- **Planner**: 기획 요약
- **CTO**: 기술 설계 요약
- **Developer**: PR 번호 및 링크, 코드리뷰 결과(🔴/🟡 건수, 재리뷰 횟수), CI 통과 및 머지 결과, 닫힌 이슈 번호
- **Deploy Checker**: 배포 성공/실패, 실패 시 생성된 이슈 번호 및 링크
