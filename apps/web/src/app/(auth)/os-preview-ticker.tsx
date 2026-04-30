'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'

type OsStatus = 'reparo' | 'pronto' | 'aguardando' | 'orcamento' | 'analise'

interface OsEntry {
  id: string
  name: string
  device: string
  problem: string
  status: OsStatus
}

const STATUS_CONFIG: Record<OsStatus, { label: string; className: string }> = {
  reparo:     { label: 'Em reparo',   className: 'bg-[rgba(16,85,240,0.25)] text-[#93B4FD]' },
  pronto:     { label: 'Pronto ✓',   className: 'bg-[rgba(37,211,102,0.18)] text-[#4ADE80]' },
  aguardando: { label: 'Aguardando', className: 'bg-[rgba(245,158,11,0.18)] text-[#FCD34D]' },
  orcamento:  { label: 'Orçamento',  className: 'bg-[rgba(168,85,247,0.22)] text-[#D8B4FE]' },
  analise:    { label: 'Em análise', className: 'bg-[rgba(99,102,241,0.22)] text-[#A5B4FC]' },
}

const ALL_ORDERS: OsEntry[] = [
  { id: 'OS-2849', name: 'Fernanda Rocha',    device: 'iPhone 14 Pro',          problem: 'Tela',          status: 'reparo' },
  { id: 'OS-2848', name: 'Lucas Martins',     device: 'Samsung S24',             problem: 'Bateria',       status: 'aguardando' },
  { id: 'OS-2847', name: 'Maria Santos',      device: 'iPhone 14 Pro',           problem: 'Tela',          status: 'reparo' },
  { id: 'OS-2846', name: 'Carlos Oliveira',   device: 'Samsung A54',             problem: 'Bateria',       status: 'pronto' },
  { id: 'OS-2845', name: 'Ana Ferreira',      device: 'Notebook Dell',           problem: 'SSD',           status: 'aguardando' },
  { id: 'OS-2844', name: 'João Silva',        device: 'Moto G84',               problem: 'Câmera',        status: 'analise' },
  { id: 'OS-2843', name: 'Paula Costa',       device: 'MacBook Air M2',          problem: 'Teclado',       status: 'orcamento' },
  { id: 'OS-2842', name: 'Roberto Lima',      device: 'iPhone 13',              problem: 'Conector USB',  status: 'reparo' },
  { id: 'OS-2841', name: 'Beatriz Sousa',     device: 'iPad Air 5',             problem: 'Tela',          status: 'pronto' },
  { id: 'OS-2840', name: 'Rafael Pereira',    device: 'Samsung S23 Ultra',       problem: 'Alto-falante',  status: 'aguardando' },
  { id: 'OS-2839', name: 'Juliana Nunes',     device: 'Notebook Lenovo',         problem: 'Memória RAM',   status: 'analise' },
  { id: 'OS-2838', name: 'André Carvalho',    device: 'Xiaomi Redmi Note 12',    problem: 'Tela',          status: 'reparo' },
  { id: 'OS-2837', name: 'Camila Ribeiro',    device: 'iPhone SE 3',             problem: 'Bateria',       status: 'pronto' },
  { id: 'OS-2836', name: 'Felipe Monteiro',   device: 'HP Pavilion 15',          problem: 'Placa-mãe',    status: 'orcamento' },
  { id: 'OS-2835', name: 'Natalia Gomes',     device: 'Samsung Tab A8',          problem: 'Touchscreen',   status: 'aguardando' },
  { id: 'OS-2834', name: 'Diego Araújo',      device: 'Moto Edge 40',            problem: 'Tampa traseira',status: 'pronto' },
  { id: 'OS-2833', name: 'Larissa Borges',    device: 'iPhone 12 Mini',          problem: 'Câmera',        status: 'analise' },
  { id: 'OS-2832', name: 'Thiago Mendes',     device: 'ASUS VivoBook 15',        problem: 'Teclado',       status: 'reparo' },
  { id: 'OS-2831', name: 'Priscilla Xavier',  device: 'Samsung A35',             problem: 'Carregador',    status: 'orcamento' },
  { id: 'OS-2830', name: 'Rodrigo Freitas',   device: 'Dell Inspiron 15',        problem: 'Touchpad',      status: 'pronto' },
  { id: 'OS-2829', name: 'Samantha Dias',     device: 'iPhone 14',              problem: 'Conector USB',  status: 'aguardando' },
  { id: 'OS-2828', name: 'Vitor Pinto',       device: 'POCO X5',                problem: 'Tela',          status: 'reparo' },
  { id: 'OS-2827', name: 'Isabela Cruz',      device: 'MacBook Air M2',          problem: 'Bateria',       status: 'analise' },
  { id: 'OS-2826', name: 'Eduardo Lopes',     device: 'Samsung S23',             problem: 'Alto-falante',  status: 'pronto' },
  { id: 'OS-2825', name: 'Tatiana Macedo',    device: 'Notebook Dell G15',       problem: 'SSD',           status: 'orcamento' },
  { id: 'OS-2824', name: 'Bruno Figueiredo',  device: 'iPhone 13 Pro Max',       problem: 'Tela',          status: 'reparo' },
  { id: 'OS-2823', name: 'Leticia Correia',   device: 'Samsung A54',             problem: 'Câmera',        status: 'aguardando' },
  { id: 'OS-2822', name: 'Alexandre Melo',    device: 'Lenovo IdeaPad 5',        problem: 'Memória RAM',   status: 'analise' },
  { id: 'OS-2821', name: 'Mariana Castro',    device: 'Motorola Moto G73',       problem: 'Bateria',       status: 'pronto' },
  { id: 'OS-2820', name: 'Pedro Alves',       device: 'HP Pavilion x360',        problem: 'Tela',          status: 'reparo' },
]

export function OsPreviewTicker() {
  const [startIdx, setStartIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const schedule = () => {
      // Random interval between 1.8s and 3.6s for organic feel
      const delay = 1800 + Math.random() * 1800
      timerRef.current = setTimeout(() => {
        setStartIdx((i) => (i + 1) % ALL_ORDERS.length)
        schedule()
      }, delay)
    }
    schedule()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const visibleOrders = [0, 1, 2].map(
    (offset) => ALL_ORDERS[(startIdx + offset) % ALL_ORDERS.length]
  )

  return (
    <div className="mt-8 rounded-[10px] border border-white/10 bg-white/[0.06] px-4 py-3.5">
      {/* Header with live dot */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/40">
          Ordens em aberto agora
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#25D366]" />
          </span>
          <span className="text-[10px] font-semibold text-[#25D366]/70">ao vivo</span>
        </span>
      </div>

      {/* Animated list */}
      <div className="overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleOrders.map((order, displayIdx) => {
            const status = STATUS_CONFIG[order.status]
            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={cn(
                  'flex items-center justify-between py-2',
                  displayIdx < 2 && 'border-b border-white/[0.06]'
                )}
              >
                <div>
                  <div className="font-mono text-[10px] text-[#C7D7FD]">{order.id}</div>
                  <div className="text-[12px] font-semibold text-white/80">{order.name}</div>
                  <div className="text-[10px] text-white/35">
                    {order.device} — {order.problem}
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-[3px] text-[10px] font-bold',
                    status.className
                  )}
                >
                  {status.label}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
