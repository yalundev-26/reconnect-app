import { useState } from 'react'
import HeroSection from '../components/HeroSection'
import HowItWorks from '../components/HowItWorks'
import CommunityBanner from '../components/CommunityBanner'
import Footer from '../components/Footer'

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f0f2f5] font-[Arial,Helvetica,sans-serif] leading-relaxed">

      {/* ── Sticky Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-[#e4e6ea]">
        <div className="max-w-300 mx-auto px-5 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a56db] flex items-center justify-center text-white font-black text-[15px] shadow-sm">R</div>
            <span className="text-[20px] font-black text-[#1a56db] tracking-tight">Reconnect</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7 text-[14px] text-[#606770] font-medium">
            <a href="#how-it-works" className="hover:text-[#1a56db] transition-colors">How It Works</a>
            <a href="#stories"      className="hover:text-[#1a56db] transition-colors">Stories</a>
          </div>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-3">
            <a
              href="#search"
              className="bg-[#1a56db] hover:bg-[#1648c2] text-white text-[13px] font-bold px-4 py-2.25 rounded-lg transition-colors shadow-sm"
            >
              Find Someone →
            </a>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-[#f0f2f5] transition-colors"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menu"
            >
              <div className="w-5 space-y-1">
                <span className="block h-0.5 bg-[#606770]" />
                <span className="block h-0.5 bg-[#606770]" />
                <span className="block h-0.5 bg-[#606770]" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#e4e6ea] bg-white px-5 py-3 space-y-2 text-[14px] font-medium text-[#606770]">
            <a href="#how-it-works" className="block py-2 hover:text-[#1a56db]" onClick={() => setMenuOpen(false)}>How It Works</a>
            <a href="#stories"      className="block py-2 hover:text-[#1a56db]" onClick={() => setMenuOpen(false)}>Stories</a>
          </div>
        )}
      </nav>

      <HeroSection />
      <HowItWorks />
      <CommunityBanner />
      <Footer />
    </div>
  )
}
