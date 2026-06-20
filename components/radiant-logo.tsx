import { cn } from "@/lib/utils"

type RadiantLogoProps = {
  className?: string
}

export function RadiantLogo({ className }: RadiantLogoProps) {
  return (
    <img
      src="/radiant-logo.png"
      alt="Radiant"
      className={cn("h-8 w-auto shrink-0", className)}
    />
  )
}
