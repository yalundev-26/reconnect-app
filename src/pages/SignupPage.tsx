import { useState, type ChangeEvent } from 'react'

interface ProfileForm {
  firstName:  string
  lastName:   string
  schoolName: string
  cityName:   string
  year:       string
}

const initial: ProfileForm = {
  firstName:  '',
  lastName:   '',
  schoolName: '',
  cityName:   '',
  year:       '',
}

type Status = 'idle' | 'loading' | 'success' | 'error'

const inputClass =
  'w-full px-4 py-3.5 border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50'

// Decode email from token payload without an API call.
// The token is: base64url(JSON({email,ts})).hmac
// We only read the payload — the server verifies the HMAC on submit.
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

  const [form, setForm]       = useState<ProfileForm>(initial)
  const [status, setStatus]   = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const token = new URLSearchParams(window.location.search).get('token') ?? ''

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
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
          <a
            href="/"
            className="inline-block bg-[#2563eb] text-white font-bold text-[15px] px-6 py-3 rounded-[10px] no-underline"
          >
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
        <div className="mb-5 px-4 py-3 bg-[#f1f5f9] rounded-[10px] text-[14px] text-[#475569]">
          Signing up as <strong className="text-[#0f172a]">{tokenEmail}</strong>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3 mb-3 max-[480px]:grid-cols-1">
            <div>
              <label className="block mb-1 text-[13px] font-bold text-[#374151]">First Name *</label>
              <input name="firstName" type="text" placeholder="First name" required
                value={form.firstName} onChange={handleChange} disabled={isLoading}
                className={inputClass} />
            </div>
            <div>
              <label className="block mb-1 text-[13px] font-bold text-[#374151]">Last Name *</label>
              <input name="lastName" type="text" placeholder="Last name" required
                value={form.lastName} onChange={handleChange} disabled={isLoading}
                className={inputClass} />
            </div>
          </div>

          {/* School */}
          <div className="mb-3">
            <label className="block mb-1 text-[13px] font-bold text-[#374151]">School Name</label>
            <input name="schoolName" type="text" placeholder="e.g. Lincoln High School"
              value={form.schoolName} onChange={handleChange} disabled={isLoading}
              className={inputClass} />
          </div>

          {/* City + Year row */}
          <div className="grid grid-cols-2 gap-3 mb-5 max-[480px]:grid-cols-1">
            <div>
              <label className="block mb-1 text-[13px] font-bold text-[#374151]">City You Lived In</label>
              <input name="cityName" type="text" placeholder="e.g. Chicago"
                value={form.cityName} onChange={handleChange} disabled={isLoading}
                className={inputClass} />
            </div>
            <div>
              <label className="block mb-1 text-[13px] font-bold text-[#374151]">Graduation / Year Range</label>
              <input name="year" type="text" placeholder="e.g. 1995–2000"
                value={form.year} onChange={handleChange} disabled={isLoading}
                className={inputClass} />
            </div>
          </div>

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
