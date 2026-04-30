const moments = [
  {
    time: 'Sunday',
    period: '7:42 pm',
    title: 'A quiet review.',
    body:
      'You sit down with a coffee. Open Sterling. The dashboard is a single page: total balance, what’s actually available after your goals, the trend across five months.',
    accent: '#7C7DF5',
  },
  {
    time: 'Monday',
    period: '8:14 am',
    title: 'Bills, on autopilot.',
    body:
      'Your internet bill fires from a recurring rule you wrote three months ago. You don’t see it. You don’t need to. It just shows up in this week’s totals.',
    accent: '#F2D7A4',
  },
  {
    time: 'Wednesday',
    period: '12:30 pm',
    title: 'A small allocation.',
    body:
      'Lunch break. You move $50 from chequing toward your "Summer in Lisbon" goal. The available balance updates to reflect the new commitment.',
    accent: '#4ED178',
  },
  {
    time: 'Saturday',
    period: '11:08 pm',
    title: 'The first time it clicks.',
    body:
      'You haven’t opened a spreadsheet in three weeks. You know exactly where you stand. You feel, quietly, in control.',
    accent: '#B6B8F1',
  },
];

export default function DayInLife() {
  return (
    <section className="relative bg-sand-50 py-28 sm:py-32 grain-light overflow-hidden">
      <div
        aria-hidden
        className="ring-glow"
        style={{
          width: 720,
          height: 720,
          left: '50%',
          top: '0%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(124,125,245,0.10) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative">
        <div className="max-w-3xl reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-ink-900/55 font-medium">
            A week with Sterling
          </div>
          <h2 className="display mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-light text-ink-900 leading-[1.02]">
            Four small moments,
            <br />
            <span className="italic font-normal">one calmer relationship with money.</span>
          </h2>
        </div>

        <div className="mt-16 relative">
          {/* Timeline rail */}
          <div className="absolute left-[18px] sm:left-1/2 sm:-translate-x-1/2 top-2 bottom-2 w-px bg-ink-900/10" aria-hidden />

          <div className="space-y-14 sm:space-y-20">
            {moments.map((m, i) => {
              const right = i % 2 === 1;
              return (
                <div
                  key={m.title}
                  className={`relative grid sm:grid-cols-2 gap-6 sm:gap-12 items-start reveal reveal-delay-${(i % 4) + 1}`}
                >
                  {/* Timeline marker */}
                  <div
                    className="absolute left-[12px] sm:left-1/2 sm:-translate-x-1/2 top-3 w-3.5 h-3.5 rounded-full ring-4 ring-sand-50"
                    style={{ background: m.accent }}
                    aria-hidden
                  />

                  {/* Content slot */}
                  <div
                    className={`pl-10 sm:pl-0 ${right ? 'sm:col-start-2' : ''}`}
                  >
                    <div className="text-[12.5px] uppercase tracking-[0.18em] text-ink-900/55 font-semibold">
                      <span style={{ color: m.accent }}>{m.time}</span>
                      <span className="text-ink-900/30 mx-2">·</span>
                      {m.period}
                    </div>
                    <h3 className="display mt-3 text-[26px] sm:text-[30px] font-light text-ink-900 leading-[1.1]">
                      {m.title}
                    </h3>
                    <p className="mt-3 text-[15.5px] leading-relaxed text-ink-900/70 max-w-md">
                      {m.body}
                    </p>
                  </div>

                  {/* Empty slot for alternating layout */}
                  <div className={`hidden sm:block ${right ? 'sm:col-start-1 sm:row-start-1' : ''}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
