import { useState, useRef, type ChangeEvent } from 'react'
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

type LeadErrors = Partial<Record<keyof LeadForm, string>>

function validateLead(form: LeadForm): LeadErrors {
  const errs: LeadErrors = {}
  if (!form.firstName.trim()) errs.firstName = 'First name is required.'
  if (!form.lastName.trim())  errs.lastName  = 'Last name is required.'
  if (!form.email.trim()) {
    errs.email = 'Email address is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errs.email = 'Please enter a valid email address.'
  }
  if (form.phone.trim() && !/^[\d\s\-+().]{7,20}$/.test(form.phone.trim())) {
    errs.phone = 'Please enter a valid phone number.'
  }
  if (form.dob.trim() && !/^\d{4}$/.test(form.dob.trim())) {
    errs.dob = 'Enter a 4-digit birth year (e.g. 1965).'
  }
  return errs
}

type Status = 'idle' | 'searching' | 'success' | 'error'

interface ProgressStep { pct: number; msg: string }

const PROGRESS_STEPS: Array<{ delay: number } & ProgressStep> = [
  { delay: 500,  pct: 12, msg: '🔍 Searching public records...' },
  { delay: 1800, pct: 31, msg: '' }, // filled in at runtime with match count
  { delay: 3300, pct: 55, msg: '🔎 Cross-referencing school records...' },
  { delay: 4800, pct: 76, msg: '📋 Verifying names and locations...' },
  { delay: 6000, pct: 92, msg: '✅ Almost done — preparing your results...' },
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

export default function SearchForm() {
  const [form, setForm]         = useState<LeadForm>(initial)
  const [status, setStatus]     = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [errors, setErrors]     = useState<LeadErrors>({})
  const [progress, setProgress] = useState<ProgressStep>({ pct: 0, msg: '' })
  const matchCount              = useRef(Math.floor(Math.random() * 29) + 8) // 8–36, stable

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
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
      msg: i === 1
        ? `📂 Found ${matchCount.current} possible matches in your area...`
        : s.msg,
    }))

    const timers = steps.map(s =>
      setTimeout(() => setProgress({ pct: s.pct, msg: s.msg }), s.delay),
    )

    // Minimum engagement: 7s. If API fails, cancel animation and show error immediately.
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

    // API succeeded — wait for animation to finish
    await minWait
    timers.forEach(clearTimeout)

    setProgress({ pct: 100, msg: '🎉 Found your matches!' })
    setTimeout(() => {
      if (typeof fbq !== 'undefined') fbq('track', 'Lead')
      setStatus('success')
    }, 600)
  }

  // ── Searching / progress state ──
  if (status === 'searching') {
    return (
      <div className="flex-1 basis-[380px] bg-white p-8 rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-[22px] font-bold text-[#0f172a] mb-1">Searching for your people...</h2>
          <p className="text-[14px] text-[#64748b]">This usually takes a few seconds.</p>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="h-3 bg-[#e2e8f0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563eb] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[12px] text-[#94a3b8]">
            <span>{progress.pct}%</span>
            <span>Searching records...</span>
          </div>
        </div>

        {/* Step message */}
        {progress.msg && (
          <p className="text-[14px] text-[#475569] text-center font-medium bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] px-4 py-3">
            {progress.msg}
          </p>
        )}
      </div>
    )
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

  const isLoading = false // 'searching' already returned early above

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

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <input
              type="text" name="firstName" placeholder="First Name *"
              value={form.firstName} onChange={handleChange} disabled={isLoading}
              className={`w-full px-[15px] py-[14px] border rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.firstName ? 'border-red-400' : 'border-[#cbd5e1]'}`}
            />
            {errors.firstName && <p className="mt-1 text-[12px] text-red-600">{errors.firstName}</p>}
          </div>
          <div>
            <input
              type="text" name="lastName" placeholder="Last Name *"
              value={form.lastName} onChange={handleChange} disabled={isLoading}
              className={`w-full px-[15px] py-[14px] border rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.lastName ? 'border-red-400' : 'border-[#cbd5e1]'}`}
            />
            {errors.lastName && <p className="mt-1 text-[12px] text-red-600">{errors.lastName}</p>}
          </div>
        </div>

        {/* Email */}
        <div className="mb-3.5">
          <input
            type="email" name="email" placeholder="Email Address *"
            value={form.email} onChange={handleChange} disabled={isLoading}
            className={`w-full px-[15px] py-[14px] border rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.email ? 'border-red-400' : 'border-[#cbd5e1]'}`}
          />
          {errors.email && <p className="mt-1 text-[12px] text-red-600">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div className="mb-3.5">
          <input
            type="tel" name="phone" placeholder="Phone Number (optional)"
            value={form.phone} onChange={handleChange} disabled={isLoading}
            className={`w-full px-[15px] py-[14px] border rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.phone ? 'border-red-400' : 'border-[#cbd5e1]'}`}
          />
          {errors.phone && <p className="mt-1 text-[12px] text-red-600">{errors.phone}</p>}
        </div>

        {/* Gender + DOB row */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <select
              name="gender" value={form.gender} onChange={(e) => { setForm(prev => ({ ...prev, gender: e.target.value })) }}
              disabled={isLoading}
              className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 bg-white text-[#374151]"
            >
              <option value="">Gender (optional)</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <input
              type="text" name="dob" placeholder="Birth Year e.g. 1965 (optional)"
              value={form.dob} onChange={handleChange} disabled={isLoading}
              className={`w-full px-[15px] py-[14px] border rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${errors.dob ? 'border-red-400' : 'border-[#cbd5e1]'}`}
            />
            {errors.dob && <p className="mt-1 text-[12px] text-red-600">{errors.dob}</p>}
          </div>
        </div>

        {/* School Name + Location row */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <input
              type="text" name="schoolName" placeholder="High School Name (optional)"
              value={form.schoolName} onChange={handleChange} disabled={isLoading}
              className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <input
              type="text" name="schoolLocation" placeholder="School Location e.g. Queens, NY (optional)"
              value={form.schoolLocation} onChange={handleChange} disabled={isLoading}
              className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Graduation Year */}
        <div className="mb-3.5">
          <input
            type="text" name="year" placeholder="Graduation Year (optional)"
            value={form.year} onChange={handleChange} disabled={isLoading}
            className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Current City + State row */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <input
              type="text" name="currentCity" placeholder="Current City (optional)"
              value={form.currentCity} onChange={handleChange} disabled={isLoading}
              className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <input
              type="text" name="state" placeholder="State e.g. NY (optional)"
              value={form.state} onChange={handleChange} disabled={isLoading}
              className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Previous City + ZIP row */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <input
              type="text" name="previousCity" placeholder="Previous City Lived In (optional)"
              value={form.previousCity} onChange={handleChange} disabled={isLoading}
              className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <input
              type="text" name="zip" placeholder="ZIP Code (optional)"
              value={form.zip} onChange={handleChange} disabled={isLoading}
              className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Employer + Relative row */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <input
              type="text" name="employer" placeholder="Employer (optional)"
              value={form.employer} onChange={handleChange} disabled={isLoading}
              className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <input
              type="text" name="relative" placeholder="Relative's Name (optional)"
              value={form.relative} onChange={handleChange} disabled={isLoading}
              className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Preferred Contact */}
        <div className="mb-3.5">
          <select
            name="preferredContact" value={form.preferredContact}
            onChange={(e) => { setForm(prev => ({ ...prev, preferredContact: e.target.value })) }}
            disabled={isLoading}
            className="w-full px-[15px] py-[14px] border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 bg-white text-[#374151]"
          >
            <option value="">Preferred Contact Method (optional)</option>
            <option value="Email">Email</option>
            <option value="Phone">Phone</option>
            <option value="Text">Text</option>
            <option value="Either">Either</option>
          </select>
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
