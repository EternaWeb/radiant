"use client"

import { useState } from "react"
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
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { orgDepartments, departmentRoles, type Department, type StaffMember } from "@/lib/data"

const icons: Record<string, LucideIcon> = {
  heart: Heart,
  brain: Brain,
  ambulance: Ambulance,
  scan: ScanLine,
}

const statusTone: Record<StaffMember["status"], "success" | "warning" | "neutral"> = {
  Online: "success",
  "On call": "warning",
  "Off duty": "neutral",
}

export function Departments() {
  const [departments, setDepartments] = useState<Department[]>(orgDepartments)
  const [activeId, setActiveId] = useState<string | null>(null)

  const active = departments.find((d) => d.id === activeId) ?? null

  function kick(deptId: string, staffId: string) {
    setDepartments((prev) =>
      prev.map((d) => (d.id === deptId ? { ...d, staff: d.staff.filter((s) => s.id !== staffId) } : d)),
    )
  }

  function invite(deptId: string, member: StaffMember) {
    setDepartments((prev) =>
      prev.map((d) => (d.id === deptId ? { ...d, staff: [...d.staff, member] } : d)),
    )
  }

  if (active) {
    return <DepartmentDetail department={active} onBack={() => setActiveId(null)} onKick={kick} onInvite={invite} />
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Departments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage department teams, contacts, and access. Select a department to view its staff.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const Icon = icons[dept.icon] ?? ScanLine
          const online = dept.staff.filter((s) => s.status === "Online").length
          return (
            <button
              key={dept.id}
              onClick={() => setActiveId(dept.id)}
              className="group rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:bg-muted/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="neutral">
                  <Users className="h-3 w-3" /> {dept.staff.length}
                </Badge>
              </div>
              <p className="mt-4 text-lg font-semibold">{dept.name}</p>
              <p className="text-xs text-muted-foreground">Lead · {dept.lead}</p>
              <p className="mt-3 text-xs text-muted-foreground">{dept.location}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {online} online now
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
  onBack,
  onKick,
  onInvite,
}: {
  department: Department
  onBack: () => void
  onKick: (deptId: string, staffId: string) => void
  onInvite: (deptId: string, member: StaffMember) => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const Icon = icons[department.icon] ?? ScanLine

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
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{department.name}</h2>
              <p className="text-sm text-muted-foreground">
                {department.location} · Lead {department.lead}
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" /> Add member
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Team members</h3>
            <Badge variant="neutral">{department.staff.length}</Badge>
          </div>

          {department.staff.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No members in this department yet. Add one to get started.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {department.staff.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                      {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{s.name}</p>
                        <Badge variant={statusTone[s.status]}>{s.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.role}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {s.email}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {s.phone}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {s.shift}
                    </span>
                  </div>

                  <button
                    onClick={() => onKick(department.id, s.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-destructive transition-colors hover:border-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
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
          onInvite={(member) => onInvite(department.id, member)}
        />
      )}
    </div>
  )
}

function InviteModal({
  department,
  onClose,
  onInvite,
}: {
  department: Department
  onClose: () => void
  onInvite: (member: StaffMember) => void
}) {
  const [role, setRole] = useState(departmentRoles[0])
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  function handleSend() {
    if (!valid) return
    const namePart = email.split("@")[0].replace(/[._]/g, " ")
    const member: StaffMember = {
      id: `inv-${Date.now()}`,
      name: namePart.replace(/\b\w/g, (c) => c.toUpperCase()),
      role,
      email,
      phone: "Pending",
      shift: "Pending",
      status: "Off duty",
    }
    setSent(true)
    setTimeout(() => {
      onInvite(member)
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
            <p className="text-sm text-muted-foreground">An invite email will be sent (demo only).</p>
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
                {departmentRoles.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      role === r
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {r}
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hospital.org"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!valid}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Send invite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
