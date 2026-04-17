'use client'

import * as React from 'react'
import { Building2, MapPin, Phone, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BranchData {
  id: string
  name: string
  is_main: boolean | null
  city: string | null
  state: string | null
  phone: string | null
  active: boolean | null
}

interface BranchCardProps {
  branch: BranchData
  isAdmin: boolean
  onEdit: (branch: BranchData) => void
  onDelete: (branch: BranchData) => void
}

export function BranchCard({ branch, isAdmin, onEdit, onDelete }: BranchCardProps) {
  return (
    <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6 flex flex-col relative group transition-all hover:border-primary/50">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Building2 className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-none">{branch.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {branch.is_main && (
                <span className="inline-block text-[10px] uppercase tracking-wider font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">Matriz</span>
              )}
              {!branch.active && (
                <span className="inline-block text-[10px] uppercase tracking-wider font-bold bg-destructive/20 text-destructive px-2 py-0.5 rounded-full">Inativa</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-2 mt-auto text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">{branch.city ? `${branch.city} - ${branch.state}` : 'Endereço não informado'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="size-4 shrink-0" />
          <span>{branch.phone || 'Sem telefone'}</span>
        </div>
      </div>

      {isAdmin && (
        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(branch)}
            title="Editar filial"
            aria-label={`Editar filial ${branch.name}`}
          >
            <Edit2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(branch)}
            title="Excluir filial"
            aria-label={`Excluir filial ${branch.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
