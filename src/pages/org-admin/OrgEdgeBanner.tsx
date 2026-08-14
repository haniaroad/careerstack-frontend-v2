import { Alert } from '@/components/Alert'
import type { OrganizationAdminOrg } from '@/lib/organizationAdmin'

export function OrgEdgeBanner({ organization }: { organization: OrganizationAdminOrg }) {
  if (organization.workspace_status === 'offboarding_readonly') {
    return (
      <Alert tone="warning" title="Organization is read-only">
        This organization is in a 30-day offboarding window. You can review programs, members, and
        credits, but new programs, projects, invitations, and edits are blocked.
        {organization.offboarding_ends_on ? (
          <p className="mt-1 font-mono text-xs">Window ends {organization.offboarding_ends_on}</p>
        ) : null}
      </Alert>
    )
  }

  if (organization.workspace_status === 'disabled') {
    return (
      <Alert tone="danger" title="Organization workspace is disabled">
        This organization is no longer an active workspace. History remains for context; create,
        invite, and edit actions stay blocked.
      </Alert>
    )
  }

  return null
}
