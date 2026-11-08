export const TOKEN_STORAGE_KEY = 'dwlle.oidc.tokens'
const PENDING_STORAGE_KEY = 'dwlle.oidc.pending'

interface StoredTokens {
  accessToken: string
  idToken: string
  expiresAt: number
}

interface PendingAuthorization {
  state: string
  verifier: string
  nonce: string
}

interface DiscoveryDocument {
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint?: string
}

const issuer = (import.meta.env.VITE_OIDC_ISSUER as string | undefined) ?? 'http://127.0.0.1:8080/realms/dwlle'
const clientId = (import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined) ?? 'dwlle-web'
const scope = (import.meta.env.VITE_OIDC_SCOPE as string | undefined) ?? 'openid profile email'
const redirectUri = (import.meta.env.VITE_OIDC_REDIRECT_URI as string | undefined) ?? window.location.origin
let discoveryPromise: Promise<DiscoveryDocument> | undefined

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  array.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function randomValue(length = 32): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

async function discover(): Promise<DiscoveryDocument> {
  discoveryPromise ??= fetch(`${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`OIDC discovery failed with status ${response.status}`)
      return response.json() as Promise<DiscoveryDocument>
    })
    .catch((error: unknown) => {
      discoveryPromise = undefined
      throw error
    })
  return discoveryPromise
}

function readTokens(): StoredTokens | null {
  const value = sessionStorage.getItem(TOKEN_STORAGE_KEY)
  if (!value) return null
  try {
    return JSON.parse(value) as StoredTokens
  } catch {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    return null
  }
}

export function getAccessToken(): string | null {
  const tokens = readTokens()
  if (!tokens) return null
  if (tokens.expiresAt <= Date.now() + 5000) {
    clearTokens()
    return null
  }
  return tokens.accessToken
}

export function clearTokens(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  sessionStorage.removeItem(PENDING_STORAGE_KEY)
}

export async function beginLogin(): Promise<void> {
  const configuration = await discover()
  const verifier = randomValue(64)
  const pending: PendingAuthorization = {
    state: randomValue(),
    verifier,
    nonce: randomValue(),
  }
  const challenge = base64Url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending))
  const parameters = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  window.location.assign(`${configuration.authorization_endpoint}?${parameters}`)
}

function idTokenClaims(idToken: string): Record<string, unknown> {
  const encoded = idToken.split('.')[1]
  if (!encoded) throw new Error('OIDC ID token is malformed')
  const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/')
  return JSON.parse(atob(normalized)) as Record<string, unknown>
}

export async function completeLogin(): Promise<boolean> {
  const parameters = new URLSearchParams(window.location.search)
  const code = parameters.get('code')
  const error = parameters.get('error')
  if (!code && !error) return false
  if (error) throw new Error(parameters.get('error_description') ?? error)
  const storedPending = sessionStorage.getItem(PENDING_STORAGE_KEY)
  if (!storedPending) throw new Error('OIDC login state is missing')
  const pending = JSON.parse(storedPending) as PendingAuthorization
  if (!code || parameters.get('state') !== pending.state) {
    throw new Error('OIDC login state does not match')
  }

  const configuration = await discover()
  const response = await fetch(configuration.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      code_verifier: pending.verifier,
      redirect_uri: redirectUri,
    }),
  })
  if (!response.ok) throw new Error(`OIDC token exchange failed with status ${response.status}`)
  const tokenResponse = await response.json() as {
    access_token: string
    id_token: string
    expires_in: number
    token_type: string
  }
  if (tokenResponse.token_type.toLowerCase() !== 'bearer') {
    throw new Error('OIDC token type is not Bearer')
  }
  if (idTokenClaims(tokenResponse.id_token).nonce !== pending.nonce) {
    throw new Error('OIDC ID token nonce does not match')
  }
  const tokens: StoredTokens = {
    accessToken: tokenResponse.access_token,
    idToken: tokenResponse.id_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
  }
  sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
  sessionStorage.removeItem(PENDING_STORAGE_KEY)
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`)
  return true
}

export async function endLogin(): Promise<void> {
  const tokens = readTokens()
  clearTokens()
  try {
    const configuration = await discover()
    if (!configuration.end_session_endpoint) return
    const parameters = new URLSearchParams({ post_logout_redirect_uri: window.location.origin })
    if (tokens?.idToken) parameters.set('id_token_hint', tokens.idToken)
    window.location.assign(`${configuration.end_session_endpoint}?${parameters}`)
  } catch {
    clearTokens()
  }
}
