# 카카오 로그인 기술 설계

## 기술 스택 결정
NextAuth.js v5 (beta) 대신 **직접 OAuth2.0 구현** 선택.
사유: NextAuth v5는 아직 beta이며, Next.js 16과의 호환성 불확실. 직접 구현이 의존성 최소화에 유리.

## 인증 플로우
1. 클라이언트: 카카오 OAuth 인증 URL로 리다이렉트
   - `https://kauth.kakao.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code`
2. 카카오: 인증 후 redirect_uri로 code 전달
3. Server Action 또는 API Route: code로 access_token 교환
   - `POST https://kauth.kakao.com/oauth/token`
4. 카카오 사용자 정보 조회
   - `GET https://kapi.kakao.com/v2/user/me`
5. 세션 쿠키 발급 (httpOnly cookie)

## 파일 구조
```
app/
├── api/
│   └── auth/
│       ├── kakao/
│       │   └── route.ts         # 로그인 시작 (리다이렉트)
│       └── kakao/callback/
│           └── route.ts         # 콜백 처리, 토큰 교환, 세션 발급
components/
└── auth/
    ├── KakaoLoginButton.tsx     # 카카오 로그인 버튼
    └── UserProfileDropdown.tsx  # 로그인 후 프로필 드롭다운
lib/
└── auth/
    ├── kakao.ts                 # 카카오 API 유틸 함수
    └── session.ts               # 세션 관리 (쿠키)
types/
└── auth.ts                      # 사용자 타입 정의
```

## 환경변수
```
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=http://localhost:3001/api/auth/kakao/callback
NEXT_PUBLIC_KAKAO_CLIENT_ID=   # 클라이언트 사이드용
```

## 세션 관리
- httpOnly 쿠키로 세션 토큰 저장
- 서버 컴포넌트에서 `cookies()` API로 세션 확인
- 클라이언트에서는 `/api/auth/me` 엔드포인트로 유저 정보 조회

## API 설계
- `GET /api/auth/kakao` — 카카오 OAuth 시작
- `GET /api/auth/kakao/callback` — 콜백 처리
- `GET /api/auth/me` — 현재 사용자 정보
- `POST /api/auth/logout` — 로그아웃

## 데이터 모델
```typescript
interface KakaoUser {
  id: number;
  kakao_account: {
    profile: {
      nickname: string;
      profile_image_url: string;
    };
    email?: string;
  };
}

interface SessionUser {
  id: string;
  nickname: string;
  profileImage: string;
  accessToken: string;
}
```

## 리스크
- 카카오 디벨로퍼스 앱 등록 및 redirect URI 설정 필요 (외부 설정)
- access_token 만료 처리 필요 (refresh_token 구현)
- HTTPS 환경에서만 운영 쿠키 동작 (개발 환경은 http 허용)
