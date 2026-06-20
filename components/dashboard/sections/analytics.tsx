"use client"

import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { modalityData, riskTrendData, departmentUsageData } from "@/lib/data"

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-foreground)",
  fontSize: 12,
}

export function Analytics() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Cases by modality */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 font-semibold">Cases by Modality</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modalityData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="var(--color-card)"
                  >
                    {modalityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AI accuracy */}
        <Card>
          <CardContent className="flex h-full flex-col p-5">
            <h3 className="mb-4 font-semibold">AI Accuracy</h3>
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <p className="text-6xl font-bold tabular-nums text-success">97.4%</p>
              <p className="text-sm text-muted-foreground">Validated against radiologist consensus</p>
              <div className="mt-4 grid w-full max-w-sm grid-cols-3 gap-3 text-center">
                {[
                  { k: "Sensitivity", v: "96.1%" },
                  { k: "Specificity", v: "98.2%" },
                  { k: "Studies", v: "48.2k" },
                ].map((m) => (
                  <div key={m.k} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-lg font-bold tabular-nums">{m.v}</p>
                    <p className="text-xs text-muted-foreground">{m.k}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk trends */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 font-semibold">Risk Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="high" stroke="var(--color-destructive)" strokeWidth={2} dot={false} name="High risk" />
                  <Line type="monotone" dataKey="medium" stroke="var(--color-warning)" strokeWidth={2} dot={false} name="Moderate" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department usage */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 font-semibold">Department Usage</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentUsageData} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="dept"
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)" }} />
                  <Bar dataKey="scans" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
