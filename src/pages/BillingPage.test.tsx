import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BillingReturnPage } from '@/pages/BillingPage'

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    refreshSession: vi.fn().mockResolvedValue(null),
  }),
}))

vi.mock('@/lib/mixpanel', () => ({
  trackPurchaseCompleted: vi.fn(),
  trackPurchaseStarted: vi.fn(),
}))

describe('BillingReturnPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('states that nothing was charged when checkout is cancelled', () => {
    render(
      <MemoryRouter initialEntries={['/billing/return?status=cancelled']}>
        <Routes>
          <Route path="/billing/return" element={<BillingReturnPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/checkout cancelled/i)).toBeInTheDocument()
    expect(screen.getByText(/nothing was charged/i)).toBeInTheDocument()
  })
})
