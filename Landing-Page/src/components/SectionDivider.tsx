type Props = {
  tone?: 'light' | 'dark';
  className?: string;
};

/**
 * Small editorial ornament between sections. Echoes the
 * cream "sparkle" inside the Sterling logomark.
 */
export default function SectionDivider({ tone = 'light', className = '' }: Props) {
  const stroke = tone === 'dark' ? 'rgba(244,239,232,0.20)' : 'rgba(14,9,5,0.14)';
  const accent = '#E5B86F';

  return (
    <div
      className={`flex items-center justify-center gap-3 select-none ${className}`}
      aria-hidden
    >
      <span style={{ height: 1, background: stroke, flex: '0 0 80px' }} />
      <svg width="22" height="22" viewBox="0 0 22 22">
        <path
          d="M11 2 L12.4 9.6 L20 11 L12.4 12.4 L11 20 L9.6 12.4 L2 11 L9.6 9.6 Z"
          fill={accent}
        />
      </svg>
      <span style={{ height: 1, background: stroke, flex: '0 0 80px' }} />
    </div>
  );
}
