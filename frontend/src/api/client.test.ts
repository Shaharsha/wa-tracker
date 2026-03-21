import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setToken, clearToken, hasToken } from './client'

describe('auth token management', () => {
  beforeEach(() => {
    localStorage.removeItem('wa_tracker_token')
  })

  it('hasToken returns false when no token set', () => {
    expect(hasToken()).toBe(false)
  })

  it('setToken stores token and hasToken returns true', () => {
    setToken('my-token')
    expect(hasToken()).toBe(true)
    expect(localStorage.getItem('wa_tracker_token')).toBe('my-token')
  })

  it('clearToken removes token', () => {
    setToken('my-token')
    clearToken()
    expect(hasToken()).toBe(false)
    expect(localStorage.getItem('wa_tracker_token')).toBeNull()
  })
})

describe('api.login', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns token on successful login', async () => {
    const { api } = await import('./client')
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'abc123' }),
    })

    const token = await api.login('user', 'pass')
    expect(token).toBe('abc123')
    expect(fetch).toHaveBeenCalledWith('/api/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'user', password: 'pass' }),
    }))
  })

  it('throws on failed login', async () => {
    const { api } = await import('./client')
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    })

    await expect(api.login('user', 'wrong')).rejects.toThrow('Invalid credentials')
  })
})
