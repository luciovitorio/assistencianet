'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export function TimelineSheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 border-slate-200"
        onClick={() => setOpen(true)}
      >
        <History className="size-4 text-slate-400" />
        Histórico
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-primary" />
              Histórico da OS
            </SheetTitle>
          </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
    </>
  )
}
