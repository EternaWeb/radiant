type AuthMetadata = {
  avatar_url?: unknown
  picture?: unknown
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function getAuthAvatarUrl(metadata: AuthMetadata | null | undefined): string | null {
  if (typeof metadata?.avatar_url === "string" && metadata.avatar_url.length > 0) {
    return metadata.avatar_url
  }
  if (typeof metadata?.picture === "string" && metadata.picture.length > 0) {
    return metadata.picture
  }
  return null
}

export function avatarTone(name: string): string {
  const tones = [
    "bg-accent-blue/15 text-accent-blue",
    "bg-success/15 text-success",
    "bg-destructive/15 text-destructive",
    "bg-muted text-foreground",
  ]
  const hash = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return tones[hash % tones.length]
}
