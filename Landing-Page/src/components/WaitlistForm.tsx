import { FormEvent, useId } from 'react';
import { WAITLIST_EMAIL_ENTRY, WAITLIST_FORM_URL } from '../constants';

type WaitlistFormProps = {
  tone?: 'dark' | 'light';
  className?: string;
};

export default function WaitlistForm({ tone = 'dark', className = '' }: WaitlistFormProps) {
  const isDark = tone === 'dark';
  const emailId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get(WAITLIST_EMAIL_ENTRY);
    const url = new URL(WAITLIST_FORM_URL);

    url.searchParams.set('usp', 'pp_url');
    if (typeof email === 'string' && email.trim()) {
      url.searchParams.set(WAITLIST_EMAIL_ENTRY, email.trim());
    }

    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full flex-col gap-3 sm:flex-row ${className}`}
    >
      <label className="sr-only" htmlFor={emailId}>
        Email address
      </label>
      <input
        id={emailId}
        name={WAITLIST_EMAIL_ENTRY}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="Enter your email"
        className={`h-14 min-w-0 flex-1 rounded-full border px-5 text-[15px] outline-none transition-colors ${
          isDark
            ? 'border-transparent bg-sand-50/95 text-ink-900 placeholder:text-ink-900/50 focus:border-cream-200'
            : 'border-ink-900/10 bg-white text-ink-900 placeholder:text-ink-900/45 focus:border-peri-400'
        }`}
      />
      <button
        type="submit"
        className={`inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-all hover:translate-y-[-1px] ${
          isDark
            ? 'bg-sand-50 text-ink-900 shadow-[0_8px_30px_-8px_rgba(242,215,164,0.45)] hover:bg-cream-100'
            : 'bg-ink-900 text-sand-50 hover:bg-ink-700'
        }`}
      >
        Join waitlist
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}
