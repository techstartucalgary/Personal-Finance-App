import { useEffect, useState } from 'react';

export default function PageLoader() {
  const [hidden, setHidden] = useState(false);
  const [unmount, setUnmount] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHidden(true), 700);
    const t2 = setTimeout(() => setUnmount(true), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (unmount) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ease-out pointer-events-none"
      style={{
        background: '#1B1208',
        opacity: hidden ? 0 : 1,
      }}
      aria-hidden
    >
      <div
        className="relative"
        style={{
          width: 84,
          height: 84,
          animation: 'breathe 1.6s ease-in-out infinite',
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'radial-gradient(circle, rgba(124,125,245,0.5) 0%, transparent 70%)',
            filter: 'blur(24px)',
          }}
        />
        <img
          src="/logo.png"
          alt=""
          style={{ width: 84, height: 84, borderRadius: 20, position: 'relative' }}
        />
      </div>
    </div>
  );
}
