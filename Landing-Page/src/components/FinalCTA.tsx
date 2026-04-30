export default function FinalCTA() {
  return (
    <section id="download" className="relative bg-ink-900 text-sand-100 py-28 sm:py-36 grain overflow-hidden">
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
            Free to download · No advertising
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

        <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center reveal reveal-delay-3">
          <a
            href="#"
            className="inline-flex items-center justify-center gap-3 h-14 px-7 rounded-full bg-sand-50 text-ink-900 font-medium hover:bg-cream-100 shadow-[0_8px_30px_-8px_rgba(242,215,164,0.55)] transition-all hover:translate-y-[-1px]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 13.6c-.04-3.05 2.49-4.51 2.6-4.58-1.42-2.07-3.62-2.36-4.4-2.4-1.87-.19-3.65 1.1-4.6 1.1-.94 0-2.41-1.07-3.96-1.04-2.04.03-3.92 1.18-4.97 3-2.12 3.67-.54 9.1 1.52 12.07 1.01 1.46 2.21 3.1 3.79 3.04 1.52-.06 2.1-.99 3.94-.99 1.84 0 2.36.99 3.97.95 1.64-.03 2.68-1.49 3.68-2.96 1.16-1.69 1.64-3.34 1.66-3.42-.04-.02-3.18-1.21-3.21-4.81zM14.55 4.34c.83-1.01 1.39-2.4 1.24-3.78-1.2.05-2.65.8-3.51 1.8-.78.9-1.46 2.32-1.28 3.68 1.34.1 2.71-.68 3.55-1.7z"/></svg>
            <span className="text-left leading-tight">
              <span className="block text-[10.5px] uppercase tracking-[0.18em] text-ink-900/55">Download on</span>
              <span className="block text-[16px] font-semibold">App Store</span>
            </span>
          </a>
          <a
            href="#"
            className="inline-flex items-center justify-center gap-3 h-14 px-7 rounded-full bg-white/5 border border-white/15 text-sand-50 hover:bg-white/10 transition-all"
          >
            <svg width="18" height="20" viewBox="0 0 24 24" aria-hidden>
              <defs>
                <linearGradient id="gp2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C7DF5"/><stop offset="1" stopColor="#3D3DC9"/>
                </linearGradient>
              </defs>
              <path d="M3 2.5v19l11-9.5L3 2.5z" fill="url(#gp2)"/>
              <path d="M3 2.5l11 9.5 4-3.5L3 2.5z" fill="#F2D7A4"/>
              <path d="M3 21.5l11-9.5 4 3.5L3 21.5z" fill="#D86666"/>
              <path d="M14 12l4-3.5v7L14 12z" fill="#E5B86F"/>
            </svg>
            <span className="text-left leading-tight">
              <span className="block text-[10.5px] uppercase tracking-[0.18em] text-sand-100/55">Get it on</span>
              <span className="block text-[16px] font-semibold">Google Play</span>
            </span>
          </a>
        </div>

        <div className="mt-10 text-[13px] text-sand-100/45 reveal reveal-delay-4">
          iOS &nbsp;·&nbsp; Android &nbsp;·&nbsp; CAD &amp; USD &nbsp;·&nbsp; English
        </div>
      </div>
    </section>
  );
}
