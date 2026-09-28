import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/Tooltip'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { RequireAuth } from '@/auth/RequireAuth'
import { ApiError, apiFetch } from '@/lib/api'
import { AppShell } from '@/shell/AppShell'
import { SessionShellProvider } from '@/shell/SessionShellProvider'
import { AuthCompletePage } from '@/pages/AuthCompletePage'
import { BillingPage, BillingReturnPage } from '@/pages/BillingPage'
import { ExplorePage } from '@/pages/ExplorePage'
import { HomePage } from '@/pages/HomePage'
import { InboxPage } from '@/pages/InboxPage'
import { MorePage } from '@/pages/MorePage'
import { MyWorkPage } from '@/pages/MyWorkPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SignInPage } from '@/pages/SignInPage'
import { StatusPage } from '@/pages/StatusPage'
import { TaskDetailPage } from '@/pages/TaskDetailPage'
import {
  AuditArea,
  CreditsArea,
  ImpersonationArea,
  ModerationArea,
  QueuesArea,
  UsersArea,
} from './areas'
import { StaffShell } from './StaffShell'

function ShellLayout() {
  return (
    <SessionShellProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </SessionShellProvider>
  )
}

function StaffAccess({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading')

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/v1/platform_admin/session')
      .then(() => {
        if (!cancelled) setState('ok')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setState('denied')
          return
        }
        setState('denied')
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'loading') {
    return <p className="p-6 text-sm text-muted-foreground">Checking staff access…</p>
  }
  if (state === 'denied') {
    return (
      <main className="grid min-h-svh place-items-center p-6 text-sm">
        This account is not a platform admin.
      </main>
    )
  }
  return children
}

function StaffGateLayout() {
  return (
    <StaffAccess>
      <StaffShell />
    </StaffAccess>
  )
}

export function AdminRoutes() {
  const { session } = useAuth()
  const impersonating = Boolean(session?.impersonation?.active)

  return (
    <Routes>
      <Route path="/status" element={<StatusPage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/auth/complete" element={<AuthCompletePage />} />
      <Route element={<RequireAuth />}>
        {impersonating ? (
          <Route element={<ShellLayout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="my-work" element={<MyWorkPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="billing/return" element={<BillingReturnPage />} />
            <Route path="more" element={<MorePage />} />
          </Route>
        ) : (
          <Route element={<StaffGateLayout />}>
            <Route index element={<Navigate to="/admin/users" replace />} />
            <Route path="admin/users" element={<UsersArea />} />
            <Route path="admin/credits" element={<CreditsArea />} />
            <Route path="admin/moderation" element={<ModerationArea />} />
            <Route path="admin/queues" element={<QueuesArea />} />
            <Route path="admin/impersonation" element={<ImpersonationArea />} />
            <Route path="admin/audit" element={<AuditArea />} />
          </Route>
        )}
      </Route>
    </Routes>
  )
}

export function AdminApp() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <AdminRoutes />
      </AuthProvider>
    </TooltipProvider>
  )
}
