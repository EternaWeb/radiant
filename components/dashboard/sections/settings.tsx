"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Database, Cpu, Bell, LogOut, UserRound, Save, Camera, Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OrgLogo } from "@/components/org-logo"
import { UserAvatar } from "@/components/user-avatar"
import { useApp } from "@/lib/app-context"
import { formatClinicalRole } from "@/lib/roles"
import { createClient } from "@/lib/supabase/client"

function Toggle({ defaultOn = true }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  )
}

export function SettingsView() {
  const router = useRouter()
  const { hospital, role, profile, organization, setProfile, setOrganization, isAdmin, resetAuthState } = useApp()
  const [phone, setPhone] = useState(profile?.phone ?? "")
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  async function savePhone() {
    setSaving(true)
    setMessage(null)
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    })
    const result = await response.json()
    setSaving(false)

    if (!response.ok) {
      setMessage(result.error ?? "Could not save phone number.")
      return
    }

    setProfile(result.profile)
    setMessage("Phone number saved.")
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true)
    setMessage(null)
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch("/api/profile/avatar", { method: "POST", body: formData })
    const result = await response.json()
    setUploadingAvatar(false)

    if (!response.ok) {
      setMessage(result.error ?? "Could not upload profile photo.")
      return
    }

    setProfile(result.profile)
    setMessage("Profile photo updated.")
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true)
    setMessage(null)
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch("/api/organization/logo", { method: "POST", body: formData })
    const result = await response.json()
    setUploadingLogo(false)

    if (!response.ok) {
      setMessage(result.error ?? "Could not upload hospital logo.")
      return
    }

    setOrganization(result.organization)
    setMessage("Hospital logo updated.")
  }

  async function signOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    resetAuthState()
    router.refresh()
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <UserRound className="h-4 w-4 text-accent-blue" /> Profile
          </h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <UserAvatar name={profile?.full_name ?? "User"} src={profile?.avatar_url} size="xl" />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
                aria-label="Upload profile photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) uploadAvatar(file)
                  event.target.value = ""
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{profile?.full_name ?? "Pending"}</p>
              <p className="text-sm text-muted-foreground">{profile?.email ?? "Pending"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {uploadingAvatar
                  ? "Uploading photo..."
                  : "Uses your Google photo by default. Upload to replace it."}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Row label="User ID" value={profile?.id ?? "Pending"} />
            <Row label="Workspace Role" value={profile?.workspace_role ?? "participant"} />
          </div>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">Phone</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+1 (555) 000-0000"
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-accent-blue"
              />
              <Button onClick={savePhone} disabled={saving} className="h-10 px-4" data-icon="inline-start">
                <Save data-icon="inline-start" /> {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </label>
          {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Building2 className="h-4 w-4 text-accent-blue" /> Hospital branding
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <OrgLogo name={hospital.name} src={organization?.logo_url} size="lg" className="h-16 w-16" />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
                  aria-label="Upload hospital logo"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) uploadLogo(file)
                    event.target.value = ""
                  }}
                />
              </div>
              <div>
                <p className="font-semibold">{hospital.name}</p>
                <p className="text-sm text-muted-foreground">
                  {uploadingLogo ? "Uploading logo..." : "Shown on the Departments page and across your workspace."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Database className="h-4 w-4 text-accent-blue" /> Connection
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Row label="Hospital" value={hospital.name} />
            <Row label="Your department" value={hospital.department} />
            <Row label="Role" value={formatClinicalRole(role)} />
            <Row label="Is admin" value={profile?.is_admin ? "Yes" : "No"} />
            <Row label="PACS" value="Sectra PACS Cloud" status />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Cpu className="h-4 w-4 text-accent-blue" /> AI Engine
          </h3>
          <div className="flex flex-col gap-4">
            <SettingRow icon={Cpu} label="Auto-analyze incoming studies" desc="Run AI on every new DICOM as it arrives" />
            <SettingRow icon={Bell} label="Critical risk alerts" desc="Notify departments for risk scores above 80" />
            <SettingRow icon={Bell} label="Daily summary digest" desc="Email a morning report of processed studies" defaultOn={false} />
          </div>
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        size="lg"
        className="h-10 self-start px-5"
        onClick={signOut}
        disabled={signingOut}
        data-icon="inline-start"
      >
        <LogOut data-icon="inline-start" /> {signingOut ? "Signing out..." : "Sign out"}
      </Button>
    </div>
  )
}

function Row({ label, value, status }: { label: string; value: string; status?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 font-medium">
        {value}
        {status && <Badge variant="success">Connected</Badge>}
      </dd>
    </div>
  )
}

function SettingRow({
  icon: Icon,
  label,
  desc,
  defaultOn = true,
}: {
  icon: typeof Cpu
  label: string
  desc: string
  defaultOn?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-accent-blue">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Toggle defaultOn={defaultOn} />
    </div>
  )
}
