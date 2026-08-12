import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { PublicPageFrame } from '@/components/public/PublicPageFrame'
import { projectAbsoluteUrl, storeReturnTo } from '@/lib/publicSurfaces'

type CopyPublicLinkProps = {
  absoluteUrl: string
  available?: boolean
}

export function CopyPublicLink({ absoluteUrl, available = true }: CopyPublicLinkProps) {
  const liveId = useId()
  const [copied, setCopied] = useState(false)
  const [fallback, setFallback] = useState(false)

  if (!available) return null

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl)
      setCopied(true)
      setFallback(false)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setFallback(true)
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="h-9" onClick={() => void onCopy()}>
        Copy link
      </Button>
      <p id={liveId} className="sr-only" aria-live="polite">
        {copied ? 'Link copied to clipboard' : ''}
      </p>
      {copied ? (
        <p className="text-xs text-ink-muted" aria-hidden>
          Link copied
        </p>
      ) : null}
      {fallback ? (
        <input
          readOnly
          className="w-full rounded border border-border bg-surface px-3 py-2 text-xs"
          value={absoluteUrl}
          aria-label="Public URL"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
    </div>
  )
}

type PublicNotFoundProps = {
  onSignIn: () => void
  onCreateAccount: () => void
}

export function PublicNotFound({ onSignIn, onCreateAccount }: PublicNotFoundProps) {
  useEffect(() => {
    const robots = document.querySelector('meta[name="robots"]')
    const created = !robots
    const el =
      robots ??
      (() => {
        const meta = document.createElement('meta')
        meta.setAttribute('name', 'robots')
        document.head.appendChild(meta)
        return meta
      })()
    const previous = el.getAttribute('content')
    el.setAttribute('content', 'noindex, nofollow')
    return () => {
      if (created) el.remove()
      else if (previous) el.setAttribute('content', previous)
      else el.removeAttribute('content')
    }
  }, [])

  return (
    <PublicPageFrame onSignIn={onSignIn} onCreateAccount={onCreateAccount}>
      <div className="space-y-4">
        <h1 className="font-display text-3xl tracking-tight">Page not found</h1>
        <p className="text-sm text-ink-muted">
          This link is unavailable. Create an account to explore CareerStack projects and profiles.
        </p>
        <Alert tone="info" title="Nothing to show here">
          The URL may be private, expired, or incorrect.
        </Alert>
      </div>
    </PublicPageFrame>
  )
}

export function usePublicAuthActions(returnPath: string) {
  const navigate = useNavigate()

  function goAuth() {
    storeReturnTo(returnPath)
    navigate('/sign-in', { state: { from: returnPath } })
  }

  return {
    onSignIn: goAuth,
    onCreateAccount: goAuth,
    absoluteProjectUrl: projectAbsoluteUrl,
  }
}
