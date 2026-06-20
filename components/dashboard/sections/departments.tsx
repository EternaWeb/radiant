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
  Clock,
  UserPlus,
  Trash2,
  X,
  Send,
  Check,
  Shield,
  Building2,
  Crown,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { departmentRoles } from "@/lib/data"
import { parseClinicalRole } from "@/lib/roles"
import { useApp } from "@/lib/app-context"

type StaffStatus = "Online" | "On call" | "Off duty"

type DirectoryMember = {
  id: string
  name: string
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
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadDepartments() {
    setLoading(true)
    setError(null)
    const response = await fetch("/api/departments")
    const result = (await response.json()) as DepartmentsResponse
    setLoading(false)

    if (!response.ok) {
      setError(result.error ?? "Could not load departments.")
      return
    }

    setOrganizationName(result.organization?.name ?? "Hospital organization")
    setDepartments(result.departments ?? [])
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

    await loadDepartments()
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

    await loadDepartments()
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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-blue/15 text-accent-blue">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Department</p>
              <h2 className="text-2xl font-bold tracking-tight">{organizationName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Department cards are shown below. Select one to open its people cards.
              </p>
            </div>
          </div>
          <Badge variant="muted">
            <Users className="h-3 w-3" /> {departments.length} active departments
          </Badge>
        </CardContent>
      </Card>

      {loading && <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Loading departments...</p>}
      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">{error}</p>}

      {!loading && !error && departments.length === 0 && (
        <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          No departments with accepted members yet. Empty departments are hidden until someone joins them.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((department) => {
          const Icon = icons[department.icon] ?? ScanLine
          const online = department.staff.filter((staff) => staff.status === "Online").length
          return (
            <button
              key={department.id}
              onClick={() => setActiveId(department.id)}
              className="group rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-accent-blue/50 hover:bg-muted/40 hover:shadow-lg hover:shadow-accent-blue/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-accent-blue transition-colors group-hover:bg-accent-blue group-hover:text-accent-blue-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="muted">
                  <Users className="h-3 w-3" /> {department.memberCount}
                </Badge>
              </div>
              <p className="mt-4 text-lg font-semibold">{department.name}</p>
              <p className="text-xs text-muted-foreground">{department.hospital}</p>
              <p className="mt-3 text-xs text-muted-foreground">{department.location}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {online} online now · {department.memberCount} people
              </div>
            </button>
          )
        })}
      </div>
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
              <p className="text-sm text-muted-foreground">Department details</p>
              <h2 className="text-xl font-bold tracking-tight">{department.name}</h2>
              <p className="text-sm text-muted-foreground">
                {department.hospital} · {department.location}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2.5 text-sm font-medium text-accent-blue-foreground transition-colors hover:bg-accent-blue/90"
            >
              <UserPlus className="h-4 w-4" /> Add member
            </button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">People in {department.name}</h3>
            <Badge variant="muted">{department.memberCount}</Badge>
          </div>

          {department.staff.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No accepted members in this department yet. Admins can send invites to add users.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {groupedEntries.map(([role, staffMembers]) => (
                <div key={role} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{role}</h4>
                    <Badge variant="muted">{staffMembers.length}</Badge>
                  </div>
                  {staffMembers.map((staff) => (
                    <MemberCard
                      key={staff.id}
                      staff={staff}
                      isAdmin={isAdmin}
                      onKick={onKick}
                      onGrantAdmin={onGrantAdmin}
                    />
                  ))}
                </div>
              ))}
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
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-background p-4 transition-colors hover:bg-muted/40">
      <div className="min-w-48 flex-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
            {staff.name
              .split(" ")
              .map((name) => name[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{staff.name}</p>
              <Badge variant={statusTone[staff.status]}>{staff.status}</Badge>
              {staff.isAdmin && (
                <Badge variant="default">
                  <Shield className="h-3 w-3" /> Admin
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{staff.role}</p>
          </div>
        </div>

        <dl className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <Info label="User ID" value={staff.id} />
          <Info label="Email" value={staff.email} icon={Mail} />
          <Info label="Phone" value={staff.phone} icon={Phone} />
          <Info label="Workspace role" value={staff.workspaceRole} icon={Clock} />
          <Info label="Department" value={staff.department} />
          <Info label="Hospital" value={staff.hospital} />
          <Info label="Is admin" value={staff.isAdmin ? "Yes" : "No"} />
        </dl>
      </div>

      {isAdmin && !staff.isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGrantAdmin}
            disabled={granting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-accent-blue hover:bg-accent-blue/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Crown className="h-3.5 w-3.5" /> {granting ? "Granting..." : "Grant Administrator"}
          </button>
          <button
            onClick={() => onKick(staff.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-destructive transition-colors hover:border-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      )}
    </div>
  )
}

function Info({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: LucideIcon
}) {
  return (
    <div>
      <dt className="inline-flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </dt>
      <dd className="mt-0.5 break-all font-medium text-foreground">{value}</dd>
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
            <p className="text-sm text-muted-foreground">A secure invite email will be sent with a login link.</p>
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
