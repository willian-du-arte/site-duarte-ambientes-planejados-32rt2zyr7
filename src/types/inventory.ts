// Fornecedores, compras e estoque (etapa 2) — Duarte Gestão.
// Espelham o schema real das coleções PocketBase (migração 0007).

// ---------- Fornecedores ----------
export interface SupplierRecord {
  id: string
  name: string
  document?: string
  phone?: string
  email?: string
  address?: string
  categories?: string
  notes?: string
  payment_terms?: string
  delivery_time?: string
  created: string
  updated: string
}

export interface SupplierFormValues {
  name: string
  document: string
  phone: string
  email: string
  address: string
  categories: string
  payment_terms: string
  delivery_time: string
  notes: string
}

export const emptySupplierForm: SupplierFormValues = {
  name: '',
  document: '',
  phone: '',
  email: '',
  address: '',
  categories: '',
  payment_terms: '',
  delivery_time: '',
  notes: '',
}

// ---------- Compras ----------
export type PurchaseStatus = 'orcamento' | 'pedido' | 'recebido' | 'cancelado'
export type PurchasePaymentStatus = 'pendente' | 'parcial' | 'pago'

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  orcamento: 'Orçamento',
  pedido: 'Pedido feito',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
}

export const PURCHASE_PAYMENT_LABELS: Record<PurchasePaymentStatus, string> = {
  pendente: 'Pendente',
  parcial: 'Pago parcial',
  pago: 'Pago',
}

// Referência mínima de projeto (evita import circular de types/erp nesta camada).
export interface ProjectRecordRef {
  id: string
  name: string
}

export interface PurchaseRecord {
  id: string
  description: string
  quantity?: number
  unit_price?: number
  total?: number
  status: PurchaseStatus
  payment_status?: PurchasePaymentStatus
  order_date?: string
  expected_date?: string
  received_at?: string
  notes?: string
  supplier?: string
  project?: string
  created: string
  updated: string
  expand?: { supplier?: SupplierRecord; project?: ProjectRecordRef }
}

export interface PurchaseFormValues {
  description: string
  supplier: string
  project: string
  quantity: string
  unit_price: string
  status: PurchaseStatus
  payment_status: PurchasePaymentStatus
  order_date: string
  expected_date: string
  notes: string
}

export const emptyPurchaseForm: PurchaseFormValues = {
  description: '',
  supplier: '',
  project: '',
  quantity: '',
  unit_price: '',
  status: 'pedido',
  payment_status: 'pendente',
  order_date: '',
  expected_date: '',
  notes: '',
}

// ---------- Estoque ----------
export type InventoryCategory =
  | 'mdf'
  | 'ferragens'
  | 'corredicas'
  | 'dobradicas'
  | 'fitas_borda'
  | 'acessorios'
  | 'acabamento'
  | 'outros'

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  mdf: 'MDF / painéis',
  ferragens: 'Ferragens',
  corredicas: 'Corrediças',
  dobradicas: 'Dobradiças',
  fitas_borda: 'Fitas de borda',
  acessorios: 'Acessórios',
  acabamento: 'Acabamento',
  outros: 'Outros',
}

export interface InventoryItemRecord {
  id: string
  name: string
  category?: InventoryCategory | string
  unit?: string
  quantity?: number
  unit_cost?: number
  min_quantity?: number
  supplier?: string
  notes?: string
  created: string
  updated: string
  expand?: { supplier?: SupplierRecord }
}

export interface InventoryItemFormValues {
  name: string
  category: InventoryCategory | ''
  unit: string
  quantity: string
  unit_cost: string
  min_quantity: string
  supplier: string
  notes: string
}

export const emptyInventoryItemForm: InventoryItemFormValues = {
  name: '',
  category: '',
  unit: 'un',
  quantity: '0',
  unit_cost: '',
  min_quantity: '',
  supplier: '',
  notes: '',
}

export type MovementKind = 'entrada' | 'saida' | 'ajuste'

export const MOVEMENT_KIND_LABELS: Record<MovementKind, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
}

export interface MovementRecord {
  id: string
  kind: MovementKind
  quantity?: number
  unit_cost?: number
  reason?: string
  item: string
  project?: string
  purchase?: string
  created: string
  updated: string
  expand?: {
    item?: InventoryItemRecord
    project?: ProjectRecordRef
    purchase?: PurchaseRecord
  }
}

export interface MovementFormValues {
  item: string
  kind: MovementKind
  quantity: string
  unit_cost: string
  project: string
  purchase_id: string
  reason: string
}

export const emptyMovementForm: MovementFormValues = {
  item: '',
  kind: 'entrada',
  quantity: '',
  unit_cost: '',
  project: '',
  purchase_id: '',
  reason: '',
}

// Alias usado por services/inventory.ts (mesma coleção inventory_movements).
export type InventoryMovementRecord = MovementRecord

export function isLowStock(i: Pick<InventoryItemRecord, 'quantity' | 'min_quantity'>): boolean {
  return i.min_quantity != null && i.min_quantity > 0 && (i.quantity ?? 0) <= i.min_quantity
}
