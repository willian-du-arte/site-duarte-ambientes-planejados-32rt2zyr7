import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { isUserAuthenticated } from '@/services/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    setAuthenticated(isUserAuthenticated())
  }, [])

  if (authenticated === null) {
    // Verificando autenticação no client
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
