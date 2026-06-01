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
