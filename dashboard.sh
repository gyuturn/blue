#!/usr/bin/env bash
# 에이전트 작업 현황 대시보드 (/dashboard 명령어가 호출)
# GitHub 이슈/PR, Git 상태, 최근 배포(Vercel CD) 상태를 한눈에 표시한다.
set -uo pipefail

hr() { printf '%s\n' "────────────────────────────────────────────"; }
sec() { echo; hr; echo "▶ $1"; hr; }

sec "GitHub Issues (열림)"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh issue list --state open --limit 20 2>/dev/null || echo "  (이슈 조회 실패)"
else
  echo "  gh CLI 미인증 — 'gh auth login' 후 사용 가능"
fi

sec "Pull Requests (열림)"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh pr list --state open --limit 20 2>/dev/null || echo "  (PR 조회 실패)"
else
  echo "  gh CLI 미인증"
fi

sec "Git 상태"
echo "현재 브랜치: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '-')"
echo "최근 커밋:"
git log --oneline -5 2>/dev/null | sed 's/^/  /' || echo "  (git 로그 없음)"
echo "변경 파일:"
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  git status --short 2>/dev/null | sed 's/^/  /'
else
  echo "  (없음 — 클린)"
fi

sec "최근 배포 (CD → Vercel)"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh run list --workflow=cd.yml --limit 5 2>/dev/null || echo "  (배포 이력 조회 실패)"
else
  echo "  gh CLI 미인증"
fi

sec "로컬 서비스 상태 (Docker, 로컬 개발용)"
if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    docker compose ps 2>/dev/null || echo "  (compose 프로젝트 없음)"
  else
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || echo "  (docker ps 실패)"
  fi
else
  echo "  docker 미설치"
fi

echo
hr
echo "완료: $(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo now)"
