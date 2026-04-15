# CLAUDE.md

## 프로젝트 개요
청약 가점 계산 및 공고 큐레이션 서비스.
복잡한 청약 가점을 자동으로 계산하고, 사용자 상황에 맞는 청약 공고를 추천한다.

- **Repository**: https://github.com/gyuturn/blue

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 16 (TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | Supabase + Drizzle ORM |
| 인증 | Kakao OAuth |
| CI/CD | GitHub Actions + Vercel |
| 패키지 매니저 | npm |

---

## 개발 철학

> "나도 청약을 몰라서 답답해서 만들었다. 나처럼 청약이 어려운 모든 사람이 쓸 수 있어야 한다."

- **단순함 우선**: UI는 최대한 단순하게. 불필요한 복잡함을 제거한다.
- **쉽고 디테일하게**: 정보는 줄이지 않되, 누구나 이해할 수 있는 언어로 전달한다.
- **빠른 출시**: 완벽함보다 빠른 배포를 우선한다. 부족한 부분은 이후 업데이트로 보완한다.
- **청약 올인원**: 청약과 관련된 모든 기능(계산, 공고, 대출, 시세 등)을 점진적으로 붙여나간다.

---

## 주요 기능

- **청약 가점 계산**: 무주택 기간 / 부양가족 수 / 청약통장 가입 기간 (84점 만점)
- **자격 판정**: 5단계 청약 자격 판정
- **특별공급 자격 확인**: 신혼부부 / 생애최초 / 다자녀
- **청약 공고 큐레이션**: 최신 공고 지역별 필터링

---

## 에이전트 구조

| 커맨드 | 역할 |
|--------|------|
| `/pm` | 요구사항 분석 + GitHub 이슈 생성 |
| `/planner` | UI/UX 기획 (Next.js + Tailwind 기준) |
| `/cto` | 기술 검토 + 설계 문서 작성 (`/docs`) |
| `/developer` | 브랜치 생성 + 개발 + PR 생성 |
| `/feature [요구사항]` | PM → Planner → CTO → Developer 전체 파이프라인 자동 실행 |

---

## 커밋 컨벤션

```
[#이슈번호] 타입: 메시지

타입: feat / fix / refactor / docs / test / chore
```

## 브랜치 전략

- `feature/issue-[번호]-[설명]`
- `bugfix/issue-[번호]-[설명]`
- `hotfix/issue-[번호]-[설명]`

---

## 이슈 관리 규칙

### PR 머지 후 반드시 이슈 close
- PR 머지가 완료되면 연관된 GitHub 이슈를 즉시 close한다.
- PR body에 `Closes #번호` 를 명시하거나, 머지 후 수동으로 close한다.

```bash
gh issue close [번호] --repo gyuturn/blue --comment "PR #[PR번호]에서 구현 완료"
```

### 세션 시작 시 이슈 정리
- 새 세션에서 작업 전, 이미 구현 완료된 open 이슈가 있는지 확인하고 close한다.
- `gh issue list --state open` 으로 목록 조회 후 git log와 대조한다.

### PR base 브랜치 확인
- PR 생성 시 base 브랜치가 반드시 `main`인지 확인한다.
- 잘못된 경우: `gh pr edit [번호] --base main`으로 수정 후 머지.
