'use client'

import * as React from 'react'
import { User, Phone, Mail, Building2, Edit2, Trash2, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS, type EmployeeRole } from '@/lib/validations/employee'

export interface EmployeeData {
  id: string
  name: string
  role: string
  email: string | null
  phone: string | null
  cpf: string | null
  active: boolean
  branch_id: string | null
  company_id: string
  created_at: string | null
  updated_at: string | null
  labor_rate: number | null
}

interface EmployeeCardProps {
  employee: EmployeeData
  branchName?: string
  isAdmin: boolean
  onEdit: (employee: EmployeeData) => void
  onDelete: (employee: EmployeeData) => void
}

const roleColors: Record<EmployeeRole, string> = {
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  atendente: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  tecnico: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export function EmployeeCard({ employee, branchName, isAdmin, onEdit, onDelete }: EmployeeCardProps) {
  const roleLabel = ROLE_LABELS[employee.role as EmployeeRole] ?? employee.role
  const roleColor = roleColors[employee.role as EmployeeRole] ?? 'bg-muted text-muted-foreground'

  return (
    <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 flex flex-col relative group transition-all hover:border-primary/50">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <User className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-none">{employee.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className={`inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${roleColor}`}>
                {roleLabel}
              </span>
              {!employee.active && (
                <span className="inline-block text-[10px] uppercase tracking-wider font-bold bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">
                  Inativo
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-auto text-sm text-muted-foreground">
        {employee.phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-4 shrink-0" />
            <span>{employee.phone}</span>
          </div>
        )}
        {employee.email && (
          <div className="flex items-center gap-2">
            <Mail className="size-4 shrink-0" />
            <span className="truncate">{employee.email}</span>
          </div>
        )}
        {branchName && (
          <div className="flex items-center gap-2">
            <Building2 className="size-4 shrink-0" />
            <span className="truncate">{branchName}</span>
          </div>
        )}
        {employee.role === 'tecnico' && employee.labor_rate != null && (
          <div className="flex items-center gap-2">
            <Wrench className="size-4 shrink-0" />
            <span>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(employee.labor_rate)}
              {' '}/ OS
            </span>
          </div>
        )}
        {!employee.phone && !employee.email && !branchName && (
          <span className="text-xs italic">Nenhum contato informado</span>
        )}
      </div>

      {isAdmin && (
        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(employee)}
            title="Editar funcionário"
            aria-label={`Editar funcionário ${employee.name}`}
          >
            <Edit2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(employee)}
            title="Excluir funcionário"
            aria-label={`Excluir funcionário ${employee.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
