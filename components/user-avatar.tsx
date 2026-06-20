"use client"

import { avatarTone, getInitials } from "@/lib/avatars"
import { cn } from "@/lib/utils"

type UserAvatarProps = {
  name: string
  src?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClass = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
}

export function UserAvatar({ name, src, size = "md", className }: UserAvatarProps) {
  const initials = getInitials(name || "?")

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover ring-2 ring-background", sizeClass[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold ring-2 ring-background",
        avatarTone(name),
        sizeClass[size],
        className,
      )}
      aria-label={name}
    >
      {initials}
    </div>
  )
}
