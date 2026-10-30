# Issue #126 — 결과 화면 계정 저장 실패 대응

## 증상
로그인 상태로 계산 → `/result`에 `계정에 저장하지 못했어요. 이 기기에는 저장돼 있어요.`

## 진단
- 로컬 Postgres 16 + 같은 코드: `POST /api/scores` → 201. 코드 경로는 정상 (#101과 같은 결론).
- 점수 4개는 계산기에서 항상 정수 → 400 아님. 남는 경우는 **401(로그인 만료)** 또는 **503(DB 연결/쿼리 실패)**.
- 결과 화면은 두 경우를 구분하지 않고, 순간 실패(콜드 스타트 연결 timeout, pooler 재연결)도 재시도 없이 바로 실패로 보여준다.
- 운영 DB 상태는 Vercel 로그로만 볼 수 있었다 → 원인 확인이 늦어짐.

## 변경 설계
1. `lib/scoreSync.ts` — `saveScoreToAccount(body, { fetchImpl, retryDelayMs })`
   - 결과: `'saved' | 'expired' | 'failed'`
   - 401 → `expired` (재시도 안 함), 그 외 4xx → `failed` (재시도해도 같음)
   - 5xx·네트워크 오류 → `retryDelayMs`(기본 1.5초) 후 **1회 재시도**
   - 결과 화면과 홈 `LastScoreCard`가 같이 사용
2. 결과 화면 (`app/result/page.tsx`)
   - `expired` → 다시 로그인 링크(`/api/auth/kakao`), `failed` → 다시 시도 버튼
3. `GET /api/health/db` — DB 진단
   - `select 1 from subscription_scores limit 1` 실행
   - 성공: `200 { ok: true }`
   - 실패: `503 { ok: false, code, hint }` — 오류 **코드와 한글 조치 안내만** 노출 (메시지·호스트·URL은 로그에만)
   - `lib/dbHealth.ts`의 `dbHealthHint(code)`가 코드 → 조치 매핑 (#101 표와 동일)

| code | 의미 | 조치 |
|---|---|---|
| `missing_url` | `DATABASE_URL` 미설정 | Vercel 환경변수 추가 후 재배포 |
| `ENOTFOUND`/`ENETUNREACH`/`EHOSTUNREACH` | 직접 연결(IPv6) 주소 | Supabase Transaction pooler(6543) URL로 교체 |
| `CONNECT_TIMEOUT`/`ECONNREFUSED`/`ETIMEDOUT` | 접속 불가 | Supabase 프로젝트 일시정지 여부 확인(Restore) |
| `42P01` | 테이블 없음 | `DATABASE_URL=... npx drizzle-kit push` |
| `28P01` | 비밀번호 오류 | 비밀번호 재설정 후 URL 갱신 |

## 운영 확인 절차
배포 후 브라우저에서 `https://<도메인>/api/health/db` 접속 → `code`에 맞춰 위 표대로 조치.
