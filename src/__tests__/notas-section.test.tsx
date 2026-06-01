import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Nota } from '@/lib/supabase/types'

const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({ insert: mockInsert })),
  })),
}))

const mockNotas: Nota[] = [
  { id: '1', cliente_id: 'c1', texto: 'Reunião inicial realizada.', criado_por: 'u1', created_at: '2026-01-15T10:00:00Z' },
]

describe('NotasSection', () => {
  beforeEach(() => { mockInsert.mockReset(); mockSelect.mockReset(); mockSingle.mockReset() })

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
    mockSingle.mockResolvedValue({
      data: { id: '2', cliente_id: 'c1', texto: 'Nova nota.', criado_por: null, created_at: new Date().toISOString() },
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
