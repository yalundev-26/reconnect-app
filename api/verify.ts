// Vercel Serverless Function — Token verification
// GET /api/verify?token=xxx
// Returns { valid: true, email } or { valid: false }

import { verifyToken } from './_token'

export function GET(req: Request): Response {
  const url   = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''

  const result = verifyToken(token)

  if (!result.valid) {
    return Response.json({ valid: false }, { status: 401 })
  }

  return Response.json({ valid: true, email: result.email })
}
