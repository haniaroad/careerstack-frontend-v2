import { cn } from '@/lib/utils'

type BrandTone = 'on-light' | 'on-ink'

const MARK_SRC: Record<BrandTone, string> = {
  'on-light': '/brand/mark-color.png',
  'on-ink': '/brand/mark-white.png',
}

export function BrandMark({
  tone,
  labelled = false,
  className,
}: {
  tone: BrandTone
  /** Name the icon when no live “CareerStack” text sits beside it. */
  labelled?: boolean
  className?: string
}) {
  return (
    <img
      src={MARK_SRC[tone]}
      alt={labelled ? 'CareerStack' : ''}
      width={28}
      height={28}
      data-tone={tone}
      className={cn('size-7 shrink-0 object-contain', className)}
    />
  )
}

export function Wordmark({
  tone,
  compact = false,
  className,
  labelClassName,
}: {
  tone: BrandTone
  compact?: boolean
  className?: string
  labelClassName?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BrandMark tone={tone} labelled={compact} />
      {compact ? null : (
        <span className={cn('text-[15px] font-semibold tracking-tight', labelClassName)}>
          CareerStack
        </span>
      )}
    </div>
  )
}
