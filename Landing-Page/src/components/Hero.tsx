import { useEffect, useState } from 'react';
import Phone from './Phone';
import AnimatedNumber from './AnimatedNumber';
import CursorGlow from './CursorGlow';

export default function Hero() {
  const [phoneTilt, setPhoneTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onScroll = () => {
      const y = Math.min(60, window.scrollY * 0.06);
      setPhoneTilt({ x: 0, y });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section
      id="top"
      className="relative overflow-hidden grain bg-ink-800 text-sand-100 pt-32 sm:pt-36 pb-20 sm:pb-28"
    >
      <CursorGlow color="rgba(124,125,245,0.32)" size={620} />

      {/* Ambient gradient orbs */}
      <div
        aria-hidden
        className="ring-glow animate-breathe"
        style={{
          width: 720,
          height: 720,
          left: '-15%',
          top: '5%',
          background: 'radial-gradient(circle, rgba(124,125,245,0.55) 0%, transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="ring-glow animate-breathe"
        style={{
          width: 560,
          height: 560,
          right: '-10%',
          top: '30%',
          background: 'radial-gradient(circle, rgba(242,215,164,0.42) 0%, transparent 60%)',
          animationDelay: '1.4s',
        }}
      />
      <div
        aria-hidden
        className="ring-glow"
        style={{
          width: 380,
          height: 380,
          left: '40%',
          bottom: '-10%',
          background: 'radial-gradient(circle, rgba(94,96,232,0.35) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-[2] max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <div className="lg:col-span-7">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-white/5 border border-white/10 text-[12.5px] tracking-wider uppercase text-sand-100/85"
               style={{ animation: 'fadeUp 700ms cubic-bezier(.22,1,.36,1) forwards' }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cream-200 animate-breathe" />
            Available on iOS &amp; Android
          </div>

          <h1
            className="display mt-6 text-5xl sm:text-6xl lg:text-[5.4rem] font-light text-sand-50"
            style={{
              animation: 'fadeUp 900ms cubic-bezier(.22,1,.36,1) 200ms backwards',
            }}
          >
            See every dollar,
            <br />
            <span
              className="italic font-normal"
              style={{
                background: 'linear-gradient(110deg, #F2D7A4 0%, #E5B86F 35%, #F8E9C9 60%, #B6B8F1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% 100%',
                animation: 'shimmer 9s linear infinite, fadeUp 900ms cubic-bezier(.22,1,.36,1) 400ms backwards',
              }}
            >
              clearly.
            </span>
          </h1>

          <p
            className="mt-6 max-w-xl text-[17px] sm:text-[18px] leading-relaxed text-sand-100/75"
            style={{
              animation: 'fadeUp 800ms cubic-bezier(.22,1,.36,1) 600ms backwards',
            }}
          >
            Sterling brings every account, transaction, budget and goal into one quiet, focused space.
            No clutter. No noise. Just your money, finally legible.
          </p>

          {/* CTA buttons */}
          <div
            className="mt-9 flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-lg"
            style={{
              animation: 'fadeUp 800ms cubic-bezier(.22,1,.36,1) 800ms backwards',
            }}
          >
            <a
              href="#download"
              className="group inline-flex items-center justify-center gap-3 h-14 px-6 rounded-full bg-sand-50 text-ink-900 font-medium transition-all duration-300 hover:bg-cream-100 shadow-[0_8px_30px_-8px_rgba(242,215,164,0.45)] hover:translate-y-[-1px]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.6 13.6c-.04-3.05 2.49-4.51 2.6-4.58-1.42-2.07-3.62-2.36-4.4-2.4-1.87-.19-3.65 1.1-4.6 1.1-.94 0-2.41-1.07-3.96-1.04-2.04.03-3.92 1.18-4.97 3-2.12 3.67-.54 9.1 1.52 12.07 1.01 1.46 2.21 3.1 3.79 3.04 1.52-.06 2.1-.99 3.94-.99 1.84 0 2.36.99 3.97.95 1.64-.03 2.68-1.49 3.68-2.96 1.16-1.69 1.64-3.34 1.66-3.42-.04-.02-3.18-1.21-3.21-4.81zM14.55 4.34c.83-1.01 1.39-2.4 1.24-3.78-1.2.05-2.65.8-3.51 1.8-.78.9-1.46 2.32-1.28 3.68 1.34.1 2.71-.68 3.55-1.7z"/>
              </svg>
              <span className="text-left leading-tight">
                <span className="block text-[10.5px] uppercase tracking-[0.18em] text-ink-900/55">Download on</span>
                <span className="block text-[16px] font-semibold">App Store</span>
              </span>
            </a>
            <a
              href="#download"
              className="group inline-flex items-center justify-center gap-3 h-14 px-6 rounded-full bg-white/5 border border-white/15 text-sand-50 font-medium hover:bg-white/10 transition-all duration-300"
            >
              <svg width="18" height="20" viewBox="0 0 24 24" aria-hidden>
                <defs>
                  <linearGradient id="gp1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#7C7DF5"/><stop offset="1" stopColor="#3D3DC9"/>
                  </linearGradient>
                </defs>
                <path d="M3 2.5v19l11-9.5L3 2.5z" fill="url(#gp1)"/>
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

          {/* trust signals */}
          <div
            className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12.5px] text-sand-100/55"
            style={{
              animation: 'fadeUp 800ms cubic-bezier(.22,1,.36,1) 1000ms backwards',
            }}
          >
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              TLS-encrypted by default
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>
              Bank linking via Plaid
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M5 8l7-7 7 7"/></svg>
              CAD &amp; USD, side by side
            </span>
          </div>
        </div>

        {/* Phone mockup */}
        <div className="lg:col-span-5 relative">
          <div
            className="relative mx-auto w-[260px] sm:w-[300px] lg:w-[330px]"
            style={{
              transform: `translateY(${phoneTilt.y}px)`,
              transition: 'transform 200ms ease-out',
              willChange: 'transform',
            }}
          >
            <div className="spotlight" />
            <div
              className="animate-float"
              style={{
                animation: 'float 7s ease-in-out infinite, fadeUp 1000ms cubic-bezier(.22,1,.36,1) 400ms backwards',
              }}
            >
              <Phone src="/screens/dashboard-activity.png" alt="Sterling dashboard showing recent activity across linked accounts" rotate={2} />
            </div>

            {/* Floating net-worth card with animated counter */}
            <div
              className="absolute -left-12 sm:-left-20 bottom-12 w-[180px] rounded-2xl bg-white/95 backdrop-blur-md p-3.5 shadow-[0_18px_40px_-10px_rgba(14,9,5,0.45)] animate-float-slow text-ink-900"
              style={{ animationDelay: '1s' }}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-900/50">Net worth</div>
              <div className="display text-[26px] font-semibold mt-1">
                <AnimatedNumber value={29518.63} prefix="$" decimals={2} duration={1800} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-leaf-500">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l5-5 4 4 5-7"/><path d="M14 9h7v7"/></svg>
                <span className="font-medium">+4.8% this month</span>
              </div>
            </div>

            {/* Floating goal card */}
            <div
              className="absolute -right-8 sm:-right-12 top-16 w-[170px] rounded-2xl bg-ink-900/85 border border-white/10 backdrop-blur-md p-3.5 shadow-[0_18px_40px_-10px_rgba(124,125,245,0.4)] animate-float text-sand-100"
              style={{ animationDelay: '0.5s' }}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-sand-100/50">Summer in Lisbon</div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="display text-[20px] font-medium">
                  <AnimatedNumber value={1650} prefix="$" duration={1800} />
                </span>
                <span className="text-[11px] text-sand-100/55">/ $4,500</span>
              </div>
              <div className="mt-2.5 h-[5px] rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: '37%', background: 'linear-gradient(90deg, #4ED178, #22B561)' }} />
              </div>
              <div className="mt-1.5 text-[10.5px] text-sand-100/55">37% to goal</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
