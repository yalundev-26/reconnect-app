import { createHmac } from 'node:crypto'

// ── Token (inlined — no cross-file imports) ───────────────────────────────────

function verifyToken(token: string): { valid: boolean; email?: string } {
  try {
    const secret   = process.env.TOKEN_SECRET ?? 'dev-secret'
    const lastDot  = token.lastIndexOf('.')
    if (lastDot === -1) return { valid: false }

    const payload  = token.slice(0, lastDot)
    const sig      = token.slice(lastDot + 1)
    const expected = createHmac('sha256', secret).update(payload).digest('base64url')
    if (sig !== expected) return { valid: false }

    const { email, ts } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof email !== 'string' || typeof ts !== 'number') return { valid: false }
    if (Date.now() - ts > 48 * 60 * 60 * 1000) return { valid: false }

    return { valid: true, email }
  } catch {
    return { valid: false }
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export function GET(req: Request): Response {
  const url   = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''

  const result = verifyToken(token)
  if (!result.valid) {
    return Response.json({ valid: false }, { status: 401 })
  }

  return Response.json({ valid: true, email: result.email })
}
