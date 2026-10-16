import { useState } from 'react'
import { cn } from '@/lib/utils'

const SIZE = {
  sm: 'size-8 text-[11px]',
  md: 'size-12 text-sm',
  lg: 'size-16 text-lg',
} as const

function profileInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return initials || 'PU'
}

export function ProfilePhoto({
  name,
  imageUrl,
  size = 'md',
  alt = '',
  className,
}: {
  name: string
  imageUrl?: string | null
  size?: keyof typeof SIZE
  alt?: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(imageUrl) && !failed

  return (
    <span
      data-testid="profile-photo"
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted font-semibold text-muted-foreground',
        SIZE[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={imageUrl!}
          alt={alt}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden>{profileInitials(name)}</span>
      )}
    </span>
  )
}
