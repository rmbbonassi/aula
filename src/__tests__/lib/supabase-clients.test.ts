import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: {} })),
  createBrowserClient: vi.fn(() => ({ auth: {} })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

describe('Supabase server client', () => {
  it('creates a client without throwing', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    expect(() => createClient()).not.toThrow()
  })
})

describe('Supabase browser client', () => {
  it('creates a client without throwing', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    expect(() => createClient()).not.toThrow()
  })
})
