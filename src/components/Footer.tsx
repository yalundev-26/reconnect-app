import { FiHeart } from 'react-icons/fi'
import { MdOutlineWifiTethering } from 'react-icons/md'

const COMPANY = [
  { label: 'About Us',        href: '#' },
  { label: 'How It Works',    href: '#how-it-works' },
  { label: 'Success Stories', href: '#stories' },
  { label: 'Start Searching', href: '#search' },
]

const LEGAL = [
  { label: 'Privacy Policy',   href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Cookie Policy',    href: '#' },
  { label: 'Contact Us',       href: '#' },
]

export default function Footer() {
  return (
    <footer className="bg-[#1c1e21] text-[#b0b3b8]">
      <div className="max-w-275 mx-auto px-5 pt-12 pb-8">

        <div className="flex flex-wrap justify-between gap-10 mb-10">

          {/* Brand */}
          <div className="basis-60">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#1a56db] flex items-center justify-center text-white font-black text-[14px]">R</div>
              <span className="text-white font-black text-[18px]">Reconnect</span>
            </div>
            <p className="text-[13px] leading-relaxed max-w-55">
              Helping people find old friends, classmates, and neighbors since 2024.
            </p>
            <div className="inline-flex items-center gap-2 mt-4 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-[11px]">
              <MdOutlineWifiTethering size={13} color="#22c55e" />
              Active now: 23,847 people
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-12 flex-wrap">
            <div>
              <p className="text-white font-black text-[12px] uppercase tracking-wider mb-4">Company</p>
              <ul className="space-y-2.5">
                {COMPANY.map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="text-[13px] hover:text-white transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-white font-black text-[12px] uppercase tracking-wider mb-4">Legal</p>
              <ul className="space-y-2.5">
                {LEGAL.map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="text-[13px] hover:text-white transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-[#3a3b3c] pt-6 flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <span>© 2026 Reconnect Community. All rights reserved.</span>
          <span className="text-[#606770] flex items-center gap-1">
            Made with <FiHeart size={11} color="#ef4444" fill="#ef4444" strokeWidth={0} /> for people who want to reconnect
          </span>
        </div>
      </div>
    </footer>
  )
}
