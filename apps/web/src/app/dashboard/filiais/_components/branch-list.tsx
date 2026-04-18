'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BranchCard } from './branch-card'
import { BranchDialog, type BranchFormState } from './branch-dialog'
import { DeleteBranchDialog } from './delete-dialog'

export interface BranchData {
  id: string
  name: string
  is_main: boolean | null
  city: string | null
  state: string | null
  phone: string | null
  address: string | null
  zip_code: string | null
  active: boolean | null
  company_id: string
  created_at: string | null
  updated_at: string | null
}

interface BranchListProps {
  initialBranches: BranchData[]
  isAdmin: boolean
}

export function BranchList({ initialBranches, isAdmin }: BranchListProps) {
  const router = useRouter()
  const [branches, setBranches] = React.useState(initialBranches)
  const [selectedBranch, setSelectedBranch] = React.useState<BranchFormState>({})
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)

  // Sincroniza estado local quando os dados do servidor atualizam (após router.refresh())
  React.useEffect(() => {
    setBranches(initialBranches)
  }, [initialBranches])

  const handleCreate = () => {
    setSelectedBranch({})
    setIsDialogOpen(true)
  }

  const handleEdit = (branch: Partial<BranchData>) => {
    setSelectedBranch({
      id: branch.id,
      name: branch.name,
      phone: branch.phone,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      zip_code: branch.zip_code,
      active: branch.active,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (branch: Partial<BranchData>) => {
    setSelectedBranch({
      id: branch.id,
      name: branch.name,
    })
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setBranches(prev => prev.filter(b => b.id !== deletedId))
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciar Filiais</h2>
          <p className="text-muted-foreground">
            Gestão das filiais cadastradas no sistema.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreate} className="gap-2 cursor-pointer">
            <Plus className="size-4" />
            Nova Filial
          </Button>
        )}
      </div>

      {branches.length === 0 ? (
        <div className="bg-card text-card-foreground border border-border shadow-sm rounded-xl p-6">
          <div className="flex items-center justify-center p-12 flex-col text-center">
            <h3 className="text-lg font-medium mb-2">Nenhuma filial cadastrada</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Você ainda não cadastrou nenhuma filial. Clique no botão acima para adicionar a primeira.
            </p>
          </div>
        </div>
      ) : (
        <div data-testid="branch-card-grid" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              isAdmin={isAdmin}
              onEdit={() => handleEdit(branch)}
              onDelete={() => handleDelete(branch)}
            />
          ))}
        </div>
      )}

      <BranchDialog
        branch={selectedBranch}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      {selectedBranch.id && (
        <DeleteBranchDialog
          branchId={selectedBranch.id}
          branchName={selectedBranch.name || ''}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  )
}
