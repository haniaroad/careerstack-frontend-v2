import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/Tooltip'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireAuth, RequireOnboarded } from '@/auth/RequireAuth'
import { AppShell } from '@/shell/AppShell'
import { ShellProvider } from '@/shell/ShellContext'
import { SessionShellProvider } from '@/shell/SessionShellProvider'
import { AuthCompletePage } from '@/pages/AuthCompletePage'
import { BillingPage, BillingReturnPage } from '@/pages/BillingPage'
import { CreateOrganizationPage } from '@/pages/CreateOrganizationPage'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { ExplorePage } from '@/pages/ExplorePage'
import { FirstWorkspaceLandingPage } from '@/pages/FirstWorkspaceLandingPage'
import { HomePage } from '@/pages/HomePage'
import { InboxPage } from '@/pages/InboxPage'
import { MorePage } from '@/pages/MorePage'
import { MyWorkPage } from '@/pages/MyWorkPage'
import { CreateProjectPage } from '@/pages/CreateProjectPage'
import { ProjectDetailPage } from '@/pages/ProjectDetailPage'
import { TaskDetailPage } from '@/pages/TaskDetailPage'
import { OnboardingRouterPage } from '@/pages/OnboardingRouterPage'
import { OrgAdminPage } from '@/pages/OrgAdminPage'
import { OrgInvitedOnboardingPage } from '@/pages/OrgInvitedOnboardingPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SignInPage } from '@/pages/SignInPage'
import { StatusPage } from '@/pages/StatusPage'
import { isDesignSystemPreviewEnabled } from '@/config'

function ShellLayout() {
  return (
    <SessionShellProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </SessionShellProvider>
  )
}

function PreviewShellLayout() {
  return (
    <ShellProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </ShellProvider>
  )
}

export default function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <Routes>
          <Route path="/status" element={<StatusPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/auth/complete" element={<AuthCompletePage />} />
          <Route path="/invite" element={<OrgInvitedOnboardingPage />} />
          <Route path="/invite/:token" element={<OrgInvitedOnboardingPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/onboarding" element={<OnboardingRouterPage />} />
            <Route path="/welcome" element={<FirstWorkspaceLandingPage />} />
            <Route path="/organizations/new" element={<CreateOrganizationPage />} />
          </Route>

          {isDesignSystemPreviewEnabled() ? (
            <Route element={<PreviewShellLayout />}>
              <Route path="dev/design-system" element={<DesignSystemPage />} />
            </Route>
          ) : null}

          <Route element={<RequireOnboarded />}>
            <Route element={<ShellLayout />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="home" element={<HomePage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="my-work" element={<MyWorkPage />} />
              <Route path="tasks/:id" element={<TaskDetailPage />} />
              <Route path="projects/new" element={<CreateProjectPage />} />
              <Route path="projects/:id/edit" element={<CreateProjectPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="billing/return" element={<BillingReturnPage />} />
              <Route path="organization" element={<OrgAdminPage />} />
              <Route path="more" element={<MorePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/sign-in" replace />} />
        </Routes>
      </AuthProvider>
    </TooltipProvider>
  )
}
