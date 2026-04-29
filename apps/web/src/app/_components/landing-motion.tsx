'use client'

import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  style?: CSSProperties
}

const ease = [0.22, 1, 0.36, 1] as const

function offset(direction: NonNullable<RevealProps['direction']>) {
  if (direction === 'left') return { x: -28, y: 0 }
  if (direction === 'right') return { x: 28, y: 0 }
  if (direction === 'down') return { x: 0, y: -18 }
  if (direction === 'none') return { x: 0, y: 0 }
  return { x: 0, y: 24 }
}

export function Reveal({ children, className, delay = 0, direction = 'up', style }: RevealProps) {
  const reduceMotion = useReducedMotion()
  const start = offset(direction)

  return (
    <motion.div
      className={className}
      style={style}
      initial={reduceMotion ? false : { opacity: 0, ...start }}
      whileInView={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.24, margin: '0px 0px -80px' }}
      transition={{ duration: 0.55, delay, ease }}
    >
      {children}
    </motion.div>
  )
}

export function Stagger({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : 'hidden'}
      whileInView={reduceMotion ? undefined : 'show'}
      viewport={{ once: true, amount: 0.18, margin: '0px 0px -80px' }}
      variants={{
        hidden: {},
        show: { transition: { delayChildren: delay, staggerChildren: 0.08 } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.48, ease } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerList({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.ol
      className={className}
      initial={reduceMotion ? false : 'hidden'}
      whileInView={reduceMotion ? undefined : 'show'}
      viewport={{ once: true, amount: 0.18, margin: '0px 0px -80px' }}
      variants={{
        hidden: {},
        show: { transition: { delayChildren: delay, staggerChildren: 0.08 } },
      }}
    >
      {children}
    </motion.ol>
  )
}

export function StaggerListItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.li
      className={className}
      variants={{
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.48, ease } },
      }}
    >
      {children}
    </motion.li>
  )
}

export function MotionCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.48, ease } },
      }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.2, ease }}
    >
      {children}
    </motion.div>
  )
}

export function FloatingPanel({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, x: 34, rotateX: 8, rotateY: -8 }}
      animate={reduceMotion ? undefined : { opacity: 1, x: 0, rotateX: 0, rotateY: 0 }}
      transition={{ duration: 0.72, delay: 0.12, ease }}
      style={{ transformPerspective: 1200 }}
    >
      {children}
    </motion.div>
  )
}

export function MotionBar({
  className,
  height,
  background,
}: {
  className?: string
  height: string
  background: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      style={{ background }}
      initial={reduceMotion ? { height } : { height: '8%' }}
      whileInView={{ height }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.62, ease }}
    />
  )
}

export function MotionChatBubble({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.36, delay, ease }}
    >
      {children}
    </motion.div>
  )
}
