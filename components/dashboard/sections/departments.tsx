"use client"

import { useEffect, useState } from "react"
import {
  Heart,
  Brain,
  Ambulance,
  ScanLine,
  Users,
  ArrowLeft,
  Mail,
  Phone,
  UserPlus,
  Trash2,
  X,
  Send,
  Check,
  Shield,
  Crown,
  Plus,
  MapPin,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { OrgLogo } from "@/components/org-logo"
import { UserAvatar } from "@/components/user-avatar"
import { departmentRoles } from "@/lib/data"
import { DEPARTMENT_ICONS } from "@/lib/departments"
import { parseClinicalRole } from "@/lib/roles"
import { fetchCached, invalidateCached } from "@/lib/client-cache"
import { useApp } from "@/lib/app-context"

type StaffStatus = "Online" | "On call" | "Off duty"

type DirectoryMember = {
  id: string
  name: string
  avatarUrl: string | null
  role: string
  email: string
  phone: string
  shift: string
  status: StaffStatus
  isAdmin: boolean
  workspaceRole: string
  clinicalRole: string
  department: string
  hospital: string
}

type DirectoryDepartment = {
  id: string
  name: string
  icon: string
  lead: string
  location: string
  hospital: string
  memberCount: number
  staff: DirectoryMember[]
}

type DepartmentsResponse = {
  organization?: {
    id: string
    name: string
    logoUrl?: string | null
  }
  departments?: DirectoryDepartment[]
  error?: string
}

const icons: Record<string, LucideIcon> = {
  heart: Heart,
  brain: Brain,
  ambulance: Ambulance,
  scan: ScanLine,
}

const statusTone: Record<StaffStatus, "success" | "warning" | "muted"> = {
  Online: "success",
  "On call": "warning",
  "Off duty": "muted",
}

export function Departments() {
  const { isAdmin } = useApp()
  const [departments, setDepartments] = useState<DirectoryDepartment[]>([])
  const [organizationName, setOrganizationName] = useState("Hospital organization")
  const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  async function loadDepartments(force = false) {
    setLoading(true)
    setError(null)

    if (force) invalidateCached("/api/departments")

    try {
      const result = await fetchCached<DepartmentsResponse>("/api/departments", 60_000)
      setOrganizationName(result.organization?.name ?? "Hospital organization")
      setOrganizationLogoUrl(result.organization?.logoUrl ?? null)
      setDepartments(result.departments ?? [])
    } catch {
      setError("Could not load departments.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDepartments()
  }, [])

  async function kick(staffId: string) {
    const response = await fetch(`/api/departments/members/${staffId}`, {
      method: "DELETE",
    })
    const result = await response.json()

    if (!response.ok) {
      setError(result.error ?? "Could not remove member.")
      return
    }

    await loadDepartments(true)
  }

  async function grantAdmin(staffId: string) {
    const response = await fetch(`/api/departments/members/${staffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "grant_admin" }),
    })
    const result = await response.json()

    if (!response.ok) {
      setError(result.error ?? "Could not grant administrator access.")
      return
    }

    await loadDepartments(true)
  }

  const active = departments.find((department) => department.id === activeId) ?? null

  if (active) {
    return (
      <DepartmentDetail
        department={active}
        isAdmin={isAdmin}
        onBack={() => setActiveId(null)}
        onKick={kick}
        onGrantAdmin={grantAdmin}
        onInvite={loadDepartments}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <OrgLogo name={organizationName} src={organizationLogoUrl} size="lg" />
            <div>
              <p className="text-sm text-muted-foreground">Hospital organization</p>
              <h2 className="text-2xl font-bold tracking-tight">{organizationName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each card is a department. Open one to see the people assigned there.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">
              <Users className="h-3 w-3" /> {departments.length} departments
            </Badge>
            {isAdmin && (
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-blue px-3 py-2 text-sm font-medium text-accent-blue-foreground transition-colors hover:bg-accent-blue/90"
              >
                <Plus className="h-4 w-4" /> Add department
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Loading departments...</p>
      )}
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">{error}</p>
      )}

      {!loading && !error && departments.length === 0 && (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          No departments yet. {isAdmin ? "Create one to start inviting staff." : "Ask an admin to set up departments."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => {
          const Icon = icons[department.icon] ?? ScanLine
          const online = department.staff.filter((staff) => staff.status === "Online").length
          const preview = department.staff.slice(0, 4)
          return (
            <button
              key={department.id}
              onClick={() => setActiveId(department.id)}
              className="group rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-accent-blue/50 hover:bg-muted/40 hover:shadow-lg hover:shadow-accent-blue/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-accent-blue transition-colors group-hover:bg-accent-blue group-hover:text-accent-blue-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant={department.memberCount > 0 ? "muted" : "warning"}>
                  <Users className="h-3 w-3" /> {department.memberCount}
                </Badge>
              </div>
              <p className="mt-4 text-lg font-semibold">{department.name}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {department.location}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Lead: {department.lead}</p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex -space-x-2">
                  {preview.length > 0 ? (
                    preview.map((staff) => (
                      <UserAvatar
                        key={staff.id}
                        name={staff.name}
                        src={staff.avatarUrl}
                        size="sm"
                        className="ring-2 ring-card"
                      />
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No members yet</span>
                  )}
                </div>
                <span className="text-xs text-success">
                  {department.memberCount > 0 ? `${online} online` : "Empty"}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {createOpen && (
        <CreateDepartmentModal
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false)
            await loadDepartments(true)
          }}
        />
      )}
    </div>
  )
}

function DepartmentDetail({
  department,
  isAdmin,
  onBack,
  onKick,
  onGrantAdmin,
  onInvite,
}: {
  department: DirectoryDepartment
  isAdmin: boolean
  onBack: () => void
  onKick: (staffId: string) => void
  onGrantAdmin: (staffId: string) => Promise<void>
  onInvite: () => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const Icon = icons[department.icon] ?? ScanLine
  const roleGroups = department.staff.reduce<Record<string, DirectoryMember[]>>((groups, staff) => {
    groups[staff.role] = [...(groups[staff.role] ?? []), staff]
    return groups
  }, {})
  const groupedEntries = Object.entries(roleGroups).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All departments
      </button>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-accent-blue">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{department.hospital}</p>
              <h2 className="text-xl font-bold tracking-tight">{department.name}</h2>
              <p className="text-sm text-muted-foreground">
                {department.location} · Lead: {department.lead}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2.5 text-sm font-medium text-accent-blue-foreground transition-colors hover:bg-accent-blue/90"
            >
              <UserPlus className="h-4 w-4" /> Invite member
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Team members</h3>
            <Badge variant="muted">{department.memberCount}</Badge>
          </div>

          {department.staff.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                No one is assigned to {department.name} yet.
                {isAdmin ? " Send an invite to add staff." : ""}
              </p>
              {isAdmin && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <UserPlus className="h-4 w-4" /> Invite first member
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groupedEntries.flatMap(([, staffMembers]) =>
                staffMembers.map((staff) => (
                  <MemberCard
                    key={staff.id}
                    staff={staff}
                    isAdmin={isAdmin}
                    onKick={onKick}
                    onGrantAdmin={onGrantAdmin}
                  />
                )),
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <InviteModal
          department={department}
          onClose={() => setModalOpen(false)}
          onInvite={onInvite}
        />
      )}
    </div>
  )
}

function MemberCard({
  staff,
  isAdmin,
  onKick,
  onGrantAdmin,
}: {
  staff: DirectoryMember
  isAdmin: boolean
  onKick: (staffId: string) => void
  onGrantAdmin: (staffId: string) => Promise<void>
}) {
  const [granting, setGranting] = useState(false)

  async function handleGrantAdmin() {
    setGranting(true)
    try {
      await onGrantAdmin(staff.id)
    } finally {
      setGranting(false)
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-background p-4 shadow-sm transition-all hover:border-accent-blue/30 hover:shadow-md">
      <div className="flex items-start gap-3">
        <UserAvatar name={staff.name} src={staff.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-semibold">{staff.name}</p>
            {staff.isAdmin && (
              <Badge variant="default" className="gap-1">
                <Shield className="h-3 w-3" /> Admin
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{staff.role}</p>
          <Badge variant={statusTone[staff.status]} className="mt-2">
            {staff.status}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <a
          href={`mailto:${staff.email}`}
          className="inline-flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted"
        >
          <Mail className="h-3.5 w-3.5 text-accent-blue" />
          <span className="truncate">{staff.email}</span>
        </a>
        <div className="inline-flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-foreground">
          <Phone className="h-3.5 w-3.5 text-accent-blue" />
          <span>{staff.phone}</span>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {isAdmin && !staff.isAdmin && (
          <>
            <button
              onClick={handleGrantAdmin}
              disabled={granting}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:border-accent-blue hover:bg-accent-blue/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Crown className="h-3.5 w-3.5" /> {granting ? "Granting..." : "Make admin"}
            </button>
            <button
              onClick={() => onKick(staff.id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-destructive transition-colors hover:border-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function CreateDepartmentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [icon, setIcon] = useState<string>("scan")
  const [location, setLocation] = useState("Main campus")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (name.trim().length < 2) return
    setSaving(true)
    setError(null)
    const response = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon, location }),
    })
    const result = await response.json()
    setSaving(false)

    if (!response.ok) {
      setError(result.error ?? "Could not create department.")
      return
    }

    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Create department</h3>
            <p className="text-sm text-muted-foreground">Add a department card your staff can be invited into.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Department name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Emergency"
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent-blue"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Location</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Main campus"
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent-blue"
            />
          </label>

          <div>
            <span className="mb-2 block text-sm font-medium">Icon</span>
            <div className="grid grid-cols-4 gap-2">
              {DEPARTMENT_ICONS.map((candidate) => {
                const Icon = icons[candidate] ?? ScanLine
                return (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => setIcon(candidate)}
                    className={`flex h-11 items-center justify-center rounded-lg border transition-colors ${
                      icon === candidate
                        ? "border-accent-blue bg-accent-blue/10 text-accent-blue"
                        : "border-border text-muted-foreground hover:border-accent-blue/50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={name.trim().length < 2 || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2.5 text-sm font-medium text-accent-blue-foreground transition-colors hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create department"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InviteModal({
  department,
  onClose,
  onInvite,
}: {
  department: DirectoryDepartment
  onClose: () => void
  onInvite: () => void
}) {
  const [role, setRole] = useState(departmentRoles[0])
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSend() {
    if (!valid) return
    setSending(true)
    setError(null)
    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        departmentId: department.id,
        clinicalRole: parseClinicalRole(role),
      }),
    })
    const result = await response.json()
    setSending(false)

    if (!response.ok) {
      setError(result.error ?? "Could not send invite.")
      return
    }

    setSent(true)
    setTimeout(() => {
      onInvite()
      onClose()
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Invite to {department.name}</h3>
            <p className="text-sm text-muted-foreground">They will join this department after accepting the invite.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-6 w-6" />
            </div>
            <p className="font-medium">Invite sent</p>
            <p className="text-sm text-muted-foreground">
              {email} was invited as {role}.
            </p>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {departmentRoles.map((candidate) => (
                  <button
                    key={candidate}
                    onClick={() => setRole(candidate)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      role === candidate
                        ? "border-accent-blue bg-accent-blue/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-accent-blue/50 hover:text-foreground"
                    }`}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium">
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@hospital.org"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent-blue"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!valid || sending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2.5 text-sm font-medium text-accent-blue-foreground transition-colors hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send invite"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
