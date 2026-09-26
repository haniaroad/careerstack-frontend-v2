import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

export type FirstRunTipDestination = 'home' | 'my_work' | 'inbox' | 'profile'

type Tip = {
  key: string
  label: string
  body: string
}

const REPLAY_EVENT = 'careerstack:first-run-tips-replayed'

export function replayFirstRunTips() {
  return apiFetch<{ restored_keys: string[] }>('/api/v1/first_run_tips/replay', { method: 'POST' })
}

export function notifyFirstRunTipsReplayed() {
  window.dispatchEvent(new Event(REPLAY_EVENT))
}

export function FirstRunTip({ destination }: { destination: FirstRunTipDestination }) {
  const [tip, setTip] = useState<Tip | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiFetch<{ tip?: Tip | null }>(
          `/api/v1/first_run_tips?destination=${destination}`,
        )
        if (!cancelled) setTip(data?.tip ?? null)
      } catch {
        if (!cancelled) setTip(null)
      }
    }

    void load()
    window.addEventListener(REPLAY_EVENT, load)
    return () => {
      cancelled = true
      window.removeEventListener(REPLAY_EVENT, load)
    }
  }, [destination])

  async function dismiss() {
    if (!tip) return
    const current = tip
    setTip(null)
    try {
      await apiFetch(`/api/v1/first_run_tips/${current.key}/dismiss`, { method: 'POST' })
    } catch {
      setTip(current)
    }
  }

  if (!tip) return null

  return (
    <section
      data-slot="first-run-tip"
      data-layout="inline"
      aria-label={tip.label}
      className="rounded-[var(--radius-guidance-size)] border border-border bg-brand-muted px-4 py-3 motion-reduce:transition-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">{tip.label}</p>
          <p className="text-sm text-ink">{tip.body}</p>
        </div>
        <button
          type="button"
          onClick={() => void dismiss()}
          className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-ink underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Dismiss tip
        </button>
      </div>
    </section>
  )
}
