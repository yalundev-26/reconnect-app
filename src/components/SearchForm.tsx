import { useState, useRef, type ChangeEvent } from 'react'
import {
  FiSearch, FiUser, FiMail, FiPhone, FiCalendar,
  FiBook, FiMapPin, FiAward, FiHome, FiMap,
  FiHash, FiBriefcase, FiUsers, FiLock, FiCheck,
  FiCheckCircle, FiArrowRight, FiAlertCircle,
} from 'react-icons/fi'
import { HiOutlineIdentification } from 'react-icons/hi'
import { addContactToBrevo } from '../lib/brevo'

// fbq is injected globally by Meta Pixel in index.html
declare const fbq: (event: string, name: string) => void

interface LeadForm {
  firstName:        string
  lastName:         string
  email:            string
  phone:            string
  gender:           string
  dob:              string
  schoolName:       string
  schoolLocation:   string
  year:             string
  previousCity:     string
  currentCity:      string
  state:            string
  zip:              string
  employer:         string
  relative:         string
  preferredContact: string
}

const initial: LeadForm = {
  firstName:        '',
  lastName:         '',
  email:            '',
  phone:            '',
  gender:           '',
  dob:              '',
  schoolName:       '',
  schoolLocation:   '',
  year:             '',
  previousCity:     '',
  currentCity:      '',
  state:            '',
  zip:              '',
  employer:         '',
  relative:         '',
  preferredContact: '',
}

// Disposable / temp email domain blocklist (mirrors server-side list)
const BLOCKED_DOMAINS = new Set([
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
  'pookmail.com', 'sogetthis.com', 'discard.email',
  'discardmail.com', 'discardmail.de', 'crapmail.org',
  'junk.to', 'spam.la', 'anonbox.net', 'anonymbox.com', 'spambox.us',
  'inboxalias.com', 'mytrashmail.com', 'mt2014.com',
  'trashmail.at', 'trashmail.io', 'trashmail.org', 'trashmailer.com',
])

type LeadErrors = Partial<Record<keyof LeadForm, string>>

function validateLead(form: LeadForm): LeadErrors {
  const errs: LeadErrors = {}
  if (!form.firstName.trim()) errs.firstName = 'First name is required.'
  if (!form.lastName.trim())  errs.lastName  = 'Last name is required.'
  if (!form.email.trim()) {
    errs.email = 'Email address is required.'
  } else {
    const emailNorm = form.email.trim().toLowerCase()
    const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
    if (!EMAIL_RE.test(emailNorm)) {
      errs.email = 'Please enter a valid email address (e.g. name@example.com).'
    } else {
      const domain = emailNorm.split('@')[1]
      if (domain && BLOCKED_DOMAINS.has(domain)) {
        errs.email = 'Disposable email addresses are not accepted. Please use your real email.'
      }
    }
  }
  if (form.phone.trim() && !/^[\d\s\-+().]{7,20}$/.test(form.phone.trim())) {
    errs.phone = 'Please enter a valid phone number.'
  }
  if (form.dob.trim() && !/^\d{4}$/.test(form.dob.trim())) {
    errs.dob = 'Enter a 4-digit birth year (e.g. 1965).'
  }
  return errs
}

function getInboxUrl(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  if (domain === 'gmail.com' || domain === 'googlemail.com') return 'https://mail.google.com'
  if (domain.startsWith('yahoo.')) return 'https://mail.yahoo.com'
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) return 'https://outlook.live.com'
  if (domain === 'aol.com') return 'https://mail.aol.com'
  if (domain === 'icloud.com' || domain === 'me.com') return 'https://www.icloud.com/mail'
  if (domain === 'protonmail.com' || domain === 'proton.me') return 'https://mail.proton.me'
  return `https://mail.${domain}`
}

type Status = 'idle' | 'searching' | 'matches' | 'success' | 'error'

interface ProgressStep { pct: number; msg: string }

const PROGRESS_STEPS: Array<{ delay: number } & ProgressStep> = [
  { delay: 500,  pct: 12, msg: 'Searching public records...' },
  { delay: 1800, pct: 31, msg: '' }, // filled in at runtime
  { delay: 3300, pct: 55, msg: 'Cross-referencing school records...' },
  { delay: 4800, pct: 76, msg: 'Verifying names and locations...' },
  { delay: 6000, pct: 92, msg: 'Almost done — preparing your results...' },
]

async function submitLead(form: LeadForm, honeypot: string): Promise<void> {
  if (import.meta.env.DEV) {
    if (honeypot) return
    await addContactToBrevo({ email: form.email, source: 'meta_web' })
    return
  }

  const ctrl    = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 12000)

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, cityName: form.previousCity, source: 'meta_web', _hp: honeypot }),
      signal: ctrl.signal,
    })

    let data: { error?: string } = {}
    try { data = await res.json() } catch { /* ignore parse errors */ }
    if (!res.ok) throw new Error(data?.error ?? 'Submission failed.')
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// ── Shared input wrapper with left icon ──
function Field({
  icon, error, children,
}: { icon: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none z-10 flex items-center">
        {icon}
      </span>
      {children}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[12px] text-red-600">
          <FiAlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

const INPUT_BASE = 'w-full pl-10 pr-3.5 py-[13px] border rounded-[10px] text-[14px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white placeholder:text-[#94a3b8]'
const INPUT_OK  = 'border-[#cbd5e1]'
const INPUT_ERR = 'border-red-400 bg-red-50/30'

export default function SearchForm() {
  const [form, setForm]         = useState<LeadForm>(initial)
  const [status, setStatus]     = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [errors, setErrors]     = useState<LeadErrors>({})
  const [progress, setProgress] = useState<ProgressStep>({ pct: 0, msg: '' })
  const matchCount              = useRef(Math.floor(Math.random() * 29) + 8)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    const stored = name === 'email' ? value.toLowerCase() : value
    setForm(prev => ({ ...prev, [name]: stored }))
    if (errors[name as keyof LeadForm]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const honeypot = (e.currentTarget.elements as HTMLFormControlsCollection & { _hp?: HTMLInputElement })._hp?.value ?? ''

    const fieldErrors = validateLead(form)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    setStatus('searching')
    setErrorMsg('')
    setProgress({ pct: 0, msg: '' })

    const steps = PROGRESS_STEPS.map((s, i) => ({
      ...s,
      msg: i === 1 ? `Found ${matchCount.current} possible matches in your area...` : s.msg,
    }))

    const timers = steps.map(s =>
      setTimeout(() => setProgress({ pct: s.pct, msg: s.msg }), s.delay),
    )

    const minWait = new Promise<void>(r => setTimeout(r, 7000))

    try {
      await submitLead(form, honeypot)
    } catch (err) {
      timers.forEach(clearTimeout)
      setProgress({ pct: 0, msg: '' })
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      return
    }

    await minWait
    timers.forEach(clearTimeout)

    setProgress({ pct: 100, msg: 'Found your matches!' })
    setTimeout(() => {
      if (typeof fbq !== 'undefined') fbq('track', 'Lead')
      setStatus('matches')
    }, 600)
  }

  // ── Searching / progress state ──
  if (status === 'searching') {
    const SCAN_STEPS = [
      { label: 'Public records',         done: progress.pct > 20 },
      { label: 'School alumni networks', done: progress.pct > 45 },
      { label: 'Location history',       done: progress.pct > 70 },
      { label: 'Match verification',     done: progress.pct > 90 },
    ]
    return (
      <div className="flex-1 basis-[380px] bg-white rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)] overflow-hidden">
        <style>{`
          @keyframes radar {
            0%   { transform: scale(0.4); opacity: 0.9; }
            100% { transform: scale(2.4); opacity: 0; }
          }
          .rring { position:absolute; inset:0; border-radius:50%; border:2px solid #2563eb; animation: radar 2s ease-out infinite; }
          .rring2 { animation-delay:.65s !important; }
          .rring3 { animation-delay:1.3s !important; }
        `}</style>

        <div className="bg-[#0f172a] pt-8 pb-7 px-6 text-center">
          <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <div className="rring" />
            <div className="rring rring2" />
            <div className="rring rring3" />
            <div className="relative z-10 w-12 h-12 bg-[#2563eb] rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(37,99,235,0.6)]">
              <FiSearch size={22} color="white" strokeWidth={2.5} />
            </div>
          </div>
          <h2 className="text-[20px] font-black text-white mb-1">Scanning your network...</h2>
          <p className="text-[#64748b] text-[13px]">Searching through millions of records</p>
        </div>

        <div className="p-5">
          <div className="mb-5">
            <div className="h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress.pct}%`, background: 'linear-gradient(90deg,#2563eb,#60a5fa)' }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[12px] text-[#94a3b8]">
              <span className="font-semibold text-[#475569]">{progress.pct}%</span>
              <span>Processing…</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {SCAN_STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-colors duration-500 ${s.done ? 'bg-green-500' : 'bg-[#e2e8f0]'}`}>
                  {s.done
                    ? <FiCheck size={11} color="white" strokeWidth={3} />
                    : <span className="text-[9px] font-black text-[#94a3b8]">{i + 1}</span>
                  }
                </div>
                <span className={`text-[13px] transition-colors duration-500 ${s.done ? 'text-[#0f172a] font-semibold' : 'text-[#94a3b8]'}`}>{s.label}</span>
                {s.done && <span className="ml-auto text-[11px] text-green-600 font-semibold flex items-center gap-1"><FiCheckCircle size={11} /> Done</span>}
              </div>
            ))}
          </div>

          {progress.msg && (
            <div className="mt-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] px-4 py-3 text-center">
              <p className="text-[13px] text-[#475569] font-medium">{progress.msg}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Matches state ──
  if (status === 'matches') {
    const PROFILES = [
      { skin: '#f0c8a0', hair: '#3d2314', bg: '#dbeafe', shirt: '#1d4ed8', pct: 94, name: 'J**** S.',  loc: 'Queens, NY' },
      { skin: '#c8834f', hair: '#1a0a00', bg: '#fce7f3', shirt: '#be185d', pct: 87, name: 'M*** D.',   loc: 'Brooklyn, NY' },
      { skin: '#e8b08a', hair: '#5c3317', bg: '#dcfce7', shirt: '#15803d', pct: 91, name: 'R*** T.',   loc: 'Staten Is., NY' },
      { skin: '#8d5524', hair: '#2d1b00', bg: '#fef3c7', shirt: '#b45309', pct: 89, name: 'T*** W.',   loc: 'Newark, NJ' },
      { skin: '#f3d5b5', hair: '#7c5c2e', bg: '#ede9fe', shirt: '#6d28d9', pct: 83, name: 'A**** M.', loc: 'Hoboken, NJ' },
      { skin: '#d4956a', hair: '#3d2314', bg: '#ffedd5', shirt: '#c2410c', pct: 78, name: 'C**** J.',  loc: 'Jersey City, NJ' },
    ]
    const extra = matchCount.current - PROFILES.length
    return (
      <div className="flex-1 basis-[380px] bg-white rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)] overflow-hidden">
        <style>{`
          @keyframes scanReveal {
            0%   { top: -4px; opacity: 0; }
            4%   { opacity: 1; }
            88%  { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          @keyframes cardIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulseBtn {
            0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.45); }
            60%      { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
          }
          .scan-wrap { position: relative; overflow: hidden; }
          .scan-beam {
            position: absolute; left: 0; right: 0; height: 3px; z-index: 20;
            background: linear-gradient(90deg, transparent, rgba(96,165,250,.4), rgba(147,197,253,.9), rgba(96,165,250,.4), transparent);
            box-shadow: 0 0 12px 3px rgba(96,165,250,.5);
            animation: scanReveal 2.2s ease-in-out forwards;
            pointer-events: none;
          }
          .pcard { animation: cardIn .35s ease-out both; }
          .cta-btn { animation: pulseBtn 2.2s ease-in-out 1.5s infinite; }
        `}</style>

        <div className="bg-[#0f172a] px-5 pt-5 pb-5 text-center">
          <div className="inline-flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 text-green-400 text-[11px] font-black px-3 py-1 rounded-full mb-3 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Scan complete
            <FiCheckCircle size={11} />
          </div>
          <h2 className="text-[26px] font-black text-white leading-tight mb-1">
            We got <span className="text-[#60a5fa]">{matchCount.current} matches</span><br />for you!
          </h2>
          <p className="text-[#64748b] text-[12px]">People from your school, area &amp; network</p>
        </div>

        <div className="p-4">
          <div className="scan-wrap rounded-xl overflow-hidden mb-2">
            <div className="scan-beam" />
            <div className="grid grid-cols-3 gap-1.5">
              {PROFILES.map((p, i) => (
                <div
                  key={i}
                  className="pcard relative rounded-lg overflow-hidden"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div style={{ filter: 'blur(7px)', userSelect: 'none', transform: 'scale(1.06)', transformOrigin: 'center top' }}>
                    <svg width="100%" height="82" viewBox="0 0 60 82" xmlns="http://www.w3.org/2000/svg">
                      <rect width="60" height="82" fill={p.bg} />
                      <ellipse cx="30" cy="90" rx="26" ry="22" fill={p.shirt} />
                      <rect x="24" y="48" width="12" height="13" rx="3" fill={p.skin} />
                      <ellipse cx="30" cy="35" rx="14" ry="16" fill={p.skin} />
                      <ellipse cx="30" cy="20" rx="15" ry="10" fill={p.hair} />
                      <ellipse cx="16.5" cy="30" rx="4.5" ry="8" fill={p.hair} />
                      <ellipse cx="43.5" cy="30" rx="4.5" ry="8" fill={p.hair} />
                    </svg>
                  </div>

                  <div style={{ filter: 'blur(5px)', userSelect: 'none' }} className="bg-white px-1.5 pt-1.5 pb-2 text-center">
                    <div className="text-[10px] font-black text-[#0f172a] truncate">{p.name}</div>
                    <div className="text-[9px] text-[#64748b] truncate">{p.loc}</div>
                  </div>

                  <div className="absolute top-1 right-1 bg-[#0f172a]/75 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                    {p.pct}%
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center bg-black/6">
                    <div className="bg-white/85 backdrop-blur-sm rounded-full w-7 h-7 flex items-center justify-center shadow">
                      <FiLock size={12} color="#0f172a" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-white/80 to-transparent pointer-events-none" />
          </div>

          {extra > 0 && (
            <div className="text-center mb-3">
              <span className="text-[11px] text-[#64748b] bg-[#f1f5f9] border border-[#e2e8f0] px-3 py-1 rounded-full">
                +{extra} more matches hidden
              </span>
            </div>
          )}

          {/* Urgent email check banner */}
          <div className="rounded-[12px] overflow-hidden mb-3 border-2 border-[#ef4444]" style={{ animation: 'pulseBtn 1.8s ease-in-out infinite' }}>
            <div className="bg-[#ef4444] px-4 py-2 flex items-center gap-2">
              <span className="text-white text-[13px] font-black tracking-wide">🚨 CHECK YOUR EMAIL NOW</span>
            </div>
            <div className="px-4 py-3 bg-[#fff5f5] text-center">
              <p className="text-[13px] font-bold text-[#991b1b] mb-0.5">
                We just sent your verification link to:
              </p>
              <p className="text-[14px] font-black text-[#0f172a] mb-1">{form.email}</p>
              <p className="text-[11px] text-[#dc2626]">
                ⏱ Link expires in <strong>10 minutes</strong> — open your inbox right now!
              </p>
            </div>
          </div>

          <a
            href={getInboxUrl(form.email)}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-[15px] py-3.75 rounded-xl border-0 cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 no-underline"
            style={{ display: 'flex', textDecoration: 'none' }}
          >
            <FiMail size={17} strokeWidth={2.5} />
            Open My Inbox Now →
          </a>

          <button
            onClick={() => setStatus('success')}
            className="mt-2 w-full text-[12px] text-[#64748b] underline border-0 bg-transparent cursor-pointer py-1"
          >
            I already verified — show my matches
          </button>

          <p className="mt-1.5 text-[11px] text-[#94a3b8] text-center">
            Can't find it? Check your spam / junk folder.
          </p>
        </div>
      </div>
    )
  }

  // ── Success state ──
  if (status === 'success') {
    const inboxUrl = getInboxUrl(form.email)
    return (
      <div className="flex-1 basis-[380px] bg-white rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)] overflow-hidden">
        <style>{`
          @keyframes bounce {
            0%,100% { transform: translateY(0); }
            50%      { transform: translateY(-6px); }
          }
          @keyframes urgentPulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
            60%      { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          }
          .bounce-icon { animation: bounce 1.4s ease-in-out infinite; }
          .urgent-btn  { animation: urgentPulse 1.8s ease-in-out infinite; }
        `}</style>

        {/* Red urgency header */}
        <div className="bg-[#dc2626] px-6 pt-6 pb-5 text-center">
          <div className="bounce-icon w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
            <FiMail size={28} color="#dc2626" strokeWidth={2} />
          </div>
          <h2 className="text-[22px] font-black text-white mb-1">
            🚨 Check Your Email NOW!
          </h2>
          <p className="text-[13px] text-red-100">Your matches are waiting — don't let them disappear</p>
        </div>

        <div className="p-5 text-center">
          <div className="bg-[#fff5f5] border-2 border-[#fca5a5] rounded-[12px] px-4 py-4 mb-5">
            <p className="text-[13px] text-[#7f1d1d] font-semibold mb-1">We sent your verification link to:</p>
            <p className="text-[15px] font-black text-[#0f172a] break-all mb-2">{form.email}</p>
            <p className="text-[12px] text-[#dc2626] font-bold">
              ⏱ Open it within 10 minutes before it expires
            </p>
          </div>

          <a
            href={inboxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="urgent-btn w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-black text-[16px] py-4 rounded-[12px] border-0 cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 no-underline mb-3"
            style={{ display: 'flex', textDecoration: 'none' }}
          >
            <FiMail size={20} strokeWidth={2.5} />
            Open My Email Inbox →
          </a>

          <div className="space-y-2 text-left">
            <div className="flex items-start gap-2 text-[12px] text-[#64748b]">
              <FiCheckCircle size={13} color="#22c55e" className="shrink-0 mt-0.5" />
              <span>Check your <strong>inbox</strong> for an email from Reconnect</span>
            </div>
            <div className="flex items-start gap-2 text-[12px] text-[#64748b]">
              <FiCheckCircle size={13} color="#22c55e" className="shrink-0 mt-0.5" />
              <span>Click the verification link in the email</span>
            </div>
            <div className="flex items-start gap-2 text-[12px] text-[#64748b]">
              <FiCheckCircle size={13} color="#22c55e" className="shrink-0 mt-0.5" />
              <span>Not there? Check your <strong>spam/junk folder</strong></span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isLoading = false

  // ── Form state ──
  return (
    <div className="flex-1 basis-[380px] bg-white rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)] overflow-hidden">
      {/* Form header bar */}
      <div className="bg-[#0f172a] px-6 pt-5 pb-5">
        <h2 className="text-[22px] font-black text-white mb-0.5">Start Your Search</h2>
        <p className="text-[13px] text-[#64748b] flex items-center gap-1.5">
          <FiUsers size={12} color="#64748b" />
          Join 2.4M+ people who already reconnected
        </p>
      </div>

      <div className="p-[22px]">
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {/* Honeypot */}
          <input name="_hp" type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

          {/* Name row */}
          <div className="grid grid-cols-2 gap-2.5">
            <Field icon={<FiUser size={15} />} error={errors.firstName}>
              <input
                type="text" name="firstName" placeholder="First Name *"
                value={form.firstName} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${errors.firstName ? INPUT_ERR : INPUT_OK}`}
              />
            </Field>
            <Field icon={<FiUser size={15} />} error={errors.lastName}>
              <input
                type="text" name="lastName" placeholder="Last Name *"
                value={form.lastName} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${errors.lastName ? INPUT_ERR : INPUT_OK}`}
              />
            </Field>
          </div>

          {/* Email */}
          <Field icon={<FiMail size={15} />} error={errors.email}>
            <input
              type="email" name="email" placeholder="Email Address *"
              value={form.email} onChange={handleChange} disabled={isLoading}
              className={`${INPUT_BASE} ${errors.email ? INPUT_ERR : INPUT_OK}`}
            />
          </Field>

          {/* Phone */}
          <Field icon={<FiPhone size={15} />} error={errors.phone}>
            <input
              type="tel" name="phone" placeholder="Phone Number (optional)"
              value={form.phone} onChange={handleChange} disabled={isLoading}
              className={`${INPUT_BASE} ${errors.phone ? INPUT_ERR : INPUT_OK}`}
            />
          </Field>

          {/* Gender + DOB */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none z-10">
                <HiOutlineIdentification size={15} />
              </span>
              <select
                name="gender" value={form.gender}
                onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}
                disabled={isLoading}
                className="w-full pl-10 pr-3.5 py-[13px] border border-[#cbd5e1] rounded-[10px] text-[14px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 transition-all disabled:opacity-50 bg-white text-[#374151]"
              >
                <option value="">Gender (optional)</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <Field icon={<FiCalendar size={15} />} error={errors.dob}>
              <input
                type="text" name="dob" placeholder="Birth Year e.g. 1965"
                value={form.dob} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${errors.dob ? INPUT_ERR : INPUT_OK}`}
              />
            </Field>
          </div>

          {/* School Name + Location */}
          <div className="grid grid-cols-2 gap-2.5">
            <Field icon={<FiBook size={15} />}>
              <input
                type="text" name="schoolName" placeholder="High School Name"
                value={form.schoolName} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${INPUT_OK}`}
              />
            </Field>
            <Field icon={<FiMapPin size={15} />}>
              <input
                type="text" name="schoolLocation" placeholder="School City, State"
                value={form.schoolLocation} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${INPUT_OK}`}
              />
            </Field>
          </div>

          {/* Graduation Year */}
          <Field icon={<FiAward size={15} />}>
            <input
              type="text" name="year" placeholder="Graduation Year (optional)"
              value={form.year} onChange={handleChange} disabled={isLoading}
              className={`${INPUT_BASE} ${INPUT_OK}`}
            />
          </Field>

          {/* Current City + State */}
          <div className="grid grid-cols-2 gap-2.5">
            <Field icon={<FiHome size={15} />}>
              <input
                type="text" name="currentCity" placeholder="Current City"
                value={form.currentCity} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${INPUT_OK}`}
              />
            </Field>
            <Field icon={<FiMap size={15} />}>
              <input
                type="text" name="state" placeholder="State e.g. NY"
                value={form.state} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${INPUT_OK}`}
              />
            </Field>
          </div>

          {/* Previous City + ZIP */}
          <div className="grid grid-cols-2 gap-2.5">
            <Field icon={<FiMapPin size={15} />}>
              <input
                type="text" name="previousCity" placeholder="Previous City"
                value={form.previousCity} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${INPUT_OK}`}
              />
            </Field>
            <Field icon={<FiHash size={15} />}>
              <input
                type="text" name="zip" placeholder="ZIP Code"
                value={form.zip} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${INPUT_OK}`}
              />
            </Field>
          </div>

          {/* Employer + Relative */}
          <div className="grid grid-cols-2 gap-2.5">
            <Field icon={<FiBriefcase size={15} />}>
              <input
                type="text" name="employer" placeholder="Employer"
                value={form.employer} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${INPUT_OK}`}
              />
            </Field>
            <Field icon={<FiUsers size={15} />}>
              <input
                type="text" name="relative" placeholder="Relative's Name"
                value={form.relative} onChange={handleChange} disabled={isLoading}
                className={`${INPUT_BASE} ${INPUT_OK}`}
              />
            </Field>
          </div>

          {/* Preferred Contact */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none z-10">
              <FiPhone size={15} />
            </span>
            <select
              name="preferredContact" value={form.preferredContact}
              onChange={e => setForm(prev => ({ ...prev, preferredContact: e.target.value }))}
              disabled={isLoading}
              className="w-full pl-10 pr-3.5 py-[13px] border border-[#cbd5e1] rounded-[10px] text-[14px] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 transition-all disabled:opacity-50 bg-white text-[#374151]"
            >
              <option value="">Preferred Contact (optional)</option>
              <option value="Email">Email</option>
              <option value="Phone">Phone</option>
              <option value="Text">Text</option>
              <option value="Either">Either</option>
            </select>
          </div>

          {status === 'error' && (
            <div className="flex items-start gap-2 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <FiAlertCircle size={14} className="shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] text-white font-black text-[16px] py-[14px] rounded-[10px] cursor-pointer disabled:cursor-not-allowed border-0 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <FiSearch size={18} strokeWidth={2.5} />
            {isLoading ? 'Searching...' : 'Find My Community'}
            <FiArrowRight size={18} strokeWidth={2.5} />
          </button>

          <p className="text-[11px] text-[#94a3b8] text-center pt-1">
            By submitting, you agree to receive updates about your search and community access.
          </p>
        </form>
      </div>
    </div>
  )
}
