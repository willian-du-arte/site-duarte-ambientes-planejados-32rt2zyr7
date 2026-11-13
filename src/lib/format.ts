// Formatadores de valores, datas e dinheiro (padrões do Duarte Gestão).
// Moeda em reais (R$) e datas em DD/MM/AAAA.

export function formatCurrency(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n || 0)
}

// Converte o formato do <input type="date"> (AAAA-MM-DD) para exibição DD/MM/AAAA.
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const raw = value.length > 10 ? value.slice(0, 10) : value
  const [y, m, d] = raw.split('-')
  if (!y || !m || !d) return '—'
  return `${d}/${m}/${y}`
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Nome curto do mês (ex.: "jan/26") a partir de AAAA-MM.
export function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const months = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ]
  const idx = parseInt(m, 10) - 1
  if (!y || Number.isNaN(idx) || !months[idx]) return ym
  return `${months[idx]}/${y.slice(2)}`
}

// Hoje em AAAA-MM-DD (fuso local), para comparações com campos date.
export function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isOverdue(dateISO?: string | null): boolean {
  if (!dateISO) return false
  return dateISO.slice(0, 10) < todayISO()
}
