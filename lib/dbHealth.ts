// /api/health/db 응답용: DB 오류 코드 → 운영자가 할 일 (docs/technical/issue-126-result-save-error.md)
const HINTS: Record<string, string> = {
  missing_url: 'Vercel 환경변수에 DATABASE_URL을 추가하고 재배포하세요',
  ENOTFOUND: 'Supabase 직접 연결(IPv6) 주소로 보여요. Connect > Transaction pooler(6543) URL로 바꾸세요',
  ENETUNREACH: 'Supabase 직접 연결(IPv6) 주소로 보여요. Connect > Transaction pooler(6543) URL로 바꾸세요',
  EHOSTUNREACH: 'Supabase 직접 연결(IPv6) 주소로 보여요. Connect > Transaction pooler(6543) URL로 바꾸세요',
  CONNECT_TIMEOUT: 'DB에 접속하지 못했어요. Supabase 프로젝트가 일시정지(Paused)됐는지 확인하세요',
  ECONNREFUSED: 'DB에 접속하지 못했어요. Supabase 프로젝트가 일시정지(Paused)됐는지 확인하세요',
  ETIMEDOUT: 'DB에 접속하지 못했어요. Supabase 프로젝트가 일시정지(Paused)됐는지 확인하세요',
  XX000: 'pooler가 프로젝트를 찾지 못했어요. URL의 사용자명(postgres.<ref>)과 일시정지 여부를 확인하세요',
  '42P01': '테이블이 없어요. DATABASE_URL=... npx drizzle-kit push 로 테이블을 만드세요',
  '28P01': 'DB 비밀번호가 맞지 않아요. 비밀번호를 재설정하고 DATABASE_URL을 갱신하세요',
};

export function dbHealthHint(code: string): string {
  return HINTS[code] ?? 'Vercel 로그의 [db] 줄에서 자세한 오류를 확인하세요';
}

// drizzle은 원래 오류를 cause에 감싼다
export function dbErrorCode(err: unknown): string {
  const e = (err as { cause?: unknown })?.cause ?? err;
  const code = (e as { code?: unknown })?.code;
  return code ? String(code) : 'unknown';
}
