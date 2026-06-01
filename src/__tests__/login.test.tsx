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
