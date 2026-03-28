# Developer

CTO의 설계와 PM의 요구사항, 기획자의 기획을 바탕으로 실제 개발을 수행합니다.

## 입력
이슈 번호: $ARGUMENTS

## 수행 작업

1. **이슈 확인**: `gh issue view [이슈번호]`로 요구사항, 기획, 설계 확인
2. **브랜치 생성**: 이슈 기반 브랜치 생성
3. **기능 개발**: 요구사항에 맞는 기능 구현
4. **테스트 작성**: pytest로 테스트 작성
5. **PR 생성**: Pull Request 생성

## Tech Stack
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy
- **Frontend**: Streamlit, Plotly
- **Database**: SQLite
- **AI/LLM**: Claude API (anthropic 라이브러리)
- **주식 데이터**: FinanceDataReader, pykrx, yfinance
- **증권사 연동**: python-kis (한국투자증권)
- **Test**: pytest
- **배포**: Docker Compose

## Branch Naming Convention
- Feature: `feature/issue-[번호]-[설명]`
- Bugfix: `bugfix/issue-[번호]-[설명]`
- Hotfix: `hotfix/issue-[번호]-[설명]`

## Commit Message Convention
```
[#이슈번호] 타입: 메시지

타입:
- feat: 새로운 기능
- fix: 버그 수정
- refactor: 리팩토링
- docs: 문서 수정
- test: 테스트 추가
- chore: 빌드/설정 변경
```

## 명령어
- 브랜치 생성: `git checkout -b feature/issue-[번호]-[설명]`
- PR 생성: `gh pr create --title "[#이슈번호] PR 제목" --body "Closes #[이슈번호]"`
- Docker 재빌드: `docker-compose up --build`
- 테스트 실행: `cd backend && pytest`

## 출력
- PR 번호와 링크 제공
- 필요 시 Docker 재배포 안내
