# Design: Sistema de Login e Dashboard CRM

**Data:** 2026-05-31
**Status:** Aprovado

---

## Visão Geral

Sistema web para pequenas equipes (2–20 pessoas) com autenticação por e-mail e senha, dando acesso a um dashboard de CRM focado em gestão de clientes, contatos e histórico de interações.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Auth + Database | Supabase |
| Client | `@supabase/ssr` (createServerClient + createBrowserClient) |
| UI Components | shadcn/ui + `@tanstack/react-table` (DataTable) |
| Estilização | Tailwind CSS |
| Deploy | EasyPanel (Docker) |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                   Next.js App Router                │
│                                                     │
│  /login                    → Página pública         │
│  /dashboard                → Resumo geral           │
│  /dashboard/clientes       → Lista de clientes      │
│  /dashboard/clientes/[id]  → Ficha do cliente       │
└────────────────────┬────────────────────────────────┘
                     │ @supabase/ssr
┌────────────────────▼────────────────────────────────┐
│                    Supabase                         │
│                                                     │
│  Auth     → Sessões, JWT, login/logout              │
│  Database → PostgreSQL                              │
│  RLS      → Row Level Security                      │
└─────────────────────────────────────────────────────┘
```

### Estrutura de pastas

```
src/
├── app/
│   ├── login/           → página de login
│   └── dashboard/       → páginas protegidas
│       ├── page.tsx     → resumo geral
│       └── clientes/
│           ├── page.tsx          → lista de clientes
│           └── [id]/page.tsx     → ficha do cliente
├── components/          → componentes reutilizáveis
├── lib/
│   └── supabase/
│       ├── server.ts    → createServerClient com cookies() do next/headers (Server Components, Route Handlers)
│       └── client.ts    → createBrowserClient (Client Components com 'use client')
└── middleware.ts         → createServerClient inline com setAll em NextResponse (token refresh)
```

---

## Autenticação

### Fluxo principal

1. Usuário acessa rota protegida → middleware chama `supabase.auth.getUser()` (não `getSession()` — não verificado pelo servidor) dentro de `try/catch`; em caso de exceção de rede, permitir a requisição continuar sem redirecionar → redireciona para `/login` apenas se `user` for null sem erro
2. Usuário insere e-mail e senha → Supabase valida credenciais
3. Sessão armazenada em cookie httpOnly com flags `Secure` e `SameSite=Lax` (gerenciado pelo `@supabase/ssr`)
4. Token expirado → redirecionamento silencioso para `/login`
5. Logout → sessão destruída → redirecionamento para `/login`

### Detalhes da tela de login

- Campos: e-mail e senha
- Botão "Entrar"
- Link "Esqueci minha senha" (Supabase envia e-mail de recuperação)
- Validação em tempo real nos campos
- Redirecionamento automático para `/dashboard` se já autenticado

### Cadastro de usuários

Feito diretamente no painel do Supabase pelo administrador. Não há tela de cadastro público — apenas membros cadastrados manualmente podem acessar o sistema.

### Permissões

Todos os usuários têm acesso igual por enquanto. Adicionar roles no futuro exigirá uma tabela `perfis` ou coluna de role e reescrita das políticas RLS.

---

## Dashboard CRM

### Layout

- **Sidebar** fixa à esquerda com navegação (Clientes, futura expansão)
- **Header** com nome do usuário logado e botão de logout
- **Área principal** com conteúdo da rota ativa

### Telas

| Rota | Descrição |
|------|-----------|
| `/dashboard` | Resumo: total de clientes, contatos recentes |
| `/dashboard/clientes` | Tabela com busca e paginação |
| `/dashboard/clientes/[id]` | Ficha: dados, contatos e histórico de notas |

### Componentes principais

- Tabela de clientes usando **shadcn/ui DataTable + TanStack Table v8**: nome, empresa, e-mail, telefone, data de cadastro; com ordenação, busca e paginação built-in
- Formulário de cliente (modal): criar e editar
- **Fluxo de exclusão de cliente:** botão "Excluir" abre modal de confirmação → app exclui primeiro todos os contatos e notas do cliente → depois exclui o cliente; se houver erro FK, exibir mensagem "Remova os contatos e notas antes de excluir o cliente"
- Seção de contatos por cliente
- Seção de notas/histórico por cliente

---

## Modelo de Dados

```sql
-- Gerenciado pelo Supabase Auth
-- auth.users: id, email, created_at

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

-- Trigger para atualizar updated_at automaticamente em cada UPDATE
create extension if not exists moddatetime schema extensions;
create trigger handle_updated_at
  before update on clientes
  for each row execute procedure extensions.moddatetime(updated_at);

-- on delete restrict: impede exclusão acidental de cliente com dados associados
create table contatos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes(id) on delete restrict,
  nome        text not null,
  cargo       text,
  email       text,
  telefone    text
);

-- on delete restrict: preserva histórico de notas; excluir cliente exige remoção manual prévia
create table notas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes(id) on delete restrict,
  texto       text not null,
  criado_por  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);
```

### Row Level Security

RLS deve ser habilitado explicitamente em cada tabela e as políticas criadas antes de qualquer acesso.

```sql
-- Habilitar RLS
alter table clientes enable row level security;
alter table contatos enable row level security;
alter table notas    enable row level security;

-- Políticas: apenas usuários autenticados têm acesso total (acesso compartilhado pela equipe)
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
```

---

## Tratamento de Erros

| Situação | Comportamento |
|----------|--------------|
| Credenciais inválidas | "E-mail ou senha incorretos" (não revela qual) |
| Sessão expirada | Redirecionamento automático para `/login` |
| Erro de rede/servidor | Toast de aviso no canto da tela |
| Campos vazios | Validação antes de submeter com feedback visual |
| Excluir cliente com dados associados | Modal de confirmação → app tenta excluir contatos e notas primeiro → se FK violation persistir, exibe "Não foi possível excluir. Remova os contatos e notas manualmente." |

---

## Deploy (EasyPanel)

- Projeto contém `Dockerfile` com build multi-stage otimizado para Next.js
- `next.config.js` deve incluir `output: 'standalone'` — obrigatório para que o multi-stage build gere `.next/standalone` e o container funcione corretamente
- **HTTPS obrigatório:** configurar domínio com certificado Let's Encrypt no EasyPanel antes de expor à equipe; os cookies de sessão exigem a flag `Secure` que só funciona sobre HTTPS
- Variáveis de ambiente no EasyPanel:
  - `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase (pública)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave anon do Supabase (pública)
  - `SUPABASE_SERVICE_ROLE_KEY` — chave de serviço (**somente server-side**; nunca importar em arquivos com `'use client'` nem prefixar com `NEXT_PUBLIC_`)
- Deploy via repositório Git conectado ao EasyPanel

---

## Fora do Escopo (v1)

- Funil de vendas / pipeline de oportunidades
- Relatórios e gráficos
- Integrações externas (WhatsApp, e-mail marketing)
- Cadastro público de usuários
- Aplicativo mobile
