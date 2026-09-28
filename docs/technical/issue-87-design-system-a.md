# 디자인 A안 적용: Radix Colors + Pretendard

**Issue:** [#87] 디자인 A안 적용
**Date:** 2026-09-28
**Status:** Implemented
**Proposal:** #80

---

## 1. 결정

- 색: Radix Colors(MIT)의 Blue / Slate 스케일
- 폰트: Pretendard Variable(OFL-1.1), npm `pretendard@1.3.9`를 `next/font/local`로 자체 호스팅
- shadcn/ui 컴포넌트는 설치하지 않는다. 지금 화면은 단순 Tailwind 컴포넌트라 radix-ui·cva·tailwind-merge 의존성을 들일 이득이 작다. 색·라운드 규칙만 따른다.

## 2. 적용 방식

화면 코드는 `blue-*` / `gray-*` 유틸리티만 쓰고 hex 직접 지정이 없다. 그래서 `app/globals.css`의 `@theme`에서 두 팔레트를 재정의하면 전 화면이 바뀐다. green/amber/red/yellow/purple 등 상태 색은 그대로 둔다.

| 토큰 | 값 | 출처 | 용도 | 흰 배경 대비 |
|---|---|---|---|---|
| blue-50 | `#E6F4FE` | Radix blue3 | 옅은 강조 배경 | — |
| blue-500 | `#0090FF` | Radix blue9 | 장식(막대·점) | 3.26 |
| blue-600 | `#006BD6` | blue9~11 사이 조정 | 버튼·강조 글씨 | 5.15 (blue-50 위 4.60) |
| blue-700 | `#0B5CB0` | 조정 | hover·옅은 배경 위 글씨 | — |
| gray-100 | `#F0F0F3` | Radix slate3 | 회색 면 | — |
| gray-400 | `#8B8D98` | slate9 | 흐린 글씨 | 3.30 (이전 2.54) |
| gray-500 | `#60646C` | slate11 | 보조 글씨 | 5.94 |
| gray-900 | `#1C2024` | slate12 | 본문 | 16.4 |

A안 목업의 `#0090FF`는 흰 글씨 대비가 3.26:1이라 버튼 배경에는 쓰지 않는다.

## 3. 함께 고친 것

- `body { font-family: Arial }`이 Tailwind 폰트 설정을 덮어써 지금까지 한글이 시스템 기본 폰트로 나오고 있었다. 제거하고 `font-sans`(Pretendard)를 쓴다.
- OS 다크 모드에서 `body` 배경만 검게 바뀌던 블록을 제거했다. 화면 전체가 밝은 배경으로 설계돼 있어 라이트로 고정한다.

## 4. 라이선스

- Radix Colors: MIT (© WorkOS). 색 값만 사용.
- Pretendard: SIL Open Font License 1.1. 웹폰트로 포함·제공 가능, 폰트 단독 판매 금지. npm 패키지에 LICENSE가 없어 원문(upstream `orioncactus/pretendard`)을 `public/licenses/Pretendard-OFL.txt`로 함께 배포한다(`/licenses/Pretendard-OFL.txt`).
