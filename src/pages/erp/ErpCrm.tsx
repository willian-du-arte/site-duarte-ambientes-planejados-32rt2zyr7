// CRM — clientes + funil de vendas visual (9 etapas exatas) com oportunidades.
import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErpEmptyState, ErpPageHeader, ErpSectionTitle } from './ErpShared'
import { cn } from '@/lib/utils'
import {
  createClient,
  createOpportunity,
  deleteClient,
  deleteOpportunity,
  moveOpportunityStage,
  updateClient,
  updateOpportunity,
  listClients,
  listOpportunities,
  listActivityLog,
} from '@/services/erp'
import { ErpValidationError, getErrorMessage } from '@/lib/pocketbase/errors'
import { formatCurrency, formatDate, formatDateTime, isOverdue } from '@/lib/format'
import {
  CLIENT_ORIGINS,
  CLIENT_ORIGIN_LABELS,
  CLIENT_TYPES,
  CLIENT_TYPE_LABELS,
  FUNNEL_STAGES,
  FUNNEL_STAGE_LABELS,
  emptyClientForm,
  emptyOpportunityForm,
  type ClientFormValues,
  type ClientRecord,
  type FunnelStage,
  type OpportunityFormValues,
  type OpportunityRecord,
  type StageTotals,
} from '@/types/erp'
import { AlertTriangle, ArrowRight, History, Loader2, Plus, Trash2, UserPlus } from 'lucide-react'

// ---------- formulário de cliente ----------

function ClientFields({
  form,
  setForm,
  errors,
}: {
  form: ClientFormValues
  setForm: (f: ClientFormValues) => void
  errors: Record<string, string>
}) {
  const set = (patch: Partial<ClientFormValues>) => setForm({ ...form, ...patch })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="client-name">Nome / Razão social *</Label>
        <Input
          id="client-name"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          className="bg-white/5"
        />
        {errors.name && <p className="mt-1 text-xs text-red-300">{errors.name}</p>}
      </div>
      <div>
        <Label htmlFor="client-document">CPF / CNPJ</Label>
        <Input
          id="client-document"
          value={form.document}
          onChange={(e) => set({ document: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="client-type">Tipo de cliente</Label>
        <Select
          value={form.client_type}
          onValueChange={(v) => set({ client_type: v as ClientFormValues['client_type'] })}
        >
          <SelectTrigger className="bg-white/5">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {CLIENT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="client-phone">Telefone</Label>
        <Input
          id="client-phone"
          value={form.phone}
          onChange={(e) => set({ phone: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="client-whatsapp">WhatsApp</Label>
        <Input
          id="client-whatsapp"
          value={form.whatsapp}
          onChange={(e) => set({ whatsapp: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="client-email">E-mail</Label>
        <Input
          id="client-email"
          type="email"
          value={form.email}
          onChange={(e) => set({ email: e.target.value })}
          className="bg-white/5"
        />
        {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="client-origin">Origem do contato</Label>
        <Select
          value={form.origin}
          onValueChange={(v) => set({ origin: v as ClientFormValues['origin'] })}
        >
          <SelectTrigger className="bg-white/5">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_ORIGINS.map((o) => (
              <SelectItem key={o} value={o}>
                {CLIENT_ORIGIN_LABELS[o]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="client-address">Endereço</Label>
        <Input
          id="client-address"
          value={form.address}
          onChange={(e) => set({ address: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="client-history">Histórico de relacionamento</Label>
        <Textarea
          id="client-history"
          value={form.history}
          onChange={(e) => set({ history: e.target.value })}
          className="bg-white/5"
          rows={2}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="client-notes">Observações</Label>
        <Textarea
          id="client-notes"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          className="bg-white/5"
          rows={2}
        />
      </div>
    </div>
  )
}

function validateClient(form: ClientFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = 'Informe o nome ou razão social.'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'E-mail inválido.'
  return errors
}

// ---------- formulário de oportunidade ----------

function OpportunityFields({
  form,
  setForm,
  errors,
}: {
  form: OpportunityFormValues
  setForm: (f: OpportunityFormValues) => void
  errors: Record<string, string>
}) {
  const set = (patch: Partial<OpportunityFormValues>) => setForm({ ...form, ...patch })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="opp-title">Título *</Label>
        <Input
          id="opp-title"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          className="bg-white/5"
        />
        {errors.title && <p className="mt-1 text-xs text-red-300">{errors.title}</p>}
      </div>
      <div>
        <Label htmlFor="opp-value">Valor estimado (R$)</Label>
        <Input
          id="opp-value"
          type="number"
          min="0"
          step="0.01"
          value={form.value}
          onChange={(e) => set({ value: e.target.value })}
          className="bg-white/5"
        />
      </div>
      <div>
        <Label>Etapa do funil</Label>
        <Select value={form.stage} onValueChange={(v) => set({ stage: v as FunnelStage })}>
          <SelectTrigger className="bg-white/5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FUNNEL_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {FUNNEL_STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="opp-action">Próxima ação</Label>
        <Input
          id="opp-action"
          value={form.next_action}
          onChange={(e) => set({ next_action: e.target.value })}
          placeholder="Ex.: ligar para confirmar visita"
          className="bg-white/5"
        />
      </div>
      <div>
        <Label htmlFor="opp-action-date">Data da próxima ação</Label>
        <Input
          id="opp-action-date"
          type="date"
          value={form.next_action_date}
          onChange={(e) => set({ next_action_date: e.target.value })}
          className="bg-white/5"
        />
      </div>
      {form.stage === 'venda_perdida' && (
        <div className="sm:col-span-2">
          <Label htmlFor="opp-lost">Motivo da perda</Label>
          <Input
            id="opp-lost"
            value={form.lost_reason}
            onChange={(e) => set({ lost_reason: e.target.value })}
            className="bg-white/5"
          />
        </div>
      )}
      <div className="sm:col-span-2">
        <Label htmlFor="opp-notes">Observações</Label>
        <Textarea
          id="opp-notes"
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          className="bg-white/5"
          rows={2}
        />
      </div>
    </div>
  )
}

function validateOpportunity(form: OpportunityFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.title.trim()) errors.title = 'Informe um título.'
  if (form.value && Number.isNaN(Number(form.value))) errors.value = 'Valor inválido.'
  return errors
}

// ---------- página ----------

export default function ErpCrm() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // dialogs
  const [clientDialog, setClientDialog] = useState<{ open: boolean; editing: ClientRecord | null }>(
    { open: false, editing: null },
  )
  const [clientForm, setClientForm] = useState<ClientFormValues>(emptyClientForm)
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [clientDelete, setClientDelete] = useState<ClientRecord | null>(null)
  const [saving, setSaving] = useState(false)

  const [oppDialog, setOppDialog] = useState<{
    open: boolean
    editing: OpportunityRecord | null
    clientId: string
    clientName: string
  }>({ open: false, editing: null, clientId: '', clientName: '' })
  const [oppForm, setOppForm] = useState<OpportunityFormValues>(emptyOpportunityForm)
  const [oppErrors, setOppErrors] = useState<Record<string, string>>({})
  const [oppDelete, setOppDelete] = useState<OpportunityRecord | null>(null)

  const [logFor, setLogFor] = useState<ClientRecord | null>(null)
  const [logRows, setLogRows] = useState<Awaited<ReturnType<typeof listActivityLog>>>([])

  const load = async () => {
    const [cs, os] = await Promise.all([listClients(), listOpportunities()])
    setClients(cs)
    setOpportunities(os)
  }

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        toast({
          title: 'Erro ao carregar',
          description: getErrorMessage(e),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const stageTotals = useMemo<StageTotals[]>(() => {
    return FUNNEL_STAGES.map((stage) => {
      const rows = opportunities.filter((o) => o.stage === stage)
      return {
        stage,
        count: rows.length,
        value: rows.reduce((acc, o) => acc + (o.value ?? 0), 0),
      }
    })
  }, [opportunities])

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—'

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.document ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    )
  }, [clients, search])

  const clientOpportunities = (clientId: string) =>
    opportunities.filter((o) => o.client === clientId)

  // alertas: próxima ação vencida ou sem ação definida há mais de 7 dias (criação/atualização)
  const awaitingReturn = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return opportunities
      .filter((o) => o.stage !== 'venda_fechada' && o.stage !== 'venda_perdida')
      .filter((o) => {
        if (o.next_action_date && o.next_action_date.slice(0, 10) < today) return true
        if (!o.next_action_date && !o.next_action) {
          const last = (o.updated || o.created).slice(0, 10)
          const days = (Date.now() - new Date(last).getTime()) / 86400000
          return days > 7
        }
        return false
      })
      .sort((a, b) =>
        (a.next_action_date || a.updated) < (b.next_action_date || b.updated) ? -1 : 1,
      )
  }, [opportunities])

  // ---- ações ----

  const openNewClient = () => {
    setClientForm(emptyClientForm)
    setClientErrors({})
    setClientDialog({ open: true, editing: null })
  }

  const openEditClient = (c: ClientRecord) => {
    setClientForm({
      name: c.name ?? '',
      document: c.document ?? '',
      phone: c.phone ?? '',
      whatsapp: c.whatsapp ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      client_type: c.client_type ?? '',
      origin: c.origin ?? '',
      history: c.history ?? '',
      notes: c.notes ?? '',
    })
    setClientErrors({})
    setClientDialog({ open: true, editing: c })
  }

  const saveClient = async () => {
    const errors = validateClient(clientForm)
    if (Object.keys(errors).length > 0) {
      setClientErrors(errors)
      return
    }
    setSaving(true)
    try {
      if (clientDialog.editing) {
        await updateClient(clientDialog.editing.id, clientDialog.editing, clientForm)
        toast({ title: 'Cliente atualizado' })
      } else {
        await createClient(clientForm)
        toast({ title: 'Cliente cadastrado' })
      }
      setClientDialog({ open: false, editing: null })
      await load()
    } catch (e) {
      if (e instanceof ErpValidationError) setClientErrors(e.fields)
      else
        toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const confirmDeleteClient = async () => {
    if (!clientDelete) return
    setSaving(true)
    try {
      await deleteClient(clientDelete.id)
      toast({ title: 'Cliente excluído' })
      setClientDelete(null)
      await load()
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const openNewOpportunity = (c: ClientRecord) => {
    setOppForm({ ...emptyOpportunityForm, title: `${c.name} — ambiente sob medida` })
    setOppErrors({})
    setOppDialog({ open: true, editing: null, clientId: c.id, clientName: c.name })
  }

  const openEditOpportunity = (o: OpportunityRecord) => {
    setOppForm({
      title: o.title ?? '',
      value: o.value ? String(o.value) : '',
      stage: o.stage,
      next_action: o.next_action ?? '',
      next_action_date: o.next_action_date ? o.next_action_date.slice(0, 10) : '',
      lost_reason: o.lost_reason ?? '',
      notes: o.notes ?? '',
    })
    setOppErrors({})
    setOppDialog({ open: true, editing: o, clientId: o.client, clientName: clientName(o.client) })
  }

  const saveOpportunity = async () => {
    const errors = validateOpportunity(oppForm)
    if (Object.keys(errors).length > 0) {
      setOppErrors(errors)
      return
    }
    setSaving(true)
    try {
      if (oppDialog.editing) {
        await updateOpportunity(oppDialog.editing.id, oppDialog.editing, oppForm)
        toast({ title: 'Oportunidade atualizada' })
      } else {
        await createOpportunity(oppDialog.clientId, oppForm)
        toast({ title: 'Oportunidade criada no funil' })
      }
      setOppDialog({ open: false, editing: null, clientId: '', clientName: '' })
      await load()
    } catch (e) {
      if (e instanceof ErpValidationError) setOppErrors(e.fields)
      else
        toast({ title: 'Erro ao salvar', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const moveStage = async (o: OpportunityRecord, stage: FunnelStage) => {
    try {
      await moveOpportunityStage(o.id, o, stage)
      await load()
      toast({ title: `Etapa alterada para "${FUNNEL_STAGE_LABELS[stage]}"` })
    } catch (e) {
      toast({
        title: 'Erro ao mover etapa',
        description: getErrorMessage(e),
        variant: 'destructive',
      })
    }
  }

  const confirmDeleteOpportunity = async () => {
    if (!oppDelete) return
    setSaving(true)
    try {
      await deleteOpportunity(oppDelete.id)
      toast({ title: 'Oportunidade excluída' })
      setOppDelete(null)
      await load()
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const openLog = async (c: ClientRecord) => {
    setLogFor(c)
    try {
      setLogRows(await listActivityLog('clients', c.id))
    } catch {
      setLogRows([])
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-300" />
      </div>
    )
  }

  return (
    <div>
      <ErpPageHeader
        title="Clientes & CRM"
        subtitle="Cadastro de clientes e funil de vendas completo."
        actions={
          <Button onClick={openNewClient} className="bg-amber-300 text-zinc-900 hover:bg-amber-200">
            <UserPlus className="mr-2 h-4 w-4" /> Novo cliente
          </Button>
        }
      />

      {/* Alertas de retorno */}
      {awaitingReturn.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-300/30 bg-amber-300/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            {awaitingReturn.length} oportunidade(s) aguardando retorno
          </p>
          <ul className="mt-2 space-y-1">
            {awaitingReturn.slice(0, 4).map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300"
              >
                <span>
                  <span className="text-zinc-100">{clientName(o.client)}</span> — {o.title}
                  {o.next_action_date && (
                    <span className="text-red-300">
                      {' '}
                      · ação vencida {formatDate(o.next_action_date)}
                    </span>
                  )}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-amber-300/40 text-amber-200 hover:bg-amber-300/10"
                  onClick={() => openEditOpportunity(o)}
                >
                  Registrar ação
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Funil visual */}
      <ErpSectionTitle>Funil de vendas</ErpSectionTitle>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3">
          {stageTotals.map((s, idx) => (
            <div
              key={s.stage}
              className={cn(
                'w-52 shrink-0 rounded-lg border bg-white/[0.03] p-3',
                s.stage === 'venda_fechada' && 'border-emerald-400/30',
                s.stage === 'venda_perdida' && 'border-red-400/30',
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-amber-200/90">
                  {idx + 1}. {FUNNEL_STAGE_LABELS[s.stage]}
                </p>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300">
                  {s.count}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">{formatCurrency(s.value)}</p>
              <ul className="mt-3 space-y-2">
                {opportunities
                  .filter((o) => o.stage === s.stage)
                  .map((o) => (
                    <li
                      key={o.id}
                      className="rounded-md border border-white/10 bg-[#1d1f24] p-2 text-xs"
                    >
                      <p className="font-medium text-zinc-100">{clientName(o.client)}</p>
                      <p className="mt-0.5 text-zinc-400">{o.title}</p>
                      <p className="mt-1 text-zinc-300">{formatCurrency(o.value ?? 0)}</p>
                      {o.next_action && (
                        <p
                          className={`mt-1 ${isOverdue(o.next_action_date) ? 'text-red-300' : 'text-amber-200/80'}`}
                        >
                          {o.next_action}
                          {o.next_action_date ? ` · ${formatDate(o.next_action_date)}` : ''}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-1">
                        {idx < FUNNEL_STAGES.length - 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-[10px] text-amber-200 hover:bg-amber-300/10"
                            onClick={() => moveStage(o, FUNNEL_STAGES[idx + 1])}
                            title={`Mover para ${FUNNEL_STAGE_LABELS[FUNNEL_STAGES[idx + 1]]}`}
                          >
                            <ArrowRight className="h-3 w-3" />
                            {FUNNEL_STAGE_LABELS[FUNNEL_STAGES[idx + 1]]}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] text-zinc-300 hover:bg-white/10"
                          onClick={() => openEditOpportunity(o)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] text-red-300 hover:bg-red-400/10"
                          onClick={() => setOppDelete(o)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="mt-8">
        <ErpSectionTitle>Clientes cadastrados ({filteredClients.length})</ErpSectionTitle>
        <Input
          placeholder="Buscar por nome, documento, telefone ou e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 max-w-md bg-white/5"
        />
        {filteredClients.length === 0 ? (
          <ErpEmptyState
            title="Nenhum cliente cadastrado"
            description="Cadastre o primeiro cliente ou converta um contato do site no painel."
            icon={<UserPlus className="h-8 w-8" />}
            action={
              <Button
                onClick={openNewClient}
                className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
              >
                <Plus className="mr-2 h-4 w-4" /> Cadastrar cliente
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-400">
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Contato</th>
                  <th className="px-3 py-2">Origem</th>
                  <th className="px-3 py-2">Oportunidades</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-2">
                      <p className="font-medium text-zinc-100">{c.name}</p>
                      {c.client_type && (
                        <p className="text-[11px] text-zinc-500">
                          {CLIENT_TYPE_LABELS[c.client_type]}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">{c.document || '—'}</td>
                    <td className="px-3 py-2 text-zinc-300">
                      <p>{c.phone || c.whatsapp || '—'}</p>
                      {c.email && <p className="text-[11px] text-zinc-500">{c.email}</p>}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {c.origin ? CLIENT_ORIGIN_LABELS[c.origin] : '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {clientOpportunities(c.id).length}
                      {clientOpportunities(c.id).length > 0 && (
                        <span className="ml-1 text-[11px] text-zinc-500">
                          (
                          {formatCurrency(
                            clientOpportunities(c.id).reduce((a, o) => a + (o.value ?? 0), 0),
                          )}
                          )
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-amber-200 hover:bg-amber-300/10"
                          onClick={() => openNewOpportunity(c)}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Oportunidade
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-zinc-300 hover:bg-white/10"
                          onClick={() => openEditClient(c)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-zinc-400 hover:bg-white/10"
                          onClick={() => openLog(c)}
                          title="Histórico"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-red-300 hover:bg-red-400/10"
                          onClick={() => setClientDelete(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog: cliente */}
      <Dialog
        open={clientDialog.open}
        onOpenChange={(o) => setClientDialog({ open: o, editing: clientDialog.editing })}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{clientDialog.editing ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Dados cadastrais completos do cliente.
            </DialogDescription>
          </DialogHeader>
          <ClientFields form={clientForm} setForm={setClientForm} errors={clientErrors} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClientDialog({ open: false, editing: null })}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveClient}
              disabled={saving}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: oportunidade */}
      <Dialog
        open={oppDialog.open}
        onOpenChange={(o) =>
          setOppDialog({
            open: o,
            editing: oppDialog.editing,
            clientId: oppDialog.clientId,
            clientName: oppDialog.clientName,
          })
        }
      >
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {oppDialog.editing
                ? 'Editar oportunidade'
                : `Nova oportunidade — ${oppDialog.clientName}`}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Etapa, valor e próxima ação com data.
            </DialogDescription>
          </DialogHeader>
          <OpportunityFields form={oppForm} setForm={setOppForm} errors={oppErrors} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setOppDialog({ open: false, editing: null, clientId: '', clientName: '' })
              }
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveOpportunity}
              disabled={saving}
              className="bg-amber-300 text-zinc-900 hover:bg-amber-200"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmações de exclusão */}
      <Dialog open={!!clientDelete} onOpenChange={(o) => !o && setClientDelete(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Excluir "{clientDelete?.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClientDelete(null)}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button onClick={confirmDeleteClient} disabled={saving} variant="destructive">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!oppDelete} onOpenChange={(o) => !o && setOppDelete(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir oportunidade</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Excluir "{oppDelete?.title}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOppDelete(null)}
              className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button onClick={confirmDeleteOpportunity} disabled={saving} variant="destructive">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico do cliente */}
      <Dialog open={!!logFor} onOpenChange={(o) => !o && setLogFor(null)}>
        <DialogContent className="border-white/10 bg-[#1d1f24] text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico — {logFor?.name}</DialogTitle>
            <DialogDescription className="text-zinc-400">Alterações registradas.</DialogDescription>
          </DialogHeader>
          {logRows.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhuma alteração registrada.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto text-xs">
              {logRows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <p className="text-zinc-200">
                    {r.action} — {r.description}
                  </p>
                  <p className="mt-0.5 text-zinc-500">
                    {formatDateTime(r.created)}
                    {r.field ? ` · ${r.field}: ${r.old_value || '—'} → ${r.new_value || '—'}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
