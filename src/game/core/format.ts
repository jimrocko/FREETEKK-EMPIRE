/** Formatting helpers (German locale). Used by game texts and the UI. */

const eur0 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 1.234 € · 12,50 € · 3,4 Mio. € */
export function fmtMoney(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? '+' : '';
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1_000_000_000) s = `${num1.format(n / 1_000_000_000)} Mrd. €`;
  else if (abs >= 1_000_000) s = `${num1.format(n / 1_000_000)} Mio. €`;
  else if (abs < 100 && Math.round(abs * 100) % 100 !== 0) s = eur2.format(n);
  else s = eur0.format(n);
  return sign + s;
}

export function fmtNumber(n: number, digits = 0): string {
  return digits === 0 ? num0.format(n) : new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);
}

/** 45 Sek · 5 Min · 1 Std 20 Min · 2 Tg 3 Std */
export function fmtDuration(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  if (totalSec < 60) return `${totalSec} Sek`;
  const totalMin = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (totalMin < 10 && sec > 0) return `${totalMin} Min ${sec} Sek`;
  if (totalMin < 60) return `${totalMin} Min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m > 0 ? `${h} Std ${m} Min` : `${h} Std`;
  const dd = Math.floor(h / 24);
  const hh = h % 24;
  return hh > 0 ? `${dd} Tg ${hh} Std` : `${dd} Tg`;
}

/** Compact countdown: 4:05 · 1:02:33 */
export function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (v: number) => String(v).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function fmtPercent(fraction: number): string {
  return `${Math.round(fraction * 100)} %`;
}

export function plural(n: number, one: string, many: string): string {
  return `${fmtNumber(n)} ${n === 1 ? one : many}`;
}
