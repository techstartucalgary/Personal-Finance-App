import WaitlistForm from './WaitlistForm';

export default function FinalCTA() {
  return (
    <section id="waitlist" className="relative bg-ink-900 text-sand-100 py-28 sm:py-36 grain overflow-hidden">
      <div
        aria-hidden
        className="ring-glow animate-breathe"
        style={{
          width: 800,
          height: 800,
          left: '50%',
          top: '20%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(124,125,245,0.32) 0%, transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="ring-glow animate-breathe"
        style={{
          width: 600,
          height: 600,
          right: '5%',
          top: '0%',
          background: 'radial-gradient(circle, rgba(242,215,164,0.28) 0%, transparent 60%)',
          animationDelay: '1.2s',
        }}
      />

      <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center relative z-[2]">
        <div className="reveal">
          <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-white/5 border border-white/10 text-[12px] tracking-[0.16em] uppercase text-sand-100/85">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-leaf-400 animate-breathe" />
            Waitlist open · No advertising
          </div>
        </div>

        <h2 className="display mt-7 text-5xl sm:text-6xl lg:text-[5rem] font-light leading-[0.98] reveal reveal-delay-1">
          Take control
          <br />
          of your money
          <br />
          <span
            className="italic font-normal"
            style={{
              background: 'linear-gradient(110deg, #F2D7A4 0%, #E5B86F 35%, #B6B8F1 70%, #F8E9C9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 100%',
              animation: 'shimmer 9s linear infinite',
            }}
          >
            today.
          </span>
        </h2>

        <p className="mt-7 text-[17px] text-sand-100/70 max-w-xl mx-auto reveal reveal-delay-2">
          Four small questions. One quiet view of everything. Sterling: finally, money software that
          gets out of your way.
        </p>

        <div className="mx-auto mt-10 max-w-xl reveal reveal-delay-3">
          <WaitlistForm tone="dark" />
        </div>

        <div className="mt-10 text-[13px] text-sand-100/45 reveal reveal-delay-4">
          iOS &nbsp;·&nbsp; Android &nbsp;·&nbsp; English
        </div>
      </div>
    </section>
  );
}
