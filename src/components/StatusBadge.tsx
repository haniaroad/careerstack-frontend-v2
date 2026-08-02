import type { ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info'

const TONE: Record<
  StatusTone,
  { icon: LucideIcon; label: string; className: string }
> = {
  success: {
    icon: CheckCircle2,
    label: 'Success',
    className: 'bg-status-success-bg text-status-success border-status-success/20',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    className: 'bg-status-warning-bg text-status-warning border-status-warning/20',
  },
  danger: {
    icon: AlertCircle,
    label: 'Error',
    className: 'bg-status-danger-bg text-status-danger border-status-danger/20',
  },
  info: {
    icon: Info,
    label: 'Info',
    className: 'bg-status-info-bg text-status-info border-status-info/20',
  },
}

export type StatusBadgeProps = {
  tone: StatusTone
  /** Visible text; required so status is never color-only. */
  children: ReactNode
  className?: string
  /** Override default tone label used for icon aria-hidden companion. */
  iconLabel?: string
}

/**
 * Status chip that always includes text and an icon (never color alone).
 */
export function StatusBadge({
  tone,
  children,
  className,
  iconLabel,
}: StatusBadgeProps) {
  const config = TONE[tone]
  const Icon = config.icon

  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{iconLabel ?? config.label}: </span>
      <span>{children}</span>
    </span>
  )
}
