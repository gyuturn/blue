# Issue #137 기술 설계: 사용자 위치 기반 첫 화면

## 개요

공고목록 첫 진입 시 브라우저 위치(Geolocation)를 받아 지역 필터를 사용자의 시/도로 자동 선택하고, 지도 탭에 내 위치를 표시합니다.
위치가 없으면 #113 동작(전체 공고로 시작)을 그대로 유지합니다.

## 흐름

```
[공고목록 진입]
  └ navigator.permissions.query('geolocation')
      ├ granted → 바로 위치 확인
      ├ prompt  → 안내 배너 → [위치 허용] 클릭 시 위치 확인 (사용자 동작에서 요청)
      └ denied  → 아무것도 안 함 (전체 공고)
  위치 확인: getCurrentPosition (timeout 8초, 10분 캐시)
  └ GET /api/announcements/user-region?lat=37.27&lng=127.01
       └ 카카오 coord2regioncode → region_1depth_name → REGION_OPTIONS 이름으로 변환
  └ 사용자가 아직 칩을 직접 고르지 않았으면 selectedRegion = 내 시/도
```

## API

```
GET /api/announcements/user-region?lat=<위도>&lng=<경도>
Response: { region: string | null }   // 예: "경기도", 해외·실패 시 null
```

- 국내 범위(위도 33~39, 경도 124~132) 밖이면 바로 `null`
- 좌표는 **소수 2자리(약 1km)로 반올림**한 뒤 조회합니다. 개인 위치 정밀도를 줄이고, 같은 동네는 캐시를 재사용합니다.
- 좌표는 저장하지 않고 앱 로그에도 남기지 않습니다. 단, GET 쿼리이므로 반올림된 좌표(약 1km)가 Vercel 접근 로그 URL에는 남을 수 있습니다.
- `/api/announcements*` 접두사를 써서 미들웨어(토큰 갱신 Set-Cookie)에서 제외하고, 성공 응답은 CDN 30일 / 실패는 5분 공개 캐시합니다 (#115).
- 카카오 호출: `next.revalidate` 30일, 3초 timeout. 키가 없거나 실패하면 `null`

## 시/도 이름 변환 (`lib/regions.ts` `toRegionOption`)

카카오는 `서울특별시`, `강원특별자치도`, `전북특별자치도` 같은 정식 명칭을 주지만, 옛 명칭(`강원도`, `전라북도`)이나 약칭(`서울`, `충남`)이 올 수도 있습니다. 모두 `REGION_OPTIONS` 값으로 맞춥니다. 순수 함수라 단위 테스트합니다.

## 클라이언트

- `lib/userLocation.ts`: 권한 상태 조회, 위치 요청 Promise 래퍼
- `app/announcements/page.tsx`
  - 상태: `locationStatus`(idle / prompt / locating / ready / unavailable), `userRegion`, `userPosition`
  - 사용자가 칩이나 탭을 누르면 `regionTouchedRef` = true → 자동 확인 결과로 덮어쓰지 않음
  - 자동 확인 결과가 5초보다 늦으면 화면을 바꾸지 않고 "📍 내 위치: ○○" 버튼만 표시
  - [위치 허용] 버튼으로 요청한 경우는 항상 내 시/도로 바꾸고, 거부·실패 이유를 안내
  - 위치 요청 전체 timeout 15초 (권한 팝업 방치 대비)
  - 즐겨찾기 탭이 비면 "전체 지역 즐겨찾기 보기" 제공 (다른 지역 즐겨찾기가 숨는 문제)
  - 배너 [다음에]는 sessionStorage에 기록해 이번 방문 동안 숨김
- `components/announcements/AnnouncementMap.tsx`
  - `userPosition` prop: 파란 점 오버레이 + [📍 내 위치] 버튼 (setCenter + level 7)
  - 핀이 없으면 내 위치를 중심으로 표시

## 리스크

- 카카오 Local이 비활성이면 시/도 변환 실패 → 전체 공고 유지 (기존 동작과 같음)
- iOS Safari 등 `permissions.query` 미지원 → 상태를 모르면 배너를 보여주고 버튼으로 요청
- 경계 지역(예: 서울·경기 경계)은 실제 위치의 시/도로 선택되며, 사용자가 칩으로 바꿀 수 있음
