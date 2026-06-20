import { InviteEntry } from "@/components/onboarding/invite-entry"
import { formatClinicalRole } from "@/lib/roles"
import { createServiceClient } from "@/lib/supabase/server"
import type { ClinicalRole } from "@/lib/supabase/types"

type InvitePageProps = {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const service = createServiceClient()
  const { data } = await service
    .from("invites")
    .select("*, organizations(id, name), departments(id, name)")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  const invite = data as
    | {
        email: string
        clinical_role: ClinicalRole
        organizations: { id: string; name: string } | null
        departments: { id: string; name: string } | null
      }
    | null

  if (!invite?.organizations || !invite.departments) {
    return (
      <div className="flex min-h-svh items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Invite unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite is expired, already accepted, or no longer exists. Ask your workspace admin to send a new one.
          </p>
        </div>
      </div>
    )
  }

  return (
    <InviteEntry
      token={token}
      email={invite.email}
      organizationName={invite.organizations.name}
      departmentName={invite.departments.name}
      roleLabel={formatClinicalRole(invite.clinical_role)}
    />
  )
}
