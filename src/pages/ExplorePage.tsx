import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { InviteControl } from '@/components/InviteControl'
import { Label } from '@/components/Label'
import { StatusBadge } from '@/components/StatusBadge'
import { ApiError } from '@/lib/api'
import {
  fetchExploreFilterOptions,
  fetchExplorePeople,
  fetchExploreProjects,
  joinStatusLabel,
  type ExploreFilterOptions,
  type ExplorePerson,
  type ExploreProject,
} from '@/lib/explore'
import { trackExploreViewed } from '@/lib/mixpanel'

type Tab = 'projects' | 'people'

const EMPTY_OPTIONS: ExploreFilterOptions = {
  skills: [],
  roles: [],
  experience_levels: ['beginner', 'intermediate', 'advanced'],
  locations: [],
  organizations: [],
}

function workspaceType(kind: string | undefined): 'personal' | 'organization' {
  return kind === 'organization' ? 'organization' : 'personal'
}

export function ExplorePage() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'people' ? 'people' : 'projects'
  const q = searchParams.get('q') ?? ''
  const skill = searchParams.get('skill') ?? ''
  const role = searchParams.get('role') ?? ''
  const name = searchParams.get('name') ?? ''
  const experience = searchParams.get('experience') ?? ''
  const location = searchParams.get('location') ?? ''
  const organization = searchParams.get('organization') ?? ''
  const [projects, setProjects] = useState<ExploreProject[]>([])
  const [people, setPeople] = useState<ExplorePerson[]>([])
  const [options, setOptions] = useState<ExploreFilterOptions>(EMPTY_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const explorePath = `/explore${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

  function writeFilters(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next)
  }

  function setTab(nextTab: Tab) {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'people') next.set('tab', 'people')
    else next.delete('tab')
    setSearchParams(next)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (tab === 'people') {
        const data = await fetchExplorePeople({
          name: name || q,
          skill,
          role,
          experience,
          location,
          organization,
        })
        setPeople(data.people ?? [])
      } else {
        const data = await fetchExploreProjects({ q, skill, role })
        setProjects(data.projects ?? [])
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load Explore')
    } finally {
      setLoading(false)
    }
  }, [tab, q, skill, role, name, experience, location, organization])

  useEffect(() => {
    trackExploreViewed({
      workspace_type: workspaceType(session?.active_workspace?.kind),
      tab,
    })
  }, [session?.active_workspace?.kind, tab])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    void fetchExploreFilterOptions()
      .then((data) => {
        if (!cancelled) setOptions({ ...EMPTY_OPTIONS, ...data })
      })
      .catch(() => {
        if (!cancelled) setOptions(EMPTY_OPTIONS)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl text-ink">Explore</h1>
        <div className="flex gap-2" role="tablist" aria-label="Explore">
          <Button
            type="button"
            role="tab"
            aria-selected={tab === 'projects'}
            variant={tab === 'projects' ? 'default' : 'outline'}
            onClick={() => setTab('projects')}
          >
            Projects
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={tab === 'people'}
            variant={tab === 'people' ? 'default' : 'outline'}
            onClick={() => setTab('people')}
          >
            People
          </Button>
        </div>
      </header>

      {tab === 'projects' ? (
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault()
            void load()
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="explore-q">Search</Label>
            <Input
              id="explore-q"
              value={q}
              onChange={(event) => writeFilters({ q: event.target.value })}
            />
          </div>
          <FilterSelect
            id="explore-skill"
            label="Skill"
            value={skill}
            options={options.skills}
            onChange={(value) => writeFilters({ skill: value })}
          />
          <FilterSelect
            id="explore-role"
            label="Role"
            value={role}
            options={options.roles}
            onChange={(value) => writeFilters({ role: value })}
          />
        </form>
      ) : (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void load()
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="people-name">Name</Label>
            <Input
              id="people-name"
              value={name}
              onChange={(event) => writeFilters({ name: event.target.value })}
            />
          </div>
          <FilterSelect
            id="people-skill"
            label="Skill"
            value={skill}
            options={options.skills}
            onChange={(value) => writeFilters({ skill: value })}
          />
          <FilterSelect
            id="people-role"
            label="Role"
            value={role}
            options={options.roles}
            onChange={(value) => writeFilters({ role: value })}
          />
          <FilterSelect
            id="people-experience"
            label="Experience"
            value={experience}
            options={options.experience_levels}
            onChange={(value) => writeFilters({ experience: value })}
          />
          <FilterSelect
            id="people-location"
            label="Location"
            value={location}
            options={options.locations}
            onChange={(value) => writeFilters({ location: value })}
          />
          <FilterSelect
            id="people-org"
            label="Organization"
            value={organization}
            options={options.organizations}
            onChange={(value) => writeFilters({ organization: value })}
          />
        </form>
      )}

      {error ? <Alert tone="danger" title="Something went wrong">{error}</Alert> : null}
      {loading ? <p className="text-sm text-ink-muted">Loading Explore…</p> : null}

      {!loading && tab === 'projects' && projects.length === 0 ? (
        <EmptyState title="No projects match" description="Try another search, or check back when more projects are open." />
      ) : null}
      {!loading && tab === 'people' && people.length === 0 ? (
        <EmptyState title="No matching people" description="No matching people were found." />
      ) : null}

      {!loading && tab === 'projects' ? (
        <ul className="space-y-3">
          {projects.map((project) => {
            const joinLabel = joinStatusLabel(project)
            return (
              <li key={project.id}>
                <Link
                  to={`/projects/${project.id}?from=${encodeURIComponent(explorePath)}`}
                  className="block rounded-lg border border-border bg-surface p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{project.title}</p>
                    <StatusBadge tone="info">{project.mode === 'team' ? 'Team' : 'Solo'}</StatusBadge>
                    {joinLabel ? <StatusBadge tone="info">{joinLabel}</StatusBadge> : null}
                  </div>
                  {project.skills.length > 0 ? (
                    <p className="mt-1 text-sm text-ink-muted">{project.skills.join(', ')}</p>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}

      {!loading && tab === 'people' ? (
        <ul className="space-y-3">
          {people.map((person) => (
            <li key={person.user_id} className="space-y-3 rounded-lg border border-border bg-surface p-4">
              <Link
                to={`/profile/${person.slug}?from=${encodeURIComponent(explorePath)}`}
                className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <p className="font-medium text-ink">{person.display_name}</p>
                <p className="text-sm text-ink-muted">
                  {[person.role, person.location, person.experience_level].filter(Boolean).join(' · ')}
                </p>
                {person.skills.length > 0 ? (
                  <p className="mt-1 text-sm text-ink">{person.skills.join(', ')}</p>
                ) : null}
                {person.organizations.length > 0 ? (
                  <p className="text-sm text-ink-muted">{person.organizations.join(', ')}</p>
                ) : null}
              </Link>
              <InviteControl userId={person.user_id} displayName={person.display_name} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const choices = value && !options.includes(value) ? [value, ...options] : options
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="h-9 w-full rounded-md border border-border bg-canvas px-3 text-sm text-ink"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Any</option>
        {choices.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}
