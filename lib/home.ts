// 메인(/)을 공고목록으로 대신할지 — 로그인했고 계정에 저장된 점수가 확인될 때만.
// 조회 실패(ok: false)는 점수 유무를 모르므로 기존 메인을 그대로 보여준다.
export function shouldShowAnnouncementsAsHome(
  isLoggedIn: boolean,
  server: { ok: true; record: unknown | null } | { ok: false } | null,
): boolean {
  return isLoggedIn && !!server?.ok && server.record != null;
}

export const ANNOUNCEMENTS_HOME = '/announcements';

// 이 기기에 저장된 점수가 있는지 (scoreStorage의 SavedScoreRecord 형태) — 메인 이동 판정 전용.
// 아래 인라인 스크립트와 같은 규칙이어야 한다 (tests/home.test.ts가 두 구현을 같은 입력으로 검증)
export function hasDeviceScore(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const p = JSON.parse(raw);
    return !!p && typeof p === 'object' && p.v === 1 && typeof p.savedAt === 'number' && !!p.input && typeof p.input === 'object';
  } catch {
    return false;
  }
}

// 새로고침·PWA 실행처럼 문서를 새로 받을 때, 소개 화면이 그려지기 전에 공고목록으로 보낸다 (#117)
export function deviceScoreRedirectScript(storageKey: string): string {
  return (
    `try{if(location.pathname==='/'){var p=JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)})||'null');` +
    `if(p&&typeof p==='object'&&p.v===1&&typeof p.savedAt==='number'&&p.input&&typeof p.input==='object')` +
    `location.replace(${JSON.stringify(ANNOUNCEMENTS_HOME)})}}catch(e){}`
  );
}
