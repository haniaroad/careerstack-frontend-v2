import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  icon?: ReactNode
}

/**
 * Guidance / empty surface using softer guidance radius tokens.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-start gap-3 rounded-[var(--radius-guidance-size)] border border-border bg-surface px-6 py-8',
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}
