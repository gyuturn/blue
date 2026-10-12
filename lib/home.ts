// 메인(/)을 공고목록으로 대신할지 — 로그인했고 계정에 저장된 점수가 확인될 때만.
// 조회 실패(ok: false)는 점수 유무를 모르므로 기존 메인을 그대로 보여준다.
export function shouldShowAnnouncementsAsHome(
  isLoggedIn: boolean,
  server: { ok: true; record: unknown | null } | { ok: false } | null,
): boolean {
  return isLoggedIn && !!server?.ok && server.record != null;
}
