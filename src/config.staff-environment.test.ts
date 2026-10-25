import { describe, expect, it } from 'vitest'
import { staffEnvironmentOptions } from './config'

const production = {
  VITE_API_BASE_URL: 'https://api.careerstack.co',
  VITE_FIREBASE_API_KEY: 'prod-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'prod.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'prod',
  VITE_FIREBASE_APP_ID: 'prod-app',
}

describe('staffEnvironmentOptions', () => {
  it('stays on the primary API when staging is not configured', () => {
    const result = staffEnvironmentOptions(production, 'staging')
    expect(result.options.map((option) => option.id)).toEqual(['production'])
    expect(result.selected).toBe('production')
  })

  it('remembers staging when both environments are configured', () => {
    const result = staffEnvironmentOptions(
      {
        ...production,
        VITE_STAGING_API_BASE_URL: 'https://staging-api.careerstack.co',
        VITE_STAGING_FIREBASE_API_KEY: 'stage-key',
        VITE_STAGING_FIREBASE_AUTH_DOMAIN: 'stage.firebaseapp.com',
        VITE_STAGING_FIREBASE_PROJECT_ID: 'stage',
        VITE_STAGING_FIREBASE_APP_ID: 'stage-app',
      },
      'staging',
    )
    expect(result.selected).toBe('staging')
    expect(result.options.find((option) => option.id === 'staging')?.apiBaseUrl).toBe(
      'https://staging-api.careerstack.co',
    )
  })
})
