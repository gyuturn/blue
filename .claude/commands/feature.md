# Feature Pipeline

기능 요구사항을 받아 PM -> Planner -> CTO -> Developer 순서로 전체 파이프라인을 자동 실행합니다.

## 입력
$ARGUMENTS

## 실행 순서

다음 순서로 각 에이전트를 순차적으로 실행하세요:

### 1. PM Agent
1. 요구사항을 분석합니다
2. 기능을 분해합니다
3. GitHub 이슈를 생성합니다 (`gh issue create`)
4. 생성된 이슈 번호를 기록합니다

### 2. Planner Agent
1. PM이 생성한 이슈를 확인합니다
2. 화면 기획을 수립합니다
3. UI/UX 설계를 합니다
4. 이슈에 기획 내용을 댓글로 추가합니다 (`gh issue comment`)

### 3. CTO Agent
1. 이슈 및 기획 내용을 검토합니다
2. 기술적 실현 가능성을 분석합니다
3. 아키텍처/API를 설계합니다
4. `/docs`에 설계 문서를 작성합니다
5. 이슈에 기술 검토 의견을 댓글로 추가합니다

### 4. Developer Agent
1. 이슈, 기획, 설계 문서를 확인합니다
2. feature 브랜치를 생성합니다
3. 기능을 개발합니다
4. 테스트를 작성합니다
5. PR을 생성합니다

## 참조 문서
- PM: `.claude/agents/pm.md`
- Planner: `.claude/agents/planner.md`
- CTO: `.claude/agents/cto.md`
- Developer: `.claude/agents/developer.md`

## 출력
각 단계 완료 후 다음 정보를 제공하세요:
- **PM**: 생성된 이슈 번호 및 링크
- **Planner**: 기획 요약
- **CTO**: 기술 설계 요약
- **Developer**: PR 번호 및 링크
