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
