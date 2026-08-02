import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { StubDestinationPage } from './StubDestinationPage'

export function HomePage() {
  return (
    <div className="space-y-6">
      <StubDestinationPage
        title="Home"
        description="Preview shell — identity and real home priorities arrive in the next change."
      />
      <Button asChild variant="outline" size="sm">
        <Link to="/status">Check API health</Link>
      </Button>
    </div>
  )
}
