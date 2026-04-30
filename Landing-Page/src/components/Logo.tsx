type Props = {
  size?: number;
  withWordmark?: boolean;
  tone?: 'dark' | 'light';
  className?: string;
};

export default function Logo({ size = 32, withWordmark = true, tone = 'light', className = '' }: Props) {
  const wordmarkColor = tone === 'dark' ? '#FAF7F1' : '#0E0905';
  return (
    <a href="#top" className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Sterling, home">
      <span
        className="inline-flex items-center justify-center rounded-[10px] overflow-hidden"
        style={{
          width: size,
          height: size,
          background: '#1B1208',
          boxShadow: '0 6px 16px -8px rgba(124,125,245,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        <img src="/logo.png" alt="" style={{ width: size, height: size, objectFit: 'cover' }} />
      </span>
      {withWordmark && (
        <span
          className="display text-[1.05rem] font-medium tracking-tight"
          style={{ color: wordmarkColor, lineHeight: 1 }}
        >
          Sterling
        </span>
      )}
    </a>
  );
}
