import { useEffect, useState } from 'react';

/** Counts up to `value` when it first shows (game-style score reveal). */
export function CountUp({ value, format, ms = 900 }: { value: number; format: (n: number) => string; ms?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <>{format(Math.round(shown))}</>;
}
