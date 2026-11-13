// Componentes compartilhados do ERP: cabeçalho de página, estados vazios, cartão de indicador.
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ErpPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl tracking-wide text-zinc-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function ErpEmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
      {icon && <div className="mb-3 text-amber-200/70">{icon}</div>}
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      {description && <p className="mt-1 max-w-md text-xs text-zinc-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErpStatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'positive' | 'negative' | 'warning' | 'wood'
}) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white/[0.03] p-4',
        tone === 'default' && 'border-white/10',
        tone === 'positive' && 'border-emerald-400/30 bg-emerald-400/5',
        tone === 'negative' && 'border-red-400/30 bg-red-400/5',
        tone === 'warning' && 'border-amber-300/30 bg-amber-300/5',
        tone === 'wood' &&
          'border-amber-200/20 bg-gradient-to-br from-amber-100/[0.06] to-transparent',
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <p
        className={cn(
          'mt-1 font-serif text-xl tracking-wide',
          tone === 'positive' && 'text-emerald-300',
          tone === 'negative' && 'text-red-300',
          tone === 'warning' && 'text-amber-200',
          (tone === 'default' || tone === 'wood') && 'text-zinc-100',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>}
    </div>
  )
}

export function ErpSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 font-serif text-sm uppercase tracking-[0.2em] text-amber-200/80">
      {children}
    </h2>
  )
}
