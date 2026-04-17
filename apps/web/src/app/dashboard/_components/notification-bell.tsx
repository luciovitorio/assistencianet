'use client'

import { useState, useEffect, useTransition } from 'react'
import { Bell, Building2, Package, AlertTriangle, Check, CheckCheck, ClipboardList, UserX, MessagesSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useRouteTransition } from '@/components/ui/route-transition-indicator'
import { createClient } from '@/lib/supabase/client'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  checkThirdPartyOverdueNotifications,
  checkInactiveClientNotifications,
  type Notification,
} from '@/app/actions/notifications'

export function NotificationBell() {
  const { navigate } = useRouteTransition()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    // Verifica OS com prazo de terceiro vencido (fire-and-forget)
    checkThirdPartyOverdueNotifications().catch(() => null)
    // Verifica clientes sem retorno há mais de 3 meses (fire-and-forget)
    checkInactiveClientNotifications(3).catch(() => null)

    getNotifications().then(setNotifications)

    // Polling de fallback caso o WebSocket não esteja disponível
    const interval = setInterval(() => {
      getNotifications().then(setNotifications)
    }, 30_000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (open) {
      getNotifications().then(setNotifications)
    }
  }, [open])

  // Atualiza o sino em tempo real quando uma nova notificação chega
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('notification-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          // Rebusca a lista completa para manter consistência com RLS
          getNotifications().then(setNotifications)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function handleMarkAsRead(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id))
    startTransition(async () => {
      await markNotificationAsRead(id)
    })
  }

  function handleMarkAllAsRead() {
    setNotifications([])
    startTransition(async () => {
      await markAllNotificationsAsRead()
      setOpen(false)
    })
  }

  function handleNotificationClick(notification: Notification) {
    setNotifications(prev => prev.filter(n => n.id !== notification.id))
    setOpen(false)

    startTransition(async () => {
      await markNotificationAsRead(notification.id)
    })

    if (notification.type === 'retorno_terceiro_vencido' && notification.service_order_id) {
      navigate(`/dashboard/ordens-de-servico/${notification.service_order_id}`)
      return
    }

    if (notification.type === 'cliente_inativo') {
      navigate('/dashboard/clientes')
      return
    }

    if (notification.type === 'whatsapp_atendimento') {
      navigate('/dashboard/atendimento')
      return
    }

    if (!notification.part_id) return

    const params = new URLSearchParams({ part: notification.part_id })
    if (notification.branch_id) params.set('branch', notification.branch_id)

    navigate(`/dashboard/estoque?${params.toString()}`)
  }

  const count = notifications.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="p-2 text-muted-foreground hover:text-primary transition-colors relative cursor-pointer">
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-4.5 h-4.5 bg-destructive rounded-full text-[10px] text-white font-bold flex items-center justify-center px-1 leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">Notificações</span>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1.5 text-muted-foreground"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
            >
              <CheckCheck className="size-3.5" />
              Marcar todas como vistas
            </Button>
          )}
        </div>

        {/* Empty state */}
        {count === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Bell className="size-8 opacity-25" />
            <span>Nenhuma notificação</span>
          </div>
        ) : (
          <div className="max-h-120 overflow-y-auto divide-y divide-border">
            {notifications.map(n => (
              <div
                key={n.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                {/* Ícone do tipo */}
                <div
                  className={`mt-0.5 rounded-full p-1.5 shrink-0 ${
                    n.type === 'estoque_zerado'
                      ? 'bg-destructive/10 text-destructive'
                      : n.type === 'nova_os'
                        ? 'bg-blue-500/10 text-blue-600'
                        : n.type === 'retorno_terceiro_vencido'
                          ? 'bg-indigo-500/10 text-indigo-600'
                          : n.type === 'cliente_inativo'
                            ? 'bg-orange-500/10 text-orange-600'
                            : n.type === 'whatsapp_atendimento'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-yellow-500/10 text-yellow-600'
                  }`}
                >
                  {n.type === 'estoque_zerado' ? (
                    <Package className="size-3.5" />
                  ) : n.type === 'nova_os' ? (
                    <ClipboardList className="size-3.5" />
                  ) : n.type === 'retorno_terceiro_vencido' ? (
                    <Building2 className="size-3.5" />
                  ) : n.type === 'cliente_inativo' ? (
                    <UserX className="size-3.5" />
                  ) : n.type === 'whatsapp_atendimento' ? (
                    <MessagesSquare className="size-3.5" />
                  ) : (
                    <AlertTriangle className="size-3.5" />
                  )}
                </div>

                {/* Texto */}
                {n.type === 'retorno_terceiro_vencido' || n.type === 'estoque_baixo' || n.type === 'estoque_zerado' || n.type === 'cliente_inativo' || n.type === 'whatsapp_atendimento' ? (
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => handleNotificationClick(n)}
                  >
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </button>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                )}

                {/* Botão marcar como visto */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-primary mt-0.5"
                  title="Marcar como visto"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleMarkAsRead(n.id)
                  }}
                  disabled={isPending}
                >
                  <Check className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
