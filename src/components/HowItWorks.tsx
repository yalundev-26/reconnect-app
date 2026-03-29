const steps = [
  {
    number: 1,
    title: 'Enter Your Details',
    description: 'Add your school, city, or neighborhood and the years that matter most.',
  },
  {
    number: 2,
    title: 'Discover Familiar Faces',
    description: 'We help surface possible matches based on shared places and time periods.',
  },
  {
    number: 3,
    title: 'Reconnect and Belong',
    description: 'Join conversations, share memories, and rebuild old connections in one place.',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-[60px]">
      <h3 className="text-[34px] max-md:text-[28px] font-bold text-center text-[#0f172a] mb-4">
        How It Works
      </h3>
      <p className="text-center text-[#64748b] max-w-[700px] mx-auto mb-10 text-[17px]">
        Reconnecting is simple. Tell us where you went to school or where you used to live,
        and we'll help you discover people with shared history.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
        {steps.map(step => (
          <div
            key={step.number}
            className="bg-white p-[25px] rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.06)] text-center"
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#dbeafe] text-[#2563eb] text-[20px] font-bold flex items-center justify-center">
              {step.number}
            </div>
            <h4 className="text-[20px] font-bold text-[#0f172a] mb-2.5">{step.title}</h4>
            <p className="text-[#64748b] text-[15px]">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
