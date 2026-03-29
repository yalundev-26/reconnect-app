import { useState, type ChangeEvent } from 'react'
import { addContactToBrevo } from '../lib/brevo'

// fbq is injected globally by Meta Pixel in index.html
declare const fbq: (event: string, name: string) => void

interface LeadForm {
  firstName:  string
  lastName:   string
  email:      string
  schoolName: string
  cityName:   string
  year:       string
}

const initial: LeadForm = {
  firstName:  '',
  lastName:   '',
  email:      '',
  schoolName: '',
  cityName:   '',
  year:       '',
}

type Status = 'idle' | 'loading' | 'success' | 'error'

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
      body: JSON.stringify({ ...form, source: 'meta_web', _hp: honeypot }),
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

export default function SearchForm() {
  const [form, setForm]         = useState<LeadForm>(initial)
  const [status, setStatus]     = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const honeypot = (e.currentTarget.elements as HTMLFormControlsCollection & { _hp?: HTMLInputElement })._hp?.value ?? ''
    setStatus('loading')
    setErrorMsg('')

    try {
      await submitLead(form, honeypot)

      if (typeof fbq !== 'undefined') {
        fbq('track', 'Lead')
      }

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  // ── Success state ──
  if (status === 'success') {
    return (
      <div className="flex-1 basis-[380px] bg-white p-8 rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)] text-center">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-2xl font-bold text-[#0f172a] mb-3">Check your email</h2>
        <p className="text-[#64748b] text-[15px] leading-relaxed">
          We just sent your access link to <strong className="text-[#0f172a]">{form.email}</strong>.
          <br />Open your inbox and click the link to continue.
        </p>
      </div>
    )
  }

  const isLoading = status === 'loading'

  // ── Form state ──
  return (
    <div className="flex-1 basis-[380px] bg-white p-[30px] rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
      <h2 className="text-[28px] font-bold text-[#0f172a] mb-2">Start Your Search</h2>
      <p className="text-[15px] text-[#64748b] mb-5">
        Fill out the form below to begin finding people from your past.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Honeypot — hidden from humans, bots fill it */}
        <input name="_hp" type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" aria-hidden="true" />

        <div className="mb-3.5">
          <input
            type="text" name="firstName" placeholder="First Name" required
            value={form.firstName} onChange={handleChange} disabled={isLoading}
            className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="mb-3.5">
          <input
            type="text" name="lastName" placeholder="Last Name" required
            value={form.lastName} onChange={handleChange} disabled={isLoading}
            className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="mb-3.5">
          <input
            type="email" name="email" placeholder="Email Address" required
            value={form.email} onChange={handleChange} disabled={isLoading}
            className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="mb-3.5">
          <input
            type="text" name="schoolName" placeholder="School Name"
            value={form.schoolName} onChange={handleChange} disabled={isLoading}
            className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="mb-3.5">
          <input
            type="text" name="cityName" placeholder="City You Lived In"
            value={form.cityName} onChange={handleChange} disabled={isLoading}
            className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="mb-3.5">
          <input
            type="text" name="year" placeholder="Graduation Year or Years Lived There"
            value={form.year} onChange={handleChange} disabled={isLoading}
            className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {status === 'error' && (
          <p className="mb-3 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] text-white font-bold text-[17px] py-[15px] rounded-[10px] cursor-pointer disabled:cursor-not-allowed border-0 transition-colors duration-200"
        >
          {isLoading ? 'Sending...' : 'Find My Community'}
        </button>

        <p className="mt-3 text-[12px] text-[#94a3b8] text-center">
          By submitting, you agree to receive updates about your search and community access.
        </p>
      </form>
    </div>
  )
}
