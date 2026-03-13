# Issue #14 기술 설계: 공고 상세 페이지

## 개요

`app/announcements/[id]/page.tsx` 동적 라우트를 추가하여 앱 내 공고 상세 페이지를 구현합니다.

## 아키텍처

### 라우팅 구조
```
app/
  announcements/
    page.tsx          # 기존 목록 페이지
    [id]/
      page.tsx        # 신규 상세 페이지
```

### 데이터 전달 전략

공고 ID 기반으로 상세 데이터를 가져오는 방법:

**Option A: API 재호출** — `/api/announcements?id=[id]` 파라미터 추가 (서버 부하)

**Option B: sessionStorage 경유** — 목록 페이지에서 클릭 시 선택한 공고 데이터를 `sessionStorage.setItem('selectedAnnouncement', JSON.stringify(announcement))`로 저장, 상세 페이지에서 읽기

**선택: Option B** — 이미 목록 페이지에서 데이터를 가져오므로 중복 API 호출 불필요. 구현 단순.

### sessionStorage 스키마 추가
```ts
// 기존 scoreData 외에 추가
sessionStorage.setItem('selectedAnnouncement', JSON.stringify(announcement));
```

## 구현 상세

### 1. 공고 목록 카드 클릭 처리 (`app/announcements/page.tsx`)

```tsx
// AnnouncementCard에 onClick 추가
function AnnouncementCard({ announcement, scoreData }) {
  const router = useRouter();

  const handleCardClick = () => {
    sessionStorage.setItem('selectedAnnouncement', JSON.stringify(announcement));
    router.push(`/announcements/${announcement.id}`);
  };

  return (
    <div onClick={handleCardClick} className="... cursor-pointer hover:shadow-md transition-shadow">
      {/* 기존 내용 */}
    </div>
  );
}
```

### 2. 상세 페이지 (`app/announcements/[id]/page.tsx`)

```tsx
'use client';

export default function AnnouncementDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [scoreData, setScoreData] = useState<StoredScoreData | null>(null);

  useEffect(() => {
    // sessionStorage에서 공고 데이터 로드
    const stored = sessionStorage.getItem('selectedAnnouncement');
    if (!stored) {
      router.push('/announcements');
      return;
    }
    const parsed = JSON.parse(stored) as Announcement;
    // id 검증
    if (parsed.id !== params.id) {
      router.push('/announcements');
      return;
    }
    setAnnouncement(parsed);

    // scoreData 로드
    const score = sessionStorage.getItem('scoreData');
    if (score) setScoreData(JSON.parse(score));
  }, [params.id, router]);
}
```

### 3. 목록 복귀 시 스크롤 위치 복원

Next.js App Router는 기본적으로 `router.back()`으로 돌아올 때 스크롤 위치를 복원합니다.
별도 처리 불필요.

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `app/announcements/page.tsx` | AnnouncementCard에 클릭 핸들러 + sessionStorage 저장 추가 |
| `app/announcements/[id]/page.tsx` | 신규 생성 |

## 리스크

- sessionStorage 직접 URL 접근 시 데이터 없음 → `/announcements`로 리다이렉트로 처리
- `params.id`와 저장된 공고 id 불일치 → 동일하게 리다이렉트

## 복잡도

**Low-Medium** — 신규 페이지 1개 생성 + 기존 카드 컴포넌트 수정
