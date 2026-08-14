import { StatusBadge } from '@/components/StatusBadge'
import type { ProgramStatus } from '@/lib/organizationAdmin'

const TONE: Record<ProgramStatus, 'info' | 'success' | 'warning'> = {
  draft: 'info',
  active: 'success',
  archived: 'warning',
}

const LABEL: Record<ProgramStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
}

export function ProgramStatusBadge({ status }: { status: ProgramStatus }) {
  return <StatusBadge tone={TONE[status]}>{LABEL[status]}</StatusBadge>
}
