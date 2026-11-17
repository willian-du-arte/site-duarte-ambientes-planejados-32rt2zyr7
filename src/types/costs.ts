// Custos de projeto que NÃO vieram de compra (mão de obra, transporte, instalação…).
// Espelham a coleção `cost_items` recriada na migração 0009 (objetos puros).

export type CostCategory =
  | 'mdf'
  | 'ferragens'
  | 'corte_usinagem'
  | 'terceirizados'
  | 'mao_de_obra'
  | 'transporte'
  | 'instalacao'
  | 'outros'

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  mdf: 'MDF / painéis',
  ferragens: 'Ferragens',
  corte_usinagem: 'Corte / usinagem',
  terceirizados: 'Serviços terceirizados',
  mao_de_obra: 'Mão de obra',
  transporte: 'Transporte',
  instalacao: 'Instalação',
  outros: 'Outros',
}

export const COST_CATEGORIES = Object.keys(COST_CATEGORY_LABELS) as CostCategory[]

export interface CostItemRecord {
  id: string
  description: string
  category: CostCategory | string
  amount?: number
  date?: string
  notes?: string
  project: string
  created: string
  updated: string
  expand?: { project?: { id: string; title: string } }
}

export interface CostItemFormValues {
  description: string
  category: CostCategory | ''
  amount: string
  date: string
  notes: string
  project: string
}

export const emptyCostItemForm: CostItemFormValues = {
  description: '',
  category: '',
  amount: '',
  date: '',
  notes: '',
  project: '',
}
