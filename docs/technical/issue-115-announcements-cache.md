# #115 공고 목록 조회 API 응답 캐시

## 현황
| 계층 | 대상 | 현재 TTL |
|------|------|---------|
| Next Data Cache (fetch) | 목록 API `getAPTLttotPblancDetail` | 3600s |
| Next Data Cache (fetch) | 주택형별 API `getAPTLttotPblancMdl` (특공 세대수) | 21600s |
| 라우트 응답 | `/api/announcements`, `/api/announcements/coords` | **없음** |

라우트가 `request.url`의 쿼리를 읽어 동적 라우트로 처리되므로 `export const revalidate = 3600`은 효과가 없다.
요청마다 서버 함수가 실행되고 외부 fetch 최대 21회(캐시 히트여도 함수 실행·조합 비용) + 지도 탭은 지오코딩까지 수행한다.

## 설계
라우트 응답에 `Cache-Control`을 붙여 Vercel CDN이 URL(쿼리 포함) 단위로 캐시하게 한다.
캐시 키가 `?region=` 값별로 갈리므로 지역 필터별로 각각 캐시된다.

```
실데이터  : public, s-maxage=1800, stale-while-revalidate=1800
샘플 데이터: public, s-maxage=60
```

- 정책은 `lib/announcements.ts`의 `getAnnouncementsCacheControl(isMock)` 한 곳에서 관리하고 두 라우트가 공유한다.
- 좌표 API는 `enabled: false`(키 미설정)이거나 카카오 키 오류·쿼터 초과로 지오코딩이 중단된 부분 결과일 때도 짧은 TTL을 적용한다(`geocodeMany`가 `complete` 플래그 반환).
- matcher 제외는 `api/announcements*` 접두사 전체(`/detail` 포함)에 적용된다. 이 경로 아래에 인증이 필요한 API를 추가하면 안 된다.
- 의미 없는 `export const revalidate = 3600`은 오해를 막기 위해 제거한다.
- `middleware.ts`는 토큰 만료 임박 시 응답에 `Set-Cookie`(새 access token)를 붙인다. 공개 캐시 응답에 세션 쿠키가 섞이면 안 되므로 `api/announcements`를 matcher에서 제외한다(이 API는 인증이 필요 없다. 토큰 갱신은 페이지 이동 시 계속 일어난다).

## TTL 근거
- 한국부동산원_청약홈 분양정보 조회 서비스(data.go.kr 15098547)는 공식 '업데이트 주기' 표기가 없고, 청약홈 공고 등록 시 수시 반영된다. 신규 공고는 하루 몇 건 수준이다.
- 공고 → 접수 시작까지 보통 1~2주 여유가 있어, 1시간 안팎의 지연은 사용자에게 영향이 작다.
- 접수 상태는 날짜 단위로 바뀌므로 분 단위 신선도가 필요 없다.
- 그래서 **30분 fresh + 30분 stale**로 정했다. 원본 fetch 캐시(1h)와 겹쳐도 최악 약 2시간이면 신규 공고가 반영된다.
- 샘플 데이터는 외부 API 일시 장애의 결과이므로 60초만 캐시해 복구가 빨리 반영되게 한다. 그래도 장애 중 폭주 요청은 CDN이 흡수한다.

## 영향 범위
- `lib/announcements.ts` (정책 함수 추가), `lib/geocode.ts` (`geocodeMany` 반환에 `complete` 추가)
- `app/api/announcements/route.ts`, `app/api/announcements/coords/route.ts` (헤더 적용)
- `middleware.ts` (matcher에서 `api/announcements` 제외)
- UI·DB 변경 없음. 상세 API(`/detail`)는 범위 밖.
