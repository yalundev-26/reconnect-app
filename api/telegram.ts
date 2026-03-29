// Vercel Serverless Function — Telegram Bot Webhook
// Set this URL as your bot webhook:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://yourdomain.com/api/telegram

const TG_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const BREVO_API_URL = 'https://api.brevo.com/v3/contacts'

// ── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

async function addContactToBrevo(email: string, firstName: string): Promise<void> {
  const apiKey  = process.env.BREVO_API_KEY
  const listId  = Number(process.env.BREVO_LIST_ID)

  if (!apiKey || !listId) throw new Error('Brevo not configured')

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: firstName,
        SOURCE: 'telegram',
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

// ── Webhook handler ───────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: { message?: { chat: { id: number }; from?: { first_name?: string }; text?: string } }

  try {
    body = await req.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const message = body?.message
  if (!message) return new Response('ok')

  const chatId    = message.chat.id
  const text      = message.text?.trim() ?? ''
  const firstName = message.from?.first_name ?? ''

  try {
    if (text === '/start') {
      await sendMessage(
        chatId,
        `👋 Hi${firstName ? ` <b>${firstName}</b>` : ''}!\n\nEnter your email address and we'll send you an access link to reconnect with people from your past.`,
      )

    } else if (isValidEmail(text)) {
      await addContactToBrevo(text, firstName)
      await sendMessage(
        chatId,
        `✅ Done! We sent your access link to <b>${text}</b>.\n\nOpen your inbox and click the link to continue. See you inside! 🎉`,
      )

    } else if (text.startsWith('/')) {
      // Unknown command
      await sendMessage(chatId, 'Send your email address to get your private access link.')

    } else {
      // Any other text — assume they don't know what to do
      await sendMessage(chatId, `That doesn't look like an email address. Please send your email and we'll get you set up.`)
    }
  } catch (err) {
    console.error('Telegram bot error:', err)
    await sendMessage(chatId, 'Something went wrong. Please try again in a moment.')
  }

  return new Response('ok')
}

export const config = { runtime: 'edge' }
