import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { InsufficientCreditsInterception } from '@/components/InsufficientCreditsInterception'

describe('Create flow interception', () => {
  it('offers purchase for personal insufficient credits on confirm', () => {
    render(
      <MemoryRouter>
        <InsufficientCreditsInterception
          blockedAction="create a project"
          remaining={0}
          variant="personal"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Not enough credits/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Buy personal pack/i })).toHaveAttribute(
      'href',
      '/billing',
    )
  })
})
