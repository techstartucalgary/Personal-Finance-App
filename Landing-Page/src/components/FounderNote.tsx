export default function FounderNote() {
  return (
    <section className="relative bg-ink-800 text-sand-100 py-28 sm:py-32 grain overflow-hidden">
      <div
        aria-hidden
        className="ring-glow"
        style={{
          width: 700,
          height: 700,
          left: '-15%',
          top: '20%',
          background: 'radial-gradient(circle, rgba(242,215,164,0.20) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 relative z-[2]">
        <div className="reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-cream-200 font-medium">
            From the team
          </div>
        </div>

        <div className="mt-10 reveal reveal-delay-1">
          <p className="display text-[28px] sm:text-[34px] lg:text-[40px] font-light leading-[1.2] text-sand-50">
            We built Sterling because the apps that were supposed to clarify our money were quietly
            making it noisier. Notifications begging for attention. Dashboards designed to keep you
            scrolling. Every screen optimised for the company, not the customer.
          </p>

          <p className="mt-7 text-[16.5px] leading-relaxed text-sand-100/70 max-w-2xl">
            We wanted something different. Software that respects your time, doesn’t treat your
            transactions as engagement metrics, and doesn’t need you to log in every day to be
            useful. Something a thoughtful friend would build.
          </p>

          <p className="mt-5 text-[16.5px] leading-relaxed text-sand-100/70 max-w-2xl">
            That’s the version of personal finance we’re trying to make: quiet, deliberate, and
            entirely on your side.
          </p>
        </div>

        {/* Signature block */}
        <div className="mt-12 flex items-center gap-4 reveal reveal-delay-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-ink-900 font-semibold display"
            style={{
              background: 'linear-gradient(135deg, #F2D7A4 0%, #E5B86F 100%)',
            }}
          >
            S
          </div>
          <div>
            <div
              className="display text-[18px] text-sand-50"
              style={{ fontStyle: 'italic' }}
            >
              The Sterling team
            </div>
            <div className="text-[12.5px] uppercase tracking-[0.18em] text-sand-100/50 font-semibold mt-0.5">
              Currently small. Quietly growing.
            </div>
          </div>
        </div>

        {/* Pillars below signature */}
        <div className="mt-14 grid sm:grid-cols-3 gap-5 reveal reveal-delay-3">
          {[
            {
              title: 'No advertising',
              body: 'Your transactions are not a product we sell.',
            },
            {
              title: 'No engagement loops',
              body: 'We don’t need you to open the app to be useful.',
            },
            {
              title: 'No surprise pricing',
              body: 'When pricing changes, we’ll tell you well in advance.',
            },
          ].map(p => (
            <div
              key={p.title}
              className="p-5 rounded-2xl bg-white/[0.04] border border-white/10"
            >
              <div className="text-[14.5px] font-semibold text-sand-50">{p.title}</div>
              <div className="mt-2 text-[13.5px] text-sand-100/60 leading-relaxed">{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
