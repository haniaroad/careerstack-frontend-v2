import { beforeEach, describe, expect, it } from 'vitest'
import {
  consumeReturnTo,
  isInviteReturnTo,
  isSafeReturnTo,
  storeReturnTo,
} from './publicSurfaces'

describe('returnTo helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('allows organization invite paths and rejects nested traversal', () => {
    expect(isSafeReturnTo('/invite')).toBe(true)
    expect(isSafeReturnTo('/invite/abc-TOKEN_123')).toBe(true)
    expect(isInviteReturnTo('/invite/abc-TOKEN_123')).toBe(true)
    expect(isSafeReturnTo('/invite/../home')).toBe(false)
    expect(isSafeReturnTo('https://evil.example/invite/x')).toBe(false)
  })

  it('stores invite returnTo in localStorage so a magic-link tab can resume', () => {
    storeReturnTo('/invite/tok-1')
    expect(window.localStorage.getItem('careerstack.returnTo')).toBe('/invite/tok-1')
    expect(window.sessionStorage.getItem('careerstack.returnTo')).toBe('/invite/tok-1')
    expect(consumeReturnTo()).toBe('/invite/tok-1')
    expect(window.localStorage.getItem('careerstack.returnTo')).toBeNull()
  })
})
