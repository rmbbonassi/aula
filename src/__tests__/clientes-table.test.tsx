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
