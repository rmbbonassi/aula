-- Add created_at to contatos for chronological ordering
alter table contatos
  add column created_at timestamptz not null default now();

-- Protect audit column: prevent authenticated clients from setting or overriding it
revoke insert (created_at) on contatos from authenticated;
revoke update (created_at) on contatos from authenticated;
