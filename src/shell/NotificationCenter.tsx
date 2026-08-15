import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/Sheet'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { trackNotificationOpened } from '@/lib/mixpanel'
import { useShell } from './ShellContext'
import {
  NOTIFICATIONS_REFRESH_EVENT,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  type NotificationItem,
} from '@/lib/notifications'

const POLL_MS = 60_000

function useMdUp() {
  const [mdUp, setMdUp] = useState(true)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(min-width: 768px)')
    const sync = () => setMdUp(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mdUp
}

function NotificationList({
  items,
  onActivate,
}: {
  items: NotificationItem[]
  onActivate: (item: NotificationItem) => void
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="You're all caught up"
        description="Notifications about projects, invitations, and account notices will show up here."
        className="border-0 bg-transparent px-3 py-8"
      />
    )
  }

  return (
    <ul className="max-h-80 overflow-auto">
      {items.map((item) => (
        <li key={item.id} className="border-b border-border last:border-b-0">
          <button
            type="button"
            className={cn(
              'flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              !item.read && 'font-semibold',
            )}
            onClick={() => onActivate(item)}
          >
            <span
              className={cn(
                'mt-1.5 size-2 shrink-0 rounded-full',
                item.read ? 'bg-transparent' : 'bg-primary',
              )}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block text-sm text-foreground">{item.title}</span>
              {item.body ? (
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {item.body}
                </span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function NotificationCenter() {
  const navigate = useNavigate()
  const { workspaces, activeWorkspaceId } = useShell()
  const mdUp = useMdUp()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])

  const workspaceType =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId)?.type ?? 'personal'

  const refresh = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    try {
      const [count, list] = await Promise.all([fetchUnreadCount(), fetchNotifications(20)])
      setUnreadCount(count)
      setItems(list)
    } catch {
      // fail soft — bell stays usable
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onFocus = () => {
      void refresh()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const onRefresh = () => {
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, POLL_MS)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh)
      window.clearInterval(timer)
    }
  }, [refresh])

  async function onActivate(item: NotificationItem) {
    trackNotificationOpened({ event_key: item.event_key, workspace_type: workspaceType })
    if (!item.read) {
      try {
        await markNotificationRead(item.id)
        setItems((current) =>
          current.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
        )
        setUnreadCount((count) => Math.max(0, count - 1))
      } catch {
        // still follow the deep link
      }
    }
    setOpen(false)
    if (item.path) navigate(item.path)
  }

  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={label}
      data-testid="notification-bell"
    >
      <Bell className="size-[18px]" strokeWidth={1.75} aria-hidden />
      {unreadCount > 0 ? (
        <span
          className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-surface"
          aria-hidden
        />
      ) : null}
    </Button>
  )

  const panel = (
    <div data-testid="notification-center">
      <p className="px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Notifications
      </p>
      <NotificationList items={items} onActivate={(item) => void onActivate(item)} />
    </div>
  )

  if (mdUp) {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0" aria-label="Notification center">
          {panel}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm" aria-label="Notification center">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Recent account and project notices</SheetDescription>
        </SheetHeader>
        {panel}
      </SheetContent>
    </Sheet>
  )
}
