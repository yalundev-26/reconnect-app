import { useState, type ChangeEvent } from 'react'
import { addContactToBrevo } from '../lib/brevo'

interface SignupForm {
  firstName: string
  lastName: string
  email: string
  schoolName: string
  cityName: string
  year: string
  password: string
}

const initial: SignupForm = {
  firstName: '',
  lastName: '',
  email: '',
  schoolName: '',
  cityName: '',
  year: '',
  password: '',
}

type Status = 'idle' | 'loading' | 'success' | 'error'

const inputClass =
  'w-full px-4 py-3.5 border border-[#cbd5e1] rounded-[10px] text-[15px] outline-none focus:border-[#2563eb] transition-colors disabled:opacity-50'

export default function SignupPage() {
  const [form, setForm] = useState<SignupForm>(initial)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      await addContactToBrevo({
        email:      form.email,
        firstName:  form.firstName,
        lastName:   form.lastName,
        schoolName: form.schoolName,
        cityName:   form.cityName,
        year:       form.year,
        source:     'meta_web',
      })
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

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

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center px-5 py-12">
      <div className="bg-white p-8 rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)] w-full max-w-lg">

        <h1 className="text-[28px] font-bold text-[#0f172a] mb-1">Complete Your Profile</h1>
        <p className="text-[#64748b] text-[15px] mb-6">
          Tell us a bit more so we can find the right people for you.
        </p>

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

          {/* Email */}
          <div className="mb-3">
            <label className="block mb-1 text-[13px] font-bold text-[#374151]">Email Address *</label>
            <input name="email" type="email" placeholder="you@example.com" required
              value={form.email} onChange={handleChange} disabled={isLoading}
              className={inputClass} />
          </div>

          {/* School */}
          <div className="mb-3">
            <label className="block mb-1 text-[13px] font-bold text-[#374151]">School Name</label>
            <input name="schoolName" type="text" placeholder="e.g. Lincoln High School"
              value={form.schoolName} onChange={handleChange} disabled={isLoading}
              className={inputClass} />
          </div>

          {/* City + Year row */}
          <div className="grid grid-cols-2 gap-3 mb-3 max-[480px]:grid-cols-1">
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

          {/* Password */}
          <div className="mb-5">
            <label className="block mb-1 text-[13px] font-bold text-[#374151]">Create a Password *</label>
            <input name="password" type="password" placeholder="Min 8 characters" required
              minLength={8} value={form.password} onChange={handleChange} disabled={isLoading}
              className={inputClass} />
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
            {isLoading ? 'Creating your profile...' : 'Join the Community'}
          </button>

          <p className="mt-3 text-[12px] text-[#94a3b8] text-center">
            By joining, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  )
}
