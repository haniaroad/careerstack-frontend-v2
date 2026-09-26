import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FirstRunTip } from './FirstRunTip'

const apiFetch = vi.fn()

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number
    code: string
    constructor(status: number, code: string, message: string) {
      super(message)
      this.status = status
      this.code = code
    }
  }
  return { apiFetch: (...args: unknown[]) => apiFetch(...args), ApiError }
})

describe('FirstRunTip', () => {
  afterEach(() => {
    cleanup()
    apiFetch.mockReset()
  })

  it('shows one inline tip and dismisses it without opening a dialog', async () => {
    const user = userEvent.setup()
    apiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (init?.method === 'POST') return {}
      return {
        tip: {
          key: 'home',
          label: 'Start here',
          body: 'Home shows your next action, including a first project in your Personal workspace if you still have a credit.',
        },
      }
    })

    render(<FirstRunTip destination="home" />)

    const tip = await screen.findByRole('region', { name: 'Start here' })
    expect(tip).toHaveAttribute('data-layout', 'inline')
    expect(tip.className).not.toMatch(/ember|fixed|absolute|popover/i)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/Personal workspace/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dismiss tip' }))
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/first_run_tips/home/dismiss', { method: 'POST' })
    expect(screen.queryByRole('region', { name: 'Start here' })).not.toBeInTheDocument()
  })

  it('renders restricted copy from the server and stays inline', async () => {
    apiFetch.mockResolvedValue({
      tip: {
        key: 'home',
        label: 'Start here',
        body: 'Home shows the next action for this workspace.',
      },
    })

    render(<FirstRunTip destination="home" />)

    const tip = await screen.findByText('Home shows the next action for this workspace.')
    expect(tip.closest('[data-layout="inline"]')).toBeTruthy()
    expect(screen.queryByText(/Personal workspace/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/credit/i)).not.toBeInTheDocument()
  })
})
