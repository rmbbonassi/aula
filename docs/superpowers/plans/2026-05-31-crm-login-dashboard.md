# CRM Login & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 14 CRM with email/password login and a dashboard for managing clients, contacts, and interaction notes — deployed via Docker on EasyPanel.

**Architecture:** Next.js 14 App Router with Server Components for data fetching and Client Components for interactivity. Supabase handles auth (JWT in httpOnly cookies via `@supabase/ssr`) and PostgreSQL database with RLS policies. Middleware protects all `/dashboard/*` routes by calling `getUser()` on every request.

**Tech Stack:** Next.js 14, TypeScript, Supabase (`@supabase/ssr`), shadcn/ui, `@tanstack/react-table`, Tailwind CSS, Vitest, React Testing Library, Docker (EasyPanel)

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/supabase/types.ts` | Database type definitions (manual, matches schema) |
| `src/lib/supabase/server.ts` | `createClient()` for Server Components + Route Handlers |
| `src/lib/supabase/client.ts` | `createClient()` for `'use client'` components |
| `src/middleware.ts` | Inline `createServerClient` with `setAll` → `NextResponse`; `getUser()` in try/catch |
| `src/app/layout.tsx` | Root layout with Toaster |
| `src/app/login/page.tsx` | Login form (email + password + forgot password) |
| `src/app/dashboard/layout.tsx` | Protected layout: re-checks session, renders Sidebar + Header |
| `src/app/dashboard/page.tsx` | Home: total de clientes + contatos recentes |
| `src/app/dashboard/clientes/page.tsx` | Client list page (fetches data, passes to DataTable) |
| `src/app/dashboard/clientes/[id]/page.tsx` | Client detail page (ficha + contatos + notas) |
| `src/components/sidebar.tsx` | Navigation sidebar (`'use client'` for active link) |
| `src/components/header.tsx` | Header with user email + logout button |
| `src/components/clientes-table.tsx` | shadcn DataTable with TanStack Table columns, search, pagination |
| `src/components/cliente-form.tsx` | Create/edit client modal (Dialog) |
| `src/components/cliente-delete-dialog.tsx` | Delete confirmation (AlertDialog) with cascade logic |
| `src/components/contatos-section.tsx` | Contact list + add/edit/delete for a client |
| `src/components/notas-section.tsx` | Notes list + add note for a client |
| `supabase/migrations/001_initial_schema.sql` | Full DDL: tables, trigger, RLS |
| `next.config.js` | `output: 'standalone'` |
| `Dockerfile` | Multi-stage build |
| `.dockerignore` | Exclude node_modules, .next, .env |
| `vitest.config.ts` | Vitest + jsdom + React plugin |
| `vitest.setup.ts` | `@testing-library/jest-dom` setup |

---

## Task 1: Scaffold Project + Install Dependencies

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `.env.local`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Scaffold Next.js 14**

```bash
cd C:\aula
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

When prompted, accept all defaults.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js lucide-react class-variance-authority clsx tailwind-merge @tanstack/react-table
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```

Accept defaults. When asked for style: `Default`. Base color: `Slate`. CSS variables: `yes`.

- [ ] **Step 4: Add required shadcn components**

```bash
npx shadcn@latest add button input label dialog alert-dialog table toast sonner badge
```

- [ ] **Step 5: Install test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 6: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 7: Create vitest.setup.ts**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Add test script to package.json**

In `package.json`, add inside `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 9: Create .env.local**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Replace values with real credentials from Supabase dashboard → Settings → API.

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: Server running at `http://localhost:3000`. Press Ctrl+C to stop.

- [ ] **Step 11: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 14 CRM project with dependencies"
```

---

## Task 2: Database Schema Migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `src/lib/supabase/types.ts`

- [ ] **Step 1: Create migration file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/001_initial_schema.sql`:

```sql
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
```

- [ ] **Step 2: Run migration on Supabase**

In Supabase Dashboard → SQL Editor, paste and run the contents of `001_initial_schema.sql`.

Expected: All statements execute without error. Tables appear in Table Editor.

- [ ] **Step 3: Create database types**

Create `src/lib/supabase/types.ts`:

```typescript
export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          nome: string
          empresa: string | null
          email: string | null
          telefone: string | null
          criado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          empresa?: string | null
          email?: string | null
          telefone?: string | null
          criado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          empresa?: string | null
          email?: string | null
          telefone?: string | null
          criado_por?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contatos: {
        Row: {
          id: string
          cliente_id: string
          nome: string
          cargo: string | null
          email: string | null
          telefone: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          nome: string
          cargo?: string | null
          email?: string | null
          telefone?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          nome?: string
          cargo?: string | null
          email?: string | null
          telefone?: string | null
        }
      }
      notas: {
        Row: {
          id: string
          cliente_id: string
          texto: string
          criado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          texto: string
          criado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          texto?: string
          criado_por?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Cliente = Database['public']['Tables']['clientes']['Row']
export type ClienteInsert = Database['public']['Tables']['clientes']['Insert']
export type ClienteUpdate = Database['public']['Tables']['clientes']['Update']
export type Contato = Database['public']['Tables']['contatos']['Row']
export type ContatoInsert = Database['public']['Tables']['contatos']['Insert']
export type Nota = Database['public']['Tables']['notas']['Row']
export type NotaInsert = Database['public']['Tables']['notas']['Insert']
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql src/lib/supabase/types.ts
git commit -m "feat: add database schema and TypeScript types"
```

---

## Task 3: Supabase Client Utilities

**Files:**
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/__tests__/lib/supabase-clients.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/lib/supabase-clients.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: {} })),
  createBrowserClient: vi.fn(() => ({ auth: {} })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

describe('Supabase server client', () => {
  it('creates a client without throwing', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    expect(() => createClient()).not.toThrow()
  })
})

describe('Supabase browser client', () => {
  it('creates a client without throwing', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    expect(() => createClient()).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/lib/supabase-clients.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/supabase/server'"

- [ ] **Step 3: Create server.ts**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context — cookies are read-only; middleware handles writes
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Create client.ts**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/lib/supabase-clients.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/server.ts src/lib/supabase/client.ts src/__tests__/lib/supabase-clients.test.ts
git commit -m "feat: add Supabase server and browser client utilities"
```

---

## Task 4: Auth Middleware

**Files:**
- Create: `src/middleware.ts`
- Create: `src/__tests__/middleware.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/middleware.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockSetAll = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

async function runMiddleware(url: string, user: object | null, throwError = false) {
  mockGetUser.mockImplementation(() => {
    if (throwError) throw new Error('Network error')
    return Promise.resolve({ data: { user }, error: user ? null : { message: 'Not authenticated' } })
  })
  const { middleware } = await import('@/middleware')
  const req = new NextRequest(new URL(url, 'http://localhost:3000'))
  return middleware(req)
}

describe('middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockReset()
  })

  it('redirects unauthenticated user from /dashboard to /login', async () => {
    const res = await runMiddleware('http://localhost:3000/dashboard', null)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects authenticated user from /login to /dashboard', async () => {
    const res = await runMiddleware('http://localhost:3000/login', { id: 'user-1', email: 'a@b.com' })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('allows authenticated user to access /dashboard', async () => {
    const res = await runMiddleware('http://localhost:3000/dashboard', { id: 'user-1', email: 'a@b.com' })
    expect(res.status).toBe(200)
  })

  it('allows unauthenticated user to access /login', async () => {
    const res = await runMiddleware('http://localhost:3000/login', null)
    expect(res.status).toBe(200)
  })

  it('allows request through when getUser throws a network error', async () => {
    const res = await runMiddleware('http://localhost:3000/dashboard', null, true)
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/middleware.test.ts
```

Expected: FAIL — "Cannot find module '@/middleware'"

- [ ] **Step 3: Create middleware.ts**

Create `src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error) user = data.user
  } catch {
    // Network error — allow request through, do not crash all routes
    return supabaseResponse
  }

  const { pathname } = request.nextUrl

  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/__tests__/middleware.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/__tests__/middleware.test.ts
git commit -m "feat: add auth middleware with getUser and network error handling"
```

---

## Task 5: Login Page

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/__tests__/login.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/login.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSignIn = vi.fn()
const mockResetPassword = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignIn,
      resetPasswordForEmail: mockResetPassword,
    },
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush, refresh: mockRefresh })),
}))

async function renderLogin() {
  const { default: LoginPage } = await import('@/app/login/page')
  return render(<LoginPage />)
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSignIn.mockReset()
    mockPush.mockReset()
  })

  it('renders email and password fields', async () => {
    await renderLogin()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('shows error when submitting empty fields', async () => {
    await renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByText(/preencha todos os campos/i)).toBeInTheDocument()
  })

  it('shows error on invalid credentials', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    await renderLogin()
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'wrongpass')
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByText(/e-mail ou senha incorretos/i)).toBeInTheDocument()
  })

  it('redirects to /dashboard on successful login', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    await renderLogin()
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/senha/i), 'password123')
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/login.test.tsx
```

Expected: FAIL — "Cannot find module '@/app/login/page'"

- [ ] **Step 3: Create login page**

Create `src/app/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError('Preencha todos os campos')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Digite seu e-mail para recuperar a senha')
      return
    }
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    })
    setError('')
    alert('E-mail de recuperação enviado. Verifique sua caixa de entrada.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-2">CRM</h1>
        <p className="text-sm text-gray-500 mb-6">Entre com sua conta</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-500">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          <button
            type="button"
            onClick={handleForgotPassword}
            className="w-full text-sm text-blue-600 hover:underline text-center"
          >
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/__tests__/login.test.tsx
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.tsx src/__tests__/login.test.tsx
git commit -m "feat: add login page with email/password auth and forgot password"
```

---

## Task 6: Dashboard Layout + Sidebar + Header

**Files:**
- Create: `src/components/sidebar.tsx`
- Create: `src/components/header.tsx`
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/__tests__/sidebar.test.tsx`
- Create: `src/__tests__/header.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/sidebar.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard/clientes'),
  useRouter: vi.fn(() => ({})),
}))

describe('Sidebar', () => {
  it('renders Clientes navigation link', async () => {
    const { default: Sidebar } = await import('@/components/sidebar')
    render(<Sidebar />)
    expect(screen.getByRole('link', { name: /clientes/i })).toBeInTheDocument()
  })

  it('highlights active link', async () => {
    const { default: Sidebar } = await import('@/components/sidebar')
    render(<Sidebar />)
    const link = screen.getByRole('link', { name: /clientes/i })
    expect(link.className).toMatch(/blue/)
  })
})
```

Create `src/__tests__/header.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockSignOut = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ auth: { signOut: mockSignOut } })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush, refresh: mockRefresh })),
}))

describe('Header', () => {
  it('shows user email', async () => {
    const { default: Header } = await import('@/components/header')
    render(<Header userEmail="test@example.com" />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('signs out and redirects to /login on logout click', async () => {
    mockSignOut.mockResolvedValue({})
    const { default: Header } = await import('@/components/header')
    render(<Header userEmail="test@example.com" />)
    fireEvent.click(screen.getByRole('button', { name: /sair/i }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/__tests__/sidebar.test.tsx src/__tests__/header.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/sidebar'"

- [ ] **Step 3: Create sidebar.tsx**

Create `src/components/sidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r flex flex-col shrink-0">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold tracking-tight">CRM</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link
          href="/dashboard/clientes"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname.startsWith('/dashboard/clientes')
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          <Users className="h-4 w-4" />
          Clientes
        </Link>
      </nav>
    </aside>
  )
}
```

- [ ] **Step 4: Create header.tsx**

Create `src/components/header.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  userEmail: string
}

export default function Header({ userEmail }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{userEmail}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700">
          Sair
        </Button>
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Create dashboard layout**

Create `src/app/dashboard/layout.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header userEmail={user.email ?? ''} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm run test:run -- src/__tests__/sidebar.test.tsx src/__tests__/header.test.tsx
```

Expected: PASS — 4 tests

- [ ] **Step 7: Commit**

```bash
git add src/components/sidebar.tsx src/components/header.tsx src/app/dashboard/layout.tsx src/__tests__/sidebar.test.tsx src/__tests__/header.test.tsx
git commit -m "feat: add dashboard layout with sidebar and header"
```

---

## Task 7: Dashboard Home Page

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard home page**

Create `src/app/dashboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()

  const [{ count: totalClientes }, { data: contatosRecentes }] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
    supabase
      .from('contatos')
      .select('id, nome, cargo, clientes(nome)')
      .order('id', { ascending: false })
      .limit(5),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resumo</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <p className="text-sm text-gray-500">Total de Clientes</p>
          <p className="text-3xl font-bold mt-1">{totalClientes ?? 0}</p>
        </div>
      </div>

      {contatosRecentes && contatosRecentes.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Contatos Recentes</h2>
          <ul className="space-y-2">
            {contatosRecentes.map(contato => (
              <li key={contato.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{contato.nome}</span>
                {contato.cargo && (
                  <span className="text-gray-400">— {contato.cargo}</span>
                )}
                {contato.clientes && (
                  <span className="text-gray-400 text-xs">
                    ({(contato.clientes as { nome: string }).nome})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify page renders in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Expected: page shows "Resumo" with total de clientes = 0 (database is empty). No errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add dashboard home page with client count and recent contacts"
```

---

## Task 8: Clientes DataTable

**Files:**
- Create: `src/components/clientes-table.tsx`
- Create: `src/app/dashboard/clientes/page.tsx`
- Create: `src/__tests__/clientes-table.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/clientes-table.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Cliente } from '@/lib/supabase/types'

const mockClientes: Cliente[] = [
  { id: '1', nome: 'Empresa Alpha', empresa: 'Alpha Ltda', email: 'alpha@example.com', telefone: '11999999999', criado_por: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: '2', nome: 'Beta Corp', empresa: 'Beta S.A.', email: 'beta@example.com', telefone: null, criado_por: null, created_at: '2026-01-02', updated_at: '2026-01-02' },
]

describe('ClientesTable', () => {
  it('renders client names in rows', async () => {
    const { default: ClientesTable } = await import('@/components/clientes-table')
    render(<ClientesTable clientes={mockClientes} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Empresa Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta Corp')).toBeInTheDocument()
  })

  it('renders column headers', async () => {
    const { default: ClientesTable } = await import('@/components/clientes-table')
    render(<ClientesTable clientes={mockClientes} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Nome')).toBeInTheDocument()
    expect(screen.getByText('Empresa')).toBeInTheDocument()
    expect(screen.getByText('E-mail')).toBeInTheDocument()
  })

  it('filters rows by search input', async () => {
    const { default: ClientesTable } = await import('@/components/clientes-table')
    render(<ClientesTable clientes={mockClientes} onEdit={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText(/buscar/i), { target: { value: 'Alpha' } })
    expect(screen.getByText('Empresa Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Beta Corp')).not.toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn()
    const { default: ClientesTable } = await import('@/components/clientes-table')
    render(<ClientesTable clientes={mockClientes} onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /editar/i })[0])
    expect(onEdit).toHaveBeenCalledWith(mockClientes[0])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/clientes-table.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/clientes-table'"

- [ ] **Step 3: Create clientes-table.tsx**

Create `src/components/clientes-table.tsx`:

```typescript
'use client'

import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Cliente } from '@/lib/supabase/types'

interface ClientesTableProps {
  clientes: Cliente[]
  onEdit: (cliente: Cliente) => void
  onDelete: (cliente: Cliente) => void
}

export default function ClientesTable({ clientes, onEdit, onDelete }: ClientesTableProps) {
  const [globalFilter, setGlobalFilter] = useState('')

  const columns: ColumnDef<Cliente>[] = [
    { accessorKey: 'nome', header: 'Nome' },
    { accessorKey: 'empresa', header: 'Empresa', cell: ({ getValue }) => getValue() ?? '—' },
    { accessorKey: 'email', header: 'E-mail', cell: ({ getValue }) => getValue() ?? '—' },
    { accessorKey: 'telefone', header: 'Telefone', cell: ({ getValue }) => getValue() ?? '—' },
    {
      id: 'acoes',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)} aria-label="Editar">
            Editar
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(row.original)} aria-label="Excluir">
            Excluir
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: clientes,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar clientes..."
        value={globalFilter}
        onChange={e => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-gray-400 py-8">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create clientes list page**

Create `src/app/dashboard/clientes/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import ClientesPageClient from './page-client'

export default async function ClientesPage() {
  const supabase = createClient()
  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .order('nome')

  return <ClientesPageClient clientes={clientes ?? []} />
}
```

Create `src/app/dashboard/clientes/page-client.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import ClientesTable from '@/components/clientes-table'
import ClienteForm from '@/components/cliente-form'
import ClienteDeleteDialog from '@/components/cliente-delete-dialog'
import { Button } from '@/components/ui/button'
import type { Cliente } from '@/lib/supabase/types'

interface Props {
  clientes: Cliente[]
}

export default function ClientesPageClient({ clientes }: Props) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null)

  function handleEdit(cliente: Cliente) {
    setEditingCliente(cliente)
    setFormOpen(true)
  }

  function handleCreate() {
    setEditingCliente(null)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    setFormOpen(false)
    setEditingCliente(null)
    router.refresh()
    toast.success(editingCliente ? 'Cliente atualizado.' : 'Cliente criado.')
  }

  async function handleDeleteConfirm(cliente: Cliente) {
    const supabase = createClient()
    // Delete children first (on delete restrict requires manual cascade)
    await supabase.from('notas').delete().eq('cliente_id', cliente.id)
    await supabase.from('contatos').delete().eq('cliente_id', cliente.id)
    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id)
    if (error) {
      toast.error('Não foi possível excluir. Remova os contatos e notas manualmente.')
    } else {
      toast.success('Cliente excluído.')
      router.refresh()
    }
    setDeletingCliente(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={handleCreate}>Novo Cliente</Button>
      </div>

      <ClientesTable
        clientes={clientes}
        onEdit={handleEdit}
        onDelete={setDeletingCliente}
      />

      <ClienteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        cliente={editingCliente}
        onSuccess={handleFormSuccess}
      />

      {deletingCliente && (
        <ClienteDeleteDialog
          cliente={deletingCliente}
          open={!!deletingCliente}
          onOpenChange={open => !open && setDeletingCliente(null)}
          onConfirm={() => handleDeleteConfirm(deletingCliente)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:run -- src/__tests__/clientes-table.test.tsx
```

Expected: PASS — 4 tests

- [ ] **Step 6: Commit**

```bash
git add src/components/clientes-table.tsx src/app/dashboard/clientes/ src/__tests__/clientes-table.test.tsx
git commit -m "feat: add clientes DataTable with search, pagination, and action buttons"
```

---

## Task 9: Cliente Form Modal (Create / Edit)

**Files:**
- Create: `src/components/cliente-form.tsx`
- Create: `src/__tests__/cliente-form.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/cliente-form.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Cliente } from '@/lib/supabase/types'

const mockInsert = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
      update: vi.fn(() => ({ eq: mockUpdate })),
    })),
    auth: { getUser: vi.fn(() => ({ data: { user: { id: 'u1' } } })) },
  })),
}))

const mockCliente: Cliente = {
  id: '1', nome: 'Alpha', empresa: 'Alpha Ltda', email: 'a@b.com', telefone: '11999',
  criado_por: null, created_at: '2026-01-01', updated_at: '2026-01-01',
}

describe('ClienteForm', () => {
  beforeEach(() => { mockInsert.mockReset(); mockUpdate.mockReset() })

  it('renders empty form for new client', async () => {
    const { default: ClienteForm } = await import('@/components/cliente-form')
    render(<ClienteForm open onOpenChange={vi.fn()} cliente={null} onSuccess={vi.fn()} />)
    expect(screen.getByLabelText(/nome/i)).toHaveValue('')
  })

  it('renders populated form for existing client', async () => {
    const { default: ClienteForm } = await import('@/components/cliente-form')
    render(<ClienteForm open onOpenChange={vi.fn()} cliente={mockCliente} onSuccess={vi.fn()} />)
    expect(screen.getByLabelText(/nome/i)).toHaveValue('Alpha')
    expect(screen.getByLabelText(/empresa/i)).toHaveValue('Alpha Ltda')
  })

  it('shows error when submitting without required nome field', async () => {
    const { default: ClienteForm } = await import('@/components/cliente-form')
    render(<ClienteForm open onOpenChange={vi.fn()} cliente={null} onSuccess={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(await screen.findByText(/nome é obrigatório/i)).toBeInTheDocument()
  })

  it('calls onSuccess after successful insert', async () => {
    mockInsert.mockResolvedValue({ error: null })
    const onSuccess = vi.fn()
    const { default: ClienteForm } = await import('@/components/cliente-form')
    render(<ClienteForm open onOpenChange={vi.fn()} cliente={null} onSuccess={onSuccess} />)
    await userEvent.type(screen.getByLabelText(/nome/i), 'Novo Cliente')
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/cliente-form.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/cliente-form'"

- [ ] **Step 3: Create cliente-form.tsx**

Create `src/components/cliente-form.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import type { Cliente } from '@/lib/supabase/types'

interface ClienteFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente | null
  onSuccess: () => void
}

interface FormData {
  nome: string
  empresa: string
  email: string
  telefone: string
}

const empty: FormData = { nome: '', empresa: '', email: '', telefone: '' }

export default function ClienteForm({ open, onOpenChange, cliente, onSuccess }: ClienteFormProps) {
  const supabase = createClient()
  const [form, setForm] = useState<FormData>(empty)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(cliente ? {
        nome: cliente.nome,
        empresa: cliente.empresa ?? '',
        email: cliente.email ?? '',
        telefone: cliente.telefone ?? '',
      } : empty)
      setError('')
    }
  }, [open, cliente])

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setError('Nome é obrigatório')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      nome: form.nome.trim(),
      empresa: form.empresa.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
    }

    const { error } = cliente
      ? await supabase.from('clientes').update(payload).eq('id', cliente.id)
      : await supabase.from('clientes').insert(payload)

    if (error) {
      setError('Erro ao salvar. Tente novamente.')
      setLoading(false)
      return
    }
    setLoading(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} id="cliente-form" className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" value={form.nome} onChange={set('nome')} placeholder="Nome do cliente" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="empresa">Empresa</Label>
            <Input id="empresa" value={form.empresa} onChange={set('empresa')} placeholder="Nome da empresa" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={form.email} onChange={set('email')} placeholder="email@empresa.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" value={form.telefone} onChange={set('telefone')} placeholder="(11) 99999-9999" />
          </div>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="cliente-form" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/__tests__/cliente-form.test.tsx
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/cliente-form.tsx src/__tests__/cliente-form.test.tsx
git commit -m "feat: add cliente create/edit form modal"
```

---

## Task 10: Cliente Delete Dialog

**Files:**
- Create: `src/components/cliente-delete-dialog.tsx`
- Create: `src/__tests__/cliente-delete-dialog.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/cliente-delete-dialog.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Cliente } from '@/lib/supabase/types'

const mockCliente: Cliente = {
  id: '1', nome: 'Alpha', empresa: null, email: null, telefone: null,
  criado_por: null, created_at: '2026-01-01', updated_at: '2026-01-01',
}

describe('ClienteDeleteDialog', () => {
  it('shows client name in confirmation message', async () => {
    const { default: ClienteDeleteDialog } = await import('@/components/cliente-delete-dialog')
    render(<ClienteDeleteDialog open cliente={mockCliente} onOpenChange={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByText(/Alpha/i)).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn()
    const { default: ClienteDeleteDialog } = await import('@/components/cliente-delete-dialog')
    render(<ClienteDeleteDialog open cliente={mockCliente} onOpenChange={vi.fn()} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const onOpenChange = vi.fn()
    const { default: ClienteDeleteDialog } = await import('@/components/cliente-delete-dialog')
    render(<ClienteDeleteDialog open cliente={mockCliente} onOpenChange={onOpenChange} onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/cliente-delete-dialog.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/cliente-delete-dialog'"

- [ ] **Step 3: Create cliente-delete-dialog.tsx**

Create `src/components/cliente-delete-dialog.tsx`:

```typescript
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Cliente } from '@/lib/supabase/types'

interface ClienteDeleteDialogProps {
  open: boolean
  cliente: Cliente
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export default function ClienteDeleteDialog({
  open, cliente, onOpenChange, onConfirm,
}: ClienteDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{cliente.nome}</strong>?
            Todos os contatos e notas associados também serão removidos.
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/__tests__/cliente-delete-dialog.test.tsx
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/cliente-delete-dialog.tsx src/__tests__/cliente-delete-dialog.test.tsx
git commit -m "feat: add cliente delete confirmation dialog"
```

---

## Task 11: Cliente Detail Page

**Files:**
- Create: `src/app/dashboard/clientes/[id]/page.tsx`

- [ ] **Step 1: Create client detail page**

Create `src/app/dashboard/clientes/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import ContatosSection from '@/components/contatos-section'
import NotasSection from '@/components/notas-section'

interface Props {
  params: { id: string }
}

export default async function ClienteDetailPage({ params }: Props) {
  const supabase = createClient()

  const [{ data: cliente }, { data: contatos }, { data: notas }] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', params.id).single(),
    supabase.from('contatos').select('*').eq('cliente_id', params.id).order('nome'),
    supabase.from('notas').select('*').eq('cliente_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!cliente) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clientes">
          <Button variant="ghost" size="sm">← Voltar</Button>
        </Link>
        <h1 className="text-2xl font-bold">{cliente.nome}</h1>
      </div>

      {/* Dados do cliente */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Dados</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Empresa</dt>
            <dd className="font-medium">{cliente.empresa ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">E-mail</dt>
            <dd className="font-medium">{cliente.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Telefone</dt>
            <dd className="font-medium">{cliente.telefone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Atualizado em</dt>
            <dd className="font-medium">{new Date(cliente.updated_at).toLocaleDateString('pt-BR')}</dd>
          </div>
        </dl>
      </div>

      <ContatosSection clienteId={params.id} initialContatos={contatos ?? []} />
      <NotasSection clienteId={params.id} initialNotas={notas ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Create a client via the list page, then click to view the detail. Expected: detail page renders with client data, empty contacts/notes sections. No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/clientes/[id]/page.tsx
git commit -m "feat: add client detail page with data, contacts and notes sections"
```

---

## Task 12: Contatos Section

**Files:**
- Create: `src/components/contatos-section.tsx`
- Create: `src/__tests__/contatos-section.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/contatos-section.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Contato } from '@/lib/supabase/types'

const mockInsert = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
      delete: vi.fn(() => ({ eq: mockDelete })),
    })),
  })),
}))

const mockContatos: Contato[] = [
  { id: '1', cliente_id: 'c1', nome: 'João Silva', cargo: 'Diretor', email: 'joao@company.com', telefone: null },
]

describe('ContatosSection', () => {
  beforeEach(() => { mockInsert.mockReset(); mockDelete.mockReset() })

  it('renders existing contacts', async () => {
    const { default: ContatosSection } = await import('@/components/contatos-section')
    render(<ContatosSection clienteId="c1" initialContatos={mockContatos} />)
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Diretor')).toBeInTheDocument()
  })

  it('shows empty state when no contacts', async () => {
    const { default: ContatosSection } = await import('@/components/contatos-section')
    render(<ContatosSection clienteId="c1" initialContatos={[]} />)
    expect(screen.getByText(/nenhum contato/i)).toBeInTheDocument()
  })

  it('adds a new contact on form submit', async () => {
    mockInsert.mockResolvedValue({ data: [{ id: '2', cliente_id: 'c1', nome: 'Maria', cargo: null, email: null, telefone: null }], error: null })
    const { default: ContatosSection } = await import('@/components/contatos-section')
    render(<ContatosSection clienteId="c1" initialContatos={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /adicionar contato/i }))
    await userEvent.type(screen.getByLabelText(/nome/i), 'Maria')
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(mockInsert).toHaveBeenCalled())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/contatos-section.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/contatos-section'"

- [ ] **Step 3: Create contatos-section.tsx**

Create `src/components/contatos-section.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Contato } from '@/lib/supabase/types'

interface ContatosSectionProps {
  clienteId: string
  initialContatos: Contato[]
}

interface ContatoForm {
  nome: string
  cargo: string
  email: string
  telefone: string
}

const emptyForm: ContatoForm = { nome: '', cargo: '', email: '', telefone: '' }

export default function ContatosSection({ clienteId, initialContatos }: ContatosSectionProps) {
  const supabase = createClient()
  const [contatos, setContatos] = useState<Contato[]>(initialContatos)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ContatoForm>(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof ContatoForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true)
    const { data, error } = await supabase.from('contatos').insert({
      cliente_id: clienteId,
      nome: form.nome.trim(),
      cargo: form.cargo.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
    })
    if (error) { setError('Erro ao salvar.'); setLoading(false); return }
    if (data) setContatos(prev => [...prev, data[0]])
    setLoading(false)
    setOpen(false)
    setForm(emptyForm)
    setError('')
  }

  async function handleDelete(id: string) {
    await supabase.from('contatos').delete().eq('id', id)
    setContatos(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Contatos</h2>
        <Button size="sm" onClick={() => { setForm(emptyForm); setError(''); setOpen(true) }}>
          Adicionar Contato
        </Button>
      </div>

      {contatos.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum contato cadastrado.</p>
      ) : (
        <ul className="space-y-3">
          {contatos.map(c => (
            <li key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium text-sm">{c.nome}</p>
                <div className="flex gap-2 mt-1">
                  {c.cargo && <Badge variant="secondary">{c.cargo}</Badge>}
                  {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                  {c.telefone && <span className="text-xs text-gray-400">{c.telefone}</span>}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(c.id)}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Contato</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} id="contato-form" className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="contato-nome">Nome *</Label>
              <Input id="contato-nome" value={form.nome} onChange={set('nome')} placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contato-cargo">Cargo</Label>
              <Input id="contato-cargo" value={form.cargo} onChange={set('cargo')} placeholder="Ex: Diretor Comercial" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contato-email">E-mail</Label>
              <Input id="contato-email" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contato-telefone">Telefone</Label>
              <Input id="contato-telefone" value={form.telefone} onChange={set('telefone')} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="contato-form" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/__tests__/contatos-section.test.tsx
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/contatos-section.tsx src/__tests__/contatos-section.test.tsx
git commit -m "feat: add contacts section with add/delete functionality"
```

---

## Task 13: Notas Section

**Files:**
- Create: `src/components/notas-section.tsx`
- Create: `src/__tests__/notas-section.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/notas-section.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Nota } from '@/lib/supabase/types'

const mockInsert = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({ insert: mockInsert })),
    auth: { getUser: vi.fn(() => ({ data: { user: { id: 'u1' } } })) },
  })),
}))

const mockNotas: Nota[] = [
  { id: '1', cliente_id: 'c1', texto: 'Reunião inicial realizada.', criado_por: 'u1', created_at: '2026-01-15T10:00:00Z' },
]

describe('NotasSection', () => {
  beforeEach(() => mockInsert.mockReset())

  it('renders existing notes', async () => {
    const { default: NotasSection } = await import('@/components/notas-section')
    render(<NotasSection clienteId="c1" initialNotas={mockNotas} />)
    expect(screen.getByText('Reunião inicial realizada.')).toBeInTheDocument()
  })

  it('shows empty state when no notes', async () => {
    const { default: NotasSection } = await import('@/components/notas-section')
    render(<NotasSection clienteId="c1" initialNotas={[]} />)
    expect(screen.getByText(/nenhuma nota/i)).toBeInTheDocument()
  })

  it('adds a new note on submit', async () => {
    mockInsert.mockResolvedValue({
      data: [{ id: '2', cliente_id: 'c1', texto: 'Nova nota.', criado_por: 'u1', created_at: new Date().toISOString() }],
      error: null,
    })
    const { default: NotasSection } = await import('@/components/notas-section')
    render(<NotasSection clienteId="c1" initialNotas={[]} />)
    await userEvent.type(screen.getByPlaceholderText(/escreva uma nota/i), 'Nova nota.')
    fireEvent.click(screen.getByRole('button', { name: /adicionar nota/i }))
    await waitFor(() => expect(mockInsert).toHaveBeenCalled())
  })

  it('does not submit empty note', async () => {
    const { default: NotasSection } = await import('@/components/notas-section')
    render(<NotasSection clienteId="c1" initialNotas={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /adicionar nota/i }))
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/notas-section.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/notas-section'"

- [ ] **Step 3: Create notas-section.tsx**

Create `src/components/notas-section.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Nota } from '@/lib/supabase/types'

interface NotasSectionProps {
  clienteId: string
  initialNotas: Nota[]
}

export default function NotasSection({ clienteId, initialNotas }: NotasSectionProps) {
  const supabase = createClient()
  const [notas, setNotas] = useState<Nota[]>(initialNotas)
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('notas').insert({
      cliente_id: clienteId,
      texto: texto.trim(),
      criado_por: user?.id ?? null,
    })
    if (!error && data) {
      setNotas(prev => [data[0], ...prev])
      setTexto('')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Histórico de Notas</h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <Textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escreva uma nota sobre esta interação..."
          className="resize-none"
          rows={2}
        />
        <Button type="submit" disabled={loading} className="self-end shrink-0">
          {loading ? '...' : 'Adicionar Nota'}
        </Button>
      </form>

      {notas.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma nota registrada.</p>
      ) : (
        <ul className="space-y-4">
          {notas.map(nota => (
            <li key={nota.id} className="border-l-2 border-gray-200 pl-4">
              <p className="text-sm">{nota.texto}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(nota.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add Textarea to shadcn (if not already installed)**

```bash
npx shadcn@latest add textarea
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:run -- src/__tests__/notas-section.test.tsx
```

Expected: PASS — 4 tests

- [ ] **Step 6: Run all tests**

```bash
npm run test:run
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/notas-section.tsx src/__tests__/notas-section.test.tsx
git commit -m "feat: add notes section with add note functionality"
```

---

## Task 14: Docker + EasyPanel Deploy Config

**Files:**
- Modify: `next.config.js`
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Configure next.config.js with standalone output**

Replace `next.config.js` with:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig
```

- [ ] **Step 2: Create .dockerignore**

Create `.dockerignore`:

```
node_modules
.next
.env
.env.local
.env*.local
Dockerfile
.dockerignore
.git
.gitignore
README.md
```

- [ ] **Step 3: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# Stage 2: Build application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 4: Verify build succeeds locally**

```bash
npm run build
```

Expected: Build completes without errors. `.next/standalone` directory is created.

- [ ] **Step 5: Add Toaster to root layout**

Open `src/app/layout.tsx` and ensure it includes the Sonner Toaster:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CRM',
  description: 'Sistema de gestão de clientes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        <Toaster richColors />
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add next.config.js Dockerfile .dockerignore src/app/layout.tsx
git commit -m "feat: add Docker multi-stage build and standalone Next.js config"
```

- [ ] **Step 7: Connect repo to EasyPanel**

In EasyPanel:
1. Create new service → "App" → connect Git repository
2. Set build type to "Dockerfile"
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key (server-side only)
4. Configure custom domain + enable Let's Encrypt HTTPS
5. Deploy

---

## Self-Review Checklist

### Spec Coverage

| Spec Requirement | Task |
|-----------------|------|
| Login com email/senha | Task 5 |
| Cookie httpOnly + Secure + SameSite=Lax via @supabase/ssr | Task 4 |
| Middleware com getUser() + try/catch | Task 4 |
| Redirecionamento para /login se não autenticado | Task 4 |
| Redirecionamento para /dashboard se já logado | Task 4 |
| Link "Esqueci minha senha" | Task 5 |
| Sidebar com navegação | Task 6 |
| Header com email do usuário + logout | Task 6 |
| Dashboard home com total de clientes | Task 7 |
| Tabela de clientes com busca + paginação (shadcn DataTable) | Task 8 |
| Formulário criar/editar cliente (modal) | Task 9 |
| Fluxo de exclusão com modal de confirmação | Tasks 8 + 10 |
| Página de detalhe do cliente | Task 11 |
| Seção de contatos por cliente | Task 12 |
| Seção de notas/histórico | Task 13 |
| Schema SQL com RLS + trigger updated_at | Task 2 |
| output: standalone + Dockerfile multi-stage | Task 14 |
| HTTPS via EasyPanel | Task 14 |
| @tanstack/react-table listado | Task 1 |
| getUser() com try/catch no middleware | Task 4 |

### Type Consistency
- `Cliente`, `Contato`, `Nota`, `ClienteInsert`, `ContatoInsert`, `NotaInsert` — defined in Task 2, used consistently in Tasks 8–13
- `createClient()` — same function name in both `server.ts` and `client.ts` (different imports)
- `onEdit(cliente: Cliente)` and `onDelete(cliente: Cliente)` — consistent across Tasks 8, 9, 10
- `clienteId: string` prop — consistent across Tasks 12, 13

### Placeholder Scan
- No TBDs found
- All code blocks complete
- All commands include expected output
