import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('includes a non-color cue (text + icon label) for warning status', () => {
    const { container } = render(
      <StatusBadge tone="warning">Needs review</StatusBadge>,
    )

    expect(screen.getByText('Needs review')).toBeInTheDocument()
    expect(screen.getByText(/Warning:/i)).toBeInTheDocument()
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
