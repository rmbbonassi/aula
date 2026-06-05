# Register Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a página `/register` com formulário de cadastro (nome, e-mail, senha, confirmar senha) e confirmação por e-mail via Supabase.

**Architecture:** Client Component seguindo o mesmo padrão do `/login`. Após submit bem-sucedido, o formulário é substituído por mensagem de confirmação. A confirmação de e-mail é delegada ao Supabase (email confirmation habilitado por padrão).

**Tech Stack:** Next.js 14 App Router, Supabase Auth (`supabase.auth.signUp`), shadcn/ui (Button, Input, Label), Vitest + @testing-library/react.

---

### Task 1: Testes para RegisterPage

**Files:**
- Create: `src/__tests__/register.test.tsx`

- [ ] **Step 1: Criar o arquivo de teste**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSignUp = vi.fn()
const mockPush = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: mockSignUp,
    },
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}))

async function renderRegister() {
  const { default: RegisterPage } = await import('@/app/register/page')
  return render(<RegisterPage />)
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSignUp.mockReset()
    mockPush.mockReset()
  })

  it('renders all fields', async () => {
    await renderRegister()
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
  })

  it('shows error when fields are empty', async () => {
    await renderRegister()
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByText(/preencha todos os campos/i)).toBeInTheDocument()
  })

  it('shows error when nome has less than 2 characters', async () => {
    await renderRegister()
    await userEvent.type(screen.getByLabelText(/nome completo/i), 'A')
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'senha123')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'senha123')
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByText(/nome deve ter ao menos 2 caracteres/i)).toBeInTheDocument()
  })

  it('shows error when password is too short', async () => {
    await renderRegister()
    await userEvent.type(screen.getByLabelText(/nome completo/i), 'João')
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/^senha$/i), '123')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), '123')
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByText(/senha deve ter ao menos 6 caracteres/i)).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    await renderRegister()
    await userEvent.type(screen.getByLabelText(/nome completo/i), 'João')
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'senha123')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'outrasenha')
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByText(/as senhas não coincidem/i)).toBeInTheDocument()
  })

  it('shows success message after signUp', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { email: 'a@b.com' } }, error: null })
    await renderRegister()
    await userEvent.type(screen.getByLabelText(/nome completo/i), 'João')
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'senha123')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'senha123')
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByText(/verifique seu e-mail/i)).toBeInTheDocument()
  })

  it('shows error on signUp failure', async () => {
    mockSignUp.mockResolvedValue({ data: null, error: { message: 'User already registered' } })
    await renderRegister()
    await userEvent.type(screen.getByLabelText(/nome completo/i), 'João')
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/^senha$/i), 'senha123')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'senha123')
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByText(/não foi possível criar a conta/i)).toBeInTheDocument()
  })

  it('renders link to /login', async () => {
    await renderRegister()
    expect(screen.getByRole('link', { name: /já tenho conta/i })).toHaveAttribute('href', '/login')
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
npx vitest run src/__tests__/register.test.tsx
```

Esperado: todos os testes falham com `Cannot find module '@/app/register/page'`.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/register.test.tsx
git commit -m "test: add RegisterPage tests (red)"
```

---

### Task 2: Implementar RegisterPage

**Files:**
- Create: `src/app/register/page.tsx`

- [ ] **Step 1: Criar a página**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const supabase = createClient()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome || !email || !password || !confirm) {
      setError('Preencha todos os campos')
      return
    }
    if (nome.trim().length < 2) {
      setError('Nome deve ter ao menos 2 caracteres')
      return
    }
    if (password.length < 6) {
      setError('Senha deve ter ao menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: nome.trim() } },
    })
    if (error) {
      setError('Não foi possível criar a conta. Tente novamente.')
      setLoading(false)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow text-center space-y-4">
          <h1 className="text-2xl font-bold">Verifique seu e-mail</h1>
          <p className="text-sm text-gray-500">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Verifique sua caixa de entrada para ativar a conta.
          </p>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-2">Criar conta</h1>
        <p className="text-sm text-gray-500 mb-6">Preencha os dados para se cadastrar</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
            />
          </div>
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
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repita a senha"
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-500">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </Button>
          <Link
            href="/login"
            className="block w-full text-sm text-blue-600 hover:underline text-center"
          >
            Já tenho conta. Entrar
          </Link>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rodar os testes e confirmar que passam**

```bash
npx vitest run src/__tests__/register.test.tsx
```

Esperado: todos os 8 testes passam.

- [ ] **Step 3: Commit**

```bash
git add src/app/register/page.tsx
git commit -m "feat: add register page with email confirmation"
```

---

### Task 3: Adicionar link "Criar conta" no Login

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Adicionar import de Link e o link para /register**

No arquivo `src/app/login/page.tsx`:

Adicionar no topo, após os imports existentes:
```tsx
import Link from 'next/link'
```

Adicionar após o `<button>` de "Esqueci minha senha" (linha ~93), dentro do `<form>`:
```tsx
          <Link
            href="/register"
            className="block w-full text-sm text-gray-500 hover:underline text-center"
          >
            Não tem conta? Criar conta
          </Link>
```

- [ ] **Step 2: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: todos os 33+ testes passam (os testes de login existentes continuam verdes).

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: add register link to login page"
```
