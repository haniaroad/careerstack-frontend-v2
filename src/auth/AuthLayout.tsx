import type { ReactNode } from 'react'

export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_oklch(0.97_0.02_250),_oklch(0.94_0.01_240)_45%,_oklch(0.92_0.01_230))] px-4 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold tracking-[0.08em] text-primary uppercase">
            CareerStack
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="rounded-xl border border-border/80 bg-background/90 p-6 shadow-sm backdrop-blur">
          {children}
        </div>
      </div>
    </main>
  )
}
