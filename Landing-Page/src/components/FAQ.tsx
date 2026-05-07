import { ReactNode, useState } from 'react';

type FAQItem = { q: string; a: ReactNode };

const faqs: FAQItem[] = [
  {
    q: 'Is Sterling free?',
    a: 'Sterling is free today. Premium automation features are in development, and pricing will be clear before they launch.',
  },
  {
    q: 'Which banks does Sterling support?',
    a: 'Sterling connects to over 10,000 financial institutions across North America via Plaid, including all major banks and most credit unions. You can always add manual accounts for anything not on the list.',
  },
  {
    q: 'How is my financial data secured?',
    a: 'All connections to Sterling use TLS encryption. Your bank credentials never touch our servers. Plaid handles the secure handshake during account linking. You can sign in with email and password or with your Google account.',
  },
  {
    q: 'Will Sterling sell my data?',
    a: (
      <>
        Never. Our{' '}
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="under-link text-peri-600 font-medium"
        >
          Privacy Policy
        </a>{' '}
        makes that explicit. We have no advertising network, no broker relationships, and no quiet
        data partnerships. Your money trail belongs to you.
      </>
    ),
  },
  {
    q: 'Can I export or delete my data?',
    a: (
      <>
        Yes. You can export your data and request deletion at any time. Email{' '}
        <a
          href="mailto:sterling.privacy@gmail.com"
          className="under-link text-peri-600 font-medium"
        >
          sterling.privacy@gmail.com
        </a>{' '}
        and we will respond promptly.
      </>
    ),
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative bg-sand-100 py-28 sm:py-32 grain-light">
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl reveal">
          <div className="tick-divider text-[12.5px] tracking-[0.22em] uppercase text-ink-900/55 font-medium">
            Questions
          </div>
          <h2 className="display mt-6 text-4xl sm:text-5xl font-light text-ink-900 leading-[1.02]">
            What people ask us
            <span className="italic font-normal"> first.</span>
          </h2>
        </div>

        <div className="mt-12 divide-y divide-ink-900/10 border-y border-ink-900/10">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="reveal">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-start justify-between gap-6 py-6 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-[17.5px] sm:text-[19px] font-medium text-ink-900 tracking-tight">
                    {f.q}
                  </span>
                  <span
                    className={`mt-1 shrink-0 w-8 h-8 rounded-full bg-ink-900/5 flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-45 bg-ink-900 text-sand-50' : 'text-ink-900'}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-[max-height,opacity] duration-500 ease-out"
                  style={{ maxHeight: isOpen ? 280 : 0, opacity: isOpen ? 1 : 0 }}
                >
                  <p className="pb-6 pr-12 text-[15.5px] leading-relaxed text-ink-900/70">{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
