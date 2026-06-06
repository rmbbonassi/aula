import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
