import { Link } from 'react-router-dom'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'

export type InsufficientCreditsInterceptionProps = {
  blockedAction: string
  remaining: number
  variant: 'personal' | 'organization'
  /** Organization role for copy; ignored for personal. */
  role?: 'admin' | 'manager' | 'participant'
}

export function InsufficientCreditsInterception({
  blockedAction,
  remaining,
  variant,
  role = 'participant',
}: InsufficientCreditsInterceptionProps) {
  if (variant === 'personal') {
    return (
      <Alert tone="warning" title="Not enough credits">
        <p className="mb-3">
          You need a credit to {blockedAction}. You have {remaining} remaining.
        </p>
        <Button asChild size="sm">
          <Link to="/billing">Buy personal pack</Link>
        </Button>
      </Alert>
    )
  }

  const body =
    role === 'admin'
      ? 'Organization credits are unavailable for this action. Submit an upgrade request from Organization administration when that flow is available.'
      : role === 'manager'
        ? 'This organization does not have enough pooled credits for this action.'
        : 'Sponsorship is unavailable for this action right now.'

  return (
    <div data-testid="insufficient-credits">
      <Alert tone="warning" title="Credits unavailable">
        <p>
          You cannot {blockedAction}. {body}
        </p>
      </Alert>
    </div>
  )
}
