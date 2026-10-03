# Issue #101 — 계정 점수 저장 실패 대응 설계

## 증상
로그인 후 홈의 "이 기기의 점수를 내 계정에 저장할까요?" → 저장하기 → `저장하지 못했어요`.

## 진단
- 로컬 Postgres(16) + 동일 코드로 재현: `POST /api/scores` → 201, 카드가 "내 계정에 저장"으로 전환. **코드 경로는 정상.**
- 홈 서버 컴포넌트의 `getLatestServerRecord`는 DB 오류를 `null`로 삼킨다. DB에 붙지 못하면
  1) 계정 기록이 "없음"으로 보여 저장 제안이 뜨고 2) 저장 POST는 처리되지 않은 예외로 500 → 스크린샷과 일치.
- API 라우트에 try/catch·로그가 없어 운영에서 원인을 볼 수 없었다.

### 유력 원인 (운영 환경)
| 원인 | 확인 방법 | 조치 |
|---|---|---|
| `DATABASE_URL`이 Supabase **직접 연결**(`db.<ref>.supabase.co:5432`) — IPv6 전용이라 Vercel(IPv4)에서 접속 불가 | Vercel 로그에 `[db]` 오류 코드 `ENOTFOUND`/`ENETUNREACH`/`EHOSTUNREACH` | Supabase > Connect > **Transaction pooler** URL(`aws-0-<region>.pooler.supabase.com:6543`, 사용자명 `postgres.<ref>`)로 교체 |
| 무료 프로젝트 7일 비활성 일시정지 | Supabase 대시보드에 Paused 표시 | Restore |
| 테이블 미생성 | 로그 코드 `42P01` (relation does not exist) | `DATABASE_URL=... npx drizzle-kit push` |
| `DATABASE_URL` 미설정 | 로그 `DATABASE_URL is not set` | Vercel 환경변수 추가 후 재배포 |
| 비밀번호 오류 | 로그 코드 `28P01` | 비밀번호 재설정 후 URL 갱신 |

## 변경 설계
1. `lib/db/index.ts`
   - `DATABASE_URL` 누락 시 경고 로그. (localhost로 조용히 붙는 대신 원인을 남긴다)
   - 서버리스 옵션: `max: 1`, `connect_timeout: 10`, `idle_timeout: 20`, `prepare: false`(pooler 트랜잭션 모드 호환, 기존 유지)
   - `describeDbError(err)` — 로그용 `code`/`message` 추출 헬퍼
2. `/api/scores` POST, `/api/scores/latest` GET
   - DB 오류 → `console.error('[db] ...', code, message)` + `503 { error: 'db_unavailable' }`
   - POST 본문 검증: 4개 점수는 0 이상 정수, JSON 파싱 실패 → 400
3. 홈 `getLatestServerRecord` → `{ ok: true, record } | { ok: false }`. 실패 시 로그를 남기고 `LastScoreCard`에 `serverAvailable=false` 전달 → 저장 제안 숨김.
4. `LastScoreCard`: 401이면 "로그인이 만료됐어요…", 그 외는 기존 문구.
5. 헤더: 모바일 한 줄 고정, 닉네임은 `sm` 이상에서만.

## API 응답 계약 (변경분)
| 상태 | 본문 | 의미 |
|---|---|---|
| 400 | `{ error: 'Invalid body' }` | 점수 필드 누락/비정수 |
| 503 | `{ error: 'db_unavailable' }` | DB 연결/쿼리 실패 (원인은 서버 로그) |

## 검증
- 로컬 Postgres: 정상 저장 201, 잘못된 본문 400, DB 중지 후 503 + 로그, 홈에서 제안 숨김
- 400px 폭 헤더 스크린샷
