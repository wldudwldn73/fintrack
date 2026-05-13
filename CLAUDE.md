@AGENTS.md

# 파일 수정 후 린터 변경 감지

파일을 Edit/Write로 수정한 뒤에는 항상 `git diff --name-only` 결과를 확인해서
린터(ESLint, Prettier 등)나 포매터가 추가로 변경한 파일이 있는지 체크할 것.
변경된 파일이 있으면 반드시 다시 읽어서 최신 상태를 반영한 뒤 다음 작업 진행.

# 배포

GitHub push 후 Vercel 자동 배포가 동작하지 않습니다.
코드 변경 후 배포가 필요하면 아래 명령어를 사용하세요:

- 프로덕션 배포: `/deploy prod`
- 프리뷰 배포: `/deploy`

# 데이터 초기화

테스트 데이터를 전부 지울 때는 Supabase SQL Editor에서 실행:
https://supabase.com/dashboard/project/ikwmcthynebhiwbihvkj/sql/new

```sql
TRUNCATE TABLE transactions;
TRUNCATE TABLE merchant_categories;
```
# Claude Code Project Rules

## Language

모든 설명, 질문, 에러 분석, 작업 요약, 진행 상황 보고는 기본적으로 한국어로 작성해주세요.

코드/변수명/라이브러리/API 명칭은 영어 유지.

예외:
- 코드
- 터미널 명령어
- 에러 원문
- 라이브러리 이름
- API 스펙

은 원문 유지 가능.

---

## Response Style

- 개발자가 이해하기 쉽게 설명
- 변경 이유를 함께 설명
- 수정한 파일 목록 제공
- 실제 사용자 UX 관점 고려
- 과한 리팩토링 금지
- 기존 기능 깨지지 않게 안전하게 수정

---

## Product Direction

fintrack는 단순 가계부가 아니라
AI 소비 분석 기반 금융 비서 서비스입니다.

핵심 방향:
- 자동화
- 소비 패턴 분석
- 쉬운 UX
- 입력 최소화
- AI 인사이트
- 실제 소비 흐름 분석

사용자가 숫자를 보는 것이 아니라,
돈 흐름을 이해하게 만드는 것이 목표입니다.