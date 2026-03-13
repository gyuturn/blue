# Issue #12 기술 설계: 청약통장 입력 UX 개선

## 개요

`app/calculator/page.tsx`의 Step3 컴포넌트에서 숫자 입력 필드(납입 횟수, 예치 금액)의 UX를 개선합니다.

## 구현 전략

### 1. 예치 금액 — 천단위 콤마 포맷 + 원 단위 변환

`input type="number"`는 브라우저 기본 스피너와 포맷 제한이 있어 UX 커스터마이징이 불리합니다.
`type="text"` + 입력 파싱 방식으로 교체합니다.

```tsx
// 표시용 포맷 함수
function formatWithComma(value: number | ''): string {
  if (value === '' || value === 0) return '';
  return value.toLocaleString('ko-KR');
}

// 파싱: 콤마 제거 후 숫자 변환
function parseCommaNumber(raw: string): number {
  return Number(raw.replace(/,/g, '')) || 0;
}
```

**상태 분리:**
- 내부 상태: `EligibilityInput.subscriptionBalance: number` 유지 (0 = 미입력으로 처리)
- 표시 상태: `displayBalance: string` — 콤마 포함 문자열

**실시간 원 변환:**
```tsx
// 만원 → 원 변환 표시
const wonDisplay = balance > 0
  ? `= ${(balance * 10000).toLocaleString('ko-KR')}원`
  : null;
```

---

### 2. 납입 횟수 — 기간 환산 안내

```tsx
function formatMonthsToYears(months: number): string {
  if (months <= 0) return '';
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (years === 0) return `${months}회 = ${months}개월`;
  if (remaining === 0) return `${months}회 = 약 ${years}년`;
  return `${months}회 = 약 ${years}년 ${remaining}개월`;
}
```

---

### 3. 초기값 처리

현재 `defaultInput`의 `subscriptionPaymentCount: 0`, `subscriptionBalance: 0`은 유지하되,
표시 레이어에서 `value === 0`일 때 빈 문자열로 렌더링합니다.

```tsx
// 납입 횟수: 0이면 빈 값 표시
value={subscriptionPaymentCount === 0 ? '' : subscriptionPaymentCount}
```

타입 변경 없이 기존 계산 로직과 호환성 유지.

---

## 변경 파일

| 파일 | 변경 범위 |
|------|-----------|
| `app/calculator/page.tsx` | Step3 컴포넌트만 수정 |

## 리스크

- `type="text"` 변경 시 모바일 키패드가 숫자패드로 열리지 않을 수 있음 → `inputMode="numeric"` 속성 추가로 해결
- 콤마 파싱 중 비숫자 문자 입력 방어 처리 필요

## 복잡도

**Low** — 단일 컴포넌트, 순수 클라이언트 로직, 외부 의존성 없음
