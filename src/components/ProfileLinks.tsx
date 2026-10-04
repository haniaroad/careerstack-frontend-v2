function providerLabel(provider: string) {
  if (provider === 'github') return 'GitHub'
  if (provider === 'linkedin') return 'LinkedIn'
  if (provider === 'portfolio' || provider === 'website') return 'Website'
  return provider
}

export function ProfileLinks({ links }: { links: { provider: string; url: string }[] }) {
  if (links.length === 0) return null
  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.provider}>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand underline underline-offset-2 hover:underline"
          >
            <ProviderIcon provider={link.provider} />
            <span>{providerLabel(link.provider)}</span>
            <span className="break-all">{link.url}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function ProviderIcon({ provider }: { provider: string }) {
  const mark = provider === 'github' ? 'GH' : provider === 'linkedin' ? 'in' : 'W'
  return (
    <span
      aria-hidden
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm bg-brand text-[8px] font-bold leading-none text-brand-foreground"
    >
      {mark}
    </span>
  )
}
