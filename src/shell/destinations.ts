export type DestinationId =
  | 'home'
  | 'explore'
  | 'my-work'
  | 'inbox'
  | 'profile'
  | 'org-admin'
  | 'more'

export type Destination = {
  id: DestinationId
  label: string
  path: string
}

export const PRIMARY_DESTINATIONS: Destination[] = [
  { id: 'home', label: 'Home', path: '/home' },
  { id: 'explore', label: 'Explore', path: '/explore' },
  { id: 'my-work', label: 'My Work', path: '/my-work' },
  { id: 'inbox', label: 'Inbox', path: '/inbox' },
  { id: 'profile', label: 'Profile', path: '/profile' },
]

export const ORG_ADMIN_DESTINATION: Destination = {
  id: 'org-admin',
  label: 'Organization administration',
  path: '/organization',
}

export const MOBILE_BOTTOM_DESTINATIONS: Destination[] = [
  { id: 'home', label: 'Home', path: '/home' },
  { id: 'explore', label: 'Explore', path: '/explore' },
  { id: 'my-work', label: 'My Work', path: '/my-work' },
  { id: 'inbox', label: 'Inbox', path: '/inbox' },
  { id: 'more', label: 'More', path: '/more' },
]

export function destinationFromPath(pathname: string): DestinationId | null {
  if (pathname === '/' || pathname.startsWith('/home')) return 'home'
  if (pathname.startsWith('/explore')) return 'explore'
  if (pathname.startsWith('/my-work')) return 'my-work'
  if (pathname.startsWith('/inbox')) return 'inbox'
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/organization')) return 'org-admin'
  if (pathname.startsWith('/more')) return 'more'
  return null
}
