import type { ReactNode } from 'react';
import { useId } from 'react';
import { Icon, type IconName } from './Icon';

export function Card({
  title,
  icon,
  action,
  children,
  className,
  bodyClass,
}: {
  title?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`card ${className ?? ''}`}>
      {title !== undefined && (
        <header className="card-h">
          {icon && <Icon name={icon} size={14} />}
          <span>{title}</span>
          <span className="spacer" />
          {action}
        </header>
      )}
      <div className={`card-b ${bodyClass ?? ''}`}>{children}</div>
    </section>
  );
}

export function Dot({ state }: { state: 'ok' | 'err' | 'dim' }) {
  return <i className={`dot ${state === 'err' ? 'err' : state === 'dim' ? 'dim' : ''}`} style={{ display: 'inline-block' }} />;
}

export function Delta({ value }: { value: number }) {
  if (value > 0) return <span className="delta">+{value.toLocaleString('en-US')}</span>;
  if (value < 0) return <span className="delta neg">{value.toLocaleString('en-US')}</span>;
  return <span className="delta zero">±0</span>;
}

/** Smooth-ish sparkline with gradient fill. data in 0..1 or raw; normalized automatically. */
export function Spark({ data, stroke = '#3b82f6', height = 28 }: { data: number[]; stroke?: string; height?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const w = 100;
  const h = height;
  const pts = normalize(data);
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts.length - 1 || 1)) * w},${(1 - v) * (h - 4) - 2}`).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={`sp${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor={stroke} stopOpacity="0.35" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {pts.length > 1 && <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#sp${uid})`} stroke="none" />}
      {pts.length > 1 && <path d={d} fill="none" stroke={stroke} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />}
      {pts.length <= 1 && <line x1="0" y1={h - 4} x2={w} y2={h - 4} stroke={stroke} strokeWidth="1.4" opacity="0.5" />}
    </svg>
  );
}

function normalize(data: number[]): number[] {
  const arr = data.length ? data : [0, 0];
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  if (max - min < 1e-9) return arr.map(() => 0.5);
  return arr.map((v) => (v - min) / (max - min));
}

export interface AreaSeries {
  name: string;
  color: string;
  data: number[];
}

/** Dual-series area chart (CPU/RAM) with soft gradients — mirrors the reference chart card. */
export function AreaChart({ series, labels, height = 96 }: { series: AreaSeries[]; labels: string[]; height?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const w = 300;
  const h = height;
  const pad = 6;
  const all = series.flatMap((s) => s.data);
  const max = Math.max(1, ...all) * 1.15;
  const x = (i: number, n: number) => (n <= 1 ? 0 : (i / (n - 1)) * w);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  return (
    <svg className="areachart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }}>
      <defs>
        {series.map((s, si) => (
          <linearGradient key={si} id={`ac${uid}${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor={s.color} stopOpacity="0.3" />
            <stop offset="1" stopColor={s.color} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="#1c4182" strokeWidth="0.5" opacity="0.35" />
      ))}
      {series.map((s, si) => {
        if (s.data.length < 2) return null;
        const d = s.data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i, s.data.length).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        return (
          <g key={si}>
            <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#ac${uid}${si})`} />
            <path d={d} fill="none" stroke={s.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={i} x={Math.min(w - 2, Math.max(10, (i / Math.max(1, labels.length - 1)) * w))} y={h - 1} fontSize="7.5" fill="#5a76a6" textAnchor={i === 0 ? 'start' : 'middle'}>
          {l}
        </text>
      ))}
    </svg>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={`switch ${on ? 'on' : ''}`}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      aria-pressed={on}
      aria-label="toggle"
    >
      <i />
    </button>
  );
}

export function StatusPill({ state, label }: { state: 'online' | 'offline' | 'unset'; label: string }) {
  return (
    <span className={`pill ${state}`}>
      <i className="dot" style={{ display: 'inline-block' }} />
      {label}
    </span>
  );
}

export function Empty({ icon = 'list', children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={26} />
      <div>{children}</div>
    </div>
  );
}

export function Kevb({ k, v, na }: { k: string; v?: ReactNode; na?: boolean }) {
  return (
    <div className="kv">
      <span>{k}</span>
      {na ? <b className="na">—</b> : <b>{v}</b>}
    </div>
  );
}
