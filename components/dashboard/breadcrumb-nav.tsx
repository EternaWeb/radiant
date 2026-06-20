"use client"

import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type BreadcrumbItem = {
  label: string
  onClick?: () => void
}

export function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {item.onClick ? (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={item.onClick}>
              {item.label}
            </Button>
          ) : (
            <span className="px-2 text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
