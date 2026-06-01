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
