@AGENTS.md

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
