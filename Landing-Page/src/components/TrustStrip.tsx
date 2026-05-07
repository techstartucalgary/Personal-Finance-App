export default function TrustStrip() {
  const items = [
    'Plaid · 10,000+ institutions',
    'TLS-encrypted connections',
    'Manual + linked accounts',
    'Recurring rules',
    'Goal allocations',
    'No data selling, ever',
    'Built for iOS & Android',
    'Multi-account budgets',
  ];
  // duplicate for seamless marquee
  const loop = [...items, ...items];

  return (
    <section className="relative bg-ink-900 text-sand-100/65 py-6 border-y border-white/5 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, #0E0905, transparent)' }}
      />
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(-90deg, #0E0905, transparent)' }}
      />
      <div className="overflow-hidden whitespace-nowrap">
        <div className="marquee-track">
          {loop.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 mx-7 text-[12.5px] tracking-[0.16em] uppercase">
              <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden><circle cx="3" cy="3" r="3" fill="#F2D7A4"/></svg>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
