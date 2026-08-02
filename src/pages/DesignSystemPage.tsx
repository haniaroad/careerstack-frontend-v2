import { Navigate } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { StatusBadge } from '@/components/StatusBadge'
import { isDesignSystemPreviewEnabled } from '@/config'

export function DesignSystemPage() {
  if (!isDesignSystemPreviewEnabled()) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Local / staging preview
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Design system</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tokenized components for CareerStack. Not a product destination — disabled outside
          local and staging.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tokens
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            ['Canvas', 'bg-canvas border'],
            ['Surface', 'bg-surface border'],
            ['Brand', 'bg-primary'],
            ['Ink', 'bg-ink'],
            ['Muted', 'bg-muted border'],
          ].map(([label, className]) => (
            <div key={label} className="space-y-1">
              <div className={`size-12 rounded-md ${className}`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Typography
        </h2>
        <p className="text-2xl font-semibold">Mona Sans — UI sans</p>
        <p className="font-mono text-sm">IBM Plex Mono — meta / code</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Buttons
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Status
        </h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="success">Approved</StatusBadge>
          <StatusBadge tone="warning">Needs review</StatusBadge>
          <StatusBadge tone="danger">Blocked</StatusBadge>
          <StatusBadge tone="info">In progress</StatusBadge>
        </div>
        <Alert tone="warning" title="Status is never color alone">
          Every status chip includes an icon and text label.
        </Alert>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Form controls
        </h2>
        <div className="max-w-sm space-y-2">
          <Label htmlFor="demo-input">Label</Label>
          <Input id="demo-input" placeholder="Typed with tokens" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Empty state
        </h2>
        <EmptyState
          title="Nothing here yet"
          description="Guidance surfaces use the softer guidance radius token."
          action={<Button size="sm">Primary action</Button>}
        />
      </section>

      <section className="space-y-2 rounded-[var(--radius-guidance-size)] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Shell notes</p>
        <p>
          Application chrome lives in <code className="font-mono text-xs">AppShell</code> with
          stub workspace context until identity lands. Import product UI from{' '}
          <code className="font-mono text-xs">@/components</code>, not{' '}
          <code className="font-mono text-xs">@/components/ui</code>.
        </p>
      </section>
    </div>
  )
}
