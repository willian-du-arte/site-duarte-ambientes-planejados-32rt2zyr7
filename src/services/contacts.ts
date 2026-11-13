import pb from '@/lib/pocketbase/client'
import type { ContactRecord, ContactStatus, CreateContactDTO } from '@/types/contact'

export async function createContact(data: CreateContactDTO): Promise<ContactRecord> {
  const record = await pb.collection('contacts').create<ContactRecord>({
    ...data,
    status: 'novo',
  })
  return record
}

export async function listContacts(statusFilter?: ContactStatus | 'all'): Promise<ContactRecord[]> {
  const filter = statusFilter && statusFilter !== 'all' ? `status = '${statusFilter}'` : ''
  const records = await pb.collection('contacts').getFullList<ContactRecord>({
    filter,
    sort: '-created',
  })
  return records
}

export async function updateContactStatus(
  id: string,
  status: ContactStatus,
): Promise<ContactRecord> {
  const record = await pb.collection('contacts').update<ContactRecord>(id, { status })
  return record
}

export async function updateContactNotes(id: string, notes: string): Promise<ContactRecord> {
  const record = await pb.collection('contacts').update<ContactRecord>(id, { notes })
  return record
}

export async function deleteContact(id: string): Promise<boolean> {
  return await pb.collection('contacts').delete(id)
}
