// Camada de acesso a dados do FINANCEIRO (Etapa 3):
// contas a receber/pagar, categorias de receita/despesa e fluxo de caixa.
// Espelha o padrão dos outros services (payloads, throwPbError e activity_log).
import pb from '@/lib/pocketbase/client'
import { ErpValidationError, extractFieldErrors } from '@/lib/pocketbase/errors'
import type { FinancialAccountRecord } from '@/types/erp'
import type { FinanceCategoryRecord } from '@/types/finance'

function throwPbError(error: unknown): never {
  if (error && typeof error === 'object' && 'response' in error) {
    const fields = extractFieldErrors(error)
    if (Object.keys(fields).length > 0) throw new ErpValidationError(fields)
  }
  throw error
}

function userEmail(): string {
  return pb.authStore.record?.email || ''
}

async function log(
  entity: string,
  entityId: string,
  action: string,
  description: string,
  changes?: { field: string; old_value?: string; new_value: string }[],
): Promise<void> {
  try {
    const base = { entity, entity_id: entityId, action, description, user_email: userEmail() }
    if (changes && changes.length > 0) {
      for (const c of changes) {
        await pb.collection('activity_log').create({ ...base, ...c })
      }
    } else {
      await pb.collection('activity_log').create(base)
    }
  } catch {
    // log é best-effort; nunca bloqueia a operação principal
  }
}

// ---------- Contas ----------

export async function listAccounts(): Promise<FinancialAccountRecord[]> {
  return pb.collection('financial_accounts').getFullList<FinancialAccountRecord>({
    sort: 'due_date',
    expand: 'client,project,supplier',
  })
}

/** Saldo em aberto de uma conta (valor - pago). */
export function remainingOf(a: Pick<FinancialAccountRecord, 'amount' | 'paid_amount'>): number {
  return Math.max((a.amount ?? 0) - (a.paid_amount ?? 0), 0)
}

// ---------- Categorias ----------

export async function listCategories(): Promise<FinanceCategoryRecord[]> {
  return pb.collection('finance_categories').getFullList<FinanceCategoryRecord>({
    sort: 'kind,name',
  })
}

export async function createCategory(
  form: Pick<FinanceCategoryRecord, 'name' | 'kind'>,
): Promise<FinanceCategoryRecord> {
  try {
    const rec = await pb.collection('finance_categories').create<FinanceCategoryRecord>({
      name: form.name.trim(),
      kind: form.kind,
    })
    await log(
      'finance_categories',
      rec.id,
      'criado',
      `Categoria de ${form.kind === 'receita' ? 'receita' : 'despesa'} "${rec.name}" criada`,
    )
    return rec
  } catch (e) {
    throwPbError(e)
  }
}

export async function deleteCategory(id: string, name: string): Promise<void> {
  await pb.collection('finance_categories').delete(id)
  await log('finance_categories', id, 'excluído', `Categoria "${name}" excluída`)
}
