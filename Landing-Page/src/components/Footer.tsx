import Logo from './Logo';

export default function Footer() {
  const cols = [
    {
      heading: 'Product',
      links: [
        { label: 'Dashboard', href: '#features' },
        { label: 'Accounts', href: '#features' },
        { label: 'Transactions', href: '#features' },
        { label: 'Targets', href: '#features' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'How it works', href: '#onboarding' },
        { label: 'Security', href: '#security' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'FAQ', href: '#faq' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Help Center', href: '#' },
        { label: 'Contact', href: 'mailto:sterling.privacy@gmail.com' },
        { label: 'Status', href: '#' },
        { label: 'Disclosures', href: '#' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy.html' },
        { label: 'Terms of Service', href: '#' },
        { label: 'Cookie Policy', href: '#' },
        { label: 'Responsible Disclosure', href: '#' },
      ],
    },
  ];

  return (
    <footer className="relative bg-ink-900 text-sand-100/80 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <Logo tone="dark" size={36} />
            <p className="mt-5 text-[14.5px] leading-relaxed text-sand-100/55 max-w-sm">
              Sterling is a personal finance application that helps you track income,
              expenses and savings goals. Quietly, clearly, in one place.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {['twitter', 'instagram', 'linkedin'].map(s => (
                <a
                  key={s}
                  href="#"
                  aria-label={s}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 inline-flex items-center justify-center hover:bg-white/10 transition-colors text-sand-100/70"
                >
                  {s === 'twitter' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l-6 7 7 9h-4l-5-6.5L4 20H1l7-8L1 4h4l4.5 6L15 4z"/></svg>
                  )}
                  {s === 'instagram' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/></svg>
                  )}
                  {s === 'linkedin' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5C0 2.12 1.12 1 2.5 1S4.98 2.12 4.98 3.5zM.22 8h4.56V24H.22V8zm7.5 0h4.37v2.18h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 7v9.18h-4.55v-8.13c0-1.94-.04-4.43-2.7-4.43-2.7 0-3.12 2.11-3.12 4.29V24H7.72V8z"/></svg>
                  )}
                </a>
              ))}
            </div>
          </div>

          {cols.map(c => (
            <div key={c.heading} className="lg:col-span-2">
              <div className="text-[11.5px] uppercase tracking-[0.2em] text-cream-200/80 font-semibold">{c.heading}</div>
              <ul className="mt-5 space-y-3">
                {c.links.map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="text-[14px] text-sand-100/70 hover:text-sand-50 transition-colors under-link">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Regulatory disclosure */}
        <div className="mt-14 pt-8 border-t border-white/5">
          <p className="text-[12px] leading-relaxed text-sand-100/45 max-w-4xl">
            Sterling is a personal finance management application. Sterling is not a bank, lender, broker-dealer
            or registered investment advisor, and we do not hold, move or invest your money. Account aggregation
            services are provided by Plaid Inc. Information shown in the application is for informational and
            educational purposes only and does not constitute financial, tax, legal or investment advice.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-[12.5px] text-sand-100/50">
            © {new Date().getFullYear()} Sterling. All rights reserved.
          </div>
          <div className="flex items-center gap-5 text-[12px] text-sand-100/50">
            <span className="inline-flex items-center gap-2">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              TLS-encrypted
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>
              CAD &amp; USD supported
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
