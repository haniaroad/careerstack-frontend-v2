import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

export type TaxonomyTerm = {
  id: string
  key: string
  label: string
  is_other?: boolean
}

export type TaxonomyLists = {
  roles: TaxonomyTerm[]
  skills: TaxonomyTerm[]
  countries: string[]
  usStateAbbreviations: string[]
}

type TaxonomiesResponse = {
  countries?: string[]
  us_state_abbreviations?: string[]
  taxonomies?: { key: string; terms?: TaxonomyTerm[] }[]
}

export const EMPTY_TAXONOMY_LISTS: TaxonomyLists = {
  roles: [],
  skills: [],
  countries: [],
  usStateAbbreviations: [],
}

export function isUnitedStates(country: string) {
  return country.trim().toLowerCase() === 'united states'
}

export function labelsFromTerms(terms: TaxonomyTerm[]) {
  return terms.map((term) => term.label)
}

/** Taxonomy labels first, then any saved values the list does not include yet. */
export function optionsWithLegacy(labels: string[], selected: string[]) {
  const options = [...labels]
  for (const value of selected) {
    if (value && !options.includes(value)) options.push(value)
  }
  return options
}

export function useTaxonomyLists() {
  const [lists, setLists] = useState(EMPTY_TAXONOMY_LISTS)

  useEffect(() => {
    let cancelled = false
    fetchTaxonomyLists()
      .then((next) => {
        if (!cancelled) setLists(next)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return lists
}

export async function fetchTaxonomyLists(): Promise<TaxonomyLists> {
  const data = await apiFetch<TaxonomiesResponse>('/api/v1/taxonomies')
  const taxonomies = data?.taxonomies ?? []
  return {
    roles: taxonomies.find((item) => item.key === 'roles')?.terms ?? [],
    skills: taxonomies.find((item) => item.key === 'skills')?.terms ?? [],
    countries: data?.countries ?? [],
    usStateAbbreviations: data?.us_state_abbreviations ?? [],
  }
}
