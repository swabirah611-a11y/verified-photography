-- Preserve every Pricing editor field in PostgreSQL.
alter table public.pricing_packages
  add column if not exists category text not null default '',
  add column if not exists visible boolean not null default true;
