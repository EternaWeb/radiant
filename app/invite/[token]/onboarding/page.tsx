import { redirect } from "next/navigation"
import { InviteOnboarding } from "@/components/onboarding/invite-onboarding"
import { formatClinicalRole } from "@/lib/roles"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { ClinicalRole, Invite } from "@/lib/supabase/types"

type InviteOnboardingPageProps = {
  params: Promise<{ token: string }>
}

export default async function InviteOnboardingPage({ params }: InviteOnboardingPageProps) {
  const { token } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/invite/${token}`)
  }

  const service = createServiceClient()
  const { data } = await service
    .from("invites")
    .select("*, organizations(id, name), departments(id, name)")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  const invite = data as
    | (Invite & {
        organizations: { id: string; name: string } | null
        departments: { id: string; name: string } | null
      })
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

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()

  if (profile?.onboarding_complete) {
    redirect("/")
  }

  const signedInEmail = user.email ?? ""
  if (signedInEmail.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <div className="flex min-h-svh items-center justify-center px-6 text-center">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Wrong Google account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invite was sent to <span className="font-medium text-foreground">{invite.email}</span>, but you are
            signed in as <span className="font-medium text-foreground">{signedInEmail || "another account"}</span>.
            Sign out and use the invited Google account to continue.
          </p>
        </div>
      </div>
    )
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : profile?.full_name ?? ""

  return (
    <InviteOnboarding
      token={token}
      invitedEmail={invite.email}
      signedInEmail={signedInEmail}
      organizationName={invite.organizations.name}
      departmentName={invite.departments.name}
      clinicalRole={invite.clinical_role as ClinicalRole}
      roleLabel={formatClinicalRole(invite.clinical_role as ClinicalRole)}
      initialFullName={fullName}
    />
  )
}
