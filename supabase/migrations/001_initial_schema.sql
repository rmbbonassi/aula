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
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create trigger handle_updated_at
  before update on clientes
  for each row execute procedure extensions.moddatetime(updated_at);

-- Contacts table (on delete restrict: prevent accidental client deletion)
create table contatos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes(id) on delete restrict,
  nome        text not null,
  cargo       text,
  email       text,
  telefone    text
);

-- Notes table (on delete restrict: preserve history)
create table notas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes(id) on delete restrict,
  texto       text not null,
  criado_por  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

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
