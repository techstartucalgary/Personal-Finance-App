export default function OneScreenIntro() {
  return (
    <section className="relative grain-light bg-sand-100 py-28 sm:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-ink-900/55 font-medium">
            Why Sterling
          </div>
          <h2 className="display mt-6 text-4xl sm:text-5xl lg:text-[3.6rem] font-light text-ink-900 leading-[1.02]">
            One screen for everything that
            <span className="italic font-normal"> actually matters.</span>
          </h2>
          <p className="mt-6 text-[17px] leading-relaxed text-ink-900/65 max-w-2xl">
            Most money apps overwhelm. Sterling does the opposite. It collects your accounts,
            spending, recurring bills, and savings goals into a single view that’s calm to look at
            and quick to act on.
          </p>
        </div>

        {/* Three principle pillars */}
        <div className="mt-16 grid sm:grid-cols-3 gap-px bg-ink-900/5 rounded-3xl overflow-hidden">
          {[
            {
              num: '01',
              title: 'Quiet by default',
              body:
                'No animations begging for your attention. No upsells dressed as advice. Just your numbers, beautifully typeset.',
            },
            {
              num: '02',
              title: 'Built for both halves',
              body:
                'Connect a bank in seconds with Plaid, or add accounts manually for the ones that matter only to you.',
            },
            {
              num: '03',
              title: 'Yours, end to end',
              body:
                'TLS-encrypted connections and token-based sign-in. Currency, categories and goals are entirely your call.',
            },
          ].map((p, i) => (
            <div
              key={p.num}
              className={`relative bg-sand-50 p-7 sm:p-9 reveal reveal-delay-${i + 1}`}
            >
              <div className="display text-[44px] text-cream-300 leading-none">{p.num}</div>
              <h3 className="mt-5 text-[19px] font-semibold tracking-tight text-ink-900">{p.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-900/65">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
