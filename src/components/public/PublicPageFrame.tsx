import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { cn } from '@/lib/utils'

const CHROME = {
  wordmark: 'CareerStack',
  signInLabel: 'Sign in',
  createAccountLabel: 'Create account',
}

type PublicPageFrameProps = {
  children: ReactNode
  onSignIn: () => void
  onCreateAccount: () => void
  className?: string
}

/**
 * Shell-less chrome for anonymous public surfaces: wordmark + auth CTAs only.
 */
export function PublicPageFrame({
  children,
  onSignIn,
  onCreateAccount,
  className,
}: PublicPageFrameProps) {
  return (
    <div className={cn('min-h-svh bg-[#F7F5F1] text-[#0B0B0D] antialiased', className)}>
      <header className="border-b border-[#0B0B0D]/12">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
          <Link to="/sign-in" className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded bg-[#0B0B0D] text-[10px] font-bold text-white">
              CS
            </span>
            <span className="truncate text-[15px] font-semibold tracking-tight">
              {CHROME.wordmark}
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" className="h-9" onClick={onSignIn}>
              {CHROME.signInLabel}
            </Button>
            <Button
              type="button"
              className="h-9 bg-[#0B0B0D] text-white hover:bg-black"
              onClick={onCreateAccount}
            >
              {CHROME.createAccountLabel}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  )
}
