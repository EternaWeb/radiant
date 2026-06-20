import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { parseClinicalRole } from "@/lib/roles"

type Context = {
  params: Promise<{ token: string }>
}

type Payload = {
  fullName?: string
  clinicalRole?: string
}

async function getInvite(token: string) {
  const service = createServiceClient()
  return service
    .from("invites")
    .select("*, organizations(*), departments(*)")
    .eq("token", token)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()
}

export async function GET(_request: Request, context: Context) {
  const { token } = await context.params
  const { data, error } = await getInvite(token)

  if (error || !data) {
    return NextResponse.json({ error: "Invite not found or expired." }, { status: 404 })
  }

  return NextResponse.json({ invite: data })
}

export async function POST(request: Request, context: Context) {
  const { token } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to accept this invite." }, { status: 401 })
  }

  const body = (await request.json()) as Payload
  const fullName = body.fullName?.trim()
  const clinicalRole = parseClinicalRole(body.clinicalRole ?? "")

  if (!fullName) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 })
  }

  const { data: inviteData, error: inviteError } = await getInvite(token)
  const invite = inviteData as
    | {
        id: string
        email: string
        organization_id: string
        department_id: string
        clinical_role: typeof clinicalRole
        organizations: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        } | null
        departments: {
          id: string
          organization_id: string
          name: string
          icon: string
          location: string
          created_at: string
          updated_at: string
        } | null
      }
    | null

  if (inviteError || !invite?.organizations || !invite.departments) {
    return NextResponse.json({ error: "Invite not found or expired." }, { status: 404 })
  }

  if ((user.email ?? "").toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Sign in with that Google account to accept it.` },
      { status: 403 },
    )
  }

  const service = createServiceClient()
  const { data: existingProfile } = await service.from("profiles").select("*").eq("id", user.id).maybeSingle()

  if (
    existingProfile?.onboarding_complete &&
    existingProfile.organization_id &&
    existingProfile.organization_id !== invite.organization_id
  ) {
    return NextResponse.json({ error: "This account already belongs to another workspace." }, { status: 409 })
  }

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: fullName,
      email: user.email ?? invite.email,
      phone: existingProfile?.phone ?? null,
      clinical_role: clinicalRole || invite.clinical_role,
      workspace_role: "participant",
      is_admin: false,
      organization_id: invite.organization_id,
      department_id: invite.department_id,
      onboarding_complete: true,
    })
    .select("*")
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Could not accept invite." }, { status: 500 })
  }

  const { error: inviteUpdateError } = await service
    .from("invites")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invite.id)
    .is("accepted_at", null)

  if (inviteUpdateError) {
    return NextResponse.json({ error: inviteUpdateError.message }, { status: 500 })
  }

  const response = NextResponse.json({
    profile,
    organization: invite.organizations,
    department: invite.departments,
  })
  response.cookies.delete("radiant_invite_token")

  return response
}
