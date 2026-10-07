# Issue #107 기술 설계: 공급위치 주소 표시 + 주소 복사 + 지도 바로가기

## 개요

공고 상세(목록 화면의 바텀시트)에 "단지 위치" 영역을 추가하고, 공고 카드의 주소 복사 버튼 옆에 지도 바로가기를 붙입니다. 공급위치 주소를 보여주고, 주소 복사와 네이버지도·카카오맵 바로가기를 제공합니다.

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

- 매핑은 #97에서 이미 추가되었습니다.
- 바텀시트에서는 `announcement.address`가 없으면 청약홈 상세의 `detail.location`으로 대체합니다.
- 주소가 없으면 영역을 숨깁니다. 기본 정보의 중복 "위치" 행은 제거합니다.

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

#97의 복사 로직을 `lib/clipboard.ts`(`copyText`)와 `components/ui/CopyButton.tsx`로 분리해 카드와 바텀시트가 함께 씁니다.

1. `navigator.clipboard.writeText` 시도
2. 실패하면 숨긴 `textarea` + `document.execCommand('copy')`로 대체
3. 결과(복사됐어요 / 복사에 실패했어요)를 2초간 표시

## 변경 파일

| 파일 | 변경 |
|------|------|
| `lib/maps.ts` | 지도 링크 생성 함수 (신규) |
| `lib/clipboard.ts` | 복사 로직 분리 (신규) |
| `components/ui/CopyButton.tsx` | 복사 버튼 (신규, 기존 `CopyAddressButton` 대체) |
| `app/announcements/page.tsx` | 카드: 주소 복사 + 지도 바로가기 / 바텀시트: 단지 위치 영역 |
| `lib/announcements.ts` | mock 데이터에 주소 추가 |
| `tests/maps.test.ts` | 지도 링크 단위 테스트 (`npm test`) |

## 리스크

- 공급위치 표기가 "○○동 일원"처럼 모호하면 지도 검색 결과가 정확하지 않을 수 있습니다. 검색 결과 화면으로 넘기기 때문에 사용자가 직접 고를 수 있어 허용 가능한 수준입니다.
- 지도 서비스가 URL 형식을 바꾸면 링크가 깨질 수 있습니다. URL 생성을 `lib/maps.ts` 한 곳에 모아 둡니다.

## 후속

지도 기반 공고 보기 화면은 #108에서 진행합니다(좌표 변환, 카카오맵 SDK).
