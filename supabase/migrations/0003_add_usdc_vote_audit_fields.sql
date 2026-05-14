alter table public.market_posts
  add column if not exists creation_fee_tx_hash text,
  add column if not exists fee_collector_address text;

alter table public.votes
  add column if not exists fee_amount numeric not null default 0,
  add column if not exists gross_amount numeric not null default 0,
  add column if not exists tx_hash text;
