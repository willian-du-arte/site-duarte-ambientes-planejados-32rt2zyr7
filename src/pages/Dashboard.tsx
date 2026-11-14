import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  listContacts,
  updateContactStatus,
  updateContactNotes,
  deleteContact,
} from '@/services/contacts'
import { convertContact } from '@/services/contact-conversion'
import { logout, getCurrentUser } from '@/services/auth'
import type { ContactRecord, ContactStatus } from '@/types/contact'
import {
  Compass,
  LogOut,
  RefreshCw,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Trash2,
  MessageSquare,
  Search,
  ExternalLink,
  ChevronDown,
  UserPlus,
} from 'lucide-react'

const STATUS_LABELS: Record<
  ContactStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  novo: {
    label: 'Novo',
    bg: 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
    text: 'text-amber-900 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  atendido: {
    label: 'Atendido',
    bg: 'bg-blue-100 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800',
    text: 'text-blue-900 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  orcamento_enviado: {
    label: 'Orçamento Enviado',
    bg: 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
    text: 'text-emerald-900 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  convertido: {
    label: 'Convertido em cliente',
    bg: 'bg-violet-100 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800',
    text: 'text-violet-900 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
}

export default function ContactsDashboard() {
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingNotesItem, setEditingNotesItem] = useState<ContactRecord | null>(null)
  const [notesText, setNotesText] = useState('')
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ContactRecord | null>(null)
  const [convertTarget, setConvertTarget] = useState<ContactRecord | null>(null)
  const [converting, setConverting] = useState(false)
  const [convertedMsg, setConvertedMsg] = useState('')

  const navigate = useNavigate()
  const user = getCurrentUser()

  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listContacts(
        statusFilter === 'all' ? undefined : (statusFilter as ContactStatus),
      )
      setContacts(data)
    } catch (err) {
      console.error('Erro ao carregar contatos:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const handleStatusChange = async (id: string, newStatus: ContactStatus) => {
    setUpdatingId(id)
    try {
      const updated = await updateContactStatus(id, newStatus)
      setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)))
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      alert('Não foi possível atualizar o status do contato.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSaveNotes = async () => {
    if (!editingNotesItem) return
    try {
      const updated = await updateContactNotes(editingNotesItem.id, notesText)
      setContacts((prev) => prev.map((c) => (c.id === editingNotesItem.id ? updated : c)))
      setEditingNotesItem(null)
    } catch (err) {
      console.error('Erro ao salvar observação:', err)
      alert('Não foi possível salvar a observação.')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmItem) return
    try {
      await deleteContact(deleteConfirmItem.id)
      setContacts((prev) => prev.filter((c) => c.id !== deleteConfirmItem.id))
      setDeleteConfirmItem(null)
    } catch (err) {
      console.error('Erro ao remover contato:', err)
      alert('Não foi possível remover o contato.')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleConvert = async () => {
    if (!convertTarget) return
    setConverting(true)
    try {
      const result = await convertContact(convertTarget)
      setContacts((prev) =>
        prev.map((c) =>
          c.id === convertTarget.id
            ? { ...c, status: 'convertido' as ContactStatus, converted_client: result.clientId }
            : c,
        ),
      )
      setConvertedMsg(
        `${convertTarget.name} virou cliente no CRM, com oportunidade na etapa "Novo contato".`,
      )
      setConvertTarget(null)
    } catch (err) {
      console.error('Erro ao converter contato:', err)
      alert('Não foi possível converter o contato em cliente.')
    } finally {
      setConverting(false)
    }
  }

  const filteredContacts = contacts.filter((c) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      c.name.toLowerCase().includes(term) ||
      c.contact_info.toLowerCase().includes(term) ||
      c.need.toLowerCase().includes(term)
    )
  })

  const countByStatus = {
    all: contacts.length,
    novo: contacts.filter((c) => c.status === 'novo').length,
    atendido: contacts.filter((c) => c.status === 'atendido').length,
    orcamento_enviado: contacts.filter((c) => c.status === 'orcamento_enviado').length,
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Top bar */}
      <div className="bg-card border-b border-border sticky top-0 z-30 shadow-subtle">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-warm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-xl text-foreground">Painel de Contatos</h1>
              <p className="text-xs text-muted-foreground">
                Duarte Ambientes Planejados • Acesso do Dono ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadContacts}
              disabled={loading}
              className="rounded-xl border-border gap-1.5 h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="rounded-xl border-border gap-1.5 h-9"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Site</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="rounded-xl text-destructive hover:bg-destructive/10 gap-1.5 h-9"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pt-8 max-w-6xl">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === 'all'
                ? 'bg-primary/10 border-primary shadow-warm'
                : 'bg-card border-border hover:border-wood-300'
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground mb-1">Total de Contatos</div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              {countByStatus.all}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('novo')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === 'novo'
                ? 'bg-amber-500/10 border-amber-500 shadow-warm'
                : 'bg-card border-border hover:border-amber-300'
            }`}
          >
            <div className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Novos (Aguardando)
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-900 dark:text-amber-200">
              {countByStatus.novo}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('atendido')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === 'atendido'
                ? 'bg-blue-500/10 border-blue-500 shadow-warm'
                : 'bg-card border-border hover:border-blue-300'
            }`}
          >
            <div className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Atendidos
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-blue-900 dark:text-blue-200">
              {countByStatus.atendido}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('orcamento_enviado')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === 'orcamento_enviado'
                ? 'bg-emerald-500/10 border-emerald-500 shadow-warm'
                : 'bg-card border-border hover:border-emerald-300'
            }`}
          >
            <div className="text-xs font-medium text-emerald-800 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Orçamento Enviado
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-900 dark:text-emerald-200">
              {countByStatus.orcamento_enviado}
            </div>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 shadow-subtle flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, contato ou pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Filtrar por etapa:
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] rounded-xl h-10 bg-background">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({countByStatus.all})</SelectItem>
                <SelectItem value="novo">Novo ({countByStatus.novo})</SelectItem>
                <SelectItem value="atendido">Atendido ({countByStatus.atendido})</SelectItem>
                <SelectItem value="orcamento_enviado">
                  Orçamento Enviado ({countByStatus.orcamento_enviado})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contact List */}
        {loading ? (
          <div className="py-20 text-center bg-card border border-border rounded-2xl">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Carregando contatos recebidos...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="py-16 text-center bg-card border border-border rounded-2xl p-6">
            <MessageSquare className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-serif font-bold text-lg text-foreground mb-1">
              Nenhum contato encontrado
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-4">
              {searchTerm
                ? 'Nenhum contato corresponde ao termo pesquisado.'
                : 'Quando novos clientes preencherem o formulário no site, eles aparecerão aqui instantaneamente.'}
            </p>
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="rounded-xl"
              >
                Limpar busca
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContacts.map((contact) => {
              const statusCfg = STATUS_LABELS[contact.status] || STATUS_LABELS.novo
              return (
                <div
                  key={contact.id}
                  className="bg-card border border-border/80 hover:border-wood-300 rounded-2xl p-5 sm:p-6 shadow-subtle transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Contact identity & details */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-serif font-bold text-lg sm:text-xl text-foreground">
                          {contact.name}
                        </h3>

                        {contact.status === 'convertido' && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-violet-100 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800 text-violet-900 dark:text-violet-300">
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Convertido em cliente</span>
                          </div>
                        )}

                        {/* Status Badge */}
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                          <span>{statusCfg.label}</span>
                        </div>
                      </div>

                      {/* Phone / Email / Date info */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Phone className="w-4 h-4 text-primary shrink-0" />
                          <span>{contact.contact_info}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>Recebido em {formatDate(contact.created)}</span>
                        </div>
                      </div>

                      {/* Client Need / Request */}
                      <div className="bg-wood-50/70 dark:bg-muted/40 border border-wood-200/60 dark:border-border rounded-xl p-3.5 mt-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Necessidade / Projeto solicitado:
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {contact.need}
                        </p>
                      </div>

                      {/* Internal Notes if any */}
                      {contact.notes && (
                        <div className="text-xs text-muted-foreground bg-accent/40 rounded-lg p-2.5 flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-foreground">
                              Anotações internas:{' '}
                            </span>
                            <span>{contact.notes}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions: change status, notes, delete */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-border">
                      {contact.status !== 'convertido' && (
                        <Button
                          size="sm"
                          disabled={converting}
                          onClick={() => setConvertTarget(contact)}
                          className="rounded-xl gap-1.5 h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Converter em cliente</span>
                        </Button>
                      )}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs text-muted-foreground whitespace-nowrap lg:hidden">
                          Alterar status:
                        </span>
                        <Select
                          value={contact.status}
                          disabled={updatingId === contact.id}
                          onValueChange={(val) =>
                            handleStatusChange(contact.id, val as ContactStatus)
                          }
                        >
                          <SelectTrigger className="rounded-xl h-10 w-full sm:w-[190px] bg-background font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="novo">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>Marcar como Novo</span>
                              </span>
                            </SelectItem>
                            <SelectItem value="atendido">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>Marcar Atendido</span>
                              </span>
                            </SelectItem>
                            <SelectItem value="orcamento_enviado">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Orçamento Enviado</span>
                              </span>
                            </SelectItem>
                            <SelectItem value="convertido">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-violet-500" />
                                <span>Convertido em cliente</span>
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingNotesItem(contact)
                            setNotesText(contact.notes || '')
                          }}
                          className="rounded-xl text-xs text-muted-foreground hover:text-foreground h-9"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          <span>{contact.notes ? 'Editar nota' : '+ Nota'}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmItem(contact)}
                          className="rounded-xl text-xs text-destructive hover:bg-destructive/10 h-9 px-2.5"
                          title="Excluir contato"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialog: confirmar conversão */}
      <Dialog open={!!convertTarget} onOpenChange={(open) => !open && setConvertTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Converter em cliente</DialogTitle>
            <DialogDescription>
              Criar <strong>{convertTarget?.name}</strong> no CRM como cliente e abrir uma
              oportunidade na etapa "Novo contato"? O contato será marcado como convertido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConvertTarget(null)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleConvert}
              disabled={converting}
              className="rounded-xl bg-primary text-primary-foreground"
            >
              {converting ? 'Convertendo...' : 'Converter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aviso de conversão concluída */}
      <Dialog open={!!convertedMsg} onOpenChange={(open) => !open && setConvertedMsg('')}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Contato convertido
            </DialogTitle>
            <DialogDescription>{convertedMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConvertedMsg('')}
              className="rounded-xl bg-primary text-primary-foreground"
            >
              Ok
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for notes */}
      <Dialog open={!!editingNotesItem} onOpenChange={(open) => !open && setEditingNotesItem(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Anotação Interna</DialogTitle>
            <DialogDescription>
              Adicione notas sobre o contato com <strong>{editingNotesItem?.name}</strong> (visitas,
              detalhes de medidas, valores acordados).
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Ex.: Visita realizada no imóvel no dia 12. Cliente prefere MDF amadeirado Louro Freijó..."
              rows={4}
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditingNotesItem(null)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNotes}
              className="rounded-xl bg-primary text-primary-foreground"
            >
              Salvar Anotação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for delete confirmation */}
      <Dialog
        open={!!deleteConfirmItem}
        onOpenChange={(open) => !open && setDeleteConfirmItem(null)}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Remover contato?
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o contato de <strong>{deleteConfirmItem?.name}</strong>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmItem(null)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl">
              Sim, remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
