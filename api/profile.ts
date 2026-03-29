const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts'

interface ProfileBody {
  token:          string
  firstName:      string
  lastName:       string
  schoolName:     string
  cityName:       string
  yearFrom:       string
  yearTo:         string
  password:       string
  communityPrefs: string
}

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

// ── Password hash (PBKDF2-SHA-256 via Web Crypto) ────────────────────────────

async function hashPassword(password: string, email: string): Promise<string> {
  const enc         = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
  )
  const bits  = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(email), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256,
  )
  const bytes = new Uint8Array(bits)
  let binary  = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

// ── Fetch with timeout ────────────────────────────────────────────────────────

function fetchT(url: string, opts: RequestInit, ms = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const id   = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id))
}

// ── Brevo: update full profile ────────────────────────────────────────────────

async function updateBrevoProfile(
  email: string,
  data: Omit<ProfileBody, 'token'>,
  passwordHash: string,
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const listId = Number(process.env.BREVO_LIST_ID)
  if (!apiKey || !listId) throw new Error('Brevo not configured on server.')

  const res = await fetchT(BREVO_CONTACTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME:       data.firstName,
        LASTNAME:        data.lastName,
        SCHOOL:          data.schoolName,
        CITY:            data.cityName,
        YEAR_FROM:       data.yearFrom,
        YEAR_TO:         data.yearTo,
        COMMUNITY_PREFS: data.communityPrefs,
        PASSWORD_HASH:   passwordHash,
        SOURCE:          'meta_web',
      },
      listIds: [listId],
      updateEnabled: true,
    }),
  })

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? `Brevo error ${res.status}`)
  }
}

// ── Telegram: notify with full profile data (fire-and-forget) ─────────────────

async function notifyTelegram(email: string, data: Omit<ProfileBody, 'token'>): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const groupId  = process.env.TELEGRAM_GROUP_ID
  if (!botToken || !groupId) return

  const e   = (v: string) => v || '—'
  const yr  = [data.yearFrom, data.yearTo].filter(Boolean).join('–') || '—'
  const text =
    `📋 <b>New Profile Completed!</b>\n\n` +
    `📧 Email: <code>${email}</code>\n` +
    `👤 Name: ${e(data.firstName)} ${e(data.lastName)}\n` +
    `🏫 School: ${e(data.schoolName)}\n` +
    `🏙️ City: ${e(data.cityName)}\n` +
    `📅 Year range: ${yr}\n` +
    `🤝 Prefs: ${e(data.communityPrefs)}`

  await fetchT(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: groupId, text, parse_mode: 'HTML' }) },
    5000,
  )
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  let body: Partial<ProfileBody>
  try { body = await req.json() }
  catch { return new Response('Invalid JSON', { status: 400 }) }

  const {
    token,
    firstName      = '',
    lastName       = '',
    schoolName     = '',
    cityName       = '',
    yearFrom       = '',
    yearTo         = '',
    password       = '',
    communityPrefs = '',
  } = body

  if (!token) {
    return Response.json({ error: 'Missing token.' }, { status: 400 })
  }
  if (!password || password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 422 })
  }

  const result = await verifyToken(token)
  if (!result.valid) {
    return Response.json(
      { error: 'This link has expired or is invalid. Please request a new one.' },
      { status: 401 },
    )
  }

  const email        = result.email!
  const passwordHash = await hashPassword(password, email)
  const profileData  = { firstName, lastName, schoolName, cityName, yearFrom, yearTo, password, communityPrefs }

  try {
    await updateBrevoProfile(email, profileData, passwordHash)
    notifyTelegram(email, profileData).catch((err) => {
      console.error('[Telegram] notifyTelegram failed:', err?.message ?? err)
    })
    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed.'
    return Response.json({ error: message }, { status: 500 })
  }
}

export const config = { runtime: 'edge' }
