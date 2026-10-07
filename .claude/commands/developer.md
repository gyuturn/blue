# Developer

CTO의 설계와 PM의 요구사항, 기획자의 기획을 바탕으로 실제 개발을 수행합니다.

## 입력
이슈 번호: $ARGUMENTS

## Agent Use Policy
⚪ 구현(2~4)은 **인라인** — 연속 편집은 인라인이 빠르고 정확.
🟢 6번 **PR 코드리뷰 게이트는 서브에이전트 필수** — PR 생성 직후 `code-reviewer`를 호출해 PR diff를 fresh context로 독립 검증(작성자 맹점 포착). 결과는 PR 코멘트로 남기고, 🔴치명 지적은 수정·push 후 재검.
🟢 8번 **머지는 "코드리뷰 통과 + CI 통과" 두 조건이 모두 충족될 때만 자동 수행** — 파이프라인은 PR 생성에서 멈추지 않고 머지까지 진행한다.
🟢 10번 **배포 검증도 서브에이전트 필수** — 머지 후 `deploy-checker`를 호출해 실제 배포(`cd.yml`, Vercel) 성공 여부를 확인. 실패 시 이슈 자동 생성까지 담당.

## 수행 작업

1. **이슈 확인**: `gh issue view [이슈번호]`로 요구사항, 기획, 설계 확인
2. **브랜치 생성**: main 최신화 후 이슈 기반 feature 브랜치 생성
3. **기능 개발**: 요구사항에 맞는 기능 구현
4. **검증**: `npm run lint && npm run build`. 테스트 러너는 아직 없으므로, 가점 계산 등 회귀 위험이 큰 로직은 구체적 입력값으로 수동 검증한 근거를 남긴다
5. **push 및 PR 생성**: base=main, PR body에 `Closes #N` 포함
6. **🟢 PR 코드리뷰 게이트**: `code-reviewer` 서브에이전트 호출(`Task(subagent_type="code-reviewer", input=PR번호)`) → [치명/권고/무시] 요약 수신 → 요약을 PR 코멘트로 게시 → 🔴치명이 있으면 수정 커밋·push 후 재리뷰 (🔴 0건, 결론 "머지 가능"이 될 때까지 반복)
7. **CI 통과 대기**: 리뷰를 통과한 최신 head SHA 기준으로 CI(`ci.yml`) 체크가 모두 끝날 때까지 폴링
8. **PR 자동 squash merge**: 6(코드리뷰 통과)과 7(CI 통과)이 **모두** 충족되면 리뷰한 head SHA를 고정해 squash merge. 하나라도 미충족이면 머지하지 않고 PR을 오픈 상태로 두고 원인 보고
9. **원격 feature 브랜치 삭제**
10. **🟢 배포 검증**: `deploy-checker` 서브에이전트 호출(`Task(subagent_type="deploy-checker", input=머지커밋SHA)`) → 배포 성공/실패 확인, 실패 시 이슈 자동 생성

## Tech Stack
- **Frontend**: Next.js 16 (App Router, TypeScript), Tailwind CSS v4
- **Backend**: Next.js API Routes (`app/api/*`)
- **Database**: Supabase (PostgreSQL) + Drizzle ORM
- **인증**: Kakao OAuth
- **배포**: Vercel (GitHub Actions CD, `cd.yml`)

## Branch Naming Convention
- Feature: `feature/issue-[번호]-[설명]`
- Bugfix: `bugfix/issue-[번호]-[설명]`
- Hotfix: `hotfix/issue-[번호]-[설명]`

## Git Workflow (반드시 이 순서대로)

```bash
# 1. main 최신화 후 feature 브랜치 생성
git checkout main
git pull origin main
git checkout -b feature/issue-[번호]-[설명]

# 2. 개발 진행 및 커밋
git add [파일들]
git commit -m "[#이슈번호] feat: 설명"

# 3. 로컬 검증 (push 전 반드시)
npm run lint
npm run build

# 4. 원격 push
git push -u origin feature/issue-[번호]-[설명]

# 5. PR 생성 (base=main, Closes #N 포함)
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
PR_NUMBER=$(gh api repos/$REPO/pulls \
  --method POST \
  --field title="[#이슈번호] PR 제목" \
  --field head="feature/issue-[번호]-[설명]" \
  --field base="main" \
  --field body="Closes #[이슈번호]" \
  --jq '.number')
echo "PR #$PR_NUMBER 생성됨"

# 6. 🟢 PR 코드리뷰 게이트 — code-reviewer 서브에이전트로 PR diff 독립 검증
#    Task(subagent_type="code-reviewer", input=PR_NUMBER) 호출 → 요약 수신
#    리뷰 요약을 PR 코멘트로 게시:
gh pr comment "$PR_NUMBER" --repo "$REPO" --body-file review.md
#    🔴치명이 있으면: 수정 → 로컬 검증(3) → 커밋·push → 다시 6번 (🔴 0건이 될 때까지)
#    결론이 "가능"이 되면 리뷰한 head SHA를 기록 (이 SHA만 머지한다)
REVIEWED_SHA=$(gh api repos/$REPO/pulls/$PR_NUMBER --jq '.head.sha')

# 7. CI 통과 대기 (최대 15분, 30초 간격 폴링) — 리뷰한 SHA 기준
CI_OK=false
for i in $(seq 1 30); do
  RUNS=$(gh api repos/$REPO/commits/$REVIEWED_SHA/check-runs --jq \
    '.check_runs[] | .status + ":" + (.conclusion // "null")')
  # 체크가 아직 생성 전(빈 결과)이거나 진행 중이면 대기
  if [ -z "$RUNS" ] || echo "$RUNS" | grep -qvE '^completed:'; then
    sleep 30; continue
  fi
  if echo "$RUNS" | grep -vE ':(success|neutral|skipped)$' | grep -q .; then
    echo "CI 실패 — 자동 머지 중단, PR은 오픈 상태로 유지"; exit 1
  fi
  CI_OK=true; echo "CI 전체 통과 확인"; break
done
[ "$CI_OK" = true ] || { echo "CI 대기 시간 초과 — 자동 머지 중단, PR은 오픈 상태로 유지"; exit 1; }

# 8. PR 자동 squash merge (코드리뷰 통과 + CI 통과 확인 후에만)
#    sha를 고정해, 리뷰 이후 새 커밋이 올라왔다면 머지가 거부되도록 한다 (→ 6번부터 다시)
gh api repos/$REPO/pulls/$PR_NUMBER/merge \
  --method PUT \
  --field merge_method="squash" \
  --field sha="$REVIEWED_SHA" \
  --field commit_title="[#이슈번호] PR 제목 (#$PR_NUMBER)"
MERGE_SHA=$(gh api repos/$REPO/pulls/$PR_NUMBER --jq '.merge_commit_sha')

# 9. 원격 feature 브랜치 삭제
git push origin --delete feature/issue-[번호]-[설명]

# 10. 🟢 배포 검증 — deploy-checker 서브에이전트 호출 (MERGE_SHA 전달)
#     Task(subagent_type="deploy-checker", input=MERGE_SHA)
#     → 배포 실패 시 deploy-checker가 GitHub 이슈까지 자동 생성
```

> **머지 조건 = 코드리뷰 통과(🔴 0건) AND CI 통과.** 어느 하나라도 실패하면 머지하지 않는다. PR을 오픈 상태로 두고 남은 🔴치명 또는 실패한 체크 이름과 원인을 보고한다(수정 후 재푸시 → 6번부터 다시).
> 리뷰 이후 새 커밋이 push되면 이전 리뷰는 무효다. 반드시 새 head SHA로 6번(리뷰)부터 다시 수행한 뒤 머지한다.
> 머지 API가 충돌(merge conflict) 등으로 실패하면 main을 PR 브랜치에 merge해 해결 → 검증 → push → 6번부터 다시.
> `gh` CLI가 없는 환경(Claude Code 원격/클라우드 세션 등)에서는 같은 단계를 GitHub MCP 도구로 수행한다 — PR 생성 `mcp__github__create_pull_request`, 리뷰 코멘트 `mcp__github__add_issue_comment`, CI 확인 `mcp__github__pull_request_read`(method: `get_check_runs`), 머지 `mcp__github__merge_pull_request`(merge_method: `squash`). **도구 차이를 이유로 PR 생성 단계에서 멈추지 않는다.**
> `Closes #N`이 PR body에 포함되므로 머지 시 이슈가 자동으로 close된다.

## Commit Message Convention
```
[#이슈번호] 타입: 메시지

타입:
- feat: 새로운 기능
- fix: 버그 수정
- refactor: 리팩토링
- docs: 문서 수정
- test: 테스트 추가
- chore: 빌드/설정 변경
```

## 출력
- PR 번호와 링크 제공
- 코드리뷰 결과 요약 (🔴/🟡 건수, 재리뷰 횟수)
- CI 통과 및 머지 성공 여부 확인
- 닫힌 이슈 번호 확인
- 배포 검증 결과 (성공/실패, 실패 시 생성된 이슈 번호)
