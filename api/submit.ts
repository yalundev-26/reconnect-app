// Vercel Serverless Function — Form submission handler
// Adds contact to Brevo and notifies the Telegram group

const BREVO_API_URL = 'https://api.brevo.com/v3/contacts'

async function addToBrevo(email: string, source: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const listId = Number(process.env.BREVO_LIST_ID)

  if (!apiKey || !listId) throw new Error('Brevo not configured on server.')

  const res = await fetch(BREVO_API_URL, {
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

async function notifyTelegramGroup(email: string, source: string): Promise<void> {
  const token   = process.env.TELEGRAM_BOT_TOKEN
  const groupId = process.env.TELEGRAM_GROUP_ID

  if (!token || !groupId) return // silently skip if not configured

  const text =
    `🔔 <b>New Lead!</b>\n` +
    `📧 Email: <code>${email}</code>\n` +
    `📍 Source: ${source}`

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: groupId, text, parse_mode: 'HTML' }),
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: { email?: string; source?: string }

  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const email  = body?.email?.trim()
  const source = body?.source ?? 'meta_web'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email address.' }, { status: 422 })
  }

  try {
    await addToBrevo(email, source)

    // Fire-and-forget — Telegram must never block the response
    notifyTelegramGroup(email, source).catch(() => { /* ignore */ })

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed.'
    return Response.json({ error: message }, { status: 500 })
  }
}
