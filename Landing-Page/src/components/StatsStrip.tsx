import AnimatedNumber from './AnimatedNumber';
import SectionDivider from './SectionDivider';

const stats = [
  {
    value: 10000,
    suffix: '+',
    label: 'Banks via Plaid',
    sub: 'Across North America',
  },
  {
    value: 5,
    label: 'Recurring frequencies',
    sub: 'Daily · Weekly · Monthly · Yearly',
  },
  {
    value: 5,
    label: 'Budget periods',
    sub: 'Weekly through yearly',
  },
  {
    value: 12,
    label: 'Notification controls',
    sub: 'Spending · Budgets · Goals',
  },
];

export default function StatsStrip() {
  return (
    <section className="relative bg-sand-50 py-24 sm:py-28 grain-light">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-ink-900/55 font-medium">
            Built deep
          </div>
          <h2 className="display mt-5 text-3xl sm:text-4xl lg:text-[2.6rem] font-light text-ink-900 leading-[1.05] max-w-2xl">
            Personal finance is full of edge cases.
            <span className="italic font-normal"> Sterling handled them.</span>
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink-900/[0.08] rounded-3xl overflow-hidden">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`bg-sand-50 p-7 sm:p-9 reveal reveal-delay-${i + 1}`}
            >
              <div className="display text-[44px] sm:text-[56px] font-light text-ink-900 leading-none">
                <AnimatedNumber value={s.value} suffix={s.suffix ?? ''} duration={1600} />
              </div>
              <div className="mt-4 text-[14.5px] font-semibold tracking-tight text-ink-900">
                {s.label}
              </div>
              <div className="mt-1 text-[12.5px] text-ink-900/55">{s.sub}</div>
            </div>
          ))}
        </div>

        <SectionDivider className="mt-20" />
      </div>
    </section>
  );
}
