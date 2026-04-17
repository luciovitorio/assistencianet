'use client'

import * as React from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditServiceOrderDialog, type EditServiceOrderData } from './edit-service-order-dialog'

export interface EditServiceOrderButtonProps {
  serviceOrder: EditServiceOrderData
  branches: { id: string; name: string }[]
  technicians: { id: string; name: string }[]
  deviceTypes: string[]
  disabled?: boolean
}

export function EditServiceOrderButton({
  serviceOrder,
  branches,
  technicians,
  deviceTypes,
  disabled,
}: EditServiceOrderButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="gap-2"
      >
        <Pencil className="size-4" />
        Editar OS
      </Button>

      {open && (
        <EditServiceOrderDialog
          open={open}
          onOpenChange={setOpen}
          serviceOrder={serviceOrder}
          branches={branches}
          technicians={technicians}
          deviceTypes={deviceTypes}
        />
      )}
    </>
  )
}
