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
| Client | Supabase JS Client |
| UI Components | shadcn/ui |
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
                     │ Supabase JS Client
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
│   └── supabase/        → cliente Supabase (server + client)
└── middleware.ts         → proteção de rotas
```

---

## Autenticação

### Fluxo principal

1. Usuário acessa rota protegida → middleware verifica sessão → redireciona para `/login` se não autenticado
2. Usuário insere e-mail e senha → Supabase valida credenciais
3. Sessão armazenada em cookie httpOnly seguro
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

Todos os usuários têm acesso igual por enquanto. A estrutura de banco está preparada para adicionar roles no futuro sem mudanças de schema.

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

- Tabela de clientes: nome, empresa, e-mail, telefone, data de cadastro
- Formulário de cliente (modal): criar e editar
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
  criado_por  uuid references auth.users(id),
  created_at  timestamptz default now()
);

create table contatos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes(id) on delete cascade,
  nome        text not null,
  cargo       text,
  email       text,
  telefone    text
);

create table notas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references clientes(id) on delete cascade,
  texto       text not null,
  criado_por  uuid references auth.users(id),
  created_at  timestamptz default now()
);
```

### Row Level Security

- Apenas usuários autenticados podem ler e escrever em todas as tabelas
- Todos os membros da equipe compartilham acesso aos mesmos clientes

---

## Tratamento de Erros

| Situação | Comportamento |
|----------|--------------|
| Credenciais inválidas | "E-mail ou senha incorretos" (não revela qual) |
| Sessão expirada | Redirecionamento automático para `/login` |
| Erro de rede/servidor | Toast de aviso no canto da tela |
| Campos vazios | Validação antes de submeter com feedback visual |

---

## Deploy (EasyPanel)

- Projeto contém `Dockerfile` com build multi-stage otimizado para Next.js
- Variáveis de ambiente configuradas no EasyPanel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Deploy via repositório Git conectado ao EasyPanel

---

## Fora do Escopo (v1)

- Funil de vendas / pipeline de oportunidades
- Relatórios e gráficos
- Integrações externas (WhatsApp, e-mail marketing)
- Cadastro público de usuários
- Aplicativo mobile
