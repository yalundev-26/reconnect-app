import { useState, type ChangeEvent } from 'react'
import { addContactToBrevo } from '../lib/brevo'

// fbq is injected globally by Meta Pixel in index.html
declare const fbq: (event: string, name: string) => void

type Status = 'idle' | 'loading' | 'success' | 'error'

async function submitLead(email: string): Promise<void> {
  if (import.meta.env.DEV) {
    // In local dev (npm run dev), /api/submit doesn't run under Vite.
    // Call Brevo directly using the VITE_ env vars instead.
    await addContactToBrevo({ email, source: 'meta_web' })
    return
  }

  // In production (Vercel), use the serverless function which also
  // notifies the Telegram group.
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source: 'meta_web' }),
  })

  let data: { error?: string } = {}
  try {
    data = await res.json()
  } catch {
    throw new Error(`Server error (${res.status})`)
  }

  if (!res.ok) throw new Error(data?.error ?? 'Submission failed.')
}

export default function SearchForm() {
  const [email, setEmail]       = useState('')
  const [status, setStatus]     = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value)
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      await submitLead(email)

      // Fire Meta Pixel Lead event
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
          We just sent your access link to <strong className="text-[#0f172a]">{email}</strong>.
          <br />Open your inbox and click the link to continue.
        </p>
      </div>
    )
  }

  const isLoading = status === 'loading'

  // ── Form state ──
  return (
    <div className="flex-1 basis-[380px] bg-white p-8 rounded-[18px] shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
      <h2 className="text-[28px] font-bold text-[#0f172a] mb-2">Start Your Search</h2>
      <p className="text-[15px] text-[#64748b] mb-6">
        Enter your email and we'll send you an access link to find people from your past.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <input
            type="email"
            name="email"
            placeholder="Your Email Address"
            required
            value={email}
            onChange={handleChange}
            disabled={isLoading}
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
          {isLoading ? 'Sending...' : 'Send My Access Link'}
        </button>

        <p className="mt-3 text-[12px] text-[#94a3b8] text-center">
          By submitting, you agree to receive updates about your search and community access.
        </p>
      </form>
    </div>
  )
}
