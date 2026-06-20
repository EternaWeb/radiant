import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

type Context = {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to remove users." }, { status: 401 })
  }

  if (id === user.id) {
    return NextResponse.json({ error: "Admins cannot remove themselves from the workspace." }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: admin } = await service.from("profiles").select("*").eq("id", user.id).single()

  if (!admin?.is_admin || !admin.organization_id) {
    return NextResponse.json({ error: "Only workspace admins can remove users." }, { status: 403 })
  }

  const { data: member } = await service.from("profiles").select("*").eq("id", id).single()

  if (!member || member.organization_id !== admin.organization_id) {
    return NextResponse.json({ error: "Member not found in this workspace." }, { status: 404 })
  }

  const { error } = await service
    .from("profiles")
    .update({
      organization_id: null,
      department_id: null,
      workspace_role: "participant",
      is_admin: false,
      onboarding_complete: false,
    })
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
