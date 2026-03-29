import SearchForm from './SearchForm'

const bullets = [
  'Reconnect with classmates and childhood friends',
  'Find people from the city or neighborhood you once lived in',
  'Join a community built around shared memories and new conversations',
]

export default function HeroSection() {
  return (
    <section className="flex flex-wrap items-center justify-between gap-8 pt-[60px] pb-10">
      <div className="flex-1 basis-[500px]">
        <h1 className="text-[44px] max-md:text-[34px] font-bold leading-[1.1] text-[#0f172a] mb-5">
          Find Old School Friends and Reconnect With Your Community
        </h1>
        <p className="text-[19px] max-md:text-[17px] text-[#475569] max-w-[620px] mb-6">
          Search by school, city, graduation year, or the neighborhood you once lived in.
          Rediscover familiar faces, shared memories, and people from your past.
        </p>
        <ul className="mb-8 space-y-2.5">
          {bullets.map(item => (
            <li key={item} className="flex items-start gap-2 text-[17px] text-[#334155]">
              <span className="font-bold text-[#2563eb] mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <SearchForm />
    </section>
  )
}
