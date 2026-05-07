import { WAITLIST_FORM_URL } from '../constants';

const plans = [
  {
    name: 'Free',
    price: null,
    badge: 'Available now',
    features: [
      'Manual Accounts',
      'Budgets',
      'Goals',
      'Voice Input Transactions',
      'Set Recurring Transactions',
      'Track Subscriptions',
      'Custom Categories & Tags',
      'Widget based Metrics',
      'Personalizable Dashboard',
      'Reminders & Notifications',
    ],
    cta: 'Join waitlist',
    highlight: false,
  },
  {
    name: 'Premium',
    price: '$10.99/m',
    badge: 'In development',
    features: [
      'Bank Synced Accounts',
      'Auto-categorization & rules',
      'AI Financial Assistant',
      'AI Insights & Analysis',
      'Receipt Input',
      'CSV Input',
      'Generate Reports',
    ],
    cta: 'Join waitlist',
    highlight: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative bg-sand-100 py-28 sm:py-32 grain-light overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-ink-900/55 font-medium">
            Pricing
          </div>
          <h2 className="display mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-light text-ink-900 leading-[1.02]">
            Free today,
            <span className="italic font-normal"> Automatic tomorrow</span>
          </h2>
        </div>

        <div className="mt-14 grid lg:grid-cols-2 gap-5 lg:gap-7">
          {plans.map((p, i) => (
            <div
              key={p.name}
              className={`relative p-8 sm:p-10 rounded-3xl border reveal reveal-delay-${i + 1} ${
                p.highlight
                  ? 'bg-ink-900 text-sand-100 border-white/10'
                  : 'bg-sand-50 text-ink-900 border-ink-900/[0.06]'
              }`}
            >
              {p.highlight && (
                <div
                  aria-hidden
                  className="absolute -top-12 -right-12 w-72 h-72 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(242,215,164,0.22) 0%, transparent 70%)',
                  }}
                />
              )}
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className={`text-[12px] uppercase tracking-[0.2em] font-semibold ${p.highlight ? 'text-cream-200' : 'text-ink-900/55'}`}>
                    {p.badge}
                  </div>
                  {p.highlight && (
                    <span className="text-[10.5px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-cream-200 text-ink-900 font-semibold">
                      Preview
                    </span>
                  )}
                </div>
                <div className="mt-5 flex items-baseline gap-2">
                  <h3 className={`display text-[34px] sm:text-[40px] font-light ${p.highlight ? 'text-sand-50' : 'text-ink-900'}`}>
                    {p.name}
                  </h3>
                </div>
                {p.price && (
                  <div className={`mt-3 display text-[36px] sm:text-[44px] font-light ${p.highlight ? 'text-cream-200' : 'text-ink-900'}`}>
                    {p.price}
                  </div>
                )}

                <ul className="mt-7 space-y-3">
                  {p.features.map(f => (
                    <li
                      key={f}
                      className={`flex items-start gap-3 text-[14.5px] ${p.highlight ? 'text-sand-100/85' : 'text-ink-900/80'}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.highlight ? '#F2D7A4' : '#22B561'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0">
                        <path d="M5 12l5 5L20 7"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={WAITLIST_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-9 inline-flex items-center justify-center h-12 px-6 rounded-full text-sm font-medium transition-all hover:translate-y-[-1px] ${
                    p.highlight
                      ? 'bg-cream-200 text-ink-900 hover:bg-cream-100'
                      : 'bg-ink-900 text-sand-50 hover:bg-ink-700'
                  }`}
                >
                  {p.cta}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
