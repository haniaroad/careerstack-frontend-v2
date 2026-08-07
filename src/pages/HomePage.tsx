import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { StubDestinationPage } from './StubDestinationPage'

export function HomePage() {
  return (
    <div className="space-y-6">
      <StubDestinationPage
        title="Home"
        description="Start a manual solo project from My Work, or jump into create below."
      />
      <div className="flex flex-wrap gap-3">
        <Button asChild size="sm">
          <Link to="/projects/new">Create project</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/my-work">Open My Work</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/status">Check API health</Link>
        </Button>
      </div>
    </div>
  )
}
