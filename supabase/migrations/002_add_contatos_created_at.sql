-- Add created_at to contatos for chronological ordering
alter table contatos
  add column created_at timestamptz not null default now();
