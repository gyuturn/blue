# Score Persistence Design

**Issue:** [#26] 청약 가점 계산 결과 DB 저장 및 불러오기
**Author:** CTO Review
**Date:** 2026-03-22
**Status:** Proposed

---

## 1. Problem Statement

Currently, `/result` page computes scores client-side and writes only to `sessionStorage`. The data is lost when the tab closes or the session expires. Logged-in users (Kakao OAuth) should have their latest score persisted server-side and automatically restored on their next visit.

There is no database in the project today — this work introduces the entire DB stack.

---

## 2. DB Stack Decision: Supabase (PostgreSQL)

### Recommendation: Supabase

| Criterion | Supabase | PlanetScale (MySQL) |
|---|---|---|
| Setup time | Zero-infra, managed cloud | Zero-infra, managed cloud |
| SQL dialect | PostgreSQL (JSONB, UUID, TIMESTAMPTZ native) | MySQL (JSON type, less expressive) |
| Free tier | 500 MB storage, 2 GB egress/month | 5 GB storage, 1 billion row reads/month |
| Next.js integration | `@supabase/supabase-js` works in Route Handlers and Server Components | Serverless driver required |
| JSONB support | Native — ideal for `input_snapshot` | Stored as TEXT internally, less queryable |
| Row-level security | Built-in Postgres RLS (useful for future direct-from-client queries) | Not available |
| Migrations | Supabase CLI + SQL migrations or Drizzle/Prisma | Vitess-based, no raw DDL on free tier |
| Local dev | `supabase start` (Docker) | PlanetScale CLI + branch |

**Decision: Supabase.** The JSONB column for `input_snapshot` is a first-class citizen in PostgreSQL, and Supabase's free tier comfortably handles this app's scale. The Supabase JS SDK works cleanly inside Next.js 16 App Router Route Handlers (server-only, no client bundle leakage). PlanetScale remains a viable alternative if MySQL is preferred.

### ORM: Drizzle (not Prisma)

Drizzle is chosen over Prisma because:
- It generates zero runtime overhead (thin SQL builder, not a query engine process).
- Its schema is TypeScript-first — types are inferred automatically and shared with application code.
- Migration workflow (`drizzle-kit generate` + `drizzle-kit push`) is lightweight and does not require a shadow database.
- Works well with Supabase's connection pooler (`pgBouncer`) without extra adapter configuration.

---

## 3. Data Model

```sql
CREATE TABLE subscription_scores (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT        NOT NULL,                  -- Kakao user id (SessionUser.id)
  total_score    INTEGER     NOT NULL,                  -- 0–84
  housing_score  INTEGER     NOT NULL,                  -- 무주택기간 점수 (0–32)
  dependent_score INTEGER    NOT NULL,                  -- 부양가족 점수 (0–35)
  subscription_score INTEGER NOT NULL,                  -- 청약통장 점수 (0–17)
  tier           TEXT        NOT NULL,                  -- 'S' | 'A' | 'B' | 'C'
  special_supply JSONB       NOT NULL,                  -- { newlyWed, firstHome, multiChild }
  input_snapshot JSONB       NOT NULL,                  -- Full EligibilityInput for replay
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON subscription_scores (user_id, created_at DESC);
```

### Design notes

- **`user_id TEXT`** — Kakao returns a numeric ID (`KakaoUser.id: number`), but it is stored as `TEXT` for type safety and compatibility with `SessionUser.id: string`.
- **Cumulative rows, not upsert** — Rows are appended on every calculation. `GET /api/scores/latest` fetches `ORDER BY created_at DESC LIMIT 1`. This enables a future score history view without a schema migration.
- **`input_snapshot JSONB`** — Stores the full `EligibilityInput` object so any score can be replayed client-side by passing it back through the existing `?data=` query param on `/result`.
- **`special_supply JSONB`** — Stored separately from `input_snapshot` so it can be queried directly (e.g., "find users eligible for 신혼부부") without unpacking the full input.
- **`tier TEXT`** — Denormalised for fast reads on the home page card; avoids re-running the tier logic in the DB.

### Drizzle schema (TypeScript)

```typescript
// lib/db/schema.ts
import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { EligibilityInput, SpecialSupplyEligibility } from '@/types';

export const subscriptionScores = pgTable('subscription_scores', {
  id:                uuid('id').primaryKey().defaultRandom(),
  userId:            text('user_id').notNull(),
  totalScore:        integer('total_score').notNull(),
  housingScore:      integer('housing_score').notNull(),
  dependentScore:    integer('dependent_score').notNull(),
  subscriptionScore: integer('subscription_score').notNull(),
  tier:              text('tier').notNull(),
  specialSupply:     jsonb('special_supply').$type<SpecialSupplyEligibility>().notNull(),
  inputSnapshot:     jsonb('input_snapshot').$type<EligibilityInput>().notNull(),
  createdAt:         timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

---

## 4. API Design

### Authentication pattern

Both endpoints read `blue_session` cookie via the existing `getSession()` helper from `lib/auth/session.ts`. No new auth mechanism is needed.

```
┌─────────────┐   blue_session cookie   ┌───────────────────────────┐
│  Client     │ ─────────────────────►  │  Route Handler            │
│ (browser)   │                         │  getSession() → user | null│
└─────────────┘                         │  null → 401               │
                                         └───────────────────────────┘
```

### POST /api/scores

**Purpose:** Save the completed score for the authenticated user.

**Request**
```
POST /api/scores
Cookie: blue_session=<...>
Content-Type: application/json

{
  "input": EligibilityInput,
  "result": ScoreResult,
  "specialSupply": SpecialSupplyEligibility
}
```

**Responses**

| Status | Condition |
|--------|-----------|
| `201 Created` | Row inserted successfully; returns `{ id, createdAt }` |
| `400 Bad Request` | Body does not parse or required fields are missing |
| `401 Unauthorized` | No valid session cookie |
| `500 Internal Server Error` | DB write failed |

**Implementation sketch**
```typescript
// app/api/scores/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { subscriptionScores } from '@/lib/db/schema';

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  // validate body shape …

  const [row] = await db.insert(subscriptionScores).values({
    userId:            user.id,
    totalScore:        body.result.totalScore,
    housingScore:      body.result.homelessScore,
    dependentScore:    body.result.dependentsScore,
    subscriptionScore: body.result.subscriptionScore,
    tier:              body.result.tier,
    specialSupply:     body.specialSupply,
    inputSnapshot:     body.input,
  }).returning({ id: subscriptionScores.id, createdAt: subscriptionScores.createdAt });

  return NextResponse.json(row, { status: 201 });
}
```

### GET /api/scores/latest

**Purpose:** Retrieve the most recent score record for the authenticated user.

**Request**
```
GET /api/scores/latest
Cookie: blue_session=<...>
```

**Responses**

| Status | Body |
|--------|------|
| `200 OK` | Full `subscription_scores` row as JSON |
| `204 No Content` | No saved score exists for this user |
| `401 Unauthorized` | No valid session cookie |
| `500 Internal Server Error` | DB read failed |

**Implementation sketch**
```typescript
// app/api/scores/latest/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { subscriptionScores } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [row] = await db
    .select()
    .from(subscriptionScores)
    .where(eq(subscriptionScores.userId, user.id))
    .orderBy(desc(subscriptionScores.createdAt))
    .limit(1);

  if (!row) return new NextResponse(null, { status: 204 });
  return NextResponse.json(row);
}
```

---

## 5. Frontend Integration

### 5.1 `/result` page — save on load

The `useEffect` in `ResultContent` already runs when `data` is available. Add a `POST /api/scores` call there, after the existing `sessionStorage.setItem`. Gate it behind a session check using `/api/auth/me` (which already exists) or pass a server-rendered `isLoggedIn` prop.

```
useEffect:
  1. Compute scoreResult (already done via useMemo)
  2. sessionStorage.setItem (existing)
  3. if (isLoggedIn) → fetch('POST /api/scores', body)
  4. on success → show "결과가 저장되었습니다" toast
  5. on failure → silent (don't block UX, log to console)
```

The save is **fire-and-forget** from a UX perspective. A transient toast communicates success; errors are swallowed silently to not degrade the result experience.

### 5.2 Home page (`/`) — previous result card

Convert `app/page.tsx` to an **async Server Component** (it currently has no `'use client'` directive). Fetch the latest score server-side:

```typescript
// app/page.tsx  (Server Component)
import { getSession } from '@/lib/auth/session';

export default async function HomePage() {
  const user = await getSession();
  let latestScore = null;

  if (user) {
    // Internal fetch or direct DB call
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/scores/latest`, {
      headers: { Cookie: /* forward session cookie */ },
      cache: 'no-store',
    });
    if (res.ok) latestScore = await res.json();
  }

  return (
    <main>
      {latestScore && <PreviousScoreCard score={latestScore} />}
      {/* existing content */}
    </main>
  );
}
```

> Alternatively, call the Drizzle DB directly inside the Server Component (no HTTP hop) — preferred for co-located server logic.

### 5.3 Previous score card component

```
┌─────────────────────────────────────────┐
│ 이전 계산 결과                           │
│ 총점: 62점  (A등급)                      │
│ 저장일: 2026.03.15                       │
│                    [결과 다시 보기 →]    │
└─────────────────────────────────────────┘
```

"결과 다시 보기" constructs the `/result?data=<urlencoded inputSnapshot>` URL from the stored `input_snapshot` JSONB, reusing the existing result page rendering pipeline with zero additional code on the result page itself.

---

## 6. Environment Variables

Add to `.env.local` (never commit):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

`DATABASE_URL` is used by Drizzle directly from Route Handlers (server-only). `NEXT_PUBLIC_SUPABASE_*` are needed only if the Supabase JS client is used for future client-side realtime features; for this issue they are optional.

Register all three in Vercel project environment variables (Production + Preview environments).

---

## 7. Implementation Checklist

### Phase 1 — Infrastructure
- [ ] Create Supabase project; note `DATABASE_URL`
- [ ] `npm install drizzle-orm postgres` + `npm install -D drizzle-kit`
- [ ] Create `lib/db/index.ts` (Drizzle client singleton)
- [ ] Create `lib/db/schema.ts` (table definition above)
- [ ] `npx drizzle-kit push` to apply schema to Supabase
- [ ] Add env vars to `.env.local` and Vercel

### Phase 2 — API
- [ ] `app/api/scores/route.ts` — POST handler
- [ ] `app/api/scores/latest/route.ts` — GET handler
- [ ] Input validation (check required fields, guard against NaN integers)

### Phase 3 — Frontend
- [ ] `/result` page: add POST call in `useEffect`, add toast component
- [ ] `/result` page: pass `isLoggedIn` server-side (via Server Component wrapper or layout)
- [ ] Home page: convert to async Server Component, add `PreviousScoreCard`
- [ ] Non-logged-in state: add "로그인하면 결과를 저장할 수 있어요" banner on `/result`

### Phase 4 — Validation & Hardening
- [ ] Verify `user_id` is correctly sourced from `SessionUser.id` (string form of Kakao numeric ID)
- [ ] Add `NEXT_PUBLIC_URL` env var or use relative URL for internal fetch
- [ ] Confirm `httpOnly` cookie is forwarded correctly in server-side internal fetch (or use direct DB call to avoid this)
- [ ] Test with expired/missing session — expect 401

---

## 8. Security Considerations

- **Server-only DB access** — `DATABASE_URL` is never exposed to the client bundle. All DB calls happen in Route Handlers or Server Components.
- **User isolation** — All queries filter on `user_id = getSession().id`. A user cannot read or overwrite another user's rows.
- **Input validation** — The POST body should be validated before insertion. At minimum, assert `totalScore` is an integer in [0, 84], and `input_snapshot` is a non-null object.
- **Rate limiting** — The POST endpoint could be called on every calculator completion. Consider adding a simple per-user rate limit (e.g., max 10 inserts/minute) using an in-memory or Redis counter if abuse becomes a concern.
- **No PII** — `EligibilityInput` contains no name, address, or national ID — only eligibility parameters. JSONB storage is appropriate.

---

## 9. Future Extensibility

- **Score history list** — Since rows are appended (not upserted), a `GET /api/scores` endpoint returning all rows for the user can be added without any schema change.
- **Score trend chart** — `created_at` + `total_score` pairs are already available for a timeline visualisation.
- **Re-run from history** — `input_snapshot` enables any historical record to be replayed through `/result?data=<snapshot>`.
- **Admin analytics** — Aggregate queries on `tier`, `special_supply` JSONB fields are natively supported in PostgreSQL.
