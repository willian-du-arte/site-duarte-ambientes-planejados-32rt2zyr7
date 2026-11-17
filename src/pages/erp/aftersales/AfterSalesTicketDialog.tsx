// Diálogo de criação/edição de chamado de pós-venda.
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type {
  AfterSalesStatus,
  AfterSalesTicketFormValues,
  AfterSalesTicketRecord,
} from '@/types/aftersales'
import {
  AFTER_SALES_STATUSES,
  AFTER_SALES_STATUS_LABELS,
  emptyAfterSalesForm,
} from '@/types/aftersales'
import { createAfterSalesTicket, updateAfterSalesTicket } from '@/services/aftersales'

export interface AfterSalesClientOption {
  id: string
  name: string
}
export interface AfterSalesProjectOption {
  id: string
  title: string
  client?: string
  delivered_at?: string
}

interface Props {
  open: boolean
  ticket: AfterSalesTicketRecord | null
  clients: AfterSalesClientOption[]
  projects: AfterSalesProjectOption[]
  onClose: () => void
  onSaved: () => void
}

export function AfterSalesTicketDialog({
  open,
  ticket,
  clients,
  projects,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState<AfterSalesTicketFormValues>(emptyAfterSalesForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(
        ticket
          ? {
              client: ticket.client ?? '',
              project: ticket.project,
              description: ticket.description,
              opened_at: ticket.opened_at?.slice(0, 10) ?? '',
              status: ticket.status,
              scheduled_for: ticket.scheduled_for?.slice(0, 10) ?? '',
              scheduled_time: ticket.scheduled_time ?? '',
              maintenance_date: ticket.maintenance_date?.slice(0, 10) ?? '',
              maintenance_notes: ticket.maintenance_notes ?? '',
              maintenance_cost: ticket.maintenance_cost ? String(ticket.maintenance_cost) : '',
              rating: ticket.rating ? String(ticket.rating) : '',
              resolution_notes: ticket.resolution_notes ?? '',
            }
          : { ...emptyAfterSalesForm },
      )
    }
  }, [open, ticket])

  const set = (k: keyof AfterSalesTicketFormValues, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.client) {
      toast({ title: 'Selecione o cliente', variant: 'destructive' })
      return
    }
    if (!form.project) {
      toast({ title: 'Selecione o projeto', variant: 'destructive' })
      return
    }
    if (!form.description.trim()) {
      toast({ title: 'Descreva o problema', variant: 'destructive' })
      return
    }
    if (!form.opened_at) {
      toast({ title: 'Informe a data do registro', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (ticket) {
        await updateAfterSalesTicket(ticket.id, form)
        toast({ title: 'Chamado atualizado' })
      } else {
        await createAfterSalesTicket(form)
        toast({ title: 'Chamado registrado' })
      }
      onSaved()
      onClose()
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ticket ? 'Editar chamado' : 'Novo chamado de pós-venda'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Cliente *</Label>
              <Select value={form.client} onValueChange={(v) => set('client', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Projeto *</Label>
              <Select value={form.project} onValueChange={(v) => set('project', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrição do problema *</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ex.: porta do armário desalinhada, dobradiça folgada…"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Data do registro *</Label>
              <Input
                type="date"
                value={form.opened_at}
                onChange={(e) => set('opened_at', e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set('status', v as AfterSalesStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AFTER_SALES_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {AFTER_SALES_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Retorno agendado (data)</Label>
              <Input
                type="date"
                value={form.scheduled_for}
                onChange={(e) => set('scheduled_for', e.target.value)}
              />
            </div>
            <div>
              <Label>Hora</Label>
              <Input
                type="time"
                value={form.scheduled_time}
                onChange={(e) => set('scheduled_time', e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-white/10 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-zinc-400">
              Manutenção realizada
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.maintenance_date}
                  onChange={(e) => set('maintenance_date', e.target.value)}
                />
              </div>
              <div>
                <Label>Custo (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.maintenance_cost}
                  onChange={(e) => set('maintenance_cost', e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3">
              <Label>Notas da manutenção</Label>
              <Textarea
                rows={2}
                value={form.maintenance_notes}
                onChange={(e) => set('maintenance_notes', e.target.value)}
                placeholder="O que foi feito, peças trocadas…"
              />
            </div>
          </div>

          <div className="rounded-md border border-white/10 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-zinc-400">
              Resolução e satisfação
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nota (1–5, opcional)</Label>
                <Select value={form.rating} onValueChange={(v) => set('rating', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} ★{' '}
                        {n === 5 ? '(ótimo)' : n === 4 ? '(bom)' : n === 3 ? '(regular)' : '(ruim)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notas da resolução</Label>
                <Input
                  value={form.resolution_notes}
                  onChange={(e) => set('resolution_notes', e.target.value)}
                  placeholder="Como ficou resolvido"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar chamado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
