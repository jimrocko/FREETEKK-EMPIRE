/** Animated equalizer bars (pure CSS animation; delays vary per bar). */
export function Equalizer({ bars = 24, className, speed = 1 }: { bars?: number; className?: string; speed?: number }) {
  return (
    <div className={['eq', className].filter(Boolean).join(' ')} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => {
        const d = ((i * 37) % 17) / 17;
        return <span key={i} className="eq__bar" style={{ animationDelay: `${-d * 0.9}s`, animationDuration: `${(0.55 + ((i * 13) % 7) / 10) / speed}s` }} />;
      })}
    </div>
  );
}
