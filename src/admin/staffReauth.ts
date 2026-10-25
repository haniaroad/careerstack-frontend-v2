import { ApiError } from '@/lib/api'
import { reauthenticateCurrentUser } from '@/lib/firebase'

const REAUTH_FINISH_MESSAGE = 'Finish signing in, then try this action again.'
const REAUTH_MAGIC_LINK_MESSAGE =
  'We emailed you a sign-in link. Open it, then try this action again.'

/** Runs a staff write, and retries it once after a Google popup updates auth_time. */
export async function runWithStaffReauth<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof ApiError) || err.code !== 'reauthentication_required') throw err
    const method = await reauthenticateCurrentUser()
    if (method === 'popup') return await run()
    if (method === 'magic_link') throw new Error(REAUTH_MAGIC_LINK_MESSAGE)
    throw new Error(REAUTH_FINISH_MESSAGE)
  }
}
