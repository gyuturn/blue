import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // 없으면 postgres가 localhost로 조용히 붙으려다 실패하므로 원인을 먼저 남긴다
  console.error('[db] DATABASE_URL is not set');
}

// 서버리스: 인스턴스마다 연결 1개, 오래 기다리지 않는다. prepare:false는 Supabase 트랜잭션 pooler 호환용
const client = postgres(connectionString ?? '', {
  prepare: false,
  max: 1,
  connect_timeout: 10,
  idle_timeout: 20,
});
export const db = drizzle(client, { schema });

// 로그용: Postgres 오류 코드(42P01 등)나 네트워크 오류 코드(ENOTFOUND 등)를 꺼낸다
export function describeDbError(err: unknown): string {
  // drizzle은 원래 오류를 cause에 감싼다
  const e = (err as { cause?: unknown })?.cause ?? err;
  const code = (e as { code?: unknown })?.code;
  const message = e instanceof Error ? e.message : String(e);
  return code ? `${String(code)} ${message}` : message;
}
