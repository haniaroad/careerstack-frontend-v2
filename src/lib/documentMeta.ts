type DocumentMetaInput = {
  title: string
  description: string
  canonicalPath: string
  indexable: boolean
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

export function setDocumentMeta({
  title,
  description,
  canonicalPath,
  indexable,
}: DocumentMetaInput) {
  if (typeof document === 'undefined') return
  const origin = window.location.origin
  const canonical = `${origin}${canonicalPath}`

  document.title = title
  upsertMeta('name', 'description', description)
  upsertMeta('name', 'robots', indexable ? 'index,follow' : 'noindex,nofollow')
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', description)
  upsertMeta('property', 'og:url', canonical)
  upsertMeta('property', 'og:type', 'website')
  upsertCanonical(canonical)
}
