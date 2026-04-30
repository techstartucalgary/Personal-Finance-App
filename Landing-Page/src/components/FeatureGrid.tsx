type Feature = {
  title: string;
  body: string;
  Icon: () => JSX.Element;
};

const features: Feature[] = [
  {
    title: 'Multi-currency, native',
    body: 'Hold accounts in CAD or USD without juggling apps. Pick your default at signup and adjust anytime.',
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>
    ),
  },
  {
    title: 'Recurring rules, flexible',
    body: 'Daily, weekly, monthly, yearly. Set optional end dates and edit either a single occurrence or every future one.',
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 4v4h-4"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 20v-4h4"/></svg>
    ),
  },
  {
    title: 'Goal-linked accounts',
    body: 'Set aside money for goals without moving it. Sterling subtracts allocations from "available."',
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
    ),
  },
  {
    title: 'Spending insights',
    body: 'A five-month balance trend, multi-account, side-by-side. No interpretation needed.',
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-7"/></svg>
    ),
  },
  {
    title: 'Plaid-secured bank linking',
    body: 'Your bank credentials never reach our servers. Plaid handles the secure handshake. All app traffic moves over TLS.',
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
    ),
  },
  {
    title: 'Notifications, on your terms',
    body: 'Twelve toggles across spending, budgets, goals and credit. Stay informed; never overwhelmed.',
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
    ),
  },
];

export default function FeatureGrid() {
  return (
    <section className="relative bg-sand-100 py-28 sm:py-32 grain-light">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-ink-900/55 font-medium">
            Built for the way you spend
          </div>
          <h2 className="display mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-light text-ink-900 leading-[1.02]">
            Small details.
            <span className="italic font-normal"> Big peace of mind.</span>
          </h2>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-900/[0.08] rounded-3xl overflow-hidden">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group relative bg-sand-50 p-7 sm:p-8 transition-colors duration-300 hover:bg-white reveal reveal-delay-${(i % 4) + 1}`}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-ink-900 transition-transform duration-300 group-hover:rotate-[-4deg]"
                style={{ background: i % 2 === 0 ? '#F2D7A4' : '#D8D9F8' }}
              >
                <f.Icon />
              </div>
              <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-ink-900">{f.title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-900/65">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
