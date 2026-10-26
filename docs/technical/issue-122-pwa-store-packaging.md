# PWABuilder 스토어 패키징 경고 해소

> 관련 이슈: #122 (선행: #59 모바일 배포 전략, #60 PWA manifest)

## 배경
`https://blue-snowy.vercel.app`을 PWABuilder로 점검한 결과는 오류 0, 경고 5였다. 주요 경고는 서비스 워커 없음, 스크린샷 링크 깨짐(타입·크기 불일치 포함), manifest `id` 없음이었다.

## 설계

| 항목 | 결정 | 이유 |
|------|------|------|
| 서비스 워커 | `public/sw.js`, fetch 핸들러는 비워 둠(캐시 없음) | 설치형 앱 요건만 맞춘다. 캐시를 하면 배포 후 옛 화면이 남을 수 있고 API·인증 응답이 섞일 수 있다 |
| 등록 위치 | `components/layout/ServiceWorkerRegister.tsx`를 루트 레이아웃에 둠 | 모든 페이지에서 한 번만 등록. 실패해도 앱 동작에 영향 없음 |
| manifest `id` | `'/'` | URL이 바뀌어도 같은 앱으로 식별. `start_url`과 동일 |
| `screenshots` | 제거 | 파일이 없어 링크가 깨짐. 스토어 스크린샷은 Play Console에 직접 등록 |

## 영향 범위
- 브라우저는 `/sw.js` 갱신 확인 요청에 쿠키를 붙여 보낸다. 페이지 요청과 겹쳐 토큰 갱신이 중복 실행되지 않도록 `middleware.ts` matcher에서 `sw.js`를 제외한다.
- 서버 API, 인증, DB, 가점 계산 로직은 바뀌지 않는다.

## 이후 작업 (사용자 진행)
1. PWABuilder → Package For Stores → Android (`com.blue.cheongyak`)
2. Play Console 업로드 후, 앱 서명 키 SHA-256을 `public/.well-known/assetlinks.json`에 반영
