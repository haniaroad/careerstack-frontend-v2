import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/Tooltip'
import { ContributionActivity, type ActivityPoint } from './ContributionActivity'

function renderChart(activity: ActivityPoint[]) {
  return render(
    <TooltipProvider delayDuration={0}>
      <ContributionActivity activity={activity} />
    </TooltipProvider>,
  )
}

const emptyWeeks: ActivityPoint[] = Array.from({ length: 26 }, (_, index) => ({
  week_start: `2026-01-${String(index + 5).padStart(2, '0')}`,
  count: 0,
  by_kind: {},
}))

describe('ContributionActivity', () => {
  it('explains an empty window and draws no bars', () => {
    renderChart(emptyWeeks)
    expect(screen.getByText(/Qualifying actions have not been recorded yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('draws an Ember bar and summarizes the week on hover and focus', async () => {
    const user = userEvent.setup()
    renderChart([
      ...emptyWeeks.slice(0, 25),
      {
        week_start: '2026-09-28',
        count: 9,
        by_kind: {
          task_submitted: 4,
          task_approved: 3,
          peer_review_submitted: 1,
          project_completed: 1,
        },
      },
    ])

    expect(screen.getByText('9 contributions in the last 26 weeks')).toBeInTheDocument()
    const bar = screen.getByRole('button', {
      name: /Week of Sep 28, 2026, 9 contributions, 4 tasks submitted, 3 tasks approved, 1 peer review, 1 project completed/i,
    })
    expect(bar.className).toContain('bg-primary')

    await user.tab()
    expect(bar).toHaveFocus()
    expect(await screen.findByText('3 tasks approved')).toBeInTheDocument()

    await user.hover(bar)
    expect(await screen.findByText('Week of Sep 28, 2026')).toBeInTheDocument()
    expect(screen.getByText('4 tasks submitted')).toBeInTheDocument()
    expect(screen.queryByText(/artifact/i)).not.toBeInTheDocument()
  })
})