const voices = [
  {
    archetype: 'For paying down debt',
    quote:
      '"The first thing I needed was to see all the numbers in one place. Sterling gave me that, and the urge to keep checking three different banking apps just… went away."',
    accent: '#7C7DF5',
  },
  {
    archetype: 'For saving for something big',
    quote:
      '"I set a goal, linked it to my chequing, and watched the available balance shrink to what I’d actually told myself I could spend. It’s a small mental trick that saved me from myself."',
    accent: '#F2D7A4',
  },
  {
    archetype: 'For building net worth',
    quote:
      '"The five-month trend chart is what got me. For the first time I could look at my net worth as a curve, not a number. It changed how I thought about saving."',
    accent: '#4ED178',
  },
  {
    archetype: 'For controlling spending',
    quote:
      '"Recurring rules turned out to be the killer feature. Once my bills were on autopilot, the only transactions I had to think about were the ones I’d actually decided to make."',
    accent: '#B6B8F1',
  },
  {
    archetype: 'For investing for the future',
    quote:
      '"I use Sterling alongside my brokerage. It’s the dashboard I open first every Sunday. The one place that tells me whether I’m actually saving enough to invest later."',
    accent: '#E5B86F',
  },
];

export default function Voices() {
  return (
    <section className="relative bg-sand-100 py-28 sm:py-32 grain-light overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-ink-900/55 font-medium">
            How Sterling shows up
          </div>
          <h2 className="display mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-light text-ink-900 leading-[1.02]">
            Five different goals.
            <br />
            <span className="italic font-normal">One quiet way to chase them.</span>
          </h2>
          <p className="mt-6 text-[15.5px] leading-relaxed text-ink-900/55 max-w-xl italic">
            Voices below describe how Sterling is designed to feel for each of the five primary
            goals you can set during onboarding.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5 lg:gap-6">
          {voices.map((v, i) => {
            // 5-card layout: row 1 has cards 0/1/2, row 2 centers cards 3/4 (lg only)
            const lgPlacement =
              i === 3 ? 'lg:col-start-2 lg:col-span-2' :
              i === 4 ? 'lg:col-span-2' :
              'lg:col-span-2';
            return (
              <figure
                key={v.archetype}
                className={`relative p-7 rounded-2xl bg-sand-50 border border-ink-900/[0.05] reveal reveal-delay-${(i % 4) + 1} ${lgPlacement}`}
              >
                <div
                  className="absolute top-0 left-7 right-7 h-[3px] rounded-b-full"
                  style={{ background: v.accent }}
                  aria-hidden
                />
                <svg width="22" height="22" viewBox="0 0 24 24" fill={v.accent} aria-hidden>
                  <path d="M9 7H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v-2a2 2 0 0 1 2-2V7zm10 0h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v-2a2 2 0 0 1 2-2V7z"/>
                </svg>
                <blockquote className="mt-4 text-[15.5px] leading-relaxed text-ink-900/85">
                  {v.quote}
                </blockquote>
                <figcaption className="mt-5 text-[12px] uppercase tracking-[0.18em] text-ink-900/50 font-semibold">
                  {v.archetype}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
