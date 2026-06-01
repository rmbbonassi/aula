-- Enable moddatetime extension for auto-updating updated_at
create extension if not exists moddatetime schema extensions;

-- Clients table
create table clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  empresa     text,
  email       text,
  telefone    text,
  criado_por  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger handle_updated_at
  before update on clientes
  for each row execute procedure extensions.moddatetime(updated_at);

-- Contacts table (on delete restrict: prevent accidental client deletion)
create table contatos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete restrict,
  nome        text not null,
  cargo       text,
  email       text,
  telefone    text
);

-- Notes table (on delete restrict: preserve history)
create table notas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete restrict,
  texto       text not null,
  criado_por  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Indexes for FK lookups (Postgres does not auto-create these)
create index on contatos(cliente_id);
create index on notas(cliente_id);

-- Enable Row Level Security
alter table clientes enable row level security;
alter table contatos enable row level security;
alter table notas    enable row level security;

-- Policies: authenticated users have full access (shared team access)
create policy "acesso autenticado - clientes"
  on clientes for all
  to authenticated
  using (true)
  with check (true);

create policy "acesso autenticado - contatos"
  on contatos for all
  to authenticated
  using (true)
  with check (true);

create policy "acesso autenticado - notas"
  on notas for all
  to authenticated
  using (true)
  with check (true);

-- Trigger to auto-set criado_por from auth.uid() on insert
create or replace function set_criado_por()
  returns trigger language plpgsql security definer as $$
begin
  new.criado_por := auth.uid();
  return new;
end;
$$;

create trigger set_clientes_criado_por
  before insert on clientes
  for each row execute function set_criado_por();

create trigger set_notas_criado_por
  before insert on notas
  for each row execute function set_criado_por();

-- Revoke client control over audit columns
revoke insert (id, created_at, updated_at, criado_por) on clientes from authenticated;
revoke update (created_at, updated_at, criado_por) on clientes from authenticated;
revoke insert (id, criado_por, created_at) on notas from authenticated;
revoke update (criado_por, created_at) on notas from authenticated;
revoke insert (id) on contatos from authenticated;
