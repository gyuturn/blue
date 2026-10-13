# 청약 공고 최초 진입 시 '전체' 지역으로 시작

**Issue:** [#113]
**Date:** 2026-10-12
**Status:** Implemented

---

## 1. 원인

`app/announcements/page.tsx`가 지역 칩을 누를 때 `localStorage.preferred_region`에 저장하고, 진입 시 `useEffect`로 그 값을 읽어 `selectedRegion`을 바꿨다. 그래서 예전에 누른 지역(예: 경기도)이 다음 진입에도 걸리고, 그 지역에 공고가 없으면 빈 목록이 보였다.

## 2. 결정

- 지역 선택은 저장하지 않는다. 화면 상태(`useState`)로만 들고, 진입할 때마다 `INITIAL_REGION`(= '전체')에서 시작한다.
- 이미 저장된 `preferred_region` 값은 진입 시 `removeItem`으로 지운다 (다른 곳에서 쓰지 않음).
- 첫 조회는 `region` 파라미터 없이 `/api/announcements`를 호출한다. 서버 API는 변경 없음.

## 3. 변경 파일

| 파일 | 내용 |
|---|---|
| `lib/regions.ts` (신규) | `REGION_OPTIONS`, `ALL_REGION`, `INITIAL_REGION`, `getRegionQuery()` |
| `app/announcements/page.tsx` | 저장값 복원·저장 제거, `lib/regions` 사용 |
| `components/announcements/AnnouncementMap.tsx` | 지도 좌표 조회도 `getRegionQuery()` 사용 |
| `tests/regions.test.ts` (신규) | 초기 지역이 '전체'인지, 쿼리 생성 검증 |

## 4. 영향

- 지역을 매번 다시 골라야 한다. 대신 "필터를 건 적 없는데 공고가 없다"는 오해가 사라진다.
- 지도 탭은 같은 `selectedRegion`을 받으므로 함께 '전체'로 시작한다.
