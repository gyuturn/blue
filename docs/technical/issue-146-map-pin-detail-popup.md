# #146 지도 공고 핀 클릭 시 상세 팝업 바로 표시

## 배경
지도 탭에서 공고 핀을 누르면 작은 요약 카드만 보이고, "상세 보기"를 한 번 더 눌러야 상세를 볼 수 있었다.
전체 공고 목록에서 카드를 누를 때와 동일한 상세 팝업(BottomSheet + AnnouncementDetail)이 바로 떠야 한다.

## 변경 내용 (`components/announcements/AnnouncementMap.tsx`)
- 핀 클릭 시 `setSelectedId(id)` + `onOpenDetail(announcement)`를 함께 호출한다.
  - `onOpenDetail`은 페이지의 `setSelectedAnnouncement` → 목록과 같은 BottomSheet가 열린다.
  - 핀 그리기 effect의 deps가 늘지 않도록 `onOpenDetail`은 ref로 보관하고 별도 effect에서 갱신한다.
- 지도 래퍼에 `isolate`를 추가해 카카오 지도 내부 z-index가 래퍼 밖으로 새지 않게 한다.
  BottomSheet(`fixed z-50`)는 `main` 직속으로 렌더되므로 항상 지도 위에 표시된다.
- 요약 카드와 "상세 보기" 버튼은 유지 → 팝업을 닫은 뒤 다시 열 수 있다.
- 안내 문구: "핀을 누르면 공고 상세를 볼 수 있어요".

## 동작
- 팝업을 닫아도 지도 위치/확대 수준과 선택된 핀 강조는 유지된다 (지도 컴포넌트는 리마운트되지 않음).
- 지도 빈 곳 클릭 시 선택 해제는 기존과 동일.

## 영향 범위
- 지도 컴포넌트 단일 파일. 청약 가점 계산/자격 판정 로직 영향 없음.
