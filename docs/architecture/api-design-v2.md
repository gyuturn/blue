# 청약홈 API 연동 설계 v2

## 개요

공공데이터포털 한국부동산원 청약홈 분양공고 서비스(ApplyhomeInfoDetailSvc)와의 실제 연동을 위한 기술 설계 문서입니다.
이 문서는 기존 api-design.md를 보완하며, 실제 API 응답 필드명과 운영 환경에서 필요한 구체적인 구현 전략을 다룹니다.

---

## API 엔드포인트

### 분양 공고 목록 (APT 기준)

- **URL**: `https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail`
- **Method**: GET
- **설명**: APT 분양공고의 상세 정보 목록을 제공합니다 (주택관리번호, 공고번호, 공급지역명, 모집공고일 등)

#### 요청 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `serviceKey` | String | Y | 인증키 (URL 인코딩 형식) |
| `returnType` | String | N | 응답 형식: JSON (기본값) 또는 XML |
| `page` | Integer | N | 페이지 번호 (기본값: 1) |
| `perPage` | Integer | N | 페이지당 건수 (기본값: 10, 최대 100) |
| `cond[SUBSCRPT_AREA_CODE_NM::EQ]` | String | N | 공급지역명 (예: 서울특별시) |
| `cond[HOUSE_NM::LIKE]` | String | N | 주택명 부분 검색 |
| `cond[HOUSE_SECD::EQ]` | String | N | 주택구분코드 (01: APT, 09: 민간사전청약, 10: 신혼희망타운) |
| `cond[RCRIT_PBLANC_DE::GTE]` | String | N | 모집공고일 시작 (YYYYMMDD) |
| `cond[RCRIT_PBLANC_DE::LTE]` | String | N | 모집공고일 종료 (YYYYMMDD) |
| `cond[HOUSE_MANAGE_NO::EQ]` | String | N | 주택관리번호 |
| `cond[PBLANC_NO::EQ]` | String | N | 공고번호 |

#### 요청 예시

```
GET https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/getAPTLttotPblancDetail
  ?serviceKey=YOUR_ENCODED_API_KEY
  &returnType=JSON
  &page=1
  &perPage=20
  &cond[SUBSCRPT_AREA_CODE_NM::EQ]=서울특별시
```

---

## 응답 필드 매핑

Swagger UI (https://infuser.odcloud.kr/api/stages/37000) 및 실제 API 호출을 통해 확인된 응답 필드입니다.

### API 응답 필드 -> 앱 타입 매핑

| API 응답 필드명 | 타입 | 설명 | 앱 타입 필드 |
|----------------|------|------|-------------|
| `HOUSE_MANAGE_NO` | String | 주택관리번호 (고유 ID) | `id` |
| `PBLANC_NO` | String | 공고번호 | - (참조용) |
| `HOUSE_NM` | String | 주택명 (단지명) | `complexName` |
| `HOUSE_SECD_NM` | String | 주택구분명 (예: 민영주택, 공공분양) | `houseType` |
| `SUBSCRPT_AREA_CODE_NM` | String | 공급지역명 (시도 단위) | `region` |
| `HSSPLY_ADRES` | String | 공급위치 (주소) | - (확장 가능) |
| `TOT_SUPLY_HSHLDCO` | Integer | 공급세대수 합계 | - (확장 가능) |
| `BSNS_MBY_NM` | String | 사업주체명 (건설사) | `builder` |
| `MDHS_TELNO` | String | 문의처 전화번호 | - (확장 가능) |
| `RCRIT_PBLANC_DE` | String | 모집공고일 (YYYYMMDD) | `announcementDate` |
| `RCEPT_BGNDE` | String | 청약접수시작일 (YYYYMMDD) | `subscriptionStartDate` |
| `RCEPT_ENDDE` | String | 청약접수종료일 (YYYYMMDD) | `subscriptionEndDate` |
| `PRZWNER_PRESNATN_DE` | String | 당첨자발표일 (YYYYMMDD) | - (확장 가능) |
| `CNTRCT_CNCLS_BGNDE` | String | 계약시작일 (YYYYMMDD) | - (확장 가능) |
| `CNTRCT_CNCLS_ENDDE` | String | 계약종료일 (YYYYMMDD) | - (확장 가능) |
| `MVN_PREARNGE_YM` | String | 입주예정월 (YYYYMM) | - (확장 가능) |
| `PBLANC_URL` | String | 분양공고 URL | `pdfUrl` |

### 날짜 형식 변환

공공 API의 날짜는 `YYYYMMDD` (예: `20260224`) 형식으로 반환됩니다.
앱 내부에서는 `YYYY-MM-DD` (예: `2026-02-24`) 형식으로 변환하여 사용합니다.

```typescript
function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return '';
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
```

### 현재 코드와의 차이점

현재 `route.ts`는 `SUBSCRPT_RCPT_BGNDE`, `SUBSCRPT_RCPT_ENDDE` 필드명을 사용하지만,
실제 Swagger UI 명세에서 확인된 필드명은 `RCEPT_BGNDE`, `RCEPT_ENDDE`입니다.

```typescript
// 현재 코드 (주의: 실제 API 필드명과 다를 수 있음)
subscriptionStartDate: item.SUBSCRPT_RCPT_BGNDE ?? '',
subscriptionEndDate: item.SUBSCRPT_RCPT_ENDDE ?? '',

// 실제 API 필드명 (Swagger UI 기준)
subscriptionStartDate: item.RCEPT_BGNDE ?? '',
subscriptionEndDate: item.RCEPT_ENDDE ?? '',
```

실제 API 키 발급 후 응답 필드명을 직접 확인하여 매핑을 최종 검증할 것을 권장합니다.

---

## 지역코드 매핑

`SUBSCRPT_AREA_CODE_NM` 파라미터에 사용하는 공급지역명 (시도 단위 행정구역명 사용).

| 시도명 | API 파라미터 값 |
|--------|----------------|
| 서울 | 서울특별시 |
| 경기 | 경기도 |
| 인천 | 인천광역시 |
| 부산 | 부산광역시 |
| 대구 | 대구광역시 |
| 광주 | 광주광역시 |
| 대전 | 대전광역시 |
| 울산 | 울산광역시 |
| 세종 | 세종특별자치시 |
| 강원 | 강원특별자치도 |
| 충북 | 충청북도 |
| 충남 | 충청남도 |
| 전북 | 전북특별자치도 |
| 전남 | 전라남도 |
| 경북 | 경상북도 |
| 경남 | 경상남도 |
| 제주 | 제주특별자치도 |

### 프론트엔드 표시명 -> API 파라미터 변환

```typescript
const REGION_MAP: Record<string, string> = {
  '서울': '서울특별시',
  '경기': '경기도',
  '인천': '인천광역시',
  '부산': '부산광역시',
  '대구': '대구광역시',
  '광주': '광주광역시',
  '대전': '대전광역시',
  '울산': '울산광역시',
  '세종': '세종특별자치시',
  '강원': '강원특별자치도',
  '충북': '충청북도',
  '충남': '충청남도',
  '전북': '전북특별자치도',
  '전남': '전라남도',
  '경북': '경상북도',
  '경남': '경상남도',
  '제주': '제주특별자치도',
};

// 프론트에서 '서울특별시' 전체 이름을 보내는 경우 그대로 사용
function resolveRegionParam(region: string): string {
  return REGION_MAP[region] ?? region;
}
```

---

## 에러 처리 전략

### 타임아웃

공공데이터 API는 평균 1~3초 응답 지연이 발생할 수 있으며, 최대 5초 타임아웃을 적용합니다.

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    next: { revalidate: 3600 },
  });
  clearTimeout(timeoutId);
  // ...
} catch (error) {
  clearTimeout(timeoutId);
  if (error instanceof Error && error.name === 'AbortError') {
    // 타임아웃 처리: Mock 데이터 fallback
    console.warn('[API] Timeout: serving mock data');
    return [];
  }
  throw error;
}
```

### Rate Limit 대응

- 공공데이터포털 무료 API: 일 1,000회 호출 제한
- ISR 캐시(revalidate: 3600)로 실제 외부 호출 횟수를 최소화
- 429 응답 수신 시 캐시된 데이터로 서비스 지속

```typescript
if (response.status === 429) {
  console.error('[API] Rate limit exceeded');
  return []; // Mock fallback 트리거
}
```

### 서비스 점검 대응

- 공공데이터 API 점검 시간대: 주로 새벽 2~6시 (실제 확인 필요)
- 503 응답 수신 시 ISR 캐시의 stale 데이터로 서비스 지속
- `next: { revalidate: 3600 }` 설정으로 이전 성공 응답을 캐시에 보관

```typescript
if (!response.ok) {
  console.error(`[API] Error: ${response.status} ${response.statusText}`);
  return []; // Mock fallback 트리거
}
```

### Fallback 전략 전체 흐름

```
1. 공공 API 호출 시도
2. 성공 -> 실제 데이터 반환 (isMock: false)
3. 실패 (타임아웃/에러/Rate Limit) -> []  반환
4. 빈 배열이면 Mock 데이터 사용 (isMock: true)
5. 지역 필터 적용 후 응답
```

---

## 캐싱 전략

### Route Handler 레벨 캐싱

```typescript
// fetch 옵션에 revalidate 설정
const response = await fetch(url, {
  next: { revalidate: 3600 }, // 1시간 캐시
});
```

### 캐시 키 설계

공공 API 호출은 파라미터 조합에 따라 캐시가 구분됩니다.

| 캐시 키 | 설명 | revalidate |
|--------|------|-----------|
| `getAPTLttotPblancDetail?page=1&perPage=20` | 전체 목록 | 3600초 |
| `getAPTLttotPblancDetail?...&cond[SUBSCRPT_AREA_CODE_NM::EQ]=서울특별시` | 서울 목록 | 3600초 |
| `getAPTLttotPblancDetail?...&cond[SUBSCRPT_AREA_CODE_NM::EQ]=경기도` | 경기 목록 | 3600초 |

### 수동 캐시 무효화

긴급 공고 추가 등 즉각적인 갱신이 필요한 경우:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token');
  if (token !== process.env.REVALIDATE_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  revalidatePath('/api/announcements');
  return Response.json({ revalidated: true });
}
```

---

## 접수 상태 계산 로직

API 응답에는 접수 상태 필드가 없으므로, 날짜를 비교하여 클라이언트/서버에서 계산합니다.

### 상태 정의

| 상태 | 조건 | 표시값 |
|------|------|--------|
| 접수중 | `startDate <= today <= endDate` | `접수중` |
| 접수예정 | `today < startDate` | `접수예정` |
| 마감 | `today > endDate` | `마감` |
| 미정 | `startDate 또는 endDate 없음` | `일정미정` |

### 구현 코드

```typescript
type AnnouncementStatus = '접수중' | '접수예정' | '마감' | '일정미정';

function getSubscriptionStatus(
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
): AnnouncementStatus {
  if (!startDate || !endDate) return '일정미정';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (today < start) return '접수예정';
  if (today > end) return '마감';
  return '접수중';
}
```

### status 파라미터 필터링

`GET /api/announcements?status=접수중` 쿼리 처리:

```typescript
const STATUS_FILTER_MAP = {
  '접수중': (a: Announcement) => getSubscriptionStatus(a.subscriptionStartDate, a.subscriptionEndDate) === '접수중',
  '접수예정': (a: Announcement) => getSubscriptionStatus(a.subscriptionStartDate, a.subscriptionEndDate) === '접수예정',
  '마감': (a: Announcement) => getSubscriptionStatus(a.subscriptionStartDate, a.subscriptionEndDate) === '마감',
};

// route.ts에서 적용
const status = searchParams.get('status');
if (status && STATUS_FILTER_MAP[status]) {
  announcements = announcements.filter(STATUS_FILTER_MAP[status]);
}
```

---

## 환경변수 구성

```bash
# .env.local (git ignore - 로컬 및 배포 환경)
PUBLIC_DATA_API_KEY=실제_API_키_여기에_입력

# Vercel 배포 시: Settings > Environment Variables에서 설정
```

### API 키 발급 절차

1. [공공데이터포털](https://www.data.go.kr) 회원가입
2. **한국부동산원_청약홈 분양정보 조회 서비스** 검색
3. 활용신청 -> 자동 승인 (일반적으로 즉시 발급)
4. 마이페이지 > 개발계정 > 일반 인증키(Encoding) 복사
5. `.env.local`에 `PUBLIC_DATA_API_KEY=발급받은_키` 설정

### 주의사항

- `serviceKey` 파라미터 전달 시 URL 인코딩된 키를 사용해야 합니다
- `URLSearchParams`를 사용하면 자동으로 인코딩됩니다
- `NEXT_PUBLIC_` 접두사 없이 서버 전용 변수로 관리합니다 (클라이언트 노출 방지)

---

## 관련 문서

- [공공데이터포털 청약홈 API](https://www.data.go.kr/data/15098547/openapi.do)
- [한국부동산원 공공데이터 자료실](https://www.reb.or.kr/reb/na/ntt/selectNttList.do?mi=10251&bbsId=1268)
- [기존 API 설계 문서](./api-design.md)
- [시스템 아키텍처 문서](./system-architecture.md)
