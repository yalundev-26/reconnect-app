import HeroSection from '../components/HeroSection'
import HowItWorks from '../components/HowItWorks'
import CommunityBanner from '../components/CommunityBanner'
import Footer from '../components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#1f2937] font-[Arial,sans-serif] leading-relaxed">
      <div className="w-full max-w-[1100px] mx-auto px-5">
        <HeroSection />
        <HowItWorks />
        <CommunityBanner />
        <Footer />
      </div>
    </div>
  )
}
