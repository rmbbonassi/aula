import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Contato } from '@/lib/supabase/types'

const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))
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
  { id: '1', cliente_id: 'c1', nome: 'João Silva', cargo: 'Diretor', email: 'joao@company.com', telefone: null, created_at: '2026-01-01T10:00:00Z' },
]

describe('ContatosSection', () => {
  beforeEach(() => { mockInsert.mockReset(); mockSelect.mockReset(); mockSingle.mockReset(); mockDelete.mockReset() })

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
    mockSingle.mockResolvedValue({ data: { id: '2', cliente_id: 'c1', nome: 'Maria', cargo: null, email: null, telefone: null, created_at: new Date().toISOString() }, error: null })
    const { default: ContatosSection } = await import('@/components/contatos-section')
    render(<ContatosSection clienteId="c1" initialContatos={[]} />)
    fireEvent.click(screen.getByRole('button', { name: /adicionar contato/i }))
    await userEvent.type(screen.getByLabelText(/nome/i), 'Maria')
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(mockInsert).toHaveBeenCalled())
  })
})
