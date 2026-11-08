import { describe, expect, it, vi } from 'vitest'
import { completeLogin, getAccessToken, TOKEN_STORAGE_KEY } from './oidc'
import { jsonResponse } from '../test/setup'

function encodeClaims(claims: object): string {
  return btoa(JSON.stringify(claims)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

describe('OIDC authorization code flow', () => {
  it('exchanges a PKCE code and validates state and nonce', async () => {
    sessionStorage.setItem('dwlle.oidc.pending', JSON.stringify({
      state: 'expected-state',
      verifier: 'expected-verifier',
      nonce: 'expected-nonce',
    }))
    window.history.replaceState({}, '', '/?code=auth-code&state=expected-state')
    const idToken = `header.${encodeClaims({ nonce: 'expected-nonce' })}.signature`
    vi.mocked(fetch).mockImplementation((input) => {
      if (String(input).includes('openid-configuration')) {
        return Promise.resolve(jsonResponse({
          authorization_endpoint: 'http://keycloak.test/authorize',
          token_endpoint: 'http://keycloak.test/token',
        }))
      }
      return Promise.resolve(jsonResponse({
        access_token: 'oidc-access-token',
        id_token: idToken,
        expires_in: 300,
        token_type: 'Bearer',
      }))
    })

    await expect(completeLogin()).resolves.toBe(true)

    expect(getAccessToken()).toBe('oidc-access-token')
    expect(window.location.search).toBe('')
    expect(sessionStorage.getItem('dwlle.oidc.pending')).toBeNull()
    const tokenCall = vi.mocked(fetch).mock.calls.find(([input]) => String(input).includes('/token'))
    expect(tokenCall?.[1]?.method).toBe('POST')
    expect(String(tokenCall?.[1]?.body)).toContain('code_verifier=expected-verifier')
    expect(JSON.parse(sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? '{}').idToken).toBe(idToken)
  })

  it('rejects a callback with unexpected state', async () => {
    sessionStorage.setItem('dwlle.oidc.pending', JSON.stringify({
      state: 'expected-state',
      verifier: 'expected-verifier',
      nonce: 'expected-nonce',
    }))
    window.history.replaceState({}, '', '/?code=auth-code&state=attacker-state')

    await expect(completeLogin()).rejects.toThrow('OIDC login state does not match')
    expect(getAccessToken()).toBe('test-access-token')
  })

  it('does not use an expired access token', () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({
      accessToken: 'expired-token',
      idToken: 'expired-id-token',
      expiresAt: Date.now() - 1000,
    }))

    expect(getAccessToken()).toBeNull()
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })
})
