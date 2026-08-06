import { describe, expect, it } from 'vitest'
import { looksLikeHtmlResponse } from '@/lib/api'

describe('looksLikeHtmlResponse', () => {
  it('detects text/html content-type', () => {
    expect(looksLikeHtmlResponse('text/html; charset=utf-8', '')).toBe(true)
  })

  it('detects doctype bodies even without html content-type', () => {
    expect(looksLikeHtmlResponse('application/json', '<!DOCTYPE html><html>')).toBe(true)
  })

  it('allows normal JSON', () => {
    expect(looksLikeHtmlResponse('application/json', '{"taxonomies":[]}')).toBe(false)
  })
})
