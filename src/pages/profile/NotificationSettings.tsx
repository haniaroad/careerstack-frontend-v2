import { cn } from '@/lib/utils'
import type { NotificationPreference } from '@/lib/notifications'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'

const TIER_LABEL = {
  mandatory: 'Always on',
  realtime_config: 'Realtime',
  digest_config: 'Digest',
} as const

export function NotificationSettings({
  preferences,
  onToggle,
}: {
  preferences: NotificationPreference[]
  onToggle?: (preferenceId: string, emailEnabled: boolean) => void
}) {
  if (preferences.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center">
        <p className="text-sm font-medium text-ink">No notification preferences</p>
        <p className="mt-1 text-sm text-ink-muted">Email preference categories will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="max-w-xl text-sm text-ink-muted">
        Choose email frequency for configurable categories. Security and account messages stay
        mandatory.
      </p>
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {preferences.map((pref, index) => (
          <li
            key={pref.id}
            className={cn(
              'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
              index > 0 && 'border-t border-border',
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink">{pref.label}</p>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-muted">
                  {TIER_LABEL[pref.tier]}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{pref.description}</p>
            </div>

            <label className="inline-flex shrink-0 items-center gap-2.5">
              <span className="text-xs font-medium text-ink-muted">
                {pref.can_disable ? 'Email' : 'Required'}
              </span>
              <input
                type="checkbox"
                className={cn(
                  'size-4 rounded border-border text-accent',
                  focusRing,
                  !pref.can_disable && 'cursor-not-allowed opacity-60',
                )}
                checked={pref.email_enabled}
                disabled={!pref.can_disable}
                onChange={(event) => onToggle?.(pref.id, event.target.checked)}
                aria-label={`${pref.label} email notifications`}
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
