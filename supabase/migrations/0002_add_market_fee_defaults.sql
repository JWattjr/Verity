alter table public.market_posts
  add column if not exists market_creation_fee_usdc numeric not null default 1,
  add column if not exists trading_fee_bps integer not null default 200;
