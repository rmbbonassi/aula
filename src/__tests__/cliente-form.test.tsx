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
