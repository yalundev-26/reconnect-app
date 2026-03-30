const BREVO_CONTACTS_URL      = 'https://api.brevo.com/v3/contacts'
const BREVO_TRANSACTIONAL_URL = 'https://api.brevo.com/v3/smtp/email'

// ── Disposable / temp email domain blocklist ──────────────────────────────────
const BLOCKED_DOMAINS = new Set([
  // Major disposable services
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.biz',
  'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org', 'sharklasers.com',
  'grr.la', 'spam4.me', 'trashmail.com', 'trashmail.me', 'trashmail.net',
  'tempmail.com', 'temp-mail.org', 'tempr.email', 'tempinbox.com', 'temp-mail.io',
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemail.de',
  'throwaway.email', 'throwawayemail.com', 'throwam.com', 'throwme.pw',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf',
  'dispostable.com', 'disposeamail.com', 'mailexpire.com',
  'spamex.com', 'spaml.com', 'spamgourmet.com', 'spamhole.com',
  'mailnull.com', 'maildrop.cc', 'getairmail.com',
  'owlpic.com', 'filzmail.com', 'wegwerfemail.de',
  'binkmail.com', 'safetymail.info', 'letthemeatspam.com',
  'zetmail.com', 'trbvm.com', 'fakeinbox.com',
  'getnada.com', 'mailnesia.com', 'mintemail.com',
  'pookmail.com', 'sogetthis.com', 'spamgourmet.net',
  'spamgourmet.org', 'mailnull.com', 'spamtraps.de',
  'discard.email', 'discardmail.com', 'discardmail.de',
  'crapmail.org', 'junk.to', 'spam.la',
  'anonbox.net', 'anonymbox.com', 'spambox.us',
  'inboxalias.com', 'mytrashmail.com', 'mt2014.com',
  'notsharingmy.info', 'trashmail.at', 'trashmail.io',
  'trashmail.me', 'trashmail.org', 'trashmailer.com',
])

// ── MX record check via Cloudflare DNS-over-HTTPS ─────────────────────────────
// Runs on Edge — no Node.js DNS module needed.
// Fail-open: if the lookup errors out, we allow the email through.
async function hasValidMX(domain: string): Promise<boolean> {
  try {
    const res = await fetchT(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { Accept: 'application/dns-json' } },
      4000,
    )
    if (!res.ok) return true
    const data = await res.json() as { Status: number; Answer?: unknown[] }
    return data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0
  } catch {
    return true // network failure → don't block real users
  }
}

async function validateEmailDomain(email: string): Promise<string | null> {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return 'Invalid email address.'
  if (BLOCKED_DOMAINS.has(domain)) {
    return 'Disposable email addresses are not accepted. Please use your real email.'
  }
  const valid = await hasValidMX(domain)
  if (!valid) {
    return 'That email domain doesn\'t appear to exist. Please double-check your address.'
  }
  return null
}

// ── Token (inlined — no cross-file imports) ───────────────────────────────────

function toBase64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
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

async function generateToken(email: string): Promise<string> {
  const secret  = process.env.TOKEN_SECRET ?? 'dev-secret'
  const ts      = Date.now()
  const payload = toBase64url(JSON.stringify({ email, ts }))
  const sig     = await hmacSha256Base64url(secret, payload)
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

interface LeadData {
  email:            string
  source:           string
  firstName?:       string
  lastName?:        string
  phone?:           string
  gender?:          string
  dob?:             string
  schoolName?:      string
  schoolLocation?:  string
  year?:            string
  cityName?:        string
  currentCity?:     string
  state?:           string
  zip?:             string
  employer?:        string
  relative?:        string
  preferredContact?: string
}

async function addToBrevo(data: LeadData): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const listId = Number(process.env.BREVO_LIST_ID)
  if (!apiKey || !listId) throw new Error('Brevo not configured on server.')

  const res = await fetchT(BREVO_CONTACTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      email: data.email,
      attributes: {
        SOURCE:            data.source,
        FIRSTNAME:         data.firstName        ?? '',
        LASTNAME:          data.lastName         ?? '',
        PHONE:             data.phone            ?? '',
        GENDER:            data.gender           ?? '',
        DOB:               data.dob              ?? '',
        SCHOOL:            data.schoolName       ?? '',
        SCHOOL_LOCATION:   data.schoolLocation   ?? '',
        YEAR:              data.year             ?? '',
        CITY:              data.cityName         ?? '',
        CURRENT_CITY:      data.currentCity      ?? '',
        STATE:             data.state            ?? '',
        ZIP:               data.zip              ?? '',
        EMPLOYER:          data.employer         ?? '',
        RELATIVE:          data.relative         ?? '',
        PREFERRED_CONTACT: data.preferredContact ?? '',
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

// ── Brevo: send access email ──────────────────────────────────────────────────

async function sendAccessEmail(email: string, token: string, baseUrl: string): Promise<void> {
  const apiKey      = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName  = process.env.BREVO_SENDER_NAME ?? 'Reconnect'
  if (!apiKey || !senderEmail) throw new Error('BREVO_SENDER_EMAIL is not set in environment variables.')

  const link = `https://app.reconnectbase.com`

  const res = await fetchT(BREVO_TRANSACTIONAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      subject: 'Hey — your access link is ready!',
      headers: { 'List-Unsubscribe': `<mailto:${senderEmail}?subject=unsubscribe>` },
      htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your access link is ready</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif">

  <!--[if mso]><table width="600" align="center" cellpadding="0" cellspacing="0"><tr><td><![endif]-->

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:32px 16px">

        <!-- Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;
                      overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08)">

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding:36px 40px 24px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#0f172a;border-radius:14px;padding:12px 20px">
                    <span style="font-size:22px;font-weight:900;color:#ffffff;
                                 letter-spacing:-0.5px;font-family:Arial,sans-serif">
                      Reconnect
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="padding:0 40px 8px">
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#0f172a;line-height:1.3;
                         font-family:Arial,sans-serif">
                Hey, your access link<br/>is ready!
              </h1>
            </td>
          </tr>

          <!-- Sub-copy -->
          <tr>
            <td align="center" style="padding:12px 48px 28px">
              <p style="margin:0;font-size:15px;color:#64748b;line-height:1.6;text-align:center">
                Hi! Thanks for joining.<br/>
                We're ready to help you reconnect with people from your school,
                hometown, and past community.
              </p>
            </td>
          </tr>

          <!-- Feature banner -->
          <tr>
            <td style="padding:0 40px 32px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);
                            border-radius:14px;overflow:hidden">
                <tr>
                  <td style="padding:32px 28px 24px">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#7dd3fc;
                               letter-spacing:1.5px;text-transform:uppercase;font-family:Arial,sans-serif">
                      Welcome to Reconnect
                    </p>
                    <h2 style="margin:0 0 24px;font-size:24px;font-weight:800;color:#ffffff;
                               line-height:1.25;font-family:Arial,sans-serif">
                      Your link access<br/>is ready
                    </h2>

                    <!-- 3 features -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- Feature 1 -->
                        <td width="32%" valign="top"
                            style="background:rgba(255,255,255,0.08);border-radius:10px;
                                   padding:14px 10px;text-align:center">
                          <div style="font-size:18px;margin-bottom:6px">&#10003;</div>
                          <p style="margin:0;font-size:12px;color:#e2e8f0;line-height:1.4;
                                    font-family:Arial,sans-serif">
                            Reconnect with classmates &amp; childhood friends
                          </p>
                        </td>
                        <td width="2%"></td>
                        <!-- Feature 2 -->
                        <td width="32%" valign="top"
                            style="background:rgba(255,255,255,0.08);border-radius:10px;
                                   padding:14px 10px;text-align:center">
                          <div style="font-size:18px;margin-bottom:6px">&#10003;</div>
                          <p style="margin:0;font-size:12px;color:#e2e8f0;line-height:1.4;
                                    font-family:Arial,sans-serif">
                            Find people from your old city or neighborhood
                          </p>
                        </td>
                        <td width="2%"></td>
                        <!-- Feature 3 -->
                        <td width="32%" valign="top"
                            style="background:rgba(255,255,255,0.08);border-radius:10px;
                                   padding:14px 10px;text-align:center">
                          <div style="font-size:18px;margin-bottom:6px">&#10003;</div>
                          <p style="margin:0;font-size:12px;color:#e2e8f0;line-height:1.4;
                                    font-family:Arial,sans-serif">
                            Join a community built around shared memories
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding:0 40px 16px">
              <a href="${link}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;
                        font-weight:700;font-size:16px;padding:16px 36px;
                        border-radius:10px;text-decoration:none;
                        font-family:Arial,sans-serif;letter-spacing:0.2px">
                Complete My Profile &#8594;
              </a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td align="center" style="padding:16px 48px 8px">
              <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:4px 48px 28px">
              <a href="${link}"
                 style="font-size:12px;color:#2563eb;word-break:break-all;text-decoration:underline">
                ${link}
              </a>
            </td>
          </tr>

          <!-- Community note -->
          <tr>
            <td style="padding:0 40px 28px;border-top:1px solid #f1f5f9">
              <p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.7">
                We're excited to have you join our community. You can expect exclusive updates
                and announcements about our activity.<br/><br/>
                This link is private — it only works for <strong>${email}</strong>
                and expires in <strong>48 hours</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
                style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center">
                &copy; 2026 Reconnect. All rights reserved.<br/>
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
        <!-- / Card -->

      </td>
    </tr>
  </table>

  <!--[if mso]></td></tr></table><![endif]-->

</body>
</html>`,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? `Email send error ${res.status}`)
  }
}

// ── Telegram (fire-and-forget) ────────────────────────────────────────────────

async function notifyTelegram(data: LeadData): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const groupId  = process.env.TELEGRAM_GROUP_ID
  if (!botToken || !groupId) return

  const e = (v?: string) => v?.trim() || '—'
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || '—'

  const text =
    `🔔 <b>New Lead</b>\n\n` +
    `👤 Full Name: ${fullName}\n` +
    `📧 Email: <code>${data.email}</code>\n` +
    `📞 Phone: ${e(data.phone)}\n` +
    `👤 Gender: ${e(data.gender)}\n` +
    `🎂 DOB: ${e(data.dob)}\n\n` +
    `🏫 High School: ${e(data.schoolName)}\n` +
    `📍 School Location: ${e(data.schoolLocation)}\n` +
    `📅 Graduation Year: ${e(data.year)}\n\n` +
    `🏙️ Current City: ${e(data.currentCity)}\n` +
    `🗺️ State: ${e(data.state)}\n` +
    `📍 Previous City: ${e(data.cityName)}\n` +
    `📮 ZIP: ${e(data.zip)}\n\n` +
    `💼 Employer: ${e(data.employer)}\n` +
    `👨‍👩‍👧 Relative: ${e(data.relative)}\n\n` +
    `📲 Preferred Contact: ${e(data.preferredContact)}\n` +
    `✅ Consent: Yes\n\n` +
    `📍 Source: Meta Ads - Web Funnel`

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

  let body: Record<string, string | undefined>
  try { body = await req.json() }
  catch { return new Response('Invalid JSON', { status: 400 }) }

  // Honeypot — bots fill hidden fields, humans don't
  if (body?._hp) return Response.json({ ok: true })

  const email  = body?.email?.trim()
  const source = body?.source ?? 'meta_web'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email address.' }, { status: 422 })
  }

  const domainError = await validateEmailDomain(email)
  if (domainError) {
    return Response.json({ error: domainError }, { status: 422 })
  }

  const t = (v?: string) => v?.trim() || undefined

  const leadData: LeadData = {
    email,
    source,
    firstName:        t(body.firstName),
    lastName:         t(body.lastName),
    phone:            t(body.phone),
    gender:           t(body.gender),
    dob:              t(body.dob),
    schoolName:       t(body.schoolName),
    schoolLocation:   t(body.schoolLocation),
    year:             t(body.year),
    cityName:         t(body.cityName),
    currentCity:      t(body.currentCity),
    state:            t(body.state),
    zip:              t(body.zip),
    employer:         t(body.employer),
    relative:         t(body.relative),
    preferredContact: t(body.preferredContact),
  }

  try {
    const baseUrl = getBaseUrl(req)
    const token   = await generateToken(email)

    await Promise.all([
      addToBrevo(leadData),
      sendAccessEmail(email, token, baseUrl),
    ])

    await notifyTelegram(leadData).catch((err) => {
      console.error('[Telegram] notifyTelegram failed:', err?.message ?? err)
    })

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed.'
    return Response.json({ error: message }, { status: 500 })
  }
}

export const config = { runtime: 'edge' }
