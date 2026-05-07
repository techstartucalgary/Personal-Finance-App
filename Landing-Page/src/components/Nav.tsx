import { useEffect, useState } from 'react';
import Logo from './Logo';
import { WAITLIST_FORM_URL } from '../constants';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      id="top"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'backdrop-blur-xl bg-ink-900/70 border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between">
        <Logo tone="dark" size={30} />

        <nav className="hidden md:flex items-center gap-8 text-[13.5px] text-sand-100/80">
          <a href="#features" className="under-link hover:text-sand-50 transition-colors">Product</a>
          <a href="#security" className="under-link hover:text-sand-50 transition-colors">Security</a>
          <a href="#pricing" className="under-link hover:text-sand-50 transition-colors">Pricing</a>
          <a href="#faq" className="under-link hover:text-sand-50 transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href={WAITLIST_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm font-medium text-ink-900 btn-cream transition-all duration-300 hover:translate-y-[-1px] shadow-[0_4px_18px_-6px_rgba(242,215,164,0.55)]"
          >
            Join waitlist
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </a>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-sand-100 border border-white/10"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {open ? <path d="M18 6L6 18M6 6l12 12"/> : <><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></>}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-ink-900/95 backdrop-blur-xl">
          <div className="px-5 py-4 flex flex-col gap-3 text-sand-100/85 text-sm">
            <a href="#features" onClick={() => setOpen(false)}>Product</a>
            <a href="#security" onClick={() => setOpen(false)}>Security</a>
            <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
            <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
          </div>
        </div>
      )}
    </header>
  );
}
