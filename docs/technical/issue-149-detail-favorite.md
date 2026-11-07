# #149 공고 상세 팝업 즐겨찾기 토글

## 요약
공고 상세 바텀시트(`AnnouncementDetail`) 헤더의 상태·D-day 배지 옆에 ♡/♥ 버튼을 추가해, 상세를 보다가 바로 즐겨찾기할 수 있게 한다.

## 설계
- 상세 팝업은 전체/즐겨찾기 탭 카드와 지도 핀(#146) 모두 `setSelectedAnnouncement` → 같은 `BottomSheet`로 열리므로 한 곳만 바꾸면 세 진입점에 모두 적용된다.
- 카드의 하트 버튼을 `FavoriteButton` 컴포넌트로 추출해 카드(`sm`)·상세(`md`)가 공유한다.
- 상태는 페이지의 `useFavorites` 하나를 그대로 내려 쓰므로 카드 하트·즐겨찾기 탭 개수가 즉시 동기화된다. 로그인(서버)/비로그인(localStorage) 저장 방식은 변경 없음.
- 즐겨찾기 탭에서 상세를 열고 해제해도 `selectedAnnouncement`는 유지되므로 팝업이 닫히지 않는다(목록에서만 빠짐).

## 영향 범위
`app/announcements/page.tsx` 한 파일. API·DB 변경 없음.
