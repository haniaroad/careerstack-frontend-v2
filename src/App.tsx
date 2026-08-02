import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/Tooltip'
import { AppShell } from '@/shell/AppShell'
import { ShellProvider } from '@/shell/ShellContext'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { ExplorePage } from '@/pages/ExplorePage'
import { HomePage } from '@/pages/HomePage'
import { InboxPage } from '@/pages/InboxPage'
import { MorePage } from '@/pages/MorePage'
import { MyWorkPage } from '@/pages/MyWorkPage'
import { OrgAdminPage } from '@/pages/OrgAdminPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { StatusPage } from '@/pages/StatusPage'

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export default function App() {
  return (
    <TooltipProvider>
      <ShellProvider>
        <Routes>
          <Route path="/status" element={<StatusPage />} />
          <Route element={<ShellLayout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="my-work" element={<MyWorkPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="organization" element={<OrgAdminPage />} />
            <Route path="more" element={<MorePage />} />
            <Route path="dev/design-system" element={<DesignSystemPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </ShellProvider>
    </TooltipProvider>
  )
}
