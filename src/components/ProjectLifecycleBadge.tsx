import { StatusBadge, type StatusTone } from '@/components/StatusBadge'
import {
  formatProjectPhase,
  formatProjectStatus,
  type ProjectPhase,
  type ProjectStatus,
} from '@/lib/projects'
import { cn } from '@/lib/utils'

function statusTone(status: ProjectStatus | string): StatusTone {
  if (status === 'active' || status === 'completed') return 'success'
  if (status === 'expired' || status === 'cancelled' || status === 'archived') return 'warning'
  return 'info'
}

function phaseTone(phase: ProjectPhase | string): StatusTone {
  if (phase === 'ending_soon' || phase === 'grace_period') return 'warning'
  if (phase === 'read_only') return 'info'
  return 'info'
}

export type ProjectLifecycleBadgeProps = {
  status: ProjectStatus | string
  phase?: ProjectPhase | string | null
  className?: string
  /** When false, only status is shown (e.g. draft with normal phase). */
  showPhase?: boolean
}

/**
 * Status + phase chips with text labels (never color alone).
 */
export function ProjectLifecycleBadge({
  status,
  phase,
  className,
  showPhase = true,
}: ProjectLifecycleBadgeProps) {
  const phaseVisible =
    showPhase &&
    phase &&
    phase !== 'normal' &&
    !(status === 'draft' && phase === 'normal')

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      <StatusBadge tone={statusTone(status)}>{formatProjectStatus(status)}</StatusBadge>
      {phaseVisible ? (
        <StatusBadge tone={phaseTone(phase)}>{formatProjectPhase(phase)}</StatusBadge>
      ) : null}
    </span>
  )
}
