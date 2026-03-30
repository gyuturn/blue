# API 설계 문서

## 개요

청약 매칭 가이드의 API 레이어는 Next.js 14 Route Handlers를 활용하여 공공데이터포털의 한국부동산원 청약홈 분양공고 서비스와 연동합니다. 모든 외부 API 호출은 서버 사이드에서 수행되어 API 키 보안을 보장합니다.

---

## 공공데이터 API 연동 설계

### 사용 API

- **서비스명**: 한국부동산원 청약홈 분양공고 서비스
- **제공기관**: 한국부동산원
- **포털**: [공공데이터포털](https://www.data.go.kr)
- **인증 방식**: API Key (serviceKey 파라미터)
- **응답 형식**: JSON / XML

### 주요 API 엔드포인트 (공공데이터포털)

| 오퍼레이션 | 설명 |
|-----------|------|
| `APT_PUBLIC_ANNOUNCEMENT` | 아파트 분양공고 목록 조회 |
| `APT_PUBLIC_ANNOUNCEMENT_DETAIL` | 아파트 분양공고 상세 조회 |
| `APT_SUPPLY_SCHEDULE` | 청약 일정 조회 |

### 공공데이터 API 호출 예시

```typescript
// 분양공고 목록 조회
const BASE_URL = 'https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1';

const response = await fetch(
  `${BASE_URL}/getAPTLttotPblancDetail?` +
  `serviceKey=${encodeURIComponent(process.env.PUBLIC_DATA_API_KEY!)}&` +
  `page=1&perPage=10&` +
  `cond[SUBSCRPT_AREA_CODE_NM::EQ]=${region}`,
  { next: { revalidate: 3600 } }
);
```

---

## Next.js Route Handlers API 엔드포인트 설계

### 1. GET /api/announcements - 청약 공고 목록 조회

**파일 경로**: `app/api/announcements/route.ts`

#### 요청 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `region` | string | N | - | 지역명 (예: 서울, 경기) |
| `type` | string | N | - | 공급 유형 (APT: 아파트, OFTEL: 오피스텔) |
| `page` | number | N | 1 | 페이지 번호 |
| `limit` | number | N | 10 | 페이지당 항목 수 (최대 20) |
| `status` | string | N | - | 공고 상태 (upcoming: 예정, ongoing: 진행중, closed: 마감) |

#### 응답 형식

```typescript
// 성공 응답 (200 OK)
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "2024-APT-001",
        "name": "래미안 원베일리",
        "region": "서울",
        "district": "서초구",
        "type": "APT",
        "totalUnits": 224,
        "supplyTypes": ["general", "special_newlywed", "special_first_home"],
        "applicationStartDate": "2024-03-15",
        "applicationEndDate": "2024-03-18",
        "announcementDate": "2024-03-01",
        "status": "ongoing",
        "minPrice": 850000000,
        "maxPrice": 1200000000,
        "sourceUrl": "https://www.applyhome.co.kr/..."
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 48,
      "limit": 10
    }
  },
  "cachedAt": "2024-03-15T10:00:00Z"
}

// 에러 응답 (400 Bad Request)
{
  "success": false,
  "error": {
    "code": "INVALID_REGION",
    "message": "유효하지 않은 지역 코드입니다."
  }
}
```

#### 구현 코드 구조

```typescript
// app/api/announcements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchAnnouncements } from '@/lib/api/announcements';
import { validateAnnouncementQuery } from '@/lib/api/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 쿼리 파라미터 추출
    const query = {
      region: searchParams.get('region') ?? undefined,
      type: searchParams.get('type') ?? undefined,
      page: Number(searchParams.get('page') ?? '1'),
      limit: Math.min(Number(searchParams.get('limit') ?? '10'), 20),
      status: searchParams.get('status') ?? undefined,
    };

    // 입력값 검증
    const validation = validateAnnouncementQuery(query);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // 공공데이터 API 호출
    const result = await fetchAnnouncements(query);

    return NextResponse.json(
      { success: true, data: result, cachedAt: new Date().toISOString() },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

### 2. GET /api/announcements/[id] - 특정 공고 상세 조회

**파일 경로**: `app/api/announcements/[id]/route.ts`

#### 요청 파라미터

| 파라미터 | 위치 | 타입 | 필수 | 설명 |
|---------|------|------|------|------|
| `id` | Path | string | Y | 공고 고유 ID |

#### 응답 형식

```typescript
// 성공 응답 (200 OK)
{
  "success": true,
  "data": {
    "id": "2024-APT-001",
    "name": "래미안 원베일리",
    "region": "서울",
    "district": "서초구",
    "address": "서울특별시 서초구 반포동 19",
    "type": "APT",
    "totalUnits": 224,
    "supplyTypes": {
      "general": {
        "units": 112,
        "eligibilityNote": "해당 지역 무주택 세대주"
      },
      "special_newlywed": {
        "units": 45,
        "eligibilityNote": "혼인기간 7년 이내 무주택 신혼부부"
      },
      "special_first_home": {
        "units": 34,
        "eligibilityNote": "생애 최초 주택 구입자"
      },
      "special_multi_child": {
        "units": 33,
        "eligibilityNote": "만 19세 미만 자녀 3명 이상 보유"
      }
    },
    "schedule": {
      "announcementDate": "2024-03-01",
      "applicationStartDate": "2024-03-15",
      "applicationEndDate": "2024-03-18",
      "winnerAnnouncementDate": "2024-03-25",
      "contractStartDate": "2024-04-01",
      "contractEndDate": "2024-04-05",
      "expectedMoveInDate": "2026-12-01"
    },
    "pricing": [
      {
        "type": "84A",
        "supplyArea": 84.97,
        "exclusiveArea": 59.97,
        "price": 950000000
      }
    ],
    "contactInfo": {
      "constructionCompany": "삼성물산",
      "phone": "02-1234-5678",
      "website": "https://..."
    },
    "sourceUrl": "https://www.applyhome.co.kr/...",
    "lastUpdated": "2024-03-15T10:00:00Z"
  }
}

// 공고 없음 (404 Not Found)
{
  "success": false,
  "error": {
    "code": "ANNOUNCEMENT_NOT_FOUND",
    "message": "해당 공고를 찾을 수 없습니다."
  }
}
```

#### 구현 코드 구조

```typescript
// app/api/announcements/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchAnnouncementById } from '@/lib/api/announcements';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: '유효하지 않은 공고 ID입니다.' } },
        { status: 400 }
      );
    }

    const announcement = await fetchAnnouncementById(id);

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: { code: 'ANNOUNCEMENT_NOT_FOUND', message: '해당 공고를 찾을 수 없습니다.' } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: announcement },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## ISR(Incremental Static Regeneration) 전략

### 적용 페이지 및 revalidate 주기

| 페이지 | revalidate | 사유 |
|--------|-----------|------|
| `/announcements` (목록) | 3600초 (1시간) | 공고 데이터 변경 빈도 낮음 |
| `/announcements/[id]` (상세) | 3600초 (1시간) | 상세 데이터도 동일 |
| `/` (메인) | 86400초 (24시간) | 정적 컨텐츠 위주 |

### ISR 구현 예시

```typescript
// app/announcements/page.tsx (Server Component)
export const revalidate = 3600;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: { region?: string; type?: string };
}) {
  // 서버 사이드에서 직접 API 호출 (ISR 캐싱 적용)
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/announcements?${new URLSearchParams(searchParams)}`,
    { next: { revalidate: 3600 } }
  );
  const data = await response.json();

  return <AnnouncementList items={data.items} />;
}
```

### 수동 재검증 (On-Demand Revalidation)

긴급 공고 등록 시 수동으로 캐시를 갱신할 수 있는 엔드포인트를 제공합니다.

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (token !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get('path') ?? '/announcements';
  revalidatePath(path);

  return NextResponse.json({ revalidated: true, path });
}
```

---

## API 키 보안 처리

### 환경변수 관리 원칙

1. **서버 전용 변수**: `PUBLIC_DATA_API_KEY`는 `NEXT_PUBLIC_` 접두사를 사용하지 않아 클라이언트 번들에 포함되지 않습니다.
2. **파일 관리**: `.env.local`은 반드시 `.gitignore`에 포함.
3. **Vercel 배포 환경**: Vercel 대시보드 > Settings > Environment Variables에서 관리.

### 환경변수 파일 구성

```bash
# .env.example (저장소에 커밋 - 실제 값 없음)
PUBLIC_DATA_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
REVALIDATE_TOKEN=your_revalidate_token_here

# .env.local (로컬 전용 - git ignore)
PUBLIC_DATA_API_KEY=실제_API_키
NEXT_PUBLIC_APP_URL=http://localhost:3000
REVALIDATE_TOKEN=임의의_안전한_토큰
```

### API 키 사용 패턴

```typescript
// lib/api/announcements.ts
// 서버 사이드 전용 함수 - 클라이언트에서 임포트 불가
export async function fetchAnnouncements(query: AnnouncementQuery) {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;

  if (!apiKey) {
    throw new Error('PUBLIC_DATA_API_KEY is not configured');
  }

  const url = new URL('https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail');
  url.searchParams.set('serviceKey', apiKey);
  // ... 추가 파라미터

  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return transformResponse(await response.json());
}
```

---

## 에러 처리 전략

### 에러 타입 분류

```typescript
// lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ExternalApiError extends ApiError {
  constructor(message: string) {
    super(502, 'EXTERNAL_API_ERROR', message);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(404, 'NOT_FOUND', message);
  }
}
```

### 공통 에러 핸들러

```typescript
// lib/api/errorHandler.ts
import { NextResponse } from 'next/server';
import { ApiError } from './errors';

export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.statusCode }
    );
  }

  // 예상치 못한 에러
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      },
    },
    { status: 500 }
  );
}
```

### 공공데이터 API 장애 대응

| 상황 | 대응 방식 |
|------|----------|
| API 응답 지연 (>5초) | Timeout 처리 후 에러 반환, ISR 캐시 데이터 서빙 |
| API 키 만료 | 관리자 알림, 503 에러 페이지 표시 |
| 일일 호출 한도 초과 | ISR 캐시로 서비스 유지, 다음날 갱신 |
| API 스펙 변경 | 응답 파싱 에러 로깅, transform.ts 수정 필요 |

### Fallback 전략

```typescript
// 공공데이터 API 호출 실패 시 Fallback
export async function fetchAnnouncementsWithFallback(query: AnnouncementQuery) {
  try {
    return await fetchAnnouncements(query);
  } catch (error) {
    // 캐시된 데이터 반환 시도 (Stale-While-Revalidate)
    console.error('External API failed, serving cached data:', error);
    throw new ExternalApiError('청약 공고 데이터를 불러오는 데 실패했습니다.');
  }
}
```

---

## HTTP 상태 코드 규약

| 상태 코드 | 사용 상황 |
|----------|----------|
| 200 OK | 정상 응답 |
| 400 Bad Request | 잘못된 쿼리 파라미터 |
| 401 Unauthorized | 재검증 토큰 불일치 |
| 404 Not Found | 공고 데이터 없음 |
| 429 Too Many Requests | API 호출 한도 초과 |
| 500 Internal Server Error | 서버 내부 오류 |
| 502 Bad Gateway | 공공데이터 API 연동 실패 |
| 503 Service Unavailable | API 키 만료 등 서비스 불가 상태 |
