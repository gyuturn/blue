# 앱 아이콘 가이드

PWABuilder 제출 및 스토어 배포를 위해 아래 아이콘 파일이 필요합니다.

## 필수 아이콘 목록

| 파일명 | 크기 | 용도 |
|--------|------|------|
| `icon-96x96.png` | 96×96 | 숏컷 아이콘 |
| `icon-192x192.png` | 192×192 | Android 홈 화면 |
| `icon-192x192-maskable.png` | 192×192 | Android Adaptive Icon (safe zone 준수) |
| `icon-512x512.png` | 512×512 | Play Store / PWABuilder 기본 |
| `icon-512x512-maskable.png` | 512×512 | 고해상도 Adaptive Icon |

## Apple용 추가 아이콘 (App Store)

| 파일명 | 크기 | 용도 |
|--------|------|------|
| `apple-touch-icon.png` | 180×180 | iOS 홈 화면 (public/ 루트에 위치) |

## 제작 가이드

- **Maskable 아이콘**: 전체 이미지 영역의 80% 안에 핵심 로고를 배치 (safe zone)
- **배경색**: `#2563eb` (파란색) 권장
- **포맷**: PNG (투명 배경 사용 가능, maskable는 불가)
- **도구**: [Maskable.app](https://maskable.app/) 에서 maskable 아이콘 미리보기 가능

## 스크린샷 (public/screenshots/)

| 파일명 | 크기 | 용도 |
|--------|------|------|
| `screenshot-home.png` | 390×844 | 홈 화면 (iPhone 14 기준) |
| `screenshot-calculator.png` | 390×844 | 가점 계산기 화면 |
