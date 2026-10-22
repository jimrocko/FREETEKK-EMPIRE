import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X, XCircle } from 'lucide-react';
import type { Tone } from '../../game/core/types';

type Variant = 'default' | 'primary' | 'danger' | 'ghost';

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  small?: boolean;
  block?: boolean;
  icon?: boolean;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
  'aria-label'?: string;
  testId?: string;
}

export function Button({ children, onClick, variant = 'default', small, block, icon, disabled, title, type = 'button', testId, ...rest }: ButtonProps) {
  const cls = ['btn', variant !== 'default' && `btn--${variant}`, small && 'btn--small', block && 'btn--block', icon && 'btn--icon']
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} title={title} aria-label={rest['aria-label']} data-testid={testId}>
      {children}
    </button>
  );
}

/** Small explanation below a disabled button. */
export function Reason({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <div className="btn-reason" role="note">
      <AlertTriangle size={13} />
      <span>{text}</span>
    </div>
  );
}

export function Card({ children, className, accent, testId }: { children: ReactNode; className?: string; accent?: boolean; testId?: string }) {
  return (
    <section className={['card', accent && 'card--accent', className].filter(Boolean).join(' ')} data-testid={testId}>
      {children}
    </section>
  );
}

export function CardHead({ icon, title, right }: { icon?: ReactNode; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="card__head">
      <div className="card__title">
        {icon}
        <span>{title}</span>
      </div>
      {right}
    </div>
  );
}

export function ProgressBar({ value, thin, running, label }: { value: number; thin?: boolean; running?: boolean; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={['progress', thin && 'progress--thin', running && 'progress--running'].filter(Boolean).join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: Tone | 'accent';
  onClick?: () => void;
}) {
  return (
    <div className={['stat', onClick && 'clickable'].filter(Boolean).join(' ')} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="stat__label">
        {icon}
        {label}
      </div>
      <div className={['stat__value', tone && `tone-${tone}`].filter(Boolean).join(' ')}>{value}</div>
      {sub !== undefined && <div className="stat__sub">{sub}</div>}
    </div>
  );
}

export type BadgeTone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'discovery';

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={['badge', tone !== 'default' && `badge--${tone}`].filter(Boolean).join(' ')}>{children}</span>;
}

export interface TabDef<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: TabDef<T>[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} className={['tab', t.id === value && 'is-active'].filter(Boolean).join(' ')} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && <span className="tab__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, testId }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; testId?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} data-testid={testId}>
        <div className="modal__head">
          <h2>{title}</h2>
          <Button icon variant="ghost" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </Button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function EmptyState({ icon, title, text, children }: { icon?: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <strong>{title}</strong>
      {text && <p className="small">{text}</p>}
      {children}
    </div>
  );
}

export function Banner({ tone, children }: { tone: 'warning' | 'danger' | 'info'; children: ReactNode }) {
  const Icon = tone === 'danger' ? XCircle : tone === 'warning' ? AlertTriangle : Info;
  return (
    <div className={`banner banner--${tone}`} role={tone === 'info' ? 'status' : 'alert'}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}

export function ConditionBar({ value }: { value: number }) {
  const cls = value >= 70 ? 'cond--good' : value >= 40 ? 'cond--ok' : 'cond--bad';
  return (
    <div className={`cond ${cls}`}>
      <span>Zustand</span>
      <ProgressBar value={value / 100} thin label="Zustand" />
      <span className="num">{Math.round(value)} %</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="page__header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
