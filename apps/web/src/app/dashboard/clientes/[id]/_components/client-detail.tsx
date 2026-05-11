'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { ClientDialog } from '@/app/dashboard/clientes/_components/client-dialog'
import { useHeaderSlot } from '@/app/dashboard/_components/header-slot'
import {
  CLIENT_CLASSIFICATION_LABELS,
  CLIENT_CLASSIFICATION_COLORS,
  type ClientClassification,
} from '@/lib/validations/client'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/validations/service-order'
import { type ClientProfileData } from '@/app/actions/clients'
import { cn } from '@/lib/utils'

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const date = (v: string) => new Date(v).toLocaleDateString('pt-BR')
const osNum = (n: number) => { const s = String(n); return `${s.slice(0, 4)}-${s.slice(4).padStart(4, '0')}` }

function ClientHeaderSlot({ name }: { name: string }) {
  useHeaderSlot({ backHref: '/dashboard/clientes', backLabel: 'Clientes', title: name })
  return null
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function SidebarRow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[13px] text-slate-700">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}

interface BranchOption { id: string; name: string }

interface ClientDetailProps {
  profile: ClientProfileData
  branches: BranchOption[]
  isAdmin: boolean
}

export function ClientDetail({ profile, branches, isAdmin }: ClientDetailProps) {
  const { client, branchName, stats, serviceOrders, warranties } = profile
  const [editOpen, setEditOpen] = useState(false)

  const hasAddress = !!(client.street || client.city || client.zip_code)
  const classLabel = CLIENT_CLASSIFICATION_LABELS[client.classification as ClientClassification] ?? client.classification
  const classColor = CLIENT_CLASSIFICATION_COLORS[client.classification as ClientClassification] ?? 'bg-slate-100 text-slate-600'

  const clientFormState = {
    id: client.id,
    name: client.name,
    document: client.document,
    phone: client.phone,
    email: client.email,
    zip_code: client.zip_code,
    street: client.street,
    number: client.number,
    complement: client.complement,
    city: client.city,
    state: client.state,
    notes: client.notes,
    active: client.active,
    classification: client.classification,
    origin_branch_id: client.origin_branch_id,
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden xl:-mx-8 xl:-mt-8 xl:-mb-12 xl:h-[calc(100vh-4rem)]">
      <ClientHeaderSlot name={client.name} />

      {/* ── Page header ── */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight text-slate-900">{client.name}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none', classColor)}>
                {classLabel}
              </span>
              <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none', client.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                {client.active ? 'Ativo' : 'Inativo'}
              </span>
              {client.phone && (
                <span className="text-[11px] text-slate-500">{client.phone}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/dashboard/ordens-de-servico/nova"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ClipboardList className="size-3.5" />
            Nova OS
          </Link>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" />
            Editar cliente
          </Button>
        </div>
      </div>

      {/* ── Workspace ── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">

        {/* ──────────── LEFT SIDEBAR ──────────── */}
        <div className="shrink-0 overflow-y-auto border-b border-slate-200 xl:w-72 xl:border-b-0 xl:border-r">

          {/* Contato */}
          <div className="px-5 pb-4 pt-5">
            <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Contato</p>
            <div className="space-y-2.5">
              {client.phone
                ? <SidebarRow icon={Phone}>{client.phone}</SidebarRow>
                : <p className="text-[13px] italic text-slate-400">Telefone não informado</p>
              }
              {client.email && <SidebarRow icon={Mail}>{client.email}</SidebarRow>}
              {client.document && <SidebarRow icon={FileText}>{client.document}</SidebarRow>}
            </div>
          </div>

          {hasAddress && (
            <>
              <div className="h-px bg-slate-100" />
              <div className="px-5 py-4">
                <p className="mb-3.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Endereço</p>
                <div className="flex items-start gap-2.5 text-[13px] text-slate-700">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  <div className="space-y-0.5">
                    {(client.street || client.number || client.complement) && (
                      <p>{[client.street, client.number, client.complement].filter(Boolean).join(', ')}</p>
                    )}
                    {(client.city || client.state) && (
                      <p>{[client.city, client.state].filter(Boolean).join(' — ')}</p>
                    )}
                    {client.zip_code && (
                      <p className="text-slate-400">CEP {client.zip_code}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {(branchName || client.created_at) && (
            <>
              <div className="h-px bg-slate-100" />
              <div className="space-y-2.5 px-5 py-4">
                {branchName && <SidebarRow icon={Building2}>{branchName}</SidebarRow>}
                <SidebarRow icon={Calendar}>
                  <span className="text-slate-400">Cliente desde {date(client.created_at)}</span>
                </SidebarRow>
              </div>
            </>
          )}

          {client.notes && (
            <>
              <div className="h-px bg-slate-100" />
              <div className="px-5 py-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Observações</p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">{client.notes}</p>
              </div>
            </>
          )}
        </div>

        {/* ──────────── RIGHT PANEL ──────────── */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain bg-[#F8F9FC] p-6">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Total de OS" value={String(stats.total)} />
            <StatCard
              label="Em aberto"
              value={String(stats.open)}
              sub={stats.open > 0 ? 'aguardando atendimento' : 'nenhuma em aberto'}
            />
            <StatCard label="Total pago" value={currency(stats.totalPaid)} />
            <StatCard
              label="Última OS"
              value={stats.lastOrderDate ? date(stats.lastOrderDate) : '—'}
            />
          </div>

          {/* Active warranties */}
          {warranties.length > 0 && (
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                Garantias Ativas
              </p>
              <div className="divide-y divide-emerald-100 rounded-lg border border-emerald-200 bg-emerald-50">
                {warranties.map((w) => (
                  <div key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                    <ShieldCheck className="size-3.5 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/ordens-de-servico/${w.id}?from=/dashboard/clientes/${client.id}`}
                        className="font-mono text-[13px] font-bold text-emerald-900 hover:underline"
                      >
                        #{osNum(w.number)}
                      </Link>
                      <span className="ml-2 text-[13px] text-emerald-800">
                        {[w.device_type, w.device_brand, w.device_model].filter(Boolean).join(' ')}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-emerald-600">
                      até {new Date(w.warranty_expires_at + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OS list */}
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Ordens de Serviço ({stats.total})
            </p>
            {serviceOrders.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                Nenhuma OS encontrada para este cliente.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {serviceOrders.map((os) => {
                  const statusLabel = STATUS_LABELS[os.status as keyof typeof STATUS_LABELS] ?? os.status
                  const statusColor = STATUS_COLORS[os.status as keyof typeof STATUS_COLORS] ?? ''
                  const device = [os.device_type, os.device_brand, os.device_model].filter(Boolean).join(' ') || '—'
                  return (
                    <Link
                      key={os.id}
                      href={`/dashboard/ordens-de-servico/${os.id}?from=/dashboard/clientes/${client.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span className="shrink-0 font-mono text-[13px] font-bold text-slate-800">
                        #{osNum(os.number)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-slate-600">{device}</span>
                      <span className={cn('inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none', statusColor)}>
                        {statusLabel}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">{date(os.created_at)}</span>
                      {os.payment_status === 'pago' && os.amount_paid != null && (
                        <span className="shrink-0 text-[11px] font-medium text-emerald-600">
                          {currency(os.amount_paid)}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ClientDialog
        client={clientFormState}
        branches={branches}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}
