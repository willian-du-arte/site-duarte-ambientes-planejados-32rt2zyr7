// Seleção de cliente e mapa de nomes para os orçamentos.
import { useEffect, useState } from 'react'
import { listClients } from '@/services/erp'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ClientRecord } from '@/types/erp'

export function QuoteClientSelect({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (id: string) => void
  error?: string
}) {
  const [clients, setClients] = useState<ClientRecord[]>([])
  useEffect(() => {
    ;(async () => {
      try {
        setClients(await listClients())
      } catch {
        // ignora — o select fica vazio e o aviso de erro aparece
      }
    })()
  }, [])
  return (
    <div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white/5">
          <SelectValue placeholder="Selecione o cliente" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}

export function useClientNames() {
  const [map, setMap] = useState<Record<string, string>>({})
  useEffect(() => {
    ;(async () => {
      try {
        const cs = await listClients()
        setMap(Object.fromEntries(cs.map((c) => [c.id, c.name])))
      } catch {
        setMap({})
      }
    })()
  }, [])
  return (id: string) => map[id] ?? '—'
}
