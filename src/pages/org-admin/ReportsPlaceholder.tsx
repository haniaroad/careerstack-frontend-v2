import { FileText } from 'lucide-react'

export function ReportsPlaceholder() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center sm:px-6">
      <FileText className="mx-auto size-8 text-ink-muted" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold text-ink">Reports are coming later</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        Stakeholder PDF and CSV exports are deferred. This tab is a placeholder so the destination
        stays in the Organization administration subnav. No files are generated here.
      </p>
    </div>
  )
}
