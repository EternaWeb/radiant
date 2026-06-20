"use client"

import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

type OrgLogoProps = {
  name: string
  src?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClass = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
}

const iconSize = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
}

export function OrgLogo({ name, src, size = "md", className }: OrgLogoProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={`${name} logo`}
        className={cn("rounded-lg object-cover", sizeClass[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-accent-blue/15 text-accent-blue",
        sizeClass[size],
        className,
      )}
      aria-label={`${name} logo`}
    >
      <Building2 className={iconSize[size]} />
    </div>
  )
}
