import SearchForm from './SearchForm'
import { FiCheckCircle, FiHeart, FiStar } from 'react-icons/fi'
import { MdOutlineWifiTethering } from 'react-icons/md'

const MATCHES = [
  { color: '#f87171', Icon: FiCheckCircle, text: 'Jennifer H. found Michael T.',       sub: "Jefferson High '98 · Queens, NY", age: '2m ago' },
  { color: '#60a5fa', Icon: FiHeart,       text: 'Carlos R. reconnected with Ana M.', sub: "Lincoln HS '03 · Brooklyn, NY",   age: '5m ago' },
  { color: '#34d399', Icon: FiStar,        text: 'David K. found Sarah L.',            sub: "MLK High '95 · The Bronx, NY",   age: '12m ago' },
]

const STATS = [
  { n: '2.4M+', label: 'Reunions Made' },
  { n: '48M+',  label: 'Profiles Searched' },
  { n: '127K+', label: 'Active Members' },
  { n: '98%',   label: 'Match Accuracy' },
]

const AVATARS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#c084fc']

export default function HeroSection() {
  return (
    <>
      {/* ── Hero ── */}
      <section
        id="search"
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0d1b4f 0%,#1a3a8f 52%,#1a56db 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(white 1px,transparent 1px)', backgroundSize: '22px 22px' }}
        />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#60a5fa]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 rounded-full bg-[#c084fc]/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-275 mx-auto px-5 py-16 max-md:py-10 flex flex-wrap items-center gap-10">

          {/* ── Left column ── */}
          <div className="flex-1 basis-110">

            {/* Live badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-[12px] font-bold text-white mb-6 backdrop-blur-sm">
              <MdOutlineWifiTethering size={14} color="#22c55e" />
              23,847 people searching right now
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            </div>

            <h1 className="text-[46px] max-md:text-[32px] font-black text-white leading-[1.06] mb-4">
              Find People From<br />
              Your Past.<br />
              <span className="text-[#93c5fd]">Reconnect Today.</span>
            </h1>

            <p className="text-[17px] max-md:text-[15px] text-white/70 max-w-115 mb-7 leading-relaxed">
              Search by school, city, graduation year, or neighborhood.
              Rediscover old friends and memories — takes less than 30&nbsp;seconds.
            </p>

            {/* Social proof avatars */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex -space-x-2">
                {AVATARS.map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white/50"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div>
                <p className="text-white text-[13px] font-bold leading-tight">2.4M+ people reunited</p>
                <p className="text-white/50 text-[11px]">Join them — free to search</p>
              </div>
            </div>

            {/* Live activity feed */}
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-2.5">Live Activity</p>
              <div className="space-y-2">
                {MATCHES.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-[14px] px-3.5 py-2.5"
                  >
                    <div
                      className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center border-2 border-white/20 shadow"
                      style={{ background: m.color }}
                    >
                      <m.Icon size={15} color="white" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-[12px] font-bold truncate leading-tight">{m.text}</p>
                      <p className="text-white/50 text-[11px] truncate">{m.sub}</p>
                    </div>
                    <span className="ml-auto text-[10px] text-white/35 shrink-0">{m.age}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right — SearchForm ── */}
          <SearchForm />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="bg-white border-b border-[#e4e6ea] shadow-sm">
        <div className="max-w-275 mx-auto px-5 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#e4e6ea]">
            {STATS.map(s => (
              <div key={s.label} className="text-center px-4 py-1">
                <p className="text-[28px] max-md:text-[22px] font-black text-[#1a56db] leading-none">{s.n}</p>
                <p className="text-[12px] text-[#8a8d91] font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
