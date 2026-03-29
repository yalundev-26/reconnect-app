import { createHmac } from 'node:crypto'

const BREVO_CONTACTS_URL      = 'https://api.brevo.com/v3/contacts'
const BREVO_TRANSACTIONAL_URL = 'https://api.brevo.com/v3/smtp/email'

// ── Token (inlined — no cross-file imports) ───────────────────────────────────

function generateToken(email: string): string {
  const secret  = process.env.TOKEN_SECRET ?? 'dev-secret'
  const ts      = Date.now()
  const payload = Buffer.from(JSON.stringify({ email, ts })).toString('base64url')
  const sig     = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

// ── Fetch with timeout ────────────────────────────────────────────────────────

function fetchT(url: string, opts: RequestInit, ms = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const id   = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id))
}

function getBaseUrl(req: Request): string {
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

// ── Brevo: add to list ────────────────────────────────────────────────────────

async function addToBrevo(email: string, source: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const listId = Number(process.env.BREVO_LIST_ID)
  if (!apiKey || !listId) throw new Error('Brevo not configured on server.')

  const res = await fetchT(BREVO_CONTACTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      email,
      attributes: { SOURCE: source },
      listIds: [listId],
      updateEnabled: true,
    }),
  })

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? `Brevo error ${res.status}`)
  }
}

// ── Brevo: send access email ──────────────────────────────────────────────────

async function sendAccessEmail(email: string, token: string, baseUrl: string): Promise<void> {
  const apiKey      = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName  = process.env.BREVO_SENDER_NAME ?? 'SyiyQ'
  if (!apiKey || !senderEmail) throw new Error('BREVO_SENDER_EMAIL is not set in environment variables.')

  const link = `${baseUrl}/signup?token=${encodeURIComponent(token)}`

  const res = await fetchT(BREVO_TRANSACTIONAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      subject: 'Your private access link 🔑',
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f4f7fb">
          <div style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(15,23,42,0.08)">
            <h2 style="margin:0 0 8px;font-size:22px;color:#0f172a">You're one step away 🎉</h2>
            <p style="color:#64748b;margin:0 0 28px;font-size:15px">
              Click the button below to complete your profile and join the community.
              This link is private — it only works for <strong>${email}</strong> and expires in 48 hours.
            </p>
            <a href="${link}"
               style="display:inline-block;background:#2563eb;color:#fff;font-weight:700;font-size:16px;
                      padding:14px 28px;border-radius:10px;text-decoration:none">
              Complete My Profile →
            </a>
            <p style="color:#94a3b8;margin:28px 0 0;font-size:12px">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? `Email send error ${res.status}`)
  }
}

// ── Telegram (fire-and-forget) ────────────────────────────────────────────────

async function notifyTelegram(email: string, source: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const groupId  = process.env.TELEGRAM_GROUP_ID
  if (!botToken || !groupId) return

  const text =
    `🔔 <b>New Lead!</b>\n` +
    `📧 Email: <code>${email}</code>\n` +
    `📍 Source: ${source}`

  await fetchT(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: groupId, text, parse_mode: 'HTML' }) },
    5000,
  )
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: { email?: string; source?: string }
  try { body = await req.json() }
  catch { return new Response('Invalid JSON', { status: 400 }) }

  const email  = body?.email?.trim()
  const source = body?.source ?? 'meta_web'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email address.' }, { status: 422 })
  }

  try {
    await addToBrevo(email, source)

    const token   = generateToken(email)
    const baseUrl = getBaseUrl(req)
    await sendAccessEmail(email, token, baseUrl)

    notifyTelegram(email, source).catch(() => { /* ignore */ })

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed.'
    return Response.json({ error: message }, { status: 500 })
  }
}
