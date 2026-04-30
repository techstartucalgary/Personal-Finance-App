import SectionDivider from './SectionDivider';

const without = [
  'A spreadsheet you stopped updating in February.',
  'Three banking apps, each telling a different story.',
  'A surprise charge you didn’t see coming.',
  'A savings goal you forgot you set.',
  'The vague feeling that money is happening to you.',
];

const withSterling = [
  'One screen. Every account. Today’s number.',
  'Recurring rules quietly handling the bills you’ve already decided about.',
  'Categories you set, totals that already account for your goals.',
  'A five-month trend that explains itself.',
  'Money that finally feels like a thing you’re doing on purpose.',
];

export default function BeforeAfter() {
  return (
    <section className="relative bg-sand-100 py-28 sm:py-32 grain-light overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-ink-900/55 font-medium">
            Before / After
          </div>
          <h2 className="display mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-light text-ink-900 leading-[1.02]">
            What money feels like
            <span className="italic font-normal"> with Sterling.</span>
          </h2>
          <p className="mt-6 text-[16.5px] leading-relaxed text-ink-900/65 max-w-2xl">
            Most people don’t need more spreadsheets. They need permission to stop tracking the same
            thing across five surfaces. Here’s the difference.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-2 gap-5 lg:gap-7">
          {/* Before */}
          <div className="relative p-7 sm:p-9 rounded-3xl bg-sand-200/40 border border-ink-900/[0.06] reveal">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ink-900/[0.06] text-ink-900/55">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M9 15l6-6"/></svg>
              </span>
              <div className="text-[12.5px] uppercase tracking-[0.18em] font-semibold text-ink-900/55">
                Without Sterling
              </div>
            </div>
            <h3 className="display mt-5 text-[26px] sm:text-[28px] font-light text-ink-900 leading-[1.15]">
              The mental tax of a money you never quite see.
            </h3>
            <ul className="mt-7 space-y-4">
              {without.map(line => (
                <li key={line} className="flex items-start gap-3 text-[15px] text-ink-900/70 leading-relaxed">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0 text-ink-900/35">
                    <path d="M9 9l6 6M9 15l6-6"/>
                  </svg>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div className="relative p-7 sm:p-9 rounded-3xl bg-ink-900 text-sand-100 reveal reveal-delay-2 overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-16 -right-16 w-72 h-72 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(124,125,245,0.32) 0%, transparent 70%)',
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream-200 text-ink-900">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
                </span>
                <div className="text-[12.5px] uppercase tracking-[0.18em] font-semibold text-cream-200">
                  With Sterling
                </div>
              </div>
              <h3 className="display mt-5 text-[26px] sm:text-[28px] font-light text-sand-50 leading-[1.15]">
                A quieter relationship with the numbers that matter.
              </h3>
              <ul className="mt-7 space-y-4">
                {withSterling.map(line => (
                  <li key={line} className="flex items-start gap-3 text-[15px] text-sand-100/80 leading-relaxed">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2D7A4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0">
                      <path d="M5 12l5 5L20 7"/>
                    </svg>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <SectionDivider className="mt-24" />
      </div>
    </section>
  );
}
