'use client'

import * as React from 'react'
import {
  ChevronDown,
  ChevronRight,
  ListTree,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  deleteBotMenuItem,
  reorderBotMenuItems,
  toggleBotMenuItem,
  type BotMenuItemRow,
  type BotMenuItemWithChildren,
} from '@/app/actions/bot-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { HANDLER_TYPE_LABELS, type HandlerType } from '@/lib/validations/bot-menu-item'
import { BotMenuItemForm } from './bot-menu-item-form'

// ── Tipos ────────────────────────────────────────────────────

interface FormState {
  open: boolean
  parentId: string | null
  editing?: BotMenuItemRow
  nextPosition: number
}

const CLOSED_FORM: FormState = { open: false, parentId: null, nextPosition: 1 }

// ── Helpers ──────────────────────────────────────────────────

const TYPE_BADGE_VARIANT: Record<HandlerType, 'default' | 'secondary' | 'outline'> = {
  check_os: 'default',
  human_handoff: 'secondary',
  info: 'outline',
  submenu: 'secondary',
  url: 'outline',
}

function ItemRow({
  item,
  onEdit,
  onAddChild,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  children,
}: {
  item: BotMenuItemRow
  onEdit: () => void
  onAddChild?: () => void
  onDelete: () => void
  onToggle: (enabled: boolean) => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
  children?: React.ReactNode
}) {
  const [expanded, setExpanded] = React.useState(false)
  const hasChildren = React.Children.count(children) > 0

  return (
    <div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-950/5">
        {/* Expand (sub-menu) */}
        {item.handler_type === 'submenu' ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex size-6 shrink-0 items-center justify-center rounded text-slate-400 hover:text-slate-700"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}

        {/* Emoji + Label */}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {item.emoji && <span className="text-base leading-none">{item.emoji}</span>}
            <span className="truncate text-sm font-medium text-slate-800">{item.label}</span>
          </span>
        </span>

        {/* Tipo */}
        <Badge variant={TYPE_BADGE_VARIANT[item.handler_type as HandlerType]} className="shrink-0 text-xs">
          {HANDLER_TYPE_LABELS[item.handler_type as HandlerType]}
        </Badge>

        {/* Enabled toggle */}
        <Checkbox
          checked={item.enabled}
          onCheckedChange={(checked) => onToggle(!!checked)}
          title={item.enabled ? 'Desativar' : 'Ativar'}
        />

        {/* Ações */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={isFirst}
            onClick={onMoveUp}
            title="Mover para cima"
          >
            ▲
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={isLast}
            onClick={onMoveDown}
            title="Mover para baixo"
          >
            ▼
          </Button>
          <Button size="icon" variant="ghost" className="size-7" onClick={onEdit} title="Editar">
            <Pencil className="size-3.5" />
          </Button>
          {onAddChild && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={onAddChild}
              title="Adicionar item filho"
            >
              <Plus className="size-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Excluir"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Filhos (sub-menu) */}
      {expanded && hasChildren && (
        <div className="mt-1 ml-9 space-y-1">{children}</div>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────

interface Props {
  initialItems: BotMenuItemWithChildren[]
}

export function BotMenuManager({ initialItems }: Props) {
  const [items, setItems] = React.useState<BotMenuItemWithChildren[]>(initialItems)
  const [form, setForm] = React.useState<FormState>(CLOSED_FORM)
  const [isPending, startTransition] = React.useTransition()

  const refresh = () => {
    window.location.reload()
  }

  const openCreate = (parentId: string | null, currentCount: number) => {
    setForm({ open: true, parentId, nextPosition: currentCount + 1, editing: undefined })
  }

  const openEdit = (item: BotMenuItemRow) => {
    setForm({ open: true, parentId: item.parent_id, nextPosition: item.position, editing: item })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteBotMenuItem(id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Item removido.')
      refresh()
    })
  }

  const handleToggle = (id: string, enabled: boolean) => {
    startTransition(async () => {
      const result = await toggleBotMenuItem(id, enabled)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setItems((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, enabled }
            : {
                ...r,
                children: r.children.map((c) => (c.id === id ? { ...c, enabled } : c)),
              },
        ),
      )
    })
  }

  const moveRoot = (index: number, direction: 'up' | 'down') => {
    const prev = [...items]
    const next = [...items]
    const target = direction === 'up' ? index - 1 : index + 1
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
    startTransition(async () => {
      const result = await reorderBotMenuItems(next.map((r) => r.id))
      if ('error' in result) {
        toast.error(result.error)
        setItems(prev)
      }
    })
  }

  const moveChild = (parentId: string, index: number, direction: 'up' | 'down') => {
    const prevItems = items
    setItems((prev) =>
      prev.map((r) => {
        if (r.id !== parentId) return r
        const next = [...r.children]
        const target = direction === 'up' ? index - 1 : index + 1
        ;[next[index], next[target]] = [next[target], next[index]]
        startTransition(async () => {
          const result = await reorderBotMenuItems(next.map((c) => c.id))
          if ('error' in result) {
            toast.error(result.error)
            setItems(prevItems)
          }
        })
        return { ...r, children: next }
      }),
    )
  }

  return (
    <>
      <Card className="rounded-2xl border-slate-200 shadow-sm shadow-slate-950/5">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <ListTree className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base">Menu do Bot</CardTitle>
                <CardDescription>
                  Itens que o cliente vê ao interagir com o WhatsApp.
                  <br />
                  Se vazio, o menu padrão (Consultar OS + Atendente) é exibido.
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => openCreate(null, items.length)}
              disabled={isPending}
            >
              <Plus className="mr-1.5 size-4" />
              Novo item
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              Nenhum item cadastrado. O menu padrão será exibido.
            </p>
          ) : (
            items.map((item, i) => (
              <ItemRow
                key={item.id}
                item={item}
                isFirst={i === 0}
                isLast={i === items.length - 1}
                onEdit={() => openEdit(item)}
                onAddChild={
                  item.handler_type === 'submenu'
                    ? () => openCreate(item.id, item.children.length)
                    : undefined
                }
                onDelete={() => handleDelete(item.id)}
                onToggle={(enabled) => handleToggle(item.id, enabled)}
                onMoveUp={() => moveRoot(i, 'up')}
                onMoveDown={() => moveRoot(i, 'down')}
              >
                {item.handler_type === 'submenu' && item.children.length > 0 && (
                  <>
                    {item.children.map((child, ci) => (
                      <ItemRow
                        key={child.id}
                        item={child}
                        isFirst={ci === 0}
                        isLast={ci === item.children.length - 1}
                        onEdit={() => openEdit(child)}
                        onDelete={() => handleDelete(child.id)}
                        onToggle={(enabled) => handleToggle(child.id, enabled)}
                        onMoveUp={() => moveChild(item.id, ci, 'up')}
                        onMoveDown={() => moveChild(item.id, ci, 'down')}
                      />
                    ))}
                  </>
                )}
              </ItemRow>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog de criação / edição */}
      <Dialog
        open={form.open}
        onOpenChange={(open) => {
          if (!open) setForm(CLOSED_FORM)
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {form.editing ? 'Editar item' : form.parentId ? 'Novo item do sub-menu' : 'Novo item do menu'}
            </DialogTitle>
          </DialogHeader>
          {form.open && (
            <BotMenuItemForm
              parentId={form.parentId}
              nextPosition={form.nextPosition}
              editing={form.editing}
              onSuccess={() => {
                setForm(CLOSED_FORM)
                refresh()
              }}
              onCancel={() => setForm(CLOSED_FORM)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
