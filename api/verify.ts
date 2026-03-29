// ── Token (inlined — no cross-file imports) ───────────────────────────────────

function fromBase64url(str: string): string {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'))
}

async function hmacSha256Base64url(secret: string, message: string): Promise<string> {
  const enc    = new TextEncoder()
  const key    = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const rawSig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  const bytes  = new Uint8Array(rawSig)
  let binary   = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function verifyToken(token: string): Promise<{ valid: boolean; email?: string }> {
  try {
    const secret   = process.env.TOKEN_SECRET ?? 'dev-secret'
    const lastDot  = token.lastIndexOf('.')
    if (lastDot === -1) return { valid: false }

    const payload  = token.slice(0, lastDot)
    const sig      = token.slice(lastDot + 1)
    const expected = await hmacSha256Base64url(secret, payload)
    if (sig !== expected) return { valid: false }

    const { email, ts } = JSON.parse(fromBase64url(payload))
    if (typeof email !== 'string' || typeof ts !== 'number') return { valid: false }
    if (Date.now() - ts > 48 * 60 * 60 * 1000) return { valid: false }

    return { valid: true, email }
  } catch {
    return { valid: false }
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }
  const url   = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''

  const result = await verifyToken(token)
  if (!result.valid) {
    return Response.json({ valid: false }, { status: 401 })
  }

  return Response.json({ valid: true, email: result.email })
}

export const config = { runtime: 'edge' }
