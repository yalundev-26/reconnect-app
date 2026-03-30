import { FiStar, FiHeart, FiArrowRight, FiLock, FiMail, FiShield, FiZap } from 'react-icons/fi'

const TESTIMONIALS = [
  {
    color: '#f87171',
    initial: 'J',
    name: 'Jennifer H.',
    school: "PS 101 • Class of '98",
    location: 'Queens, NY',
    match: '94%',
    quote: '"I found my childhood best friend after 22 years. We literally cried on the phone. This site is absolutely magical."',
  },
  {
    color: '#60a5fa',
    initial: 'C',
    name: 'Carlos R.',
    school: "Lincoln HS • Class of '03",
    location: 'Brooklyn, NY',
    match: '87%',
    quote: '"Found 6 people from my old block in under 5 minutes. Already made plans to meet up this weekend — unreal!"',
  },
  {
    color: '#34d399',
    initial: 'M',
    name: 'Maria S.',
    school: "Kennedy HS • Class of '95",
    location: 'The Bronx, NY',
    match: '91%',
    quote: '"My high school reunion is finally happening because of this. Over 30 people reconnected in just one week!"',
  },
]

const TRUST = [
  { Icon: FiLock,   label: 'SSL Secured' },
  { Icon: FiMail,   label: 'Email Verified' },
  { Icon: FiShield, label: 'Privacy Protected' },
  { Icon: FiZap,    label: 'Instant Results' },
]

export default function CommunityBanner() {
  return (
    <>
      {/* ── Testimonials ── */}
      <section id="stories" className="bg-[#f0f2f5]">
        <div className="max-w-275 mx-auto px-5 py-17.5">

          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 bg-[#fff0f3] text-[#be185d] text-[11px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider mb-3">
              <FiHeart size={11} strokeWidth={2.5} /> Real Stories
            </span>
            <h2 className="text-[36px] max-md:text-[28px] font-black text-[#0f172a] leading-tight mb-3">
              People Just Like You<br />Already Reconnected
            </h2>
            <p className="text-[#64748b] text-[16px] max-w-125 mx-auto leading-relaxed">
              Every day, thousands of people rediscover old friends and neighbors through Reconnect.
            </p>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(15,23,42,0.07)] p-6 flex flex-col gap-4 hover:shadow-[0_8px_32px_rgba(15,23,42,0.13)] hover:-translate-y-1 transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <FiStar key={j} size={14} color="#f59e0b" fill="#f59e0b" strokeWidth={0} />
                  ))}
                </div>

                <p className="text-[#1f2937] text-[15px] leading-relaxed font-medium flex-1 italic">{t.quote}</p>

                <div className="flex items-center gap-3 pt-4 border-t border-[#f1f5f9]">
                  <div
                    className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-white font-black text-[17px] shadow-sm"
                    style={{ background: t.color }}
                  >
                    {t.initial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[#0f172a] text-[14px] leading-tight">{t.name}</p>
                    <p className="text-[12px] text-[#64748b] truncate">{t.school} · {t.location}</p>
                  </div>
                  <div className="ml-auto shrink-0 bg-[#eff6ff] text-[#1a56db] text-[11px] font-black px-2.5 py-1 rounded-full">
                    {t.match} match
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0d1b4f 0%,#1a3a8f 60%,#1a56db 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(white 1px,transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#60a5fa]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-[#c084fc]/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-275 mx-auto px-5 py-20 text-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FiHeart size={30} color="white" strokeWidth={1.5} />
          </div>

          <h2 className="text-[40px] max-md:text-[28px] font-black text-white leading-tight mb-4">
            Your Past Is Waiting<br />
            <span className="text-[#93c5fd]">For You</span>
          </h2>
          <p className="text-white/70 text-[17px] max-w-135 mx-auto mb-8 leading-relaxed">
            Whether it's a childhood friend, an old classmate, or someone from your hometown —
            they might already be looking for you too.
          </p>

          <a
            href="#search"
            className="inline-flex items-center gap-2 bg-white text-[#1a56db] hover:bg-[#eff6ff] font-black text-[16px] px-8 py-4 rounded-[14px] transition-colors shadow-xl shadow-black/20 mb-5"
          >
            Start Free Search
            <FiArrowRight size={18} strokeWidth={2.5} />
          </a>

          <p className="text-white/40 text-[12px] mb-7">
            No credit card required · Takes 30 seconds · Free to search
          </p>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-[12px] text-white/40">
            {TRUST.map((t, i) => (
              <>
                <span key={t.label} className="flex items-center gap-1.5">
                  <t.Icon size={12} strokeWidth={2} /> {t.label}
                </span>
                {i < TRUST.length - 1 && <span key={`sep-${i}`} className="hidden sm:inline">·</span>}
              </>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
