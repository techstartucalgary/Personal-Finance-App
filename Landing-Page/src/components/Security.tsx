export default function Security() {
  const pillars = [
    {
      title: 'Encrypted connections',
      body: 'Every request between Sterling and our servers travels over modern TLS. Your network can\'t read what you\'re looking at, and neither can anyone else along the way.',
      Icon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
      ),
    },
    {
      title: 'We never sell your data',
      body: 'No advertising network, no broker pipeline, no quiet "partners." Your money is yours, and so is the trail it leaves behind.',
      Icon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg>
      ),
    },
    {
      title: 'You stay in control',
      body: 'Adjust notifications, currencies, categories or consent anytime. Export or delete your data when you ask us to.',
      Icon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
      ),
    },
  ];

  return (
    <section id="security" className="relative bg-sand-50 py-28 sm:py-32 grain-light overflow-hidden">
      <div
        aria-hidden
        className="ring-glow"
        style={{
          width: 480,
          height: 480,
          left: '50%',
          top: '0%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(124,125,245,0.18) 0%, transparent 60%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative">
        <div className="max-w-3xl reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-ink-900/55 font-medium">
            Security &amp; privacy
          </div>
          <h2 className="display mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-light text-ink-900 leading-[1.02]">
            Your money. Your data.
            <br />
            <span className="italic font-normal">Always.</span>
          </h2>
        </div>

        {/* Pull quote */}
        <div className="mt-14 max-w-4xl reveal reveal-delay-1">
          <div className="relative p-8 sm:p-10 rounded-3xl bg-ink-900 text-sand-100 overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-12 -right-12 w-72 h-72 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(242,215,164,0.18) 0%, transparent 70%)' }}
            />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#F2D7A4" aria-hidden>
              <path d="M9 7H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v-2a2 2 0 0 1 2-2V7zm10 0h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v-2a2 2 0 0 1 2-2V7z"/>
            </svg>
            <p className="display text-[24px] sm:text-[30px] font-light leading-[1.25] mt-5 text-sand-50 max-w-3xl">
              We process information only when we have a valid legal reason, and we never sell it.
              Sterling is built so the only person who profits from your money is you.
            </p>
            <div className="mt-5 flex items-center justify-end max-w-3xl">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#F2D7A4" aria-hidden style={{ transform: 'rotate(180deg)' }}>
                <path d="M9 7H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v-2a2 2 0 0 1 2-2V7zm10 0h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2v-2a2 2 0 0 1 2-2V7z"/>
              </svg>
            </div>
            <div className="mt-5 text-[12.5px] uppercase tracking-[0.2em] text-cream-200/80">
              Sterling Privacy Commitment
            </div>
          </div>
        </div>

        {/* Three pillars */}
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className={`p-7 rounded-2xl bg-white border border-ink-900/5 reveal reveal-delay-${i + 1}`}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-ink-900"
                style={{ background: '#F4EFE8' }}
              >
                <p.Icon />
              </div>
              <h3 className="mt-5 text-[17.5px] font-semibold text-ink-900 tracking-tight">{p.title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-900/65">{p.body}</p>
            </div>
          ))}
        </div>

        {/* Compliance & subprocessors */}
        <div className="mt-12 p-7 rounded-2xl bg-white/60 backdrop-blur border border-ink-900/5 reveal">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-[11.5px] uppercase tracking-[0.18em] text-ink-900/50 font-semibold">Bank linking</div>
              <div className="mt-2 text-[14.5px] text-ink-900/80">
                Powered by <span className="font-semibold">Plaid</span>. We never store your bank credentials.
              </div>
            </div>
            <div>
              <div className="text-[11.5px] uppercase tracking-[0.18em] text-ink-900/50 font-semibold">Authentication</div>
              <div className="mt-2 text-[14.5px] text-ink-900/80">
                Email and Google Sign-In via secure tokens.
              </div>
            </div>
            <div>
              <div className="text-[11.5px] uppercase tracking-[0.18em] text-ink-900/50 font-semibold">Your rights</div>
              <div className="mt-2 text-[14.5px] text-ink-900/80">
                Access, export and delete your data anytime. <a href="mailto:sterling.privacy@gmail.com" className="under-link text-peri-600 font-medium">sterling.privacy@gmail.com</a>
              </div>
            </div>
          </div>
        </div>

        {/* Trust row, verifiable claims only */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11.5px] uppercase tracking-[0.18em] text-ink-900/55 font-medium reveal">
          <span className="inline-flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            TLS-encrypted connections
          </span>
          <span aria-hidden className="w-1 h-1 rounded-full bg-ink-900/20"/>
          <span>Bank linking via Plaid</span>
          <span aria-hidden className="w-1 h-1 rounded-full bg-ink-900/20"/>
          <span>Token-based authentication</span>
        </div>

        {/* What we don't do */}
        <div className="mt-16 reveal">
          <div className="text-[12.5px] uppercase tracking-[0.22em] text-ink-900/55 font-medium tick-divider">
            And, just as importantly: what we don’t do
          </div>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'We don’t hold your money',
                body: 'Sterling isn’t a bank. Your money stays at your bank, where it belongs.',
              },
              {
                title: 'We don’t move your money',
                body: 'No transfers, no payments, no investments. Sterling is read-only.',
              },
              {
                title: 'We don’t sell your data',
                body: 'No advertising network, no broker pipeline, no quiet "partners."',
              },
              {
                title: 'We don’t store credentials',
                body: 'Bank logins go through Plaid. Your username and password never touch us.',
              },
            ].map((p) => (
              <div
                key={p.title}
                className="p-5 rounded-2xl bg-white/60 border border-ink-900/[0.06]"
              >
                <div className="flex items-center gap-2.5 text-[14px] font-semibold text-ink-900">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9B3838" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M5 5l14 14"/>
                  </svg>
                  {p.title}
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-900/65">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
