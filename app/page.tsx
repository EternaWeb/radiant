import { AppProvider } from "@/lib/app-context"
import { AppRouter } from "@/components/app-router"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { PendingInvite } from "@/lib/app-context"
import type { DepartmentRecord, Invite, Organization, Profile } from "@/lib/supabase/types"
import { cookies } from "next/headers"

export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile: Profile | null = null
  let organization: Organization | null = null
  let department: DepartmentRecord | null = null
  let invite: PendingInvite | null = null

  if (user) {
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    profile = profileData

    if (profile?.organization_id) {
      const { data } = await supabase.from("organizations").select("*").eq("id", profile.organization_id).maybeSingle()
      organization = data
    }

    if (profile?.department_id) {
      const { data } = await supabase.from("departments").select("*").eq("id", profile.department_id).maybeSingle()
      department = data
    }
  }

  const cookieStore = await cookies()
  const inviteToken = cookieStore.get("radiant_invite_token")?.value

  if (inviteToken && !profile?.onboarding_complete) {
    const service = createServiceClient()
    const { data } = await service
      .from("invites")
      .select("*, organizations(id, name), departments(id, name)")
      .eq("token", inviteToken)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()

    const inviteData = data as
      | (Invite & {
          token: string
          email: string
          organization_id: string
          department_id: string
          clinical_role: PendingInvite["clinicalRole"]
          organizations: { id: string; name: string } | null
          departments: { id: string; name: string } | null
        })
      | null

    if (inviteData?.organizations && inviteData.departments) {
      invite = {
        token: inviteData.token,
        email: inviteData.email,
        organizationId: inviteData.organization_id,
        organizationName: inviteData.organizations.name,
        departmentId: inviteData.department_id,
        departmentName: inviteData.departments.name,
        clinicalRole: inviteData.clinical_role,
      }
    }
  }

  const fullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null

  return (
    <AppProvider
      initialUser={user ? { id: user.id, email: user.email ?? null, fullName } : null}
      initialProfile={profile}
      initialOrganization={organization}
      initialDepartment={department}
      initialInvite={invite}
    >
      <AppRouter />
    </AppProvider>
  )
}
