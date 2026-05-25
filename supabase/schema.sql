-- Members table
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Expenses table
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  total_amount numeric(12, 2) not null check (total_amount > 0),
  date date not null,
  paid_by uuid not null references members(id),
  category text,
  receipt_urls text[] not null default '{}',
  notes text,
  split_type text not null check (split_type in ('equal', 'custom')) default 'equal',
  created_at timestamptz default now(),
  created_by uuid not null references members(id)
);

-- Expense splits table (how each expense is divided)
create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id uuid not null references members(id),
  amount numeric(12, 2) not null check (amount >= 0),
  unique(expense_id, member_id)
);

-- Payments table (settling debts)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  from_member_id uuid not null references members(id),
  to_member_id uuid not null references members(id),
  amount numeric(12, 2) not null check (amount > 0),
  date date not null,
  receipt_urls text[] not null default '{}',
  notes text,
  created_at timestamptz default now(),
  created_by uuid not null references members(id),
  check (from_member_id != to_member_id)
);

-- View: net balance per member
-- net_balance > 0 → others owe this member
-- net_balance < 0 → this member owes others
--
-- Formula:
--   net = (paid in expenses) - (share of expenses)
--       + (payments sent out)    ← reduces own debt
--       - (payments received)    ← reduces what others owe you
create or replace view member_balances as
select
  m.id   as member_id,
  m.name as member_name,
  coalesce(paid.total,  0) as total_paid,
  coalesce(owed.total,  0) as total_owed,
  coalesce(paid.total,  0)
    - coalesce(owed.total,  0)
    + coalesce(pmade.total, 0)
    - coalesce(precv.total, 0) as net_balance
from members m
left join (
  select paid_by as member_id, sum(total_amount) as total
  from expenses
  group by paid_by
) paid  on paid.member_id  = m.id
left join (
  select member_id, sum(amount) as total
  from expense_splits
  group by member_id
) owed  on owed.member_id  = m.id
left join (
  -- payments this member sent (they're settling a debt → improves balance)
  select from_member_id as member_id, sum(amount) as total
  from payments
  group by from_member_id
) pmade on pmade.member_id = m.id
left join (
  -- payments this member received (debt owed to them was reduced)
  select to_member_id as member_id, sum(amount) as total
  from payments
  group by to_member_id
) precv on precv.member_id = m.id;

-- Indexes
create index if not exists idx_expenses_date on expenses(date);
create index if not exists idx_expenses_paid_by on expenses(paid_by);
create index if not exists idx_expense_splits_expense on expense_splits(expense_id);
create index if not exists idx_payments_date on payments(date);
create index if not exists idx_payments_from on payments(from_member_id);
create index if not exists idx_payments_to on payments(to_member_id);

-- Recurring expenses catalogue (named items for the expense form dropdown)
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- -------------------------------------------------------
-- RLS: disable for all tables (no-auth private app)
-- -------------------------------------------------------
alter table members disable row level security;
alter table expenses disable row level security;
alter table expense_splits disable row level security;
alter table payments disable row level security;
alter table recurring_expenses disable row level security;

-- -------------------------------------------------------
-- Storage: allow anon full access to receipts bucket
-- Storage objects have their own RLS separate from tables.
-- -------------------------------------------------------

-- Make bucket public so URLs are readable without a token
update storage.buckets set public = true where id = 'receipts';

-- Allow anon to upload
create policy "anon can upload receipts"
  on storage.objects for insert to anon
  with check (bucket_id = 'receipts');

-- Allow anon to read (also covered by public bucket, but explicit is safer)
create policy "anon can read receipts"
  on storage.objects for select to anon
  using (bucket_id = 'receipts');

-- Allow anon to delete (for receipt removal)
create policy "anon can delete receipts"
  on storage.objects for delete to anon
  using (bucket_id = 'receipts');
