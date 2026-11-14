// Conversão de contato do site em cliente do CRM + oportunidade na etapa "Novo contato".
// Delega ao serviço do ERP (convertContactToClient) — que já cria cliente + oportunidade
// e marca o contato como convertido (converted + converted_client + converted_opportunity).
import { convertContactToClient } from '@/services/erp'

export { todayISO } from '@/lib/format'

export async function convertContact(contact: {
  id: string
  name: string
  contact_info: string
  need: string
  notes?: string
}): Promise<{ clientId: string; opportunityId: string }> {
  const result = await convertContactToClient(contact)
  return { clientId: result.clientId, opportunityId: result.opportunityId }
}
