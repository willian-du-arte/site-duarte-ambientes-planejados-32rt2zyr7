// Conversão de contato do site em cliente do CRM + oportunidade na etapa "Novo contato".
// Marca o contato como convertido (status) e grava o id do cliente — sem duplicar dados.
import pb from '@/lib/pocketbase/client'
import { ErpValidationError } from '@/lib/pocketbase/errors'
import type { ClientRecord, OpportunityRecord } from '@/types/erp'
import { OPPORTUNITY_STAGES } from '@/types/erp'

const FIRST_STAGE_ID = OPPORTUNITY_STAGES[0].id // 'novo_contato'

export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export async function convertContact(contact: {
  id: string
  name: string
  contact_info: string
  need: string
  notes: string
}): Promise<{ clientId: string; opportunityId: string }> {
  // 1. Verifica se este contato já não foi convertido (idempotência).
  const existing = await pb.collection('contacts').getOne(contact.id)
  if (existing.status === 'convertido' && existing.converted_client) {
    throw new ErpValidationError({
      contact: 'Este contato já foi convertido em cliente anteriormente.',
    })
  }

  // 2. Procura cliente com o mesmo nome — evita duplicar.
  const dupes = await pb.collection('clients').getList(1, 1, {
    filter: `name = "${contact.name.replace(/"/g, '\\"')}"`,
  })

  let clientId: string
  if (dupes.items.length > 0) {
    clientId = dupes.items[0].id
  } else {
    const created = await pb.collection('clients').create({
      name: contact.name,
      phone: contact.contact_info || '',
      client_type: 'residencial',
      origin: 'Site — formulário de contato',
      relationship_history: `Contato recebido pelo site em ${todayISO()}. Pedido: ${contact.need || '—'}`,
      notes: contact.notes || '',
    })
    clientId = created.id
  }

  // 3. Cria oportunidade na etapa inicial do funil.
  const opportunity = await pb.collection('opportunities').create({
    client: clientId,
    stage: FIRST_STAGE_ID,
    title: `Atendimento — ${contact.name}`,
    estimated_value: 0,
    next_action_desc: 'Ligar / responder o contato do site',
    next_action_date: todayISO(),
  })

  // 4. Marca o contato como convertido.
  await pb.collection('contacts').update(contact.id, {
    status: 'convertido',
    converted_client: clientId,
  })

  return { clientId, opportunityId: opportunity.id }
}
