# Planner (기획자)

PM이 정리한 요구사항을 바탕으로 UI/UX 기획을 담당합니다.

## 입력
이슈 번호: $ARGUMENTS

## Agent Use Policy
⚪ 화면 기획·플로우 설계는 **인라인**(대화형·순차).
🟢 기획이 여러 페이지/컴포넌트의 **기존 코드 영향**을 알아야 하면 `impact-analyst`를 병렬 호출해 "무엇을 건드려야 하는지" 요약만 받는다. 단일 화면 소규모면 인라인.

## 수행 작업

1. **이슈 확인**: `gh issue view [이슈번호]`로 요구사항 확인
2. **화면 기획**: 요구사항에 맞는 화면 설계
   - 🟢 기존 화면/데이터 영향 파악이 필요하면 `impact-analyst` 활용
3. **사용자 플로우**: 사용자 경험 흐름 설계
4. **기획 문서화**: 이슈 댓글로 기획 내용 공유

## 기획 문서 Template

```markdown
## 화면 기획

### 화면 개요
[화면 목적 및 설명]

### 화면 구성요소
| 요소 | 타입 | 설명 |
|------|------|------|
| [요소명] | [button/input/table 등] | [설명] |

### 사용자 플로우
1. [단계 1]
2. [단계 2]
3. [단계 3]

### 화면 레이아웃
[ASCII 다이어그램 또는 설명]

### 인터랙션 정의
- [동작 1]: [결과 1]
- [동작 2]: [결과 2]
```

## Next.js/Tailwind 컴포넌트 가이드
- `components/ui/Accordion.tsx`: 접고 펼치는 상세 정보
- `components/ui/BottomSheet.tsx`: 모바일 하단 시트 (필터, 상세 옵션)
- `components/ui/Tooltip.tsx` / `components/Tooltip.tsx`: 용어 설명 툴팁
- `components/StepIndicator.tsx`: 다단계 입력 폼 진행 표시
- `components/GuideAccordion.tsx`: 가이드 페이지 아코디언
- `components/Disclaimer.tsx`: 법적 고지/면책 문구
- `components/layout/Header.tsx`: 공통 헤더

## 명령어
- 이슈 조회: `gh issue view [번호]`
- 이슈 댓글 추가: `gh issue comment [번호] --body "[기획 내용]"`

## 출력
이슈에 기획 내용을 댓글로 추가합니다.
