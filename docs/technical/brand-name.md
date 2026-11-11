# 서비스 이름 표기 기준 (#153)

서비스 이름은 **청약 메이트**다. 사용자에게 보이는 모든 곳에서 이 이름만 쓴다.

## 이름이 들어가는 곳

| 위치 | 파일 |
|---|---|
| 상단 헤더 로고 | `components/layout/Header.tsx` |
| 브라우저 탭 기본 제목과 제목 템플릿 (`%s \| 청약 메이트`) | `app/layout.tsx` (`metadata.title`) |
| iOS 홈 화면 이름 | `app/layout.tsx` (`appleWebApp.title`) |
| PWA 이름과 홈 화면 이름 | `app/manifest.ts` (`name`, `short_name`) |
| 약관·개인정보 본문, 동의 화면, 가이드 히어로 | `app/terms`, `app/privacy`, `app/agree`, `app/guide` |
| 탈퇴 후 카카오 연결 끊기 안내 | `components/auth/WithdrawForm.tsx` |

## 규칙

- 페이지의 `metadata.title`에는 페이지 이름만 쓴다. 서비스 이름은 루트 레이아웃 템플릿이 붙인다. 직접 붙이면 탭 제목에 이름이 두 번 나온다.
- 카카오 연결 끊기 안내 문구는 카카오 디벨로퍼스 콘솔에 등록된 앱 이름과 같아야 한다. 콘솔의 앱 이름을 바꾸면 이 문구도 함께 바꾼다.
- 헤더 로고는 320px 화면에서 넘치지 않도록 모바일에서는 `text-base`, `sm` 이상에서는 `text-lg`를 쓴다.

## 바꾸지 않는 것

도메인(`blue-snowy.vercel.app`), 안드로이드 패키지명(`com.blue.cheongyak`), 저장소 이름, `blue-*` 색상 토큰은 내부 식별자라서 그대로 둔다.
