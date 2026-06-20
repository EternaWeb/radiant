import { NextResponse } from "next/server"
import { formatClinicalRole, parseClinicalRole } from "@/lib/roles"
import { sendInviteEmail } from "@/lib/resend"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import type { ClinicalRole } from "@/lib/supabase/types"

type Payload = {
  email?: string
  departmentId?: string
  clinicalRole?: ClinicalRole | string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to send invites." }, { status: 401 })
  }

  const body = (await request.json()) as Payload
  const email = body.email?.trim().toLowerCase()
  const departmentId = body.departmentId
  const clinicalRole = parseClinicalRole(String(body.clinicalRole ?? ""))

  if (!email || !emailPattern.test(email) || !departmentId) {
    return NextResponse.json({ error: "Email and department are required." }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: inviter, error: inviterError } = await service
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (inviterError || !inviter?.is_admin || !inviter.organization_id) {
    return NextResponse.json({ error: "Only workspace admins can send invites." }, { status: 403 })
  }

  const { data: department, error: departmentError } = await service
    .from("departments")
    .select("*")
    .eq("id", departmentId)
    .eq("organization_id", inviter.organization_id)
    .single()

  if (departmentError || !department) {
    return NextResponse.json({ error: "Department not found for this workspace." }, { status: 404 })
  }

  const { data: organization, error: organizationError } = await service
    .from("organizations")
    .select("*")
    .eq("id", inviter.organization_id)
    .single()

  if (organizationError || !organization) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 })
  }

  const { data: invite, error: inviteError } = await service
    .from("invites")
    .insert({
      email,
      organization_id: organization.id,
      department_id: department.id,
      clinical_role: clinicalRole,
      workspace_role: "participant",
      invited_by: inviter.id,
    })
    .select("*")
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: inviteError?.message ?? "Could not create invite." }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://radiant.trymindcore.com"
  const inviteUrl = `${appUrl}/invite/${invite.token}`

  try {
    await sendInviteEmail({
      to: email,
      inviterName: inviter.full_name,
      organizationName: organization.name,
      departmentName: department.name,
      roleLabel: formatClinicalRole(clinicalRole),
      inviteUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send invite email." },
      { status: 500 },
    )
  }

  return NextResponse.json({ invite })
}
