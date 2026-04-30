import Phone from './Phone';

const steps = [
  {
    n: '01',
    label: 'Welcome',
    title: 'Open Sterling',
    body: 'A short, three-card welcome. No emails to verify. No 12-step setup.',
    src: '/screens/onboarding-start.png',
  },
  {
    n: '02',
    label: 'Profile',
    title: 'Tell us your goal',
    body: 'Pay down debt, save for something big, build net worth, control spending, or invest for the future. Pick what drives you.',
    src: '/screens/onboarding-profile.png',
  },
  {
    n: '03',
    label: 'Currency',
    title: 'Pick CAD or USD',
    body: 'Sterling supports both. Your default sets the tone. Change it whenever you like.',
    src: '/screens/onboarding-currency.png',
  },
  {
    n: '04',
    label: 'Consent',
    title: 'Privacy, in plain English',
    body: 'A clear, readable consent step about how your data is used. You agree, and we begin.',
    src: '/screens/onboarding-consent.png',
  },
];

export default function OnboardingShowcase() {
  return (
    <section id="onboarding" className="relative bg-ink-800 text-sand-100 py-28 sm:py-32 grain overflow-hidden">
      <div
        aria-hidden
        className="ring-glow"
        style={{
          width: 700,
          height: 700,
          right: '-20%',
          top: '-20%',
          background: 'radial-gradient(circle, rgba(124,125,245,0.32) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-[2]">
        <div className="max-w-3xl reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-cream-200 font-medium">
            How it works
          </div>
          <h2 className="display mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-light leading-[1.02]">
            From zero to in control,
            <br />
            <span className="italic font-normal">in under sixty seconds.</span>
          </h2>
          <p className="mt-6 text-[16.5px] leading-relaxed text-sand-100/65 max-w-xl">
            Onboarding shouldn’t feel like a homework assignment. Sterling asks four small questions,
            then gets out of your way.
          </p>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {steps.map((s, i) => (
            <div key={s.n} className={`reveal reveal-delay-${i + 1}`}>
              <div className="relative">
                <div
                  className="absolute -top-3 -left-2 z-[3] px-2.5 py-1 rounded-full text-[10.5px] uppercase tracking-[0.2em] font-medium bg-cream-200 text-ink-900 shadow-[0_8px_22px_-10px_rgba(242,215,164,0.6)]"
                >
                  {s.n} · {s.label}
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 backdrop-blur-sm">
                  <div className="mx-auto w-[180px]">
                    <Phone src={s.src} alt={s.title} />
                  </div>
                  <div className="mt-5">
                    <div className="text-[15.5px] font-semibold text-sand-50">{s.title}</div>
                    <div className="text-[13px] text-sand-100/60 mt-1.5 leading-relaxed">{s.body}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
