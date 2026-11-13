import pb from '@/lib/pocketbase/client'

export interface UserRecord {
  id: string
  email: string
  name?: string
  avatar?: string
}

export function getCurrentUser(): UserRecord | null {
  if (pb.authStore.isValid && pb.authStore.record) {
    return {
      id: pb.authStore.record.id,
      email: pb.authStore.record.email,
      name: pb.authStore.record.name,
      avatar: pb.authStore.record.avatar,
    }
  }
  return null
}

export function isUserAuthenticated(): boolean {
  return pb.authStore.isValid
}

export async function loginWithPassword(email: string, password: string): Promise<UserRecord> {
  const authData = await pb.collection('users').authWithPassword(email, password)
  return {
    id: authData.record.id,
    email: authData.record.email,
    name: authData.record.name,
    avatar: authData.record.avatar,
  }
}

export function logout(): void {
  pb.authStore.clear()
}
