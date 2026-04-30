import { useEffect, useRef } from 'react';

type Props = {
  color?: string;
  size?: number;
  className?: string;
};

/**
 * A soft, cursor-following gradient highlight. Place inside a relatively-positioned
 * parent. Disabled on touch devices and prefers-reduced-motion.
 */
export default function CursorGlow({
  color = 'rgba(124,125,245,0.30)',
  size = 540,
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const parent = el.parentElement;
    if (!parent) return;

    let raf = 0;
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0;

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      tx = e.clientX - rect.left;
      ty = e.clientY - rect.top;
    };

    const onLeave = () => {
      tx = -9999;
      ty = -9999;
    };

    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      el.style.transform = `translate3d(${cx - size / 2}px, ${cy - size / 2}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    parent.addEventListener('mousemove', onMove);
    parent.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      parent.removeEventListener('mousemove', onMove);
      parent.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [size]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute z-[1] mix-blend-screen ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
        filter: 'blur(20px)',
        left: 0,
        top: 0,
        transform: 'translate3d(-9999px, -9999px, 0)',
        willChange: 'transform',
      }}
    />
  );
}
