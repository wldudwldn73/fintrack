create table transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  category text not null,
  description text,
  date date not null,
  created_at timestamptz default now()
);

-- 날짜 기준 조회 성능을 위한 인덱스
create index transactions_date_idx on transactions (date desc);
