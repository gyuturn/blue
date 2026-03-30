# Issue #19 Technical Design: 청약 입문자를 위한 툴팁 및 가이드 페이지

## Overview

This document covers the technical design for Issue #19: adding a reusable Tooltip component, a centralized term definitions library, inline tooltips on key pages, and a comprehensive beginner's guide page at `/guide`.

---

## 1. File Structure Plan

```
blue/
├── components/
│   └── Tooltip.tsx               # NEW: reusable tooltip component
├── lib/
│   └── terms.ts                  # NEW: centralized 청약 term definitions (15 terms)
├── app/
│   ├── guide/
│   │   └── page.tsx              # NEW: 7-section beginner guide (Server Component)
│   ├── calculator/
│   │   └── page.tsx              # MODIFIED: add tooltips to step labels & field labels
│   ├── announcements/
│   │   └── page.tsx              # MODIFIED: add tooltips to column headers
│   └── result/
│       └── page.tsx              # MODIFIED: add tooltips to score breakdown terms
```

---

## 2. Tooltip Component Interface

### File: `components/Tooltip.tsx`

This must be a **Client Component** (`'use client'`) because it manages hover/click state via `useState` and `useEffect`.

```tsx
'use client';

export interface TooltipProps {
  /** The term or label to underline/highlight */
  term: string;
  /** Explanation shown in the tooltip bubble */
  definition: string;
  /** Optional: where the bubble appears. Defaults to 'top'. */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Optional: how to trigger the tooltip. Defaults to 'hover' on desktop, 'click' on mobile. */
  trigger?: 'hover' | 'click' | 'auto';
  /** Optional additional className for the trigger wrapper */
  className?: string;
}
```

#### Behavior

- **Desktop (pointer: fine):** tooltip appears on hover (`mouseenter` / `mouseleave`).
- **Mobile (pointer: coarse / touch):** tooltip appears on tap/click; second tap or outside-click dismisses it.
- `trigger='auto'` (default) uses a `matchMedia('(pointer: coarse)')` check on mount to select mode.
- Tooltip bubble uses `position: absolute` inside a `position: relative` wrapper.
- Dismiss on `Escape` keydown for accessibility.
- `role="tooltip"` + `aria-describedby` wiring for screen-reader support.

#### Visual Design (Tailwind v4)

- Trigger text: `underline decoration-dotted decoration-blue-400 cursor-help text-blue-700`
- Bubble: `absolute z-50 w-56 rounded-xl bg-gray-900 text-white text-xs p-3 shadow-lg`
- Arrow via a small rotated `div` (`w-2 h-2 bg-gray-900 rotate-45`).
- Fade-in: `transition-opacity duration-150 opacity-0 / opacity-100`.

#### State Shape

```ts
const [visible, setVisible] = useState(false);
const [isMobile, setIsMobile] = useState(false);
```

---

## 3. `lib/terms.ts` Data Structure

### File: `lib/terms.ts`

Plain module — **no React**, no `'use client'`; importable in both Server and Client Components.

```ts
export interface Term {
  id: string;          // slug used to look up the term programmatically
  term: string;        // Korean display term
  shortDef: string;    // One-sentence definition shown in tooltip (≤ 60 chars)
  fullDef: string;     // 2–4 sentence explanation shown in the guide glossary
  relatedTermIds?: string[]; // optional cross-references
}

export const TERMS: Term[] = [ /* 15 terms — see below */ ];

/** Convenience lookup by id */
export const TERM_MAP: Record<string, Term> =
  Object.fromEntries(TERMS.map((t) => [t.id, t]));
```

### 15 Terms (ids and shortDefs)

| id | term | shortDef |
|---|---|---|
| `cheongyang` | 청약 | 신규 분양 주택을 신청하는 절차 |
| `gajum` | 가점제 | 무주택·부양가족·통장기간으로 점수를 매겨 당첨자 선정 |
| `chuchemje` | 추첨제 | 가점과 무관하게 추첨으로 당첨자를 결정하는 방식 |
| `teukbyeol` | 특별공급 | 신혼부부·다자녀 등 정책 대상에게 별도 물량을 우선 공급 |
| `ilban` | 일반공급 | 특별공급 이외의 일반 경쟁 청약 |
| `mujiutaek` | 무주택자 | 본인 및 세대원 전원이 주택을 소유하지 않은 자 |
| `buyangGajok` | 부양가족 | 청약 시 인정되는 배우자·직계존비속 등의 세대원 |
| `tongjanG` | 청약통장 | 청약에 필요한 주택청약종합저축 계좌 |
| `yechiGeum` | 예치금 | 주택 면적·지역별로 필요한 통장 최소 잔액 |
| `sinholBubu` | 신혼부부 특공 | 혼인 7년 이내 무주택 부부에게 우선 공급하는 제도 |
| `saengaeCheot` | 생애최초 특공 | 생애 처음으로 내 집을 마련하는 무주택자 대상 특공 |
| `daJanyeo` | 다자녀 특공 | 미성년 자녀 3명 이상인 가구에 우선 공급하는 제도 |
| `gonggoPyo` | 모집공고 | 주택 분양 시 발행하는 공식 안내 공고문 |
| `cheongYangHome` | 청약홈 | 한국부동산원 운영 공식 청약 신청 사이트 |
| `gyuchukyeokji` | 규제지역 | 투기과열지구 등 정부가 지정한 청약 강화 구역 |

---

## 4. Guide Page Section Breakdown

### File: `app/guide/page.tsx`

This is a **Server Component** (no `'use client'`). Static content; no need for client-side state. Tooltip components inside the guide are Client Components, but Next.js handles the boundary automatically.

```
export const metadata: Metadata = {
  title: '청약 완전 정복 가이드 | 청약 매칭 가이드',
  description: '청약 입문자를 위한 쉬운 청약 개념 정리',
};
```

### Section Layout

```
app/guide/page.tsx
│
├── <GuideHero />          — inline section component (Server)
├── Section 1: 청약이란?   — what is 청약, why it matters
├── Section 2: 자격 요건   — 무주택, 통장 요건 overview with Tooltip wrappers
├── Section 3: 가점제 설명 — score breakdown table (무주택 32 / 부양가족 35 / 통장 17)
├── Section 4: 특별공급    — 3-column card: 신혼부부 / 생애최초 / 다자녀
├── Section 5: 청약 절차   — numbered timeline: 공고→통장개설→자격확인→신청→당첨→계약
├── Section 6: FAQ         — accordion-style Q&A (5–7 questions, Client Component for open/close)
└── Section 7: 용어사전    — full glossary rendered from TERMS array
```

#### Section 6 (FAQ) Client Boundary

The FAQ accordion requires a Client Component. Extract it:

```tsx
// components/GuideAccordion.tsx
'use client';

interface FAQItem { q: string; a: string; }
export default function GuideAccordion({ items }: { items: FAQItem[] }) { ... }
```

This keeps the rest of `app/guide/page.tsx` as a Server Component, minimizing client JS bundle.

#### Section 7 (용어사전) Rendering

Import `TERMS` from `lib/terms.ts` directly in the Server Component and render a `<dl>` list — no client JS needed.

```tsx
import { TERMS } from '@/lib/terms';
// ...
<dl>
  {TERMS.map((t) => (
    <div key={t.id}>
      <dt>{t.term}</dt>
      <dd>{t.fullDef}</dd>
    </div>
  ))}
</dl>
```

---

## 5. Tooltip Application Points

### `app/calculator/page.tsx` (Client Component — already `'use client'`)

Apply tooltips to step labels and field descriptions:

| Location | Term wrapped | Term id |
|---|---|---|
| Step 1 heading "무주택 여부" | 무주택자 | `mujiutaek` |
| Step 2 heading "부양가족 수" | 부양가족 | `buyangGajok` |
| Step 3 heading "청약통장 정보" | 청약통장 | `tongjanG` |
| Step 3 예치금 hint text | 예치금 | `yechiGeum` |
| Step 5 특별공급 note | 특별공급 | `teukbyeol` |

### `app/announcements/page.tsx`

Apply tooltips to column/filter headers:

| Label | Term id |
|---|---|
| 특별공급 filter chips | `teukbyeol` |
| 신혼부부 badge | `sinholBubu` |
| 생애최초 badge | `saengaeCheot` |
| 다자녀 badge | `daJanyeo` |

### `app/result/page.tsx`

Apply tooltips to score breakdown:

| Label | Term id |
|---|---|
| 가점제 | `gajum` |
| 무주택 점수 | `mujiutaek` |
| 부양가족 점수 | `buyangGajok` |
| 청약통장 점수 | `tongjanG` |
| 특별공급 자격 | `teukbyeol` |

---

## 6. Navigation Link

Add a "청약 가이드" link to `app/page.tsx` CTA section alongside the existing buttons:

```tsx
<Link
  href="/guide"
  className="block w-full text-center py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl shadow-sm border border-gray-200 transition-colors duration-200"
>
  청약 입문 가이드 읽기
</Link>
```

---

## 7. Implementation Notes for Next.js 16 App Router

### Server vs Client Component Decision Matrix

| File | Type | Reason |
|---|---|---|
| `app/guide/page.tsx` | Server | Static content, no state; enables full SSR and metadata |
| `components/Tooltip.tsx` | Client | Needs `useState`, `useEffect`, event handlers |
| `components/GuideAccordion.tsx` | Client | FAQ open/close state |
| `lib/terms.ts` | Neither (pure TS) | No React; importable anywhere |
| `app/calculator/page.tsx` | Client (existing) | Already `'use client'` — Tooltip import just works |
| `app/result/page.tsx` | Must verify | If currently Server, add `'use client'` only if needed, or use Tooltip as a leaf |

### Avoiding Prop-Drilling the Term Definition

Instead of passing `definition` as a prop every time, consumers can look up by id:

```tsx
import { TERM_MAP } from '@/lib/terms';

<Tooltip term={TERM_MAP.mujiutaek.term} definition={TERM_MAP.mujiutaek.shortDef} />
```

Or provide a convenience wrapper:

```tsx
// components/TermTooltip.tsx  (Client Component)
import Tooltip from './Tooltip';
import { TERM_MAP } from '@/lib/terms';

export default function TermTooltip({ id }: { id: string }) {
  const t = TERM_MAP[id];
  if (!t) return null;
  return <Tooltip term={t.term} definition={t.shortDef} />;
}
```

### Tailwind v4 Compatibility

- Use utility classes only; no `@apply` for dynamic states since Tailwind v4 prefers composition.
- Tooltip visibility toggle should use conditional class merging (`cn()` or template literals) rather than CSS modules.
- The `z-50` class is sufficient; no custom z-index layer needed given the existing layout structure.

### Accessibility

- `aria-label` on the tooltip trigger button.
- `role="tooltip"` + `id` + `aria-describedby` linkage.
- `Escape` key dismisses open tooltip.
- Tooltip bubble must not trap focus.

### Performance

- `lib/terms.ts` is a static object — tree-shaken at build time. No runtime fetch.
- `app/guide/page.tsx` is fully static and can be statically generated (no `dynamic` export needed).
- Consider `export const dynamic = 'force-static'` if any parent layout introduces dynamic rendering.

---

## 8. Acceptance Criteria (from Issue #19)

- [ ] `Tooltip.tsx` works on hover (desktop) and tap (mobile) without layout shift
- [ ] `lib/terms.ts` contains exactly 15 terms with `id`, `term`, `shortDef`, `fullDef`
- [ ] `app/guide/page.tsx` renders all 7 sections with correct metadata
- [ ] Tooltips appear on calculator, announcements, and result pages for key terms
- [ ] "청약 입문 가이드" navigation link added to home page
- [ ] No TypeScript errors; all new components typed
- [ ] Guide page passes Lighthouse accessibility score ≥ 90
