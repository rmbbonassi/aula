import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockSetAll = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

async function runMiddleware(url: string, user: object | null, throwError = false) {
  mockGetUser.mockImplementation(() => {
    if (throwError) throw new Error('Network error')
    return Promise.resolve({ data: { user }, error: user ? null : { message: 'Not authenticated' } })
  })
  const { middleware } = await import('@/middleware')
  const req = new NextRequest(new URL(url, 'http://localhost:3000'))
  return middleware(req)
}

describe('middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetUser.mockReset()
  })

  it('redirects unauthenticated user from /dashboard to /login', async () => {
    const res = await runMiddleware('http://localhost:3000/dashboard', null)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects authenticated user from /login to /dashboard', async () => {
    const res = await runMiddleware('http://localhost:3000/login', { id: 'user-1', email: 'a@b.com' })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('allows authenticated user to access /dashboard', async () => {
    const res = await runMiddleware('http://localhost:3000/dashboard', { id: 'user-1', email: 'a@b.com' })
    expect(res.status).toBe(200)
  })

  it('allows unauthenticated user to access /login', async () => {
    const res = await runMiddleware('http://localhost:3000/login', null)
    expect(res.status).toBe(200)
  })

  it('allows request through when getUser throws a network error', async () => {
    const res = await runMiddleware('http://localhost:3000/dashboard', null, true)
    expect(res.status).toBe(200)
  })
})
