# Issue #16 기술 설계: 특별공급 자격 판정 정확화

## 개요

신혼부부(혼인 7년 이내), 다자녀(미성년 자녀 3명 이상) 기준을 실제 제도에 맞게 구현합니다.

## 타입 변경 (`types/index.ts`)

```ts
export interface EligibilityInput {
  // ... 기존 필드 유지 ...

  // 혼인/자녀 — 기존
  isMarried: boolean;
  hasRecentChild: boolean;

  // 혼인/자녀 — 신규
  marriageDate: string;    // YYYY-MM, 기혼일 때만 유효
  childrenCount: number;   // 미성년(만 19세 미만) 자녀 수
}
```

## 기본값 변경 (`app/calculator/page.tsx`)

```ts
const defaultInput: EligibilityInput = {
  // ... 기존 ...
  marriageDate: '',
  childrenCount: 0,
};
```

## 계산 로직 변경 (`lib/calculator.ts`)

### 신혼부부: 혼인 7년 이내 계산

```ts
function calcMarriageYears(marriageDate: string): number {
  if (!marriageDate) return Infinity;
  const [year, month] = marriageDate.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const now = new Date();
  return (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

// 신혼부부: 기혼 + 혼인 7년 이내
const newlyWed = input.isMarried && calcMarriageYears(input.marriageDate) <= 7;
```

### 다자녀: childrenCount 직접 사용

```ts
// 다자녀: 미성년 자녀 3명 이상
const multiChild = input.childrenCount >= 3;
```

## UI 변경 (`app/calculator/page.tsx` — Step 5)

```tsx
// 혼인 날짜: isMarried=true일 때만 표시
{isMarried && (
  <div>
    <label>혼인 날짜</label>
    <input type="month" max={today} value={marriageDate}
      onChange={(e) => onChange('marriageDate', e.target.value)} />
    {marriageYearsHint && <p>💡 {marriageYearsHint}</p>}
  </div>
)}

// 미성년 자녀 수: ± 버튼
<div>
  <label>미성년 자녀 수 (만 19세 미만)</label>
  <PlusMinusInput value={childrenCount}
    onChange={(v) => onChange('childrenCount', v)} />
  <p>{childrenCount >= 3 ? '💡 다자녀 특공 자격 있음' : `💡 ${3 - childrenCount}명 더 있으면 자격`}</p>
</div>
```

## 결과 페이지 변경 (`app/result/page.tsx`)

특별공급 카드 아래에 판정 근거 문구 추가:
- 신혼부부: "혼인 N년 N개월" 또는 "혼인 7년 초과 — 자격 없음"
- 다자녀: "미성년 자녀 N명"

## 하위 호환 처리

기존 sessionStorage에 `marriageDate`, `childrenCount`가 없을 경우:
- `marriageDate`: `''` → 신혼부부 판정 시 미입력으로 처리 (기혼이어도 미입력 시 false)
- `childrenCount`: `undefined ?? 0`

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `types/index.ts` | EligibilityInput에 marriageDate, childrenCount 추가 |
| `lib/calculator.ts` | calculateSpecialSupply 로직 수정 |
| `app/calculator/page.tsx` | Step 5 UI — 혼인 날짜, 자녀 수 입력 추가 |
| `app/result/page.tsx` | 특별공급 판정 근거 문구 추가 |

## 복잡도

**Medium** — 타입 변경이 여러 파일에 파급되므로 주의 필요
