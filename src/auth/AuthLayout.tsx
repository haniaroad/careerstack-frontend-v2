import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AuthLayoutProps = {
  children: ReactNode
  /** Small label above the form title (e.g. "Get started", "Step 1 of 3"). */
  eyebrow?: string
  title: string
  description?: string
  className?: string
}

/** Evidence Stack motif — contribution layers ascending to skill. */
function EvidenceStackMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 140"
      className={cn('text-brand', className)}
      aria-hidden
    >
      <g fill="currentColor" fillOpacity="0.9">
        <path d="M20 108 L60 128 L100 108 L60 88 Z" fillOpacity="1" />
        <path d="M24 90 L60 108 L96 90 L60 72 Z" fillOpacity="0.75" />
        <path d="M28 72 L60 88 L92 72 L60 56 Z" fillOpacity="0.6" />
        <path d="M32 54 L60 68 L88 54 L60 40 Z" fillOpacity="0.45" />
        <path d="M36 36 L60 48 L84 36 L60 24 Z" fillOpacity="0.35" />
      </g>
      <path
        d="M20 108 L60 128 L100 108 M24 90 L60 108 L96 90 M28 72 L60 88 L92 72 M32 54 L60 68 L88 54 M36 36 L60 48 L84 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeOpacity="0.35"
      />
    </svg>
  )
}

function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded text-[11px] font-bold tracking-tight',
          inverted ? 'bg-canvas text-ink' : 'bg-brand text-brand-foreground',
        )}
      >
        CS
      </span>
      <span className="text-lg font-semibold tracking-tight">CareerStack</span>
    </div>
  )
}

/**
 * Evidence Standard standalone auth chrome: Ink brand panel + form column.
 * Shared by sign-in, onboarding, invite, and first-workspace landing.
 */
export function AuthLayout({
  children,
  eyebrow = 'Get started',
  title,
  description,
  className,
}: AuthLayoutProps) {
  return (
    <div
      className={cn('min-h-svh bg-muted text-foreground antialiased', className)}
    >
      <div className="grid min-h-svh lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-ink text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, var(--brand) 0%, transparent 45%), radial-gradient(circle at 80% 70%, #ff6b4a 0%, transparent 40%)',
            }}
          />
          <div className="relative">
            <BrandMark />
            <h1 className="mt-16 max-w-md text-4xl font-extrabold tracking-tight text-balance xl:text-5xl xl:leading-[1.1]">
              Turn real project work into proof of skill.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-sidebar-muted">
              Build experience employers can see—structured work, reviewed evidence, and a
              credible professional record.
            </p>
          </div>
          <div className="relative mt-16 flex items-end justify-between gap-8">
            <EvidenceStackMark className="h-36 w-32 text-brand" />
            <p className="max-w-[12rem] text-right text-xs leading-relaxed text-sidebar-muted">
              Project → Submission → Review → Skill. Evidence first. Momentum second.
            </p>
          </div>
        </aside>

        <main className="relative flex flex-col justify-center overflow-y-auto bg-canvas px-5 py-10 sm:px-8 md:px-12 lg:px-16 xl:px-20">
          <div className="mb-8 lg:hidden">
            <BrandMark inverted />
          </div>

          <div className="mx-auto w-full max-w-md">
            <p className="text-xs font-medium tracking-[0.08em] text-orange-600 uppercase">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
            <div className="mt-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
