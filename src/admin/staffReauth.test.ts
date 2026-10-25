import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/firebase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/firebase')>()
  return {
    ...actual,
    reauthenticateCurrentUser: vi.fn(),
  }
})

import { ApiError } from '@/lib/api'
import { reauthenticateCurrentUser } from '@/lib/firebase'
import { runWithStaffReauth } from './staffReauth'

const reauthenticate = vi.mocked(reauthenticateCurrentUser)

describe('runWithStaffReauth', () => {
  beforeEach(() => {
    reauthenticate.mockReset()
  })

  it('returns the action result when the first attempt succeeds', async () => {
    const run = vi.fn().mockResolvedValue('ok')

    await expect(runWithStaffReauth(run)).resolves.toBe('ok')
    expect(reauthenticate).not.toHaveBeenCalled()
  })

  it('retries once after a Google popup updates the sign-in', async () => {
    reauthenticate.mockResolvedValue('popup')
    const run = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(403, 'reauthentication_required', 'Sign in again before this action'))
      .mockResolvedValueOnce('created')

    await expect(runWithStaffReauth(run)).resolves.toBe('created')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('asks for the magic link to be opened and does not retry', async () => {
    reauthenticate.mockResolvedValue('magic_link')
    const run = vi
      .fn()
      .mockRejectedValue(new ApiError(403, 'reauthentication_required', 'Sign in again before this action'))

    await expect(runWithStaffReauth(run)).rejects.toThrow(/emailed you a sign-in link/)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('asks the staff member to finish a redirect and does not retry', async () => {
    reauthenticate.mockResolvedValue('redirect')
    const run = vi.fn().mockRejectedValue(new ApiError(403, 'reauthentication_required', 'Sign in again'))

    await expect(runWithStaffReauth(run)).rejects.toThrow(/Finish signing in/)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('leaves other errors unchanged', async () => {
    const run = vi.fn().mockRejectedValue(new ApiError(422, 'validation_error', 'A reason is required'))

    await expect(runWithStaffReauth(run)).rejects.toMatchObject({ code: 'validation_error' })
    expect(reauthenticate).not.toHaveBeenCalled()
  })
})
