import { attentionSummary, type OperationalPulse } from '@/lib/organizationAdmin'

export function OperationalPulseBar({
  pulse,
  onCreditsClick,
}: {
  pulse: OperationalPulse
  onCreditsClick: () => void
}) {
  const items = [
    { label: 'Active programs', value: pulse.active_programs },
    { label: 'Active projects', value: pulse.active_projects },
    {
      label: 'Needs attention',
      value: pulse.attention_count,
      detail: attentionSummary(pulse),
    },
  ]

  return (
    <section
      aria-labelledby="org-pulse-heading"
      className="overflow-hidden rounded-lg border border-border bg-surface"
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-stretch sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2
            id="org-pulse-heading"
            className="text-[11px] font-semibold tracking-[0.1em] text-ink-muted uppercase"
          >
            Operational pulse
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6">
            {items.map((item) => (
              <div key={item.label}>
                <p className="font-mono text-2xl font-semibold tracking-tight text-ink tabular-nums">
                  {item.value}
                </p>
                <p className="mt-0.5 text-xs font-medium text-ink-muted">{item.label}</p>
                {'detail' in item && item.detail ? (
                  <p className="mt-1 max-w-[14rem] text-[11px] leading-snug text-ink-muted">
                    {item.detail}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="flex sm:items-end sm:justify-end">
          <button
            type="button"
            onClick={onCreditsClick}
            className="inline-flex w-full flex-col items-start rounded-md border border-border bg-canvas px-3.5 py-2.5 text-left hover:bg-muted sm:w-auto"
          >
            <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
              Org credits
            </span>
            <span className="mt-1 font-mono text-lg font-semibold text-ink tabular-nums">
              {pulse.credit_remaining}
            </span>
            <span className="mt-0.5 text-xs text-ink-muted">{pulse.credit_label}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
