# Issue #107 기술 설계: 공급위치 주소 표시 + 주소 복사 + 지도 바로가기

## 개요

공고 상세 페이지에 "단지 위치" 카드를 추가합니다. 공급위치 주소를 보여주고, 주소 복사와 네이버지도·카카오맵 바로가기를 제공합니다.

## 데이터

청약홈 분양정보 API(`getAPTLttotPblancDetail`)는 공급위치를 `HSSPLY_ADRES` 필드로 내려줍니다. 지금까지는 이 필드를 매핑하지 않았습니다.

```ts
// types/index.ts
export interface Announcement {
  // ...
  address?: string; // 공급위치 (HSSPLY_ADRES)
}

// lib/announcements.ts
address: item.HSSPLY_ADRES?.trim() || undefined,
```

- 상세 페이지는 목록에서 저장한 `localStorage.selectedAnnouncement`를 읽습니다. 배포 전에 저장된 데이터에는 `address`가 없을 수 있어서 optional로 둡니다.
- 주소가 없으면 카드를 숨깁니다.

## 지도 바로가기

API 키 없이 쓸 수 있는 웹 검색 URL을 사용합니다. 검색어에 주소를 넣으므로, 지도에서 주소가 자동으로 입력된 상태로 검색됩니다.

| 서비스 | URL |
|--------|-----|
| 네이버지도 | `https://map.naver.com/p/search/{encodeURIComponent(주소)}` |
| 카카오맵 | `https://map.kakao.com/link/search/{encodeURIComponent(주소)}` |

- 모바일에서 앱이 설치돼 있으면 각 서비스가 앱으로 연결해 줍니다.
- 앱 전용 스킴(`nmap://`, `kakaomap://`)은 앱이 없으면 아무 반응이 없어서 쓰지 않습니다.
- 링크 생성은 `lib/maps.ts`의 순수 함수로 분리해서 테스트합니다.

## 주소 복사

`components/ui/CopyButton.tsx`(클라이언트 컴포넌트)로 만듭니다.

1. `navigator.clipboard.writeText` 시도 (HTTPS/localhost에서만 동작)
2. 실패하거나 API가 없으면 숨긴 `textarea` + `document.execCommand('copy')`로 대체
3. 결과 상태(`idle` / `copied` / `failed`)를 2초간 표시

## 변경 파일

| 파일 | 변경 |
|------|------|
| `types/index.ts` | `Announcement.address` 추가 |
| `lib/announcements.ts` | `HSSPLY_ADRES` 매핑, mock 데이터에 주소 추가 |
| `lib/maps.ts` | 지도 링크 생성 함수 (신규) |
| `components/ui/CopyButton.tsx` | 주소 복사 버튼 (신규) |
| `app/announcements/[id]/page.tsx` | 단지 위치 카드 |
| `tests/maps.test.mjs` | 지도 링크 단위 테스트 (`npm test`, Node 22.18+) |

## 리스크

- 공급위치 표기가 "○○동 일원"처럼 모호하면 지도 검색 결과가 정확하지 않을 수 있습니다. 검색 결과 화면으로 넘기기 때문에 사용자가 직접 고를 수 있어 허용 가능한 수준입니다.
- 지도 서비스가 URL 형식을 바꾸면 링크가 깨질 수 있습니다. URL 생성을 `lib/maps.ts` 한 곳에 모아 둡니다.

## 후속

지도 기반 공고 보기 화면은 #108에서 진행합니다(좌표 변환, 카카오맵 SDK).
