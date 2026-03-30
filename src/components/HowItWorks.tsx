import { FiSearch, FiUsers, FiMessageCircle, FiArrowRight, FiLock, FiMail, FiShield, FiZap } from 'react-icons/fi'

const STEPS = [
  {
    Icon: FiSearch,
    num: '01',
    title: 'Enter Your Details',
    desc: 'Tell us your school name, city, graduation year, or neighborhood. The more you share, the better your matches.',
    iconBg: '#dbeafe',
    iconColor: '#1a56db',
    accent: '#1a56db',
  },
  {
    Icon: FiUsers,
    num: '02',
    title: 'We Find Your Matches',
    desc: 'Our system scans millions of records to surface people who share your history — school, area, and time period.',
    iconBg: '#dcfce7',
    iconColor: '#15803d',
    accent: '#15803d',
  },
  {
    Icon: FiMessageCircle,
    num: '03',
    title: 'Reconnect & Belong',
    desc: 'Verify your email to unlock profiles, see who matched, and start rebuilding connections from your past.',
    iconBg: '#fce7f3',
    iconColor: '#be185d',
    accent: '#be185d',
  },
]

const TRUST = [
  { Icon: FiLock,    label: 'SSL Secured' },
  { Icon: FiMail,    label: 'Email Verified' },
  { Icon: FiShield,  label: 'Privacy Protected' },
  { Icon: FiZap,     label: 'Results in Seconds' },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white">
      <div className="max-w-275 mx-auto px-5 py-[70px]">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block bg-[#eff6ff] text-[#1a56db] text-[11px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider mb-3">
            Simple · Fast · Free
          </span>
          <h2 className="text-[36px] max-md:text-[28px] font-black text-[#0f172a] leading-tight mb-3">
            How It Works
          </h2>
          <p className="text-[#64748b] text-[16px] max-w-130 mx-auto leading-relaxed">
            Three simple steps and you're on your way to finding people from your past.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-[52px] left-[calc(16.66%+32px)] right-[calc(16.66%+32px)] h-px bg-gradient-to-r from-[#bfdbfe] via-[#bbf7d0] to-[#fbcfe8]" />

          {STEPS.map((s, i) => (
            <div
              key={i}
              className="relative bg-[#f8fafc] hover:bg-white border border-[#e2e8f0] hover:border-[#bfdbfe] hover:shadow-xl rounded-[20px] p-7 transition-all duration-300 group cursor-default"
            >
              {/* Icon box */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 shadow-sm"
                style={{ background: s.iconBg }}
              >
                <s.Icon size={28} color={s.iconColor} strokeWidth={1.8} />
              </div>

              <p className="text-[11px] font-black uppercase tracking-widest mb-1.5" style={{ color: s.accent }}>
                Step {s.num}
              </p>
              <h3 className="text-[20px] font-black text-[#0f172a] mb-2 leading-tight">{s.title}</h3>
              <p className="text-[#64748b] text-[14px] leading-relaxed">{s.desc}</p>

              {/* Arrow between cards */}
              {i < STEPS.length - 1 && (
                <div className="hidden lg:flex absolute -right-4 top-12 z-10 w-8 h-8 bg-white border border-[#e2e8f0] rounded-full items-center justify-center shadow-sm">
                  <FiArrowRight size={14} color="#94a3b8" strokeWidth={2} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Trust row */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
          {TRUST.map((t, i) => (
            <>
              <span key={t.label} className="flex items-center gap-1.5 text-[13px] text-[#94a3b8]">
                <t.Icon size={13} strokeWidth={2} />
                {t.label}
              </span>
              {i < TRUST.length - 1 && <span key={`sep-${i}`} className="w-px h-4 bg-[#e2e8f0]" />}
            </>
          ))}
        </div>
      </div>
    </section>
  )
}
