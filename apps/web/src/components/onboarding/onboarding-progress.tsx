import { cn } from '@/lib/utils'

const STEPS = [
  { label: 'Empresa', step: 1 },
  { label: 'Filiais', step: 2 },
  { label: 'Conclusão', step: 3 },
]

export function OnboardingProgress({ current }: { current: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center mb-2">
        {STEPS.map((s, i) => (
          <div key={s.step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'size-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                  current === s.step
                    ? 'bg-primary border-primary text-primary-foreground'
                    : current > s.step
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-background border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {current > s.step ? (
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.step
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  current >= s.step ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-24 h-0.5 mx-2 mb-4 transition-colors',
                  current > s.step ? 'bg-primary' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
