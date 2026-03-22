# 툴팁 & 가이드 페이지 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 재사용 Tooltip/Accordion 컴포넌트를 만들고, `/guide` 가이드 페이지를 신설하며, 계산기·공고상세 페이지의 주요 용어에 툴팁을 적용한다.

**Architecture:** `components/ui/` 디렉토리를 신규 생성하여 Tooltip·Accordion 클라이언트 컴포넌트를 배치한다. `/guide` 페이지는 서버 컴포넌트로 SEO를 고려하고 Accordion만 클라이언트 경계로 분리한다. 기존 계산기·공고상세 페이지(`'use client'`)에 Tooltip을 직접 import하여 적용한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, React `useId`/`useState`/`useRef`/`useEffect`

**Spec:** `docs/superpowers/specs/2026-03-22-tooltip-guide-design.md`

---

### Task 1: Tooltip 컴포넌트

**Files:**
- Create: `components/ui/Tooltip.tsx`

- [ ] **Step 1: `components/ui/Tooltip.tsx` 작성**

```tsx
'use client';

import { useState, useRef, useEffect, useId } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  // visible일 때만 리스너 등록해 불필요한 전역 이벤트 방지
  useEffect(() => {
    if (!visible) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible]);

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible((v) => !v)}
      aria-describedby={visible ? tooltipId : undefined}
    >
      {children}
      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 z-50 w-max max-w-[250px] rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-lg transition-opacity duration-150"
        >
          {content}
          {/* 화살표: block으로 transform 적용 보장 */}
          <span className="absolute left-3 top-full block h-2 w-2 -translate-y-1/2 rotate-45 bg-gray-800" />
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: 타입 체크 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/ui/Tooltip.tsx
git commit -m "feat: Tooltip 컴포넌트 구현 (hover+tap, aria, useId)"
```

---

### Task 2: Accordion 컴포넌트

**Files:**
- Create: `components/ui/Accordion.tsx`

- [ ] **Step 1: `components/ui/Accordion.tsx` 작성**

```tsx
'use client';

import { useState } from 'react';

interface AccordionItem {
  term: string;
  definition: string;
}

interface AccordionProps {
  items: AccordionItem[];
}

export function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-gray-100">
      {items.map((item, i) => (
        <div key={item.term}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between py-3 text-left"
            aria-expanded={openIndex === i}
          >
            <span className="font-medium text-gray-800 text-sm">{item.term}</span>
            <svg
              className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIndex === i && (
            <p className="pb-3 text-sm text-gray-600 leading-relaxed">{item.definition}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add components/ui/Accordion.tsx
git commit -m "feat: Accordion 컴포넌트 구현 (용어 사전용)"
```

---

### Task 3: 가이드 페이지

**Files:**
- Create: `app/guide/page.tsx`

- [ ] **Step 1: `app/guide/page.tsx` 작성**

```tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import { Accordion } from '@/components/ui/Accordion';

export const metadata: Metadata = {
  title: '청약 입문 가이드 | 청약블루',
  description: '청약이란 무엇인지, 어떻게 신청하는지 처음부터 알기 쉽게 안내합니다.',
};

const GLOSSARY = [
  { term: '무주택', definition: '세대원 전원이 현재 주택을 소유하지 않은 상태. 청약 가점의 핵심 기준이며 무주택 기간이 길수록 높은 점수를 받습니다.' },
  { term: '부양가족', definition: '주민등록상 같은 세대에 등록된 배우자, 직계존속(부모·조부모), 직계비속(자녀·손자녀). 부양가족이 많을수록 가점이 높아집니다.' },
  { term: '가점제', definition: '무주택기간·부양가족 수·청약통장 가입기간의 점수 합산으로 당첨자를 선정하는 방식. 주로 전용면적 85㎡ 이하 민영주택에 적용됩니다.' },
  { term: '추첨제', definition: '가점과 무관하게 무작위 추첨으로 당첨자를 선정하는 방식. 가점이 낮아도 당첨 기회가 있습니다.' },
  { term: '전용면적', definition: '실제 거주에 사용되는 전용 공간의 면적. 베란다·복도·계단 등 공용 공간은 제외됩니다. 아파트 크기 표기의 기준이 됩니다.' },
  { term: '공급면적', definition: '전용면적에 주거공용면적(계단·복도·엘리베이터 등)을 더한 면적. 옛 표기인 "평수"의 기준이 됩니다.' },
  { term: '분양가', definition: '청약 당첨 시 해당 주택을 구입하기 위해 납부해야 하는 공급 가격. 주변 시세 대비 저렴한 경우가 많아 청약의 핵심 장점입니다.' },
  { term: '청약가점', definition: '무주택기간(최대 32점), 부양가족 수(최대 35점), 청약통장 가입기간(최대 17점)을 합산한 점수. 만점은 84점입니다.' },
  { term: '특별공급', definition: '신혼부부·생애최초·다자녀 등 정책적 배려가 필요한 계층에게 일반 청약과 별도로 물량을 공급하는 제도.' },
  { term: '일반공급', definition: '특별공급을 제외한 일반 청약자를 대상으로 가점제 또는 추첨제로 당첨자를 선정하는 공급 방식.' },
];

const SPECIAL_SUPPLY_TYPES = [
  {
    type: '신혼부부',
    color: 'bg-pink-50 border-pink-200',
    badge: 'bg-pink-100 text-pink-700',
    qualifications: ['혼인 후 7년 이내', '무주택 세대구성원', '소득 기준 충족'],
  },
  {
    type: '생애최초',
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    qualifications: ['생애 처음으로 주택 구입', '청약통장 납입 12회 이상', '근로자·자영업자(소득세 납부 이력)'],
  },
  {
    type: '다자녀',
    color: 'bg-purple-50 border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    qualifications: ['미성년 자녀 3명 이상', '무주택 세대구성원'],
  },
  {
    type: '노부모 부양',
    color: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    qualifications: ['만 65세 이상 직계존속 부양', '3년 이상 동일 세대 등록', '무주택 세대구성원'],
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">청약 입문 가이드</h1>
              <p className="text-sm text-gray-500">청약을 처음 접하는 분들을 위한 기초 안내</p>
            </div>
          </div>
        </div>

        {/* 섹션 1: 청약이란? */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-3">📌 청약이란?</h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            청약이란 새로 짓는 아파트를 분양받기 위해 사전 신청하는 제도입니다. 정부·건설사가 공급하는 주택을 시세보다 저렴하게 구입할 수 있어, 내 집 마련의 가장 보편적인 방법으로 꼽힙니다.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            당첨은 가점(무주택기간, 부양가족, 청약통장 납입기간)이나 추첨으로 결정됩니다. 청약통장을 일찍 만들고 꾸준히 납입할수록 유리합니다.
          </p>
        </section>

        {/* 섹션 2: 청약통장 종류 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🏦 청약통장 종류</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-semibold text-gray-700 pb-2 pr-4">종류</th>
                  <th className="text-left font-semibold text-gray-700 pb-2 pr-4">가입 대상</th>
                  <th className="text-left font-semibold text-gray-700 pb-2">특징</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-blue-700">주택청약종합저축</td>
                  <td className="py-2.5 pr-4 text-gray-600">누구나</td>
                  <td className="py-2.5 text-gray-600">공공+민영 모두 청약 가능. 현재 주력 상품</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-gray-600">청약저축</td>
                  <td className="py-2.5 pr-4 text-gray-600">무주택 세대주</td>
                  <td className="py-2.5 text-gray-500">공공주택 전용, 신규 가입 불가</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-medium text-gray-600">청약예금·부금</td>
                  <td className="py-2.5 pr-4 text-gray-600">누구나</td>
                  <td className="py-2.5 text-gray-500">민영주택 전용, 신규 가입 불가</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">* 지금 통장이 없다면 주택청약종합저축을 개설하세요.</p>
        </section>

        {/* 섹션 3: 청약 신청 절차 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📋 청약 신청 절차</h2>
          <div className="space-y-3">
            {[
              { step: 1, title: '청약통장 개설', desc: '주택청약종합저축에 가입하고 매달 꾸준히 납입합니다. 가입 기간과 납입 횟수가 가점에 반영됩니다.', color: 'bg-blue-600' },
              { step: 2, title: '가점 확인', desc: '청약블루 계산기로 무주택기간·부양가족·통장 가입기간을 입력해 현재 가점을 확인합니다.', color: 'bg-blue-600' },
              { step: 3, title: '공고 확인', desc: '청약홈(applyhome.co.kr)에서 관심 지역의 분양 공고를 확인하고 자격 요건을 검토합니다.', color: 'bg-blue-600' },
              { step: 4, title: '청약 신청', desc: '청약홈 또는 해당 은행 앱에서 온라인으로 신청합니다. 공고문의 청약 일정을 반드시 확인하세요.', color: 'bg-blue-600' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className={`flex-shrink-0 w-7 h-7 ${item.color} text-white rounded-full flex items-center justify-center text-xs font-bold`}>
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 섹션 4: 특별공급 유형 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⭐ 특별공급 유형</h2>
          <p className="text-sm text-gray-500 mb-4">일반 청약보다 경쟁이 낮은 경우가 많습니다. 해당되는지 확인해 보세요.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SPECIAL_SUPPLY_TYPES.map((item) => (
              <div key={item.type} className={`rounded-xl border p-4 ${item.color}`}>
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${item.badge}`}>
                  {item.type}
                </span>
                <ul className="space-y-1">
                  {item.qualifications.map((q) => (
                    <li key={q} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <span className="text-gray-400 mt-0.5 flex-shrink-0">•</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 섹션 5: 주요 용어 사전 */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">📖 주요 용어 사전</h2>
          <p className="text-sm text-gray-500 mb-4">용어를 클릭하면 설명을 볼 수 있습니다.</p>
          <Accordion items={GLOSSARY} />
        </section>

        {/* 하단 CTA */}
        <div className="space-y-3 mb-6">
          <Link
            href="/calculator"
            className="block w-full text-center py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-colors"
          >
            내 청약 가점 계산하기 →
          </Link>
          <Link
            href="/announcements"
            className="block w-full text-center py-3.5 bg-white hover:bg-gray-50 text-blue-600 font-semibold rounded-xl shadow-sm border border-blue-200 transition-colors"
          >
            청약 공고 보기
          </Link>
        </div>

        <p className="text-xs text-gray-400 text-center">
          본 가이드는 참고용이며 정확한 자격 요건은 공고문을 확인하세요.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: 타입 체크 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 브라우저에서 `/guide` 접속해 5개 섹션 표시, 아코디언 동작 확인**

- [ ] **Step 4: 커밋**

```bash
git add app/guide/page.tsx
git commit -m "feat: /guide 청약 입문 가이드 페이지 구현"
```

---

### Task 4: Header + 홈 페이지 가이드 링크 추가

**Files:**
- Modify: `components/layout/Header.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: `components/layout/Header.tsx`에 가이드 링크 추가**

`components/layout/Header.tsx`의 기존 `<nav>` 블록(현재 "공고목록", "자격계산기" 2개 링크)을 아래로 교체:

```tsx
// 기존 코드의 <nav> 섹션을 아래로 교체
<nav className="flex items-center gap-6">
  <Link href="/guide" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
    가이드
  </Link>
  <Link href="/announcements" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
    공고목록
  </Link>
  <Link href="/calculator" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
    자격계산기
  </Link>
</nav>
```

- [ ] **Step 2: `app/page.tsx` CTA 버튼 섹션에 가이드 링크 추가**

기존 CTA 버튼 블록(`{/* CTA Buttons */}`) 내 링크 2개 아래에 추가:

```tsx
<Link
  href="/guide"
  className="block w-full text-center py-3.5 bg-white hover:bg-gray-50 text-gray-600 font-semibold rounded-xl shadow-sm border border-gray-200 transition-colors duration-200"
>
  청약 입문 가이드 보기
</Link>
```

- [ ] **Step 3: 타입 체크 확인**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: 커밋**

```bash
git add components/layout/Header.tsx app/page.tsx
git commit -m "feat: Header 및 홈 페이지에 가이드 링크 추가"
```

---

### Task 5: 계산기 페이지 툴팁 적용

**Files:**
- Modify: `app/calculator/page.tsx`

> **참고**: `app/calculator/page.tsx`는 이미 `'use client'`이므로 Tooltip import 후 바로 사용 가능.

- [ ] **Step 1: Tooltip import 추가**

파일 상단 import 목록에 추가:
```tsx
import { Tooltip } from '@/components/ui/Tooltip';
```

- [ ] **Step 2: Step1 — 무주택 여부·무주택기간 툴팁 추가**

`Step1` 컴포넌트의 `<h2>무주택 여부</h2>` 부분을 아래로 교체:

```tsx
<h2 className="text-lg font-bold text-gray-900 mb-1">
  <Tooltip content="세대원 전원이 현재 주택을 소유하지 않은 상태를 말합니다. 세대원 중 한 명이라도 주택을 소유하면 무주택자로 인정되지 않습니다.">
    <span>무주택 여부 <span className="text-blue-400 text-base" aria-label="도움말">ⓘ</span></span>
  </Tooltip>
</h2>
```

`무주택 기간` label도 교체:

```tsx
<label className="block text-sm font-semibold text-gray-700 mb-2">
  <Tooltip content="무주택 상태가 지속된 기간입니다. 최대 32점이며 16년 이상이면 만점입니다.">
    <span>무주택 기간 <span className="text-blue-400" aria-label="도움말">ⓘ</span></span>
  </Tooltip>
</label>
```

- [ ] **Step 3: Step2 — 부양가족 툴팁 추가**

`Step2`의 `<h2>부양가족 수</h2>` 교체:

```tsx
<h2 className="text-lg font-bold text-gray-900 mb-1">
  <Tooltip content="주민등록상 같은 세대에 등록된 배우자, 직계존속(부모·조부모), 직계비속(자녀·손자녀)을 포함합니다. 최대 35점이며 6명 이상이면 만점입니다.">
    <span>부양가족 수 <span className="text-blue-400 text-base" aria-label="도움말">ⓘ</span></span>
  </Tooltip>
</h2>
```

- [ ] **Step 4: Step3 — 청약통장·납입횟수·예치금 툴팁 추가**

`Step3`의 `<h2>청약통장 정보</h2>` 교체:

```tsx
<h2 className="text-lg font-bold text-gray-900 mb-1">
  <Tooltip content="주택청약종합저축 등 청약 신청을 위한 전용 통장입니다. 가입 기간과 납입 횟수가 가점에 반영됩니다.">
    <span>청약통장 정보 <span className="text-blue-400 text-base" aria-label="도움말">ⓘ</span></span>
  </Tooltip>
</h2>
```

`납입 횟수` label 교체:

```tsx
<label className="block text-sm font-semibold text-gray-700 mb-1.5">
  <Tooltip content="청약통장에 납입한 총 횟수입니다. 생애최초 특별공급은 12회 이상, 가점 만점(17점)은 24회 이상이 필요합니다.">
    <span>납입 횟수 <span className="text-blue-400" aria-label="도움말">ⓘ</span></span>
  </Tooltip>
</label>
```

`예치 금액` label 교체:

```tsx
<label className="block text-sm font-semibold text-gray-700 mb-1.5">
  <Tooltip content="민영주택 청약 시 필요한 지역별 최소 예치 금액입니다. 서울 85㎡ 초과는 1,500만원 이상이 필요합니다.">
    <span>예치 금액 <span className="text-blue-400" aria-label="도움말">ⓘ</span></span>
  </Tooltip>
</label>
```

- [ ] **Step 5: Step5 — 특별공급·신혼부부·생애최초·다자녀 툴팁 추가**

`Step5`의 `<h2>혼인 및 자녀</h2>` 교체:

```tsx
<h2 className="text-lg font-bold text-gray-900 mb-1">
  <Tooltip content="특별공급 자격 판정에 사용됩니다. 신혼부부·생애최초·다자녀 등 정책적 배려 계층에게 별도 물량을 공급하는 제도입니다.">
    <span>혼인 및 자녀 <span className="text-blue-400 text-base" aria-label="도움말">ⓘ</span></span>
  </Tooltip>
</h2>
```

`혼인 여부` label 교체:

```tsx
<p className="text-sm font-semibold text-gray-700 mb-2">
  <Tooltip content="혼인 후 7년 이내이면 신혼부부 특별공급 자격이 생깁니다.">
    <span>혼인 여부 <span className="text-blue-400" aria-label="도움말">ⓘ</span></span>
  </Tooltip>
</p>
```

`미성년 자녀 수` label 교체:

```tsx
<p className="text-sm font-semibold text-gray-700 mb-2">
  <Tooltip content="만 19세 미만 자녀 수입니다. 3명 이상이면 다자녀 특별공급 자격이 생깁니다.">
    <span>미성년 자녀 수 <span className="text-blue-400" aria-label="도움말">ⓘ</span></span>
  </Tooltip>{' '}
  <span className="font-normal text-gray-400">(만 19세 미만)</span>
</p>
```

- [ ] **Step 6: 타입 체크 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 7: 브라우저에서 계산기 각 Step의 툴팁 동작 확인 (hover/tap)**

- [ ] **Step 8: 커밋**

```bash
git add app/calculator/page.tsx
git commit -m "feat: 계산기 페이지 주요 용어 툴팁 추가"
```

---

### Task 6: 공고 상세 페이지 툴팁 적용

**Files:**
- Modify: `app/announcements/[id]/page.tsx`

> **참고**: 툴팁 JSX는 반드시 `if (!announcement)` guard 이후의 main return 블록 안에만 위치해야 합니다.

- [ ] **Step 1: Tooltip import 추가**

```tsx
import { Tooltip } from '@/components/ui/Tooltip';
```

- [ ] **Step 2: 공급 정보 섹션 — 기존 레이아웃 유지, h2 제목에 툴팁 용어 추가**

기존 `{/* 공급 정보 */}` 섹션의 세대수 표시 행은 그대로 두고, `<h2>공급 정보</h2>`만 아래로 교체한다. 전용면적·분양가는 `Announcement` 타입에 데이터가 없으므로 행을 추가하지 않고 제목 옆에 툴팁 링크로만 노출한다:

```tsx
<h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
  공급 정보
  <Tooltip content="전용면적: 실제 거주 공간의 면적(베란다 제외). 분양가: 청약 당첨 시 납부 금액. 상세 내용은 공고문을 확인하세요.">
    <span className="text-blue-400 font-normal cursor-help text-xs" aria-label="도움말">전용면적·분양가 ⓘ</span>
  </Tooltip>
</h2>
```

- [ ] **Step 3: 내 청약 분석 섹션에 가점제/추첨제 툴팁 추가**

`{/* 내 청약 분석 */}` 섹션의 `<h2>내 청약 분석</h2>` 교체. 툴팁은 h2 안에 중첩하지 않고 h2 바로 옆 sibling span으로 배치한다:

```tsx
<div className="flex items-center gap-2 mb-3">
  <h2 className="text-sm font-bold text-blue-800">내 청약 분석</h2>
  <Tooltip content="가점제: 무주택기간·부양가족·청약통장 점수로 당첨자 선정. 추첨제: 가점 없이 무작위 추첨으로 선정.">
    <span className="text-blue-400 font-normal text-xs cursor-help" aria-label="도움말">가점제·추첨제 ⓘ</span>
  </Tooltip>
</div>
```

기존 코드에서 `<h2 className="text-sm font-bold text-blue-800 mb-3">내 청약 분석</h2>` 한 줄을 위의 `<div>...</div>` 블록으로 교체한다.

- [ ] **Step 4: 타입 체크 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 5: 브라우저에서 공고 상세 페이지 툴팁 동작 확인**

- [ ] **Step 6: 커밋**

```bash
git add app/announcements/[id]/page.tsx
git commit -m "feat: 공고 상세 페이지 분양가·전용면적·가점제 툴팁 추가"
```
