// Vercel Serverless Function — Full profile submission
// 1. Validates signed token (only the email recipient can submit)
// 2. Updates Brevo contact with full profile data
// 3. Notifies Telegram group with all submitted data

import { verifyToken } from './_token.js'

const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts'

interface ProfileBody {
  token:      string
  firstName:  string
  lastName:   string
  schoolName: string
  cityName:   string
  year:       string
}

async function updateBrevoProfile(email: string, data: Omit<ProfileBody, 'token'>): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const listId = Number(process.env.BREVO_LIST_ID)

  if (!apiKey || !listId) throw new Error('Brevo not configured on server.')

  const res = await fetch(BREVO_CONTACTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: data.firstName,
        LASTNAME:  data.lastName,
        SCHOOL:    data.schoolName,
        CITY:      data.cityName,
        YEAR:      data.year,
        SOURCE:    'meta_web',
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

async function notifyTelegramProfile(email: string, data: Omit<ProfileBody, 'token'>): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const groupId  = process.env.TELEGRAM_GROUP_ID

  if (!botToken || !groupId) return

  const esc = (v: string) => v || '—'

  const text =
    `📋 <b>New Profile Completed!</b>\n\n` +
    `📧 Email: <code>${email}</code>\n` +
    `👤 Name: ${esc(data.firstName)} ${esc(data.lastName)}\n` +
    `🏫 School: ${esc(data.schoolName)}\n` +
    `🏙️ City: ${esc(data.cityName)}\n` +
    `📅 Year: ${esc(data.year)}`

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: groupId, text, parse_mode: 'HTML' }),
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  let body: Partial<ProfileBody>
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { token, firstName = '', lastName = '', schoolName = '', cityName = '', year = '' } = body

  if (!token) {
    return Response.json({ error: 'Missing token.' }, { status: 400 })
  }

  // Validate token — only the email recipient can submit
  const result = verifyToken(token)
  if (!result.valid) {
    return Response.json(
      { error: 'This link has expired or is invalid. Please request a new one.' },
      { status: 401 },
    )
  }

  const email = result.email!

  try {
    await updateBrevoProfile(email, { firstName, lastName, schoolName, cityName, year })

    // Fire-and-forget — Telegram must never block the response
    notifyTelegramProfile(email, { firstName, lastName, schoolName, cityName, year }).catch(() => { /* ignore */ })

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed.'
    return Response.json({ error: message }, { status: 500 })
  }
}
