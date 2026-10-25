import { useState } from 'react'
import { firebaseSignOut } from '@/lib/firebase'
import {
  rememberStaffEnvironment,
  staffEnvironmentOptions,
  staffEnvironmentSwitchAvailable,
  type StaffEnvironmentId,
} from '@/config'

export function EnvironmentBar() {
  const available = staffEnvironmentSwitchAvailable()
  const { options, selected } = staffEnvironmentOptions()
  const [pending, setPending] = useState(false)
  if (!available) return null

  async function choose(id: StaffEnvironmentId) {
    if (id === selected || pending) return
    setPending(true)
    try {
      await firebaseSignOut()
    } catch {
      // The next environment has its own sign-in.
    }
    rememberStaffEnvironment(id)
    window.location.assign('/sign-in')
  }

  const staging = selected === 'staging'

  return (
    <div
      className={
        staging
          ? 'flex flex-wrap items-center justify-between gap-3 border-b border-status-warning/40 bg-status-warning-bg px-4 py-2 text-sm text-status-warning'
          : 'flex flex-wrap items-center justify-between gap-3 border-b border-border bg-sidebar px-4 py-2 text-sm'
      }
      role="region"
      aria-label="Staff environment"
    >
      <p>
        <span className="font-semibold">{staging ? 'Staging' : 'Production'}</span>
        <span className="text-muted-foreground">
          {' '}
          — changes here affect {staging ? 'staging' : 'production'} only.
        </span>
      </p>
      <div className="flex gap-2" role="group" aria-label="Environment">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={option.id === selected}
            disabled={pending}
            className="rounded-md border border-border bg-canvas px-3 py-1 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            onClick={() => void choose(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProductionConfirm({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const { selected } = staffEnvironmentOptions()
  if (!staffEnvironmentSwitchAvailable() || selected !== 'production') return null

  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>I am making this change in production.</span>
    </label>
  )
}

export function productionConfirmed(checked: boolean): boolean {
  const { selected } = staffEnvironmentOptions()
  if (!staffEnvironmentSwitchAvailable() || selected !== 'production') return true
  return checked
}
