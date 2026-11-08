import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { TOKEN_STORAGE_KEY } from '../auth/oidc'

export const mockCurrentUser = {
  id: 1,
  subject: 'test-user',
  email: 'test@example.com',
  display_name: '陈默',
  tenants: [{ tenant_id: 'tenant-a', role: 'Admin' }],
  workspaces: [],
}

export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

beforeEach(() => {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
    accessToken: 'test-access-token',
    idToken: 'test-id-token',
    expiresAt: Date.now() + 3600_000,
  }))
  vi.stubGlobal('fetch', vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const body = String(input).includes('/auth/me') ? mockCurrentUser : []
    return Promise.resolve(jsonResponse(body))
  }))
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  window.history.replaceState({}, '', '/')
  vi.unstubAllGlobals()
})
