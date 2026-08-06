import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { InsufficientCreditsInterception } from './InsufficientCreditsInterception'

describe('InsufficientCreditsInterception', () => {
  it('offers purchase for personal workspace', () => {
    render(
      <MemoryRouter>
        <InsufficientCreditsInterception
          blockedAction="create a project"
          remaining={0}
          variant="personal"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/not enough credits/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /buy personal pack/i })).toHaveAttribute(
      'href',
      '/billing',
    )
  })

  it('hides purchase for organization participants', () => {
    render(
      <MemoryRouter>
        <InsufficientCreditsInterception
          blockedAction="join a project"
          remaining={0}
          variant="organization"
          role="participant"
        />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('insufficient-credits')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /buy personal pack/i })).not.toBeInTheDocument()
    expect(screen.getByText(/sponsorship is unavailable/i)).toBeInTheDocument()
  })
})
