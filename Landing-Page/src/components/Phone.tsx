import { CSSProperties } from 'react';

type Props = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  rotate?: number;
};

export default function Phone({ src, alt, className = '', style, rotate = 0 }: Props) {
  return (
    <div
      className={`phone-frame ${className}`}
      style={{ ...style, transform: rotate ? `rotate(${rotate}deg)` : undefined }}
    >
      <div className="phone-screen">
        <img src={src} alt={alt} loading="lazy" />
      </div>
      {/* dynamic island */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '2.6%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '32%',
          height: '4.2%',
          background: '#0E0905',
          borderRadius: '999px',
          zIndex: 4,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      />
    </div>
  );
}
