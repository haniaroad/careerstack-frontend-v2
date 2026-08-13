import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { ApiError } from '@/lib/api'
import {
  trackProfileLinkCopied,
  trackProfileSaved,
  trackProfileViewed,
  trackProfileVisibilityConfirmed,
  trackProfileVisibilityReversed,
} from '@/lib/mixpanel'
import {
  fetchOwnProfile,
  profileAbsoluteUrl,
  profilePublicPath,
  type ProfilePayload,
  updateOwnProfile,
  updateProfileVisibility,
} from '@/lib/profiles'

type Tab = 'details' | 'activity' | 'skills' | 'settings'

function StatsRow({ stats }: { stats: ProfilePayload['stats'] }) {
  const specialized: { label: string; value: string }[] = []
  if (stats.on_time_submission_rate) {
    specialized.push({
      label: 'On-time submission',
      value: `${Math.round(stats.on_time_submission_rate.rate * 100)}%`,
    })
  }
  if (stats.late_submissions) {
    specialized.push({ label: 'Late submissions', value: String(stats.late_submissions) })
  }
  if (stats.ai_approved_tasks) {
    specialized.push({ label: 'AI-approved tasks', value: String(stats.ai_approved_tasks) })
  }
  if (stats.creator_reviewed_approved_tasks) {
    specialized.push({
      label: 'Creator-reviewed approvals',
      value: String(stats.creator_reviewed_approved_tasks),
    })
  }
  if (stats.average_creator_review_hours) {
    specialized.push({
      label: 'Avg. creator review',
      value: `${stats.average_creator_review_hours}h`,
    })
  }

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          ['Projects completed', stats.projects_completed],
          ['Active projects', stats.active_projects],
          ['Tasks approved', stats.tasks_approved],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-border bg-surface px-3.5 py-3">
            <dt className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
              {label}
            </dt>
            <dd className="mt-1 font-display text-2xl text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {specialized.length > 0 ? (
        <dl className="flex flex-wrap gap-2">
          {specialized.map((item) => (
            <div
              key={item.label}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink"
            >
              <span className="text-ink-muted">{item.label}: </span>
              {item.value}
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

function ActivitySparkline({ activity }: { activity: ProfilePayload['stats']['activity'] }) {
  const max = Math.max(1, ...activity.map((point) => point.count))
  return (
    <div className="space-y-2" aria-label="Contribution activity">
      <p className="text-sm text-ink-muted">Equal-weight contribution heartbeat (last 26 weeks)</p>
      <div className="flex h-16 items-end gap-0.5">
        {activity.map((point) => (
          <div
            key={point.week_start}
            title={`${point.week_start}: ${point.count}`}
            className="flex-1 rounded-sm bg-accent/80"
            style={{ height: `${Math.max(8, (point.count / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function SocialLinks({ links }: { links: ProfilePayload['links'] }) {
  if (links.length === 0) return null
  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.provider}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sm text-accent underline-offset-2 hover:underline"
          >
            <span className="font-medium capitalize">{link.provider}</span>
            <span className="ml-2 break-all text-ink">{link.url}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function CopyLinkControl({
  slug,
  enabled,
}: {
  slug: string
  enabled: boolean
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'unavailable'>('idle')
  if (!enabled) return null
  const url = profileAbsoluteUrl(slug)

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url)
            setState('copied')
            trackProfileLinkCopied()
            window.setTimeout(() => setState('idle'), 2000)
          } catch {
            setState('unavailable')
          }
        }}
      >
        {state === 'copied' ? 'Copied' : 'Copy link'}
      </Button>
      {state === 'unavailable' ? (
        <input
          readOnly
          value={url}
          aria-label="Public URL — select and copy"
          className="w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs"
          onFocus={(event) => event.currentTarget.select()}
        />
      ) : null}
      <span aria-live="polite" className="sr-only">
        {state === 'copied' ? `Copied ${url} to clipboard` : ''}
      </span>
    </div>
  )
}

export function ProfilePage() {
  const { session, refreshSession } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('details')
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    career_goal: '',
    country: '',
    state_region: '',
    experience_level: 'beginner',
    github_url: '',
    linkedin_url: '',
    portfolio_url: '',
  })

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await fetchOwnProfile()
      setProfile(data)
      setForm({
        display_name: data.details.display_name ?? '',
        bio: data.details.bio ?? '',
        career_goal: data.details.career_goal ?? '',
        country: data.details.country ?? '',
        state_region: data.details.state_region ?? '',
        experience_level: data.details.experience_level ?? 'beginner',
        github_url: data.details.github_url ?? '',
        linkedin_url: data.details.linkedin_url ?? '',
        portfolio_url: data.details.portfolio_url ?? '',
      })
      trackProfileViewed({ visibility: data.visibility, own: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load profile')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const genuinelyPublic = useMemo(
    () => profile?.visibility === 'public_adult' && profile.public_identity_visible,
    [profile],
  )

  const remaining = session?.credits?.remaining
  const isPersonal =
    session?.workspaces.find((w) => w.id === session.active_workspace_id)?.kind === 'personal'

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await updateOwnProfile({
        display_name: form.display_name,
        bio: form.bio || null,
        career_goal: form.career_goal,
        country: form.country,
        state_region: form.state_region,
        experience_level: form.experience_level,
        github_url: form.github_url || null,
        linkedin_url: form.linkedin_url || null,
        portfolio_url: form.portfolio_url || null,
      })
      setProfile(updated)
      trackProfileSaved()
      await refreshSession?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  async function onVisibility(decision: 'confirm' | 'reverse') {
    setError(null)
    try {
      const result = await updateProfileVisibility(decision)
      setProfile(result.profile)
      if (decision === 'confirm') trackProfileVisibilityConfirmed()
      else trackProfileVisibilityReversed()
      await refreshSession?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update visibility')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'activity', label: 'Activity' },
    { id: 'skills', label: 'Skills & artifacts' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-ink-muted">Profile</p>
        <h1 className="font-display text-3xl text-ink">
          {profile?.details.display_name ?? session?.profile?.display_name ?? 'Your profile'}
        </h1>
        <p className="text-ink-muted">{session?.user.email}</p>
        {profile?.details.slug ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-sm text-ink-muted">/profile/{profile.details.slug}</p>
            <CopyLinkControl slug={profile.details.slug} enabled={Boolean(genuinelyPublic)} />
            {genuinelyPublic ? (
              <Button type="button" variant="secondary" onClick={() => navigate(profilePublicPath(profile.details.slug))}>
                Public preview
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {error ? <Alert tone="danger" title="Something went wrong">{error}</Alert> : null}

      {profile?.age_visibility?.visibility_review_required ? (
        <Alert tone="info" title="Visibility review">
          Your profile stays private until you confirm public identity. You can reverse this later.
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onVisibility('confirm')}>
              Confirm public visibility
            </Button>
            {profile.age_visibility?.public_identity_confirmed ? (
              <Button type="button" variant="secondary" onClick={() => void onVisibility('reverse')}>
                Keep private
              </Button>
            ) : null}
          </div>
        </Alert>
      ) : null}

      {profile &&
      !profile.age_visibility?.visibility_review_required &&
      profile.public_identity_visible ? (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={() => void onVisibility('reverse')}>
            Make profile private
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border pb-2" role="tablist" aria-label="Profile sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              tab === item.id ? 'bg-ink text-white' : 'text-ink-muted hover:bg-surface'
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {profile ? <StatsRow stats={profile.stats} /> : null}

      {tab === 'details' && profile ? (
        <form className="space-y-4" onSubmit={(event) => void onSave(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experience_level">Experience</Label>
              <select
                id="experience_level"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
                value={form.experience_level}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, experience_level: event.target.value }))
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state_region">State / region</Label>
              <Input
                id="state_region"
                value={form.state_region}
                onChange={(event) => setForm((prev) => ({ ...prev, state_region: event.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="career_goal">Career goal</Label>
            <Input
              id="career_goal"
              value={form.career_goal}
              onChange={(event) => setForm((prev) => ({ ...prev, career_goal: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={form.bio}
              onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="github_url">GitHub URL</Label>
              <Input
                id="github_url"
                value={form.github_url}
                onChange={(event) => setForm((prev) => ({ ...prev, github_url: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                value={form.linkedin_url}
                onChange={(event) => setForm((prev) => ({ ...prev, linkedin_url: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portfolio_url">Portfolio URL</Label>
              <Input
                id="portfolio_url"
                value={form.portfolio_url}
                onChange={(event) => setForm((prev) => ({ ...prev, portfolio_url: event.target.value }))}
              />
            </div>
          </div>
          <SocialLinks links={profile.links} />
          <p className="text-sm text-ink-muted">
            System-recorded projects, tasks, and contribution history cannot be rewritten here.
          </p>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save details'}
          </Button>
        </form>
      ) : null}

      {tab === 'activity' && profile ? <ActivitySparkline activity={profile.stats.activity} /> : null}

      {tab === 'skills' && profile ? (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">Skills</h2>
            {profile.evidence.skills.length === 0 ? (
              <p className="text-sm text-ink-muted">Skills appear as you complete project work.</p>
            ) : (
              <ul className="space-y-2">
                {profile.evidence.skills.map((skill) => (
                  <li key={skill.name} className="rounded-md border border-border px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{skill.name}</span>
                    <span className="ml-2 text-ink-muted">{skill.level.replaceAll('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">Artifacts</h2>
            {profile.evidence.artifacts.length === 0 ? (
              <p className="text-sm text-ink-muted">Uploaded files and https links show up here.</p>
            ) : (
              <ul className="space-y-2">
                {profile.evidence.artifacts.map((artifact, index) => (
                  <li key={`${artifact.label}-${index}`} className="text-sm text-ink">
                    {artifact.url ? (
                      <a
                        href={artifact.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-accent underline-offset-2 hover:underline"
                      >
                        {artifact.label}
                      </a>
                    ) : (
                      artifact.label
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">Billing & Credits</h2>
          <p className="text-sm text-ink-muted">
            {typeof remaining === 'number'
              ? `${remaining} credit${remaining === 1 ? '' : 's'} remaining in this workspace.`
              : 'View your credit balance, purchase history, and refund options.'}
          </p>
          <Button asChild>
            <Link to="/billing">Open Billing & Credits</Link>
          </Button>
          {!isPersonal ? (
            <Alert tone="info" title="Organization workspace">
              Organization credits are pooled. Personal pack purchase is only available in Personal
              workspace.
            </Alert>
          ) : null}
          <p className="pt-2 text-sm text-ink-muted">
            Email notification preferences will land with the notifications change.
          </p>
        </section>
      ) : null}
    </div>
  )
}
