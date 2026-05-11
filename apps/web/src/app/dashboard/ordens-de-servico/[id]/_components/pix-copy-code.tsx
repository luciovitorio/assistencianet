'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function PixCopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex w-full items-start gap-2 rounded bg-white/70 px-2 py-1.5 border border-emerald-100 text-left hover:bg-white transition-colors group"
      title="Clique para copiar"
    >
      <span className="min-w-0 flex-1 break-all font-mono text-[10px] text-emerald-700">
        {code}
      </span>
      <span className="mt-0.5 shrink-0 text-emerald-500">
        {copied ? <Check className="size-3" /> : <Copy className="size-3 opacity-50 group-hover:opacity-100" />}
      </span>
    </button>
  )
}
