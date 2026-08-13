import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { PublicProfilePage } from '@/pages/PublicProfilePage'
import { PublicSurfaceProfilePage } from '@/pages/PublicSurfaceProfilePage'
import { PublicSurfaceProjectPage } from '@/pages/PublicSurfaceProjectPage'
import { AppShell } from '@/shell/AppShell'
import { SessionShellProvider } from '@/shell/SessionShellProvider'
import { ApiError } from '@/lib/api'
import { fetchPublicProject, looksLikeUuid, storeReturnTo } from '@/lib/publicSurfaces'

function ShellWrap({ children }: { children: React.ReactNode }) {
  return (
    <SessionShellProvider>
      <AppShell>{children}</AppShell>
    </SessionShellProvider>
  )
}

function useOnboarded() {
  const { status, session } = useAuth()
  const loading = status === 'loading'
  const onboarded =
    status === 'authenticated' &&
    !!session &&
    session.user.status !== 'pending_onboarding' &&
    session.workspaces.length > 0
  return { loading, onboarded, status }
}

/** `/profile/:slug` — shell for onboarded users, shell-less public otherwise. */
export function ProfileSlugGate() {
  const { loading, onboarded } = useOnboarded()

  if (loading) {
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        Checking session…
      </main>
    )
  }

  if (onboarded) {
    return (
      <ShellWrap>
        <PublicProfilePage />
      </ShellWrap>
    )
  }

  return <PublicSurfaceProfilePage />
}

/**
 * `/projects/:idOrSlug`
 * - UUID + onboarded → in-shell project detail
 * - kebab slug + anonymous → public surface
 * - kebab slug + onboarded → resolve to UUID and redirect
 */
export function ProjectParamGate() {
  const { id: idOrSlug = '' } = useParams<{ id: string }>()
  const { loading, onboarded, status } = useOnboarded()
  const [redirectId, setRedirectId] = useState<string | null>(null)
  const [publicFallback, setPublicFallback] = useState(false)
  const isUuid = looksLikeUuid(idOrSlug)

  useEffect(() => {
    if (loading || isUuid || !onboarded || !idOrSlug) return
    let cancelled = false
    ;(async () => {
      try {
        const project = await fetchPublicProject(idOrSlug)
        if (!cancelled) setRedirectId(project.id)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setPublicFallback(true)
        } else {
          setPublicFallback(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loading, isUuid, onboarded, idOrSlug])

  if (loading) {
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        Checking session…
      </main>
    )
  }

  if (isUuid) {
    if (onboarded) {
      return (
        <ShellWrap>
          <ProjectDetailPage />
        </ShellWrap>
      )
    }
    storeReturnTo(`/projects/${idOrSlug}`)
    return <Navigate to="/sign-in" replace state={{ from: `/projects/${idOrSlug}` }} />
  }

  if (onboarded) {
    if (redirectId) return <Navigate to={`/projects/${redirectId}`} replace />
    if (publicFallback) return <PublicSurfaceProjectPage />
    return (
      <main className="grid min-h-svh place-items-center text-sm text-muted-foreground">
        Opening project…
      </main>
    )
  }

  if (status === 'authenticated' && !onboarded) {
    storeReturnTo(`/projects/${idOrSlug}`)
    return <Navigate to="/onboarding" replace />
  }

  return <PublicSurfaceProjectPage />
}
