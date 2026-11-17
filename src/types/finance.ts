// Tipos do módulo Financeiro (Etapa 3) — espelham a coleção finance_categories.

export type FinanceCategoryKind = 'receita' | 'despesa'

export interface FinanceCategoryRecord {
  id: string
  name: string
  kind: FinanceCategoryKind
  created: string
  updated: string
}
