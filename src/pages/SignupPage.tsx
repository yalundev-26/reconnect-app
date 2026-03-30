import { useState, type ChangeEvent } from 'react'

interface ProfileForm {
  firstName:       string
  lastName:        string
  schoolName:      string
  cityName:        string
  yearFrom:        string
  yearTo:          string
  password:        string
  confirmPassword: string
  communityPrefs:  string[]
}

const initial: ProfileForm = {
  firstName:       '',
  lastName:        '',
  schoolName:      '',
  cityName:        '',
  yearFrom:        '',
  yearTo:          '',
  password:        '',
  confirmPassword: '',
  communityPrefs:  [],
}

const COMMUNITY_OPTIONS = [
  { value: 'classmates',   label: 'School Classmates' },
  { value: 'hometown',     label: 'Hometown & City' },
  { value: 'neighborhood', label: 'Old Neighborhood' },
  { value: 'childhood',    label: 'Childhood Friends' },
  { value: 'sports',       label: 'Sports Teams' },
  { value: 'cultural',     label: 'Cultural Groups' },
]

const YEARS = Array.from({ length: 2026 - 1960 + 1 }, (_, i) => String(2026 - i))

type Status = 'idle' | 'loading' | 'success' | 'error'

type ProfileErrors = Partial<Record<keyof ProfileForm, string>>

function validateProfile(form: ProfileForm): ProfileErrors {
  const errs: ProfileErrors = {}
  if (!form.firstName.trim()) errs.firstName = 'First name is required.'
  if (!form.lastName.trim())  errs.lastName  = 'Last name is required.'
  if (!form.password) {
    errs.password = 'Password is required.'
  } else if (form.password.length < 8) {
    errs.password = 'Password must be at least 8 characters.'
  }
  if (!form.confirmPassword) {
    errs.confirmPassword = 'Please confirm your password.'
  } else if (form.password !== form.confirmPassword) {
    errs.confirmPassword = 'Passwords do not match.'
  }
  if (form.yearFrom && form.yearTo && Number(form.yearTo) < Number(form.yearFrom)) {
    errs.yearTo = '"Year To" must be the same as or after "Year From".'
  }
  return errs
}

const inputClass =
  'w-full px-4 py-3.5 border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 bg-white'

const selectClass =
  'w-full px-4 py-3.5 border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50 bg-white'

const labelClass = 'block mb-1 text-[13px] font-bold text-[#374151]'
const sectionHeadClass = 'text-[11px] font-bold uppercase tracking-widest text-[#94a3b8] mb-3 mt-1'

function emailFromToken(token: string): string | null {
  try {
    const lastDot = token.lastIndexOf('.')
    if (lastDot === -1) return null
    const payload = token.slice(0, lastDot)
    const b64     = payload.replace(/-/g, '+').replace(/_/g, '/')
    const { email } = JSON.parse(atob(b64))
    return typeof email === 'string' && email.includes('@') ? email : null
  } catch {
    return null
  }
}

export default function SignupPage() {
  const params     = new URLSearchParams(window.location.search)
  const token      = params.get('token') ?? ''
  const tokenEmail = emailFromToken(token) ?? ''

  const [form, setForm]           = useState<ProfileForm>(initial)
  const [status, setStatus]       = useState<Status>('idle')
  const [errorMsg, setErrorMsg]   = useState('')
  const [errors, setErrors]       = useState<ProfileErrors>({})
  const [showPwd, setShowPwd]     = useState(false)
  const [showConf, setShowConf]   = useState(false)

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof ProfileForm]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  function togglePref(value: string) {
    setForm(prev => ({
      ...prev,
      communityPrefs: prev.communityPrefs.includes(value)
        ? prev.communityPrefs.filter(v => v !== value)
        : [...prev.communityPrefs, value],
    }))
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMsg('')

    const fieldErrors = validateProfile(form)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    setStatus('loading')
    const currentToken = new URLSearchParams(window.location.search).get('token') ?? ''

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: currentToken,
          firstName:      form.firstName,
          lastName:       form.lastName,
          schoolName:     form.schoolName,
          cityName:       form.cityName,
          yearFrom:       form.yearFrom,
          yearTo:         form.yearTo,
          password:       form.password,
          communityPrefs: form.communityPrefs.join(','),
        }),
      })

      let data: { error?: string } = {}
      try { data = await res.json() } catch { /* ignore */ }

      if (!res.ok) throw new Error(data?.error ?? 'Submission failed.')

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  // ── Invalid / no token in URL ─────────────────────────────────────────────
  if (!tokenEmail) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center px-5">
        <div className="bg-white p-10 rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)] text-center max-w-md w-full">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-[#0f172a] mb-3">Link not valid</h2>
          <p className="text-[#64748b] text-[15px] leading-relaxed mb-6">
            This link has expired or is invalid. Go back and enter your email again to get a new one.
          </p>
          <a href="/" className="inline-block bg-[#2563eb] text-white font-bold text-[15px] px-6 py-3 rounded-[10px] no-underline">
            ← Get a new link
          </a>
        </div>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center px-5">
        <div className="bg-white p-10 rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)] text-center max-w-md w-full">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-[#0f172a] mb-3">You're in!</h2>
          <p className="text-[#64748b] text-[15px] leading-relaxed">
            Your profile has been created. Welcome to the community —
            start reconnecting with people from your past.
          </p>
        </div>
      </div>
    )
  }

  const isLoading = status === 'loading'

  // ── Form (token valid) ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center px-5 py-12">
      <div className="bg-white p-8 rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)] w-full max-w-lg">

        <h1 className="text-[28px] font-bold text-[#0f172a] mb-1">Complete Your Profile</h1>
        <p className="text-[#64748b] text-[15px] mb-6">
          Tell us a bit more so we can find the right people for you.
        </p>

        {/* Locked email */}
        <div className="mb-6 px-4 py-3 bg-[#f1f5f9] rounded-[10px] text-[14px] text-[#475569]">
          Signing up as <strong className="text-[#0f172a]">{tokenEmail}</strong>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ─── Personal Info ─────────────────────────────────────────── */}
          <p className={sectionHeadClass}>Personal Info</p>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3 mb-3 max-[480px]:grid-cols-1">
            <div>
              <label className={labelClass}>First Name *</label>
              <input name="firstName" type="text" placeholder="First name"
                value={form.firstName} onChange={handleChange} disabled={isLoading}
                className={`${inputClass} ${errors.firstName ? 'border-red-400' : ''}`} />
              {errors.firstName && <p className="mt-1 text-[12px] text-red-600">{errors.firstName}</p>}
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input name="lastName" type="text" placeholder="Last name"
                value={form.lastName} onChange={handleChange} disabled={isLoading}
                className={`${inputClass} ${errors.lastName ? 'border-red-400' : ''}`} />
              {errors.lastName && <p className="mt-1 text-[12px] text-red-600">{errors.lastName}</p>}
            </div>
          </div>

          {/* School */}
          <div className="mb-3">
            <label className={labelClass}>School Name</label>
            <input name="schoolName" type="text" placeholder="e.g. Lincoln High School"
              value={form.schoolName} onChange={handleChange} disabled={isLoading}
              className={inputClass} />
          </div>

          {/* City */}
          <div className="mb-3">
            <label className={labelClass}>City You Lived In</label>
            <input name="cityName" type="text" placeholder="e.g. Chicago"
              value={form.cityName} onChange={handleChange} disabled={isLoading}
              className={inputClass} />
          </div>

          {/* Year range */}
          <div className="grid grid-cols-2 gap-3 mb-6 max-[480px]:grid-cols-1">
            <div>
              <label className={labelClass}>Year From</label>
              <select name="yearFrom" value={form.yearFrom} onChange={handleChange}
                disabled={isLoading} className={selectClass}>
                <option value="">Select year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Year To</label>
              <select name="yearTo" value={form.yearTo} onChange={handleChange}
                disabled={isLoading} className={`${selectClass} ${errors.yearTo ? 'border-red-400' : ''}`}>
                <option value="">Select year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {errors.yearTo && <p className="mt-1 text-[12px] text-red-600">{errors.yearTo}</p>}
            </div>
          </div>

          {/* ─── Password ──────────────────────────────────────────────── */}
          <p className={sectionHeadClass}>Set a Password</p>

          <div className="mb-3 relative">
            <label className={labelClass}>Password *</label>
            <input name="password" type={showPwd ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={form.password} onChange={handleChange} disabled={isLoading}
              className={`${inputClass} pr-20 ${errors.password ? 'border-red-400' : ''}`} />
            <button type="button" tabIndex={-1}
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-[38px] text-[12px] font-semibold text-[#2563eb] cursor-pointer bg-transparent border-0 p-0">
              {showPwd ? 'Hide' : 'Show'}
            </button>
            {errors.password && <p className="mt-1 text-[12px] text-red-600">{errors.password}</p>}
          </div>

          <div className="mb-6 relative">
            <label className={labelClass}>Confirm Password *</label>
            <input name="confirmPassword" type={showConf ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={form.confirmPassword} onChange={handleChange} disabled={isLoading}
              className={`${inputClass} pr-20 ${errors.confirmPassword ? 'border-red-400' : ''}`} />
            <button type="button" tabIndex={-1}
              onClick={() => setShowConf(v => !v)}
              className="absolute right-3 top-[38px] text-[12px] font-semibold text-[#2563eb] cursor-pointer bg-transparent border-0 p-0">
              {showConf ? 'Hide' : 'Show'}
            </button>
            {errors.confirmPassword && <p className="mt-1 text-[12px] text-red-600">{errors.confirmPassword}</p>}
          </div>

          {/* ─── Community Preferences ─────────────────────────────────── */}
          <p className={sectionHeadClass}>Community Preferences</p>
          <p className="text-[13px] text-[#64748b] mb-3">Who are you hoping to reconnect with?</p>

          <div className="grid grid-cols-2 gap-2 mb-6 max-[480px]:grid-cols-1">
            {COMMUNITY_OPTIONS.map(opt => {
              const checked = form.communityPrefs.includes(opt.value)
              return (
                <label key={opt.value}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[10px] border cursor-pointer transition-colors select-none text-[14px] font-medium
                    ${checked
                      ? 'border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]'
                      : 'border-[#e2e8f0] bg-white text-[#374151] hover:border-[#94a3b8]'
                    } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="checkbox" className="sr-only"
                    checked={checked}
                    onChange={() => togglePref(opt.value)}
                    disabled={isLoading} />
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0
                    ${checked ? 'bg-[#2563eb] border-[#2563eb]' : 'border-[#cbd5e1]'}`}>
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  {opt.label}
                </label>
              )
            })}
          </div>

          {/* Error */}
          {status === 'error' && (
            <p className="mb-4 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] text-white font-bold text-[17px] py-[15px] rounded-[10px] cursor-pointer disabled:cursor-not-allowed border-0 transition-colors duration-200"
          >
            {isLoading ? 'Saving your profile…' : 'Join the Community'}
          </button>

          <p className="mt-3 text-[12px] text-[#94a3b8] text-center">
            By joining, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  )
}
