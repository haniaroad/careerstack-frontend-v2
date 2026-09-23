import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { InviteControl } from '@/components/InviteControl'
import { Label } from '@/components/Label'
import { ApiError } from '@/lib/api'
import {
  fetchExplorePeople,
  fetchExploreProjects,
  type ExplorePerson,
  type ExploreProject,
} from '@/lib/explore'
import { trackExploreViewed } from '@/lib/mixpanel'

type Tab = 'projects' | 'people'

function workspaceType(kind: string | undefined): 'personal' | 'organization' {
  return kind === 'organization' ? 'organization' : 'personal'
}

export function ExplorePage() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: Tab = searchParams.get('tab') === 'people' ? 'people' : 'projects'
  const [projects, setProjects] = useState<ExploreProject[]>([])
  const [people, setPeople] = useState<ExplorePerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [skill, setSkill] = useState('')
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [experience, setExperience] = useState('')
  const [location, setLocation] = useState('')
  const [organization, setOrganization] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (tab === 'people') {
        const data = await fetchExplorePeople({ name, skill, role, experience, location, organization })
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
            onClick={() => setSearchParams({})}
          >
            Projects
          </Button>
          <Button
            type="button"
            role="tab"
            aria-selected={tab === 'people'}
            variant={tab === 'people' ? 'default' : 'outline'}
            onClick={() => setSearchParams({ tab: 'people' })}
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
            <Input id="explore-q" value={q} onChange={(event) => setQ(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="explore-skill">Skill</Label>
            <Input id="explore-skill" value={skill} onChange={(event) => setSkill(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="explore-role">Role</Label>
            <Input id="explore-role" value={role} onChange={(event) => setRole(event.target.value)} />
          </div>
        </form>
      ) : (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void load()
          }}
        >
          <Filter id="people-name" label="Name" value={name} onChange={setName} />
          <Filter id="people-skill" label="Skill" value={skill} onChange={setSkill} />
          <Filter id="people-role" label="Role" value={role} onChange={setRole} />
          <Filter id="people-experience" label="Experience" value={experience} onChange={setExperience} />
          <Filter id="people-location" label="Location" value={location} onChange={setLocation} />
          <Filter id="people-org" label="Organization" value={organization} onChange={setOrganization} />
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
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="block rounded-lg border border-border bg-surface p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <p className="font-medium text-ink">{project.title}</p>
                <p className="mt-1 text-sm text-ink">
                  {project.recruitment_state ? `Recruitment ${project.recruitment_state}` : project.status}
                  {project.phase ? ` · ${project.phase}` : ''}
                  {project.joining_mode ? ` · ${project.joining_mode}` : ''}
                </p>
                {project.skills.length > 0 ? (
                  <p className="mt-1 text-sm text-ink-muted">{project.skills.join(', ')}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && tab === 'people' ? (
        <ul className="space-y-3">
          {people.map((person) => (
            <li key={person.user_id} className="space-y-3 rounded-lg border border-border bg-surface p-4">
              <Link
                to={`/profile/${person.slug}`}
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

function Filter({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
