export default function CommunityBanner() {
  return (
    <section className="py-[60px]">
      <div className="bg-[#eaf2ff] rounded-[20px] p-10 text-center">
        <h3 className="text-[34px] max-md:text-[28px] font-bold text-[#0f172a] mb-4">
          Your Past Still Matters
        </h3>
        <p className="max-w-[760px] mx-auto text-[#475569] text-[17px] mb-6">
          Whether you want to find a childhood friend, reconnect with old classmates,
          or meet people from the same hometown, this community helps bring people together again.
        </p>
        <a
          href="#"
          className="inline-block bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold px-7 py-[14px] rounded-[10px] transition-colors duration-200"
        >
          Join the Community
        </a>
      </div>
    </section>
  )
}
