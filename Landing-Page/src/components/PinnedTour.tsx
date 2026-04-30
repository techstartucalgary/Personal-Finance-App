import { useEffect, useRef, useState } from 'react';
import Phone from './Phone';

const stages = [
  {
    eyebrow: '01 · Dashboard',
    title: 'Net worth, in one calm view.',
    body:
      'Total balance across every account, what’s available after your goals, plus a five-month trend. The story your money tells, told properly.',
    src: '/screens/dashboard.png',
    accent: '#7C7DF5',
    bullets: ['Total + available balance', 'Multi-account trend', 'Recent activity merged'],
  },
  {
    eyebrow: '02 · Accounts',
    title: 'Linked banks, manual cash, all one list.',
    body:
      'Plaid handles the secure handshake to over ten thousand institutions. For anything that doesn’t plug in, like cash or joint pots, you add accounts by hand.',
    src: '/screens/accounts-overview.png',
    accent: '#F2D7A4',
    bullets: ['Chequing · Credit · Savings · Loan', 'CAD and USD, side by side', 'Color-coded balances'],
  },
  {
    eyebrow: '03 · Transactions',
    title: 'Bills you’ve set, paid by themselves.',
    body:
      'Recurring rules fire on schedule, daily, weekly, monthly, or yearly. Edit a single occurrence or every future one without breaking history.',
    src: '/screens/transactions.png',
    accent: '#B6B8F1',
    bullets: ['Manual and linked, merged', 'Daily through yearly recurring', 'Search, filter, drill in'],
  },
  {
    eyebrow: '04 · Targets',
    title: 'Goals you can actually keep.',
    body:
      'Allocate a portion of an account to a savings goal. Sterling subtracts it from “available.” Pair with category budgets at any cadence.',
    src: '/screens/budgets-overview.png',
    accent: '#4ED178',
    bullets: ['Goal-linked accounts', 'Weekly through yearly budgets', 'Progress at a glance'],
  },
];

export default function PinnedTour() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const scrolled = -rect.top;
        const p = Math.max(0, Math.min(1, scrolled / total));
        setProgress(p);
        const idx = Math.min(stages.length - 1, Math.floor(p * stages.length));
        setActive(idx);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={wrapperRef}
      id="features"
      className="relative bg-ink-800 text-sand-100 grain"
      style={{ height: `${stages.length * 100}vh` }}
    >
      {/* Sticky inner viewport */}
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        {/* Ambient glows that morph by stage */}
        <div
          aria-hidden
          className="absolute -left-[15%] top-[10%] w-[640px] h-[640px] rounded-full pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(circle, ${stages[active].accent}55 0%, transparent 60%)`,
            filter: 'blur(80px)',
          }}
        />
        <div
          aria-hidden
          className="absolute right-[-10%] bottom-[5%] w-[520px] h-[520px] rounded-full pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(circle, ${stages[active].accent}30 0%, transparent 60%)`,
            filter: 'blur(70px)',
          }}
        />

        <div className="relative z-[2] w-full max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Side text */}
          <div className="lg:col-span-6 order-2 lg:order-1 relative h-[440px] lg:h-[440px]">
            {stages.map((s, i) => {
              const isActive = i === active;
              return (
                <div
                  key={s.title}
                  className="absolute inset-0 transition-all duration-500 ease-out"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'translateY(0)' : 'translateY(16px)',
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                >
                  <div
                    className="text-[12.5px] uppercase tracking-[0.22em] font-semibold"
                    style={{ color: s.accent }}
                  >
                    {s.eyebrow}
                  </div>
                  <h3 className="display mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-light leading-[1.02] text-sand-50">
                    {s.title}
                  </h3>
                  <p className="mt-5 text-[16.5px] leading-relaxed text-sand-100/70 max-w-lg">
                    {s.body}
                  </p>
                  <ul className="mt-7 space-y-2.5 max-w-md">
                    {s.bullets.map(b => (
                      <li key={b} className="flex items-start gap-3 text-[14.5px] text-sand-100/80">
                        <span
                          aria-hidden
                          className="mt-[7px] w-1.5 h-1.5 rounded-full"
                          style={{ background: s.accent }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Phone with cross-fading screens */}
          <div className="lg:col-span-6 order-1 lg:order-2 relative">
            <div className="relative mx-auto w-[270px] sm:w-[310px] lg:w-[340px]">
              <div className="spotlight" />
              {stages.map((s, i) => (
                <div
                  key={s.src}
                  className="absolute inset-0 transition-opacity duration-700 ease-out"
                  style={{
                    opacity: i === active ? 1 : 0,
                    pointerEvents: i === active ? 'auto' : 'none',
                  }}
                >
                  <Phone src={s.src} alt={s.title} />
                </div>
              ))}
              {/* Static phone to maintain layout/aspect ratio */}
              <div style={{ visibility: 'hidden' }}>
                <Phone src={stages[0].src} alt="" />
              </div>
            </div>

            {/* Stage progress dots */}
            <div className="mt-9 flex items-center justify-center gap-2">
              {stages.map((s, i) => (
                <span
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === active ? 36 : 14,
                    background: i === active ? s.accent : 'rgba(244,239,232,0.18)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Tour scroll progress (right rail) */}
        <div className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2 h-48 w-[2px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 w-full rounded-full transition-[height] duration-150 ease-out"
            style={{
              height: `${Math.round(progress * 100)}%`,
              background: 'linear-gradient(180deg, #F2D7A4, #7C7DF5)',
            }}
          />
        </div>
      </div>
    </section>
  );
}
