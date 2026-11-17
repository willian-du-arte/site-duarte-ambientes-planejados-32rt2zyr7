// Camada de acesso a dados do PAINEL DE PRODUÇÃO (Etapa 2, bloco 3):
// Kanban de projetos por etapa de produção, histórico e tarefas do projeto.
// Espelha o padrão dos outros services (payloads, throwPbError e activity_log).
import pb from '@/lib/pocketbase/client'
import { ErpValidationError, extractFieldErrors } from '@/lib/pocketbase/errors'
import type {
  ActivityLogRecord,
  ProjectRecord,
  ProjectStageRecord,
  QuoteRecord,
  TaskRecord,
} from '@/types/erp'
import type { PurchaseRecord } from '@/types/inventory'

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

// ---------- Projetos (leitura com expand do cliente) ----------

export type ProductionProject = ProjectRecord

export async function listProductionProjects(): Promise<ProductionProject[]> {
  return pb.collection('projects').getFullList<ProductionProject>({
    sort: '-created',
    expand: 'client',
  })
}

export async function listTasksByProject(projectId: string): Promise<TaskRecord[]> {
  return pb.collection('tasks').getFullList<TaskRecord>({
    filter: `project = "${projectId}"`,
    sort: 'due_date,-created',
  })
}

export async function listProjectHistory(projectId: string): Promise<ActivityLogRecord[]> {
  return pb.collection('activity_log').getFullList<ActivityLogRecord>({
    filter: `entity = "projects" && entity_id = "${projectId}"`,
    sort: '-created',
  })
}

/** Compras vinculadas ao projeto (para listar fornecedores envolvidos). */
export async function listProjectPurchases(projectId: string): Promise<PurchaseRecord[]> {
  return pb.collection('purchases').getFullList<PurchaseRecord>({
    filter: `project = "${projectId}"`,
    sort: '-created',
    expand: 'supplier',
  })
}

/** Orçamento de origem do projeto (items json = materiais), se existir. */
export async function getProjectQuote(quoteId?: string): Promise<QuoteRecord | null> {
  if (!quoteId) return null
  try {
    return await pb.collection('quotes').getOne<QuoteRecord>(quoteId)
  } catch {
    return null
  }
}

// ---------- Movimentação no Kanban (arrastar card = mudar etapa) ----------

/**
 * Move um projeto para a etapa `toOrder` do Kanban:
 * - atualiza `current_stage` do projeto;
 * - sincroniza as 11 etapas em `project_stages` (concluídas até toOrder-1,
 *   em_andamento em toOrder e pendentes depois);
 * - grava a movimentação no histórico (activity_log).
 */
export async function moveProjectStage(
  project: ProductionProject,
  toOrder: number,
  stageName: string,
): Promise<void> {
  const fromOrder = project.current_stage ?? 1
  if (fromOrder === toOrder) return

  try {
    await pb.collection('projects').update(project.id, { current_stage: toOrder })
  } catch (e) {
    throwPbError(e)
  }

  // Sincroniza as etapas de produção (best-effort — não bloqueia o drag).
  try {
    const stages = await pb.collection('project_stages').getFullList<ProjectStageRecord>({
      filter: `project = "${project.id}"`,
      sort: 'order',
    })
    const now = new Date().toISOString()
    for (const s of stages) {
      const order = s.order ?? 0
      const next = order < toOrder ? 'concluida' : order === toOrder ? 'em_andamento' : 'pendente'
      if (s.status === next) continue
      const patch: Record<string, unknown> = { status: next }
      if (next === 'concluida') {
        if (!s.completed_at) patch.completed_at = now
      } else if (next === 'em_andamento') {
        if (!s.started_at) patch.started_at = now
      }
      await pb.collection('project_stages').update(s.id, patch)
    }
  } catch {
    // best-effort
  }

  await log(
    'projects',
    project.id,
    'etapa alterada',
    `Projeto "${project.title}" movido para a etapa "${stageName}" no painel de produção`,
    [
      {
        field: 'etapa de produção',
        old_value: String(fromOrder),
        new_value: String(toOrder),
      },
    ],
  )
}

/** Marca o projeto como entregue: grava `delivered_at` e move para a etapa 11 (Finalizado). */
export async function markProjectDelivered(project: ProductionProject): Promise<void> {
  try {
    await pb.collection('projects').update(project.id, { delivered_at: new Date().toISOString() })
  } catch (e) {
    throwPbError(e)
  }
  try {
    await moveProjectStage(project, 11, 'Finalizado')
  } catch {
    // se falhar o move, o delivered_at já está gravado
  }
  await log(
    'projects',
    project.id,
    'entregue',
    `Projeto "${project.title}" marcado como entregue (etapa Finalizado)`,
  )
}

/** Desfaz a entrega rápida (limpa delivered_at — a etapa fica onde está). */
export async function undoProjectDelivered(project: ProductionProject): Promise<void> {
  try {
    await pb.collection('projects').update(project.id, { delivered_at: undefined })
  } catch (e) {
    throwPbError(e)
  }
  await log(
    'projects',
    project.id,
    'entrega desfeita',
    `Entrega do projeto "${project.title}" desfeita — delivered_at limpo`,
  )
}
