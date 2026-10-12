import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusTone } from '@/components/StatusBadge'

const TONE: Record<
  StatusTone,
  { icon: LucideIcon; label: string; className: string }
> = {
  success: {
    icon: CheckCircle2,
    label: 'Success',
    className: 'bg-status-success-bg text-status-success border-status-success/25',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    className: 'bg-status-warning-bg text-status-warning border-status-warning/25',
  },
  danger: {
    icon: AlertCircle,
    label: 'Error',
    className: 'bg-status-danger-bg text-status-danger border-status-danger/25',
  },
  info: {
    icon: Info,
    label: 'Info',
    className: 'bg-status-info-bg text-status-info border-status-info/25',
  },
}

export type AlertProps = {
  tone?: StatusTone
  title: string
  children?: ReactNode
  className?: string
  onDismiss?: () => void
}

/**
 * Inline alert with icon + title text so meaning is not color-only.
 */
export function Alert({ tone = 'info', title, children, className, onDismiss }: AlertProps) {
  const config = TONE[tone]
  const Icon = config.icon

  return (
    <div
      role="status"
      data-slot="alert"
      data-tone={tone}
      className={cn(
        'flex gap-3 rounded-[var(--radius-guidance-size)] border px-4 py-3',
        config.className,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">
          <span className="sr-only">{config.label}: </span>
          {title}
        </p>
        {children ? <div className="text-sm opacity-90">{children}</div> : null}
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-2 inline-flex h-8 items-center rounded-md px-2 text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  )
}
