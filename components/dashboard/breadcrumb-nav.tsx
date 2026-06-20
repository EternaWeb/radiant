"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type BreadcrumbItem = {
  label: string
  icon?: LucideIcon
  onClick?: () => void
}

export function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => {
        const Icon = item.icon

        return (
          <span key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            {item.onClick ? (
              <Button type="button" variant="ghost" size="sm" className="h-8 min-w-0 px-2" onClick={item.onClick}>
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{item.label}</span>
              </Button>
            ) : (
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 font-medium text-foreground">
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{item.label}</span>
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
