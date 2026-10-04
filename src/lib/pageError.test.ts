import { describe, expect, it } from 'vitest'
import { describePageError } from './pageError'

describe('describePageError', () => {
  it('explains not found without using the technical headline', () => {
    const copy = describePageError({ code: 'not_found', message: 'Resource not found' })
    expect(copy.title).toBe("This page isn't available to you.")
    expect(copy.title).not.toBe('Resource not found')
    expect(copy.body).toMatch(/private/)
    expect(copy.code).toBe('not_found')
  })

  it('keeps a specific forbidden sentence', () => {
    const copy = describePageError({
      code: 'forbidden',
      message: 'You cannot edit this project',
    })
    expect(copy.title).toBe('You cannot edit this project')
    expect(copy.code).toBe('forbidden')
  })

  it('uses a generic access sentence when forbidden has no detail', () => {
    const copy = describePageError({ code: 'forbidden', message: 'Forbidden' })
    expect(copy.title).toBe("You don't have access to this page.")
  })
})
