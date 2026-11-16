// Serviços de fornecedores, compras e estoque (etapa 2) — Duarte Gestão.
// Padrão idêntico ao services/erp.ts: grava em activity_log e mapeia erros por campo.
import pb from '@/lib/pocketbase/client'
import { ErpValidationError, extractFieldErrors } from '@/lib/pocketbase/errors'
import type {
  InventoryItemFormValues,
  InventoryItemRecord,
  InventoryMovementRecord,
  MovementFormValues,
  PurchaseFormValues,
  PurchaseRecord,
  SupplierFormValues,
  SupplierRecord,
} from '@/types/inventory'

function throwPbError(error: unknown): never {
  if (error && typeof error === 'object' && 'response' in error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) throw new ErpValidationError(fields)
  }
  throw error
}

const num = (v: string | number | undefined | null): number => {
  if (v === '' || v === undefined || v === null) return 0
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isNaN(n) ? 0 : n
}

const opt = (v: string): string | undefined => (v.trim() === '' ? undefined : v.trim())

async function log(
  entity: string,
  entity_id: string,
  action: string,
  description: string,
): Promise<void> {
  try {
    await pb.collection('activity_log').create({
      entity,
      entity_id,
      action,
      description,
      user_email: pb.authStore.record?.email || '',
    })
  } catch {
    // log é best-effort; nunca bloqueia a operação principal
  }
}

// ---------- Fornecedores ----------

function supplierPayload(form: SupplierFormValues) {
  return {
    name: form.name.trim(),
    document: opt(form.document),
    phone: opt(form.phone),
    email: opt(form.email),
    address: opt(form.address),
    categories: opt(form.categories),
    payment_terms: opt(form.payment_terms),
    delivery_time: opt(form.delivery_time),
    notes: opt(form.notes),
  }
}

export async function createSupplier(form: SupplierFormValues): Promise<SupplierRecord> {
  try {
    const rec = await pb.collection('suppliers').create<SupplierRecord>(supplierPayload(form))
    await log('suppliers', rec.id, 'criado', `Fornecedor "${rec.name}" cadastrado`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateSupplier(
  id: string,
  form: SupplierFormValues,
): Promise<SupplierRecord> {
  try {
    const rec = await pb.collection('suppliers').update<SupplierRecord>(id, supplierPayload(form))
    await log('suppliers', id, 'editado', `Fornecedor "${rec.name}" editado`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function deleteSupplier(id: string): Promise<void> {
  await pb.collection('suppliers').delete(id)
  await log('suppliers', id, 'excluído', `Fornecedor ${id} excluído`)
}

export async function listSuppliers(): Promise<SupplierRecord[]> {
  return pb.collection('suppliers').getFullList<SupplierRecord>({ sort: 'name' })
}

// ---------- Compras ----------

export function purchaseTotal(form: Pick<PurchaseFormValues, 'quantity' | 'unit_price'>): number {
  return num(form.quantity) * num(form.unit_price)
}

function purchasePayload(form: PurchaseFormValues) {
  const total = purchaseTotal(form)
  return {
    description: form.description.trim(),
    quantity: num(form.quantity),
    unit_price: num(form.unit_price),
    total,
    status: form.status,
    payment_status: form.payment_status,
    order_date: form.order_date || undefined,
    expected_date: form.expected_date || undefined,
    notes: opt(form.notes),
    supplier: form.supplier || undefined,
    project: form.project || undefined,
  }
}

async function createPayableAccount(
  rec: PurchaseRecord,
  opts: { supplierId?: string; projectId?: string },
): Promise<void> {
  const total = rec.total ?? 0
  if (total <= 0) return
  await pb.collection('financial_accounts').create({
    kind: 'pagar',
    description: `Compra: ${rec.description}`,
    amount: total,
    due_date: rec.order_date || new Date().toISOString().slice(0, 10),
    paid: false,
    supplier: opts.supplierId || rec.supplier,
    project: opts.projectId || rec.project,
    purchase: rec.id,
    category: 'compras',
  })
  await log(
    'financial_accounts',
    rec.id,
    'gerado',
    `Conta a pagar gerada pela compra "${rec.description}" (${total.toFixed(2)})`,
  )
}

export async function createPurchase(form: PurchaseFormValues): Promise<PurchaseRecord> {
  try {
    const rec = await pb.collection('purchases').create<PurchaseRecord>(purchasePayload(form))
    await log('purchases', rec.id, 'criado', `Compra "${rec.description}" registrada`)
    if (form.payment_status === 'pendente') {
      await createPayableAccount(rec, { supplierId: form.supplier, projectId: form.project })
    }
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updatePurchase(
  id: string,
  before: PurchaseRecord,
  form: PurchaseFormValues,
): Promise<PurchaseRecord> {
  try {
    const rec = await pb.collection('purchases').update<PurchaseRecord>(id, purchasePayload(form))
    await log('purchases', id, 'editado', `Compra "${rec.description}" editada`)
    // Conta a pagar nasce quando a compra vira pendente; se antes não era pendente e agora é,
    // gera a conta. Se já era pendente, a conta existente não é recriada (editável no Financeiro).
    if (form.payment_status === 'pendente' && before.payment_status !== 'pendente') {
      const existing = await pb.collection('financial_accounts').getFullList({
        filter: `purchase = "${id}"`,
        limit: 1,
      })
      if (existing.length === 0) {
        await createPayableAccount(rec, { supplierId: form.supplier, projectId: form.project })
      }
    }
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function deletePurchase(id: string): Promise<void> {
  await pb.collection('purchases').delete(id)
  await log('purchases', id, 'excluído', `Compra ${id} excluída`)
}

export async function listPurchases(): Promise<PurchaseRecord[]> {
  return pb.collection('purchases').getFullList<PurchaseRecord>({
    sort: '-created',
    expand: 'supplier,project',
  })
}

export async function markPurchaseReceived(id: string): Promise<PurchaseRecord> {
  const rec = await pb.collection('purchases').update<PurchaseRecord>(id, {
    status: 'recebido',
    received_at: new Date().toISOString(),
  })
  await log('purchases', id, 'recebido', `Compra "${rec.description}" marcada como recebida`)
  return rec
}

export async function markPurchasePaid(
  id: string,
  before: PurchaseRecord,
): Promise<PurchaseRecord> {
  const rec = await pb
    .collection('purchases')
    .update<PurchaseRecord>(id, { payment_status: 'pago' })
  // Baixa a conta a pagar vinculada, se existir e não estiver quitada.
  const linked = await pb.collection('financial_accounts').getFullList({
    filter: `purchase = "${id}"`,
  })
  for (const acc of linked) {
    if (!acc.paid) {
      await pb.collection('financial_accounts').update(acc.id, {
        paid_amount: acc.amount ?? 0,
        paid: true,
        paid_at: new Date().toISOString(),
      })
      await log(
        'financial_accounts',
        acc.id,
        'quitado',
        `Conta "${acc.description}" quitada pela compra`,
      )
    }
  }
  await log(
    'purchases',
    id,
    'pago',
    `Compra "${before.description || rec.description}" marcada como paga`,
  )
  return rec
}

// ---------- Estoque ----------

function itemPayload(form: InventoryItemFormValues) {
  return {
    name: form.name.trim(),
    category: form.category || undefined,
    unit: opt(form.unit),
    quantity: num(form.quantity),
    min_quantity: num(form.min_quantity),
    unit_cost: num(form.unit_cost),
    notes: opt(form.notes),
    supplier: form.supplier || undefined,
  }
}

export async function createInventoryItem(
  form: InventoryItemFormValues,
): Promise<InventoryItemRecord> {
  try {
    const rec = await pb
      .collection('inventory_items')
      .create<InventoryItemRecord>(itemPayload(form))
    await log('inventory_items', rec.id, 'criado', `Material "${rec.name}" cadastrado`)
    // Quantidade inicial ≠ 0 vira movimentação de entrada rastreável.
    const q = num(form.quantity)
    if (q > 0) {
      await pb.collection('inventory_movements').create({
        kind: 'entrada',
        quantity: q,
        unit_cost: num(form.unit_cost),
        reason: 'Estoque inicial no cadastro',
        item: rec.id,
      })
      await log('inventory_movements', rec.id, 'gerado', `Entrada inicial de "${rec.name}" (${q})`)
    }
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function updateInventoryItem(
  id: string,
  form: InventoryItemFormValues,
): Promise<InventoryItemRecord> {
  try {
    const rec = await pb
      .collection('inventory_items')
      .update<InventoryItemRecord>(id, itemPayload(form))
    await log('inventory_items', id, 'editado', `Material "${rec.name}" editado`)
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await pb.collection('inventory_items').delete(id)
  await log('inventory_items', id, 'excluído', `Material ${id} excluído`)
}

export async function listInventoryItems(): Promise<InventoryItemRecord[]> {
  return pb.collection('inventory_items').getFullList<InventoryItemRecord>({
    sort: 'name',
    expand: 'supplier',
  })
}

export async function listMovements(itemId?: string): Promise<InventoryMovementRecord[]> {
  return pb.collection('inventory_movements').getFullList<InventoryMovementRecord>({
    filter: itemId ? `item = "${itemId}"` : '',
    sort: '-created',
    expand: 'item,project,purchase',
  })
}

// Aplica a movimentação: cria o registro e ajusta a quantidade disponível do material.
export async function createMovement(
  itemId: string,
  item: InventoryItemRecord,
  form: MovementFormValues,
): Promise<InventoryMovementRecord> {
  const qty = num(form.quantity)
  const current = item.quantity ?? 0
  let newQty = current
  if (form.kind === 'entrada') newQty = current + qty
  if (form.kind === 'saida') newQty = current - qty
  if (form.kind === 'ajuste') newQty = qty
  try {
    const rec = await pb.collection('inventory_movements').create<InventoryMovementRecord>({
      kind: form.kind,
      quantity: qty,
      unit_cost: form.unit_cost ? num(form.unit_cost) : undefined,
      reason: opt(form.reason),
      item: itemId,
      project: form.project || undefined,
      purchase: form.purchase_id || undefined,
    })
    await pb.collection('inventory_items').update(itemId, { quantity: Math.max(newQty, 0) })
    await log(
      'inventory_movements',
      itemId,
      form.kind,
      `${form.kind === 'entrada' ? 'Entrada' : form.kind === 'saida' ? 'Saída' : 'Ajuste'} de ${qty} em "${item.name}" — ${current} → ${Math.max(newQty, 0)}`,
    )
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function deleteMovement(id: string, movement: InventoryMovementRecord): Promise<void> {
  await pb.collection('inventory_movements').delete(id)
  // Estorna o efeito da movimentação na quantidade do material.
  try {
    const item = await pb.collection('inventory_items').getOne<InventoryItemRecord>(movement.item)
    const q = movement.quantity ?? 0
    let restored = item.quantity ?? 0
    if (movement.kind === 'entrada') restored -= q
    if (movement.kind === 'saida') restored += q
    await pb.collection('inventory_items').update(movement.item, {
      quantity: Math.max(restored, 0),
    })
  } catch {
    // estorno best-effort
  }
  await log(
    'inventory_movements',
    id,
    'excluído',
    `Movimentação ${id} excluída (estoque estornado)`,
  )
}
