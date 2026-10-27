import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export const fmt = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 3 });

export function Btn({ className, variant = 'soft', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'soft' | 'primary' | 'ghost' | 'danger' }) {
  return (
    <button
      {...p}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        variant === 'soft' && 'bg-white/[0.07] hover:bg-white/[0.12]',
        variant === 'primary' && 'bg-sky-500 text-[#fff] hover:bg-sky-400',
        variant === 'ghost' && 'hover:bg-white/[0.08]',
        variant === 'danger' && 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25',
        className,
      )}
    />
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: ReactNode }) {
  return (
    <button onClick={onChange} className="group flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left text-[13px] hover:bg-white/[0.04]">
      <span>{label}</span>
      <span className={clsx('h-5 w-9 rounded-full p-0.5 transition', checked ? 'bg-sky-500' : 'bg-white/15')}>
        <span className={clsx('block h-4 w-4 rounded-full bg-[#fff] shadow transition', checked && 'translate-x-4')} />
      </span>
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
      {label}
      {children}
    </label>
  );
}

export const inputCls = 'w-16 rounded-md border border-white/10 bg-black/30 px-1.5 py-1 text-right text-[12px] text-slate-100 outline-none focus:border-sky-400';

export function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="glass flex max-h-full w-[390px] flex-col overflow-hidden rounded-2xl">
      <div className="flex items-start justify-between px-4 pb-2 pt-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="rounded-md px-2 py-0.5 text-slate-400 hover:bg-white/10 hover:text-white">✕</button>
      </div>
      <div className="scroll flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-4 pb-4">{children}</div>
    </div>
  );
}
