'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  CheckCheck,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  User,
  UserCheck,
  X,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  assumeConversation,
  getConversationMessages,
  getCurrentEmployeeId,
  markConversationRead,
  reopenConversation,
  resolveConversation,
  sendAtendimentoReply,
  deleteConversation,
  type ConversationRow,
  type MessageRow,
} from '@/app/actions/atendimento'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'

// ── Tipos ────────────────────────────────────────────────────

interface AtendimentoShellProps {
  initialConversations: ConversationRow[]
  companyId: string
  isAdmin: boolean
  branches: { id: string; name: string }[]
}

// ── Helpers de formatação ────────────────────────────────────

const formatTime = (iso: string | null) => {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHour = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min`
  if (diffHour < 24) return `${diffHour}h`
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const formatMessageTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const STATUS_CONFIG = {
  bot: { label: 'Bot', className: 'bg-slate-100 text-slate-600' },
  waiting: { label: 'Aguardando', className: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'Em atendimento', className: 'bg-emerald-100 text-emerald-700' },
  resolved: { label: 'Resolvido', className: 'bg-slate-100 text-slate-500' },
} as const

const getContactLabel = (c: ConversationRow) =>
  c.contact_name ?? c.clients?.name ?? c.phone_number

// ── Componentes auxiliares ───────────────────────────────────

function StatusBadge({ status }: { status: ConversationRow['status'] }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.bot
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', config.className)}>
      {config.label}
    </span>
  )
}

function ConversationItem({
  conversation,
  selected,
  onClick,
}: {
  conversation: ConversationRow
  selected: boolean
  onClick: () => void
}) {
  const label = getContactLabel(conversation)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors',
        selected && 'bg-emerald-50 border-l-2 border-l-emerald-500',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm font-semibold text-slate-900 flex-1">{label}</span>
        <div className="flex items-center gap-1.5 flex-none">
          {conversation.unread_count > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          )}
          <span className="text-[10px] text-slate-400">{formatTime(conversation.last_message_at)}</span>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <StatusBadge status={conversation.status} />
        {conversation.branches?.name && (
          <span className="text-[10px] text-slate-400 truncate">{conversation.branches.name}</span>
        )}
      </div>

      {conversation.last_message_preview && (
        <p className="mt-1 truncate text-xs text-slate-500">{conversation.last_message_preview}</p>
      )}
    </button>
  )
}

function MessageBubble({ message }: { message: MessageRow }) {
  const isInbound = message.direction === 'inbound'

  return (
    <div className={cn('flex', isInbound ? 'justify-start' : 'justify-end')}>
      <div className={cn('max-w-[75%] space-y-1')}>
        {!isInbound && message.sender_name && (
          <p className="text-right text-[10px] text-slate-400">{message.sender_name}</p>
        )}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap wrap-break-word',
            isInbound
              ? 'rounded-tl-sm bg-slate-100 text-slate-900'
              : message.sent_by_bot
                ? 'rounded-tr-sm bg-emerald-100 text-emerald-900'
                : 'rounded-tr-sm bg-blue-500 text-white',
          )}
        >
          {message.content}
        </div>
        <p className={cn('text-[10px] text-slate-400', isInbound ? 'text-left' : 'text-right')}>
          {formatMessageTime(message.created_at)}
          {!isInbound && message.sent_by_bot && ' · Bot'}
        </p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
      <MessageSquare className="size-12 stroke-[1.2]" />
      <p className="text-sm font-medium">Selecione uma conversa</p>
    </div>
  )
}

// ── Shell principal ──────────────────────────────────────────

export function AtendimentoShell({
  initialConversations,
  companyId,
  isAdmin,
  branches,
}: AtendimentoShellProps) {
  const [conversations, setConversations] = React.useState(initialConversations)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<MessageRow[]>([])
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [replyText, setReplyText] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [branchFilter, setBranchFilter] = React.useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [currentEmployeeId, setCurrentEmployeeId] = React.useState<string | null>(null)

  const selectedIdRef = React.useRef(selectedId)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Mantém ref em sincronia para usar em closures de Realtime
  React.useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  // Scroll automático ao adicionar mensagens
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Identifica o employee atual (para saber se a conversa é dele)
  React.useEffect(() => {
    getCurrentEmployeeId().then(setCurrentEmployeeId)
  }, [])

  // Realtime: conversas + mensagens
  React.useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`atendimento-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConversations((prev) => [payload.new as ConversationRow, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ConversationRow
            setConversations((prev) =>
              prev
                .map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
                .sort((a, b) => {
                  const ta = a.last_message_at ?? a.created_at
                  const tb = b.last_message_at ?? b.created_at
                  return tb.localeCompare(ta)
                }),
            )
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const msg = payload.new as MessageRow
          if (msg.conversation_id === selectedIdRef.current) {
            setMessages((prev) => {
              // Evita duplicatas (mensagem enviada pelo próprio atendente)
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [companyId])

  // Carrega mensagens ao selecionar conversa
  const handleSelectConversation = async (id: string) => {
    if (id === selectedId) return
    setSelectedId(id)
    setMessages([])
    setLoadingMessages(true)
    const msgs = await getConversationMessages(id)
    setMessages(msgs)
    setLoadingMessages(false)
    await markConversationRead(id)
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)))
  }

  // Enviar resposta
  const handleSend = async () => {
    if (!selectedId || !replyText.trim() || sending) return
    const text = replyText.trim()
    setReplyText('')
    setSending(true)
    const result = await sendAtendimentoReply(selectedId, text)
    if (result.error) {
      toast.error(result.error)
      setReplyText(text)
    } else if (result.message) {
      setMessages((prev) =>
        prev.some((m) => m.id === result.message!.id) ? prev : [...prev, result.message!],
      )
      if (conversations.find((c) => c.id === selectedId)?.status === 'waiting') {
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, status: 'in_progress' as const, bot_enabled: false } : c)),
        )
      }
    }
    setSending(false)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Ações de status
  const handleAssume = async () => {
    if (!selectedId) return
    const result = await assumeConversation(selectedId)
    if (result.error) { toast.error(result.error); return }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, status: 'in_progress' as const, bot_enabled: false, assigned_to: result.assignedTo ?? currentEmployeeId }
          : c,
      ),
    )
    toast.success('Conversa assumida.')
  }

  const handleResolve = async () => {
    if (!selectedId) return
    const result = await resolveConversation(selectedId)
    if (result.error) { toast.error(result.error); return }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, status: 'resolved' as const, bot_enabled: false, assigned_to: null }
          : c,
      ),
    )
    toast.success('Conversa encerrada.')
  }

  const handleReopen = async () => {
    if (!selectedId) return
    const result = await reopenConversation(selectedId)
    if (result.error) { toast.error(result.error); return }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? {
              ...c,
              status: 'in_progress' as const,
              bot_enabled: false,
              bot_state: null,
              assigned_to: result.assignedTo ?? currentEmployeeId,
            }
          : c,
      ),
    )
    toast.success('Conversa reaberta. Você assumiu o atendimento.')
  }

  const handleDelete = async () => {
    if (!selectedId) return
    
    const result = await deleteConversation(selectedId)
    if (result.error) { toast.error(result.error); return }
    
    setConversations((prev) => prev.filter((c) => c.id !== selectedId))
    setSelectedId(null)
    setMessages([])
    setDeleteDialogOpen(false)
    toast.success('Conversa excluída.')
  }

  const filteredConversations = React.useMemo(() => {
    // Conversas ainda no bot (sem solicitação de atendimento humano) não aparecem aqui —
    // a lista é para o técnico atender clientes que pediram atendimento.
    let list = conversations.filter((c) => c.status !== 'bot')
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter)
    }
    if (branchFilter !== 'all') {
      list = list.filter((c) => c.branch_id === branchFilter)
    }
    if (search) {
      const term = search.toLowerCase()
      list = list.filter(
        (c) =>
          getContactLabel(c).toLowerCase().includes(term) ||
          c.phone_number.includes(term),
      )
    }
    return list
  }, [conversations, statusFilter, branchFilter, search])

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null

  const STATUS_FILTERS = [
    { value: 'all', label: 'Todos' },
    { value: 'waiting', label: 'Aguardando' },
    { value: 'in_progress', label: 'Em atendimento' },
    { value: 'resolved', label: 'Resolvidos' },
  ]

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {/* ── Painel esquerdo: lista ─────────────────────── */}
      <div className="flex w-80 flex-none flex-col border-r border-slate-200 bg-white">
        {/* Header da lista */}
        <div className="border-b border-slate-100 p-4 space-y-3">
          <h2 className="text-base font-bold text-slate-900">Atendimento</h2>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contato..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="size-3.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Filtro de status */}
          <div className="pb-0.5">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
              <SelectTrigger className="w-full h-8 text-xs font-semibold bg-slate-50" size="sm">
                {statusFilter ? (
                  <span className="flex flex-1 text-left line-clamp-1">
                    {STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}
                  </span>
                ) : (
                  <SelectValue placeholder="Filtrar por status" />
                )}
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-xs">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de filial (apenas admin) */}
          {isAdmin && branches.length > 1 && (
            <div className="pb-0.5">
              <Select value={branchFilter} onValueChange={(val) => setBranchFilter(val || 'all')}>
                <SelectTrigger className="w-full h-8 text-xs font-semibold bg-slate-50" size="sm">
                  <span className="flex flex-1 text-left line-clamp-1">
                    {branchFilter === 'all'
                      ? 'Todas as filiais'
                      : (branches.find((b) => b.id === branchFilter)?.name ?? 'Filial')}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todas as filiais
                  </SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Lista de conversas */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
              <MessageSquare className="size-8 stroke-[1.2]" />
              <p className="text-xs">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                selected={c.id === selectedId}
                onClick={() => handleSelectConversation(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Painel direito: chat ───────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 bg-slate-50">
        {!selectedConversation ? (
          <EmptyState />
        ) : (
          <>
            {/* Header do chat */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-slate-900">
                    {getContactLabel(selectedConversation)}
                  </span>
                  <StatusBadge status={selectedConversation.status} />
                  {!selectedConversation.bot_enabled && selectedConversation.status !== 'resolved' && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      Bot pausado
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Phone className="size-3" />
                    {selectedConversation.phone_number}
                  </span>
                  {selectedConversation.clients?.name && (
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {selectedConversation.clients.name}
                    </span>
                  )}
                  {selectedConversation.branches?.name && (
                    <span className="text-slate-400">
                      {selectedConversation.branches.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 flex-none">
                {selectedConversation.status === 'waiting' && !selectedConversation.assigned_to && (
                  <Button size="sm" variant="outline" onClick={handleAssume} className="gap-1.5">
                    <UserCheck className="size-3.5" />
                    Assumir
                  </Button>
                )}
                {selectedConversation.status === 'in_progress' &&
                  selectedConversation.assigned_to === currentEmployeeId && (
                    <Button size="sm" variant="outline" onClick={handleResolve} className="gap-1.5">
                      <CheckCheck className="size-3.5" />
                      Resolver
                    </Button>
                  )}
                {selectedConversation.status === 'resolved' && (
                  <Button size="sm" variant="outline" onClick={handleReopen} className="gap-1.5">
                    <RefreshCw className="size-3.5" />
                    Reabrir
                  </Button>
                )}
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => setDeleteDialogOpen(true)} className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <Trash2 className="size-3.5" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12 text-sm text-slate-400">
                  Carregando mensagens…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-slate-400">
                  Nenhuma mensagem ainda.
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de resposta */}
            <div className="border-t border-slate-200 bg-white p-4">
              {selectedConversation.status === 'resolved' ? (
                <p className="text-center text-xs text-slate-400">
                  Conversa encerrada. Reabra para enviar mensagens.
                </p>
              ) : selectedConversation.assigned_to && selectedConversation.assigned_to !== currentEmployeeId ? (
                <p className="text-center text-xs text-slate-400">
                  Esta conversa está em atendimento por outro técnico.
                </p>
              ) : !selectedConversation.assigned_to ? (
                <p className="text-center text-xs text-slate-400">
                  Clique em “Assumir” para responder esta conversa.
                </p>
              ) : (
                <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-3xl pb-1 pl-1 pr-1 pt-1 focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-400 transition-all">
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Mensagem"
                    rows={1}
                    className="flex-1 max-h-32 min-h-10 resize-none bg-transparent px-4 pt-2.5 pb-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none scrollbar-thin scrollbar-thumb-slate-300"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!replyText.trim() || sending}
                    className={cn(
                      "h-10 w-10 shrink-0 p-0 rounded-full transition-colors mb-0.5 mr-0.5",
                      replyText.trim() && !sending
                        ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                        : "bg-slate-200 text-slate-400"
                    )}
                  >
                    <Send className={cn("size-4", replyText.trim() && !sending ? "ml-0.5" : "")} />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conversa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
