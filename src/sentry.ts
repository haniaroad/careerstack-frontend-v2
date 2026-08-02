/** Optional Sentry wiring. DSN is deferred until the staging secret exists. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return
  // Install @sentry/react and initialize here once VITE_SENTRY_DSN is set.
  console.info('Sentry DSN present; SDK install deferred until product shell change')
}
