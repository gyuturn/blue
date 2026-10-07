# Issue #108 기술 설계: 지도로 청약 공고 보기

## 개요

공고 목록에 세 번째 탭 **[🗺 지도]**를 추가합니다. 지역 필터와 마감 포함 토글이 걸린 공고를 카카오맵 위에 핀으로 보여주고, 핀을 누르면 요약 카드와 기존 상세 바텀시트로 이어집니다.

## 지도 SDK 선택: 카카오맵 JS SDK

- 카카오 로그인에 쓰는 개발자 앱을 그대로 씁니다. JavaScript 키와 Web 플랫폼 도메인만 추가하면 됩니다.
- 국내 주소·지명 정확도가 높고, 주소 → 좌표 변환(Local API)도 같은 앱으로 처리됩니다.
- 대안인 네이버 지도(NCP)는 네이버 클라우드 가입과 결제 수단 등록이 필요해서 제외합니다.

## 데이터 흐름

```
[지도 탭] ──GET /api/announcements/coords?region=경기도──▶ [서버]
                                                       ├ fetchAnnouncementsFromAPI(region)  (Next 데이터 캐시 1시간)
                                                       └ 공고 주소마다 geocodeAddress()       (Next 데이터 캐시 30일)
          ◀── { data: { [공고ID]: { lat, lng } }, enabled } ──
```

- **좌표 변환은 서버에서만** 합니다. REST 키를 노출하지 않고, 클라이언트가 임의 주소를 보낼 수 없게 공고 ID 기준으로만 응답합니다(카카오 쿼터 오남용 방지).
- **캐시**: 카카오 Local API 호출에 `next: { revalidate: 30일 }`을 걸어 같은 주소는 Vercel 데이터 캐시에서 재사용합니다. DB 테이블/마이그레이션 없이 시작하고, 필요해지면 Supabase 캐시로 옮깁니다.
- **동시성**: 공고가 많아도 카카오 호출은 5개씩 나눠 보냅니다.

### API

```
GET /api/announcements/coords?region=<지역명>
Response: {
  enabled: boolean,                         // 서버 키가 없으면 false
  data: Record<string, { lat: number; lng: number }>
}
```

목록 API와 같은 공고 조회 로직(실데이터 → 실패 시 샘플 데이터)을 쓰도록 `loadAnnouncements(region)`로 분리해 두 라우트가 공유합니다.

### 주소 → 좌표 (`lib/geocode.ts`)

청약홈 공급위치는 `충청남도 천안시 서북구 성성동 일원 (성성지구 B-1블록)`처럼 지번 대신 "일원", 괄호 설명이 붙는 경우가 많습니다. 그래서 검색어 후보를 순서대로 시도합니다.

1. 원문 주소
2. 괄호 내용 제거
3. `일원`/`외 N필지` 이후 제거
4. 위 후보로 주소 검색(`/v2/local/search/address.json`)이 모두 실패하면 마지막 후보로 키워드 검색(`/v2/local/search/keyword.json`)

후보 생성(`buildGeocodeQueries`)은 순수 함수로 분리해 단위 테스트합니다.

## 클라이언트 (`components/announcements/AnnouncementMap.tsx`)

- `NEXT_PUBLIC_KAKAO_JS_KEY`가 있을 때만 지도 탭을 보여줍니다. 키가 없는 환경(로컬, 미설정 배포)에서는 기존 화면과 똑같습니다.
- SDK는 지도 탭을 처음 열 때만 불러옵니다(`autoload=false` + `kakao.maps.load`).
- 핀은 `CustomOverlay`(HTML)로 그려 상태별 색과 D-day를 표시합니다. 공고 수가 지역당 수십 건 수준이라 클러스터링은 후속으로 미룹니다.
- 핀이 바뀔 때마다 `LatLngBounds`로 전체 핀이 보이게 맞춥니다.

## 환경 변수 / 설정 (배포 전 필요)

| 이름 | 용도 | 비고 |
|------|------|------|
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 지도 SDK | 카카오 개발자 콘솔 → 앱 키 → JavaScript 키 |
| `KAKAO_REST_API_KEY` | 주소 → 좌표 | 없으면 `KAKAO_CLIENT_ID`(로그인용 REST 키)를 사용 |

카카오 개발자 콘솔에서 할 일:
1. 플랫폼 → Web → 사이트 도메인에 배포 도메인 등록(로컬 확인 시 `http://localhost:3000`도)
2. 카카오맵 사용 설정 ON (Local API·지도 API 사용 조건)

## 리스크

- 주소가 모호하면 좌표를 못 찾거나 인근(읍·면·동 중심)으로 찍힐 수 있습니다. 못 찾은 공고는 핀 대신 "위치를 찾지 못한 공고 N건" 안내로 처리합니다.
- 카카오 Local API 일일 쿼터: 30일 캐시로 공고당 월 1회 수준이라 여유가 큽니다.
- 키 미설정 상태로 배포돼도 지도 탭이 숨겨질 뿐 기존 기능에는 영향이 없습니다.

## 추정 복잡도

Medium
