// Shared token utilities — not a Vercel function (underscore prefix)
// Files starting with _ in api/ are skipped by Vercel's function router.

import { createHmac } from 'node:crypto'

const SECRET   = process.env.TOKEN_SECRET ?? 'dev-secret-change-me'
const EXPIRY_MS = 48 * 60 * 60 * 1000 // 48 hours

/** Generate a signed, time-limited token that encodes the email. */
export function generateToken(email: string): string {
  const ts      = Date.now()
  const payload = Buffer.from(JSON.stringify({ email, ts })).toString('base64url')
  const sig     = createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/** Verify a token and return the email inside, or { valid: false }. */
export function verifyToken(token: string): { valid: boolean; email?: string } {
  try {
    const lastDot  = token.lastIndexOf('.')
    if (lastDot === -1) return { valid: false }

    const payload  = token.slice(0, lastDot)
    const sig      = token.slice(lastDot + 1)

    // Constant-time comparison via re-computing expected sig
    const expected = createHmac('sha256', SECRET).update(payload).digest('base64url')
    if (sig !== expected) return { valid: false }

    const { email, ts } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof email !== 'string' || typeof ts !== 'number') return { valid: false }
    if (Date.now() - ts > EXPIRY_MS) return { valid: false }

    return { valid: true, email }
  } catch {
    return { valid: false }
  }
}
