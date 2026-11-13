import { useEffect, useState } from 'react'
import { CalendarPlus, Copy, Send } from 'lucide-react'
import { toast } from 'sonner'
import { buildShareLink } from '@/lib/share'
import { downloadCalendarReminder } from '@/lib/calendar'

const btn = 'flex size-11 items-center justify-center rounded-xl transition-colors hover:bg-black/5'

export function CapsuleActions({ id, unlockAt, locked }: { id: string; unlockAt: number; locked: boolean }) {
  const [link, setLink] = useState<string>()

  useEffect(() => {
    let live = true
    void buildShareLink(`/?capsule=${id}`).then((value) => {
      if (live) setLink(value)
    })
    return () => {
      live = false
    }
  }, [id])

  const text = encodeURIComponent(`Time Capsule #${id} on Arc: sealed until it is time.`)
  const encodedLink = link ? encodeURIComponent(link) : ''

  return (
    <div className="flex items-center" style={{ color: 'var(--muted)' }}>
      <button
        aria-label="Copy link"
        disabled={!link}
        className={`${btn} disabled:opacity-40`}
        onClick={() => {
          if (!link) return
          void navigator.clipboard.writeText(link).then(() => toast.success('Link copied'))
        }}
      >
        <Copy className="size-4" />
      </button>
      {link && (
        <a
          aria-label="Share on Telegram"
          className={btn}
          href={`https://t.me/share/url?url=${encodedLink}&text=${text}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Send className="size-4" />
        </a>
      )}
      {locked && (
        <button aria-label="Add reminder to calendar" className={btn} onClick={() => downloadCalendarReminder(id, unlockAt, link)}>
          <CalendarPlus className="size-4" />
        </button>
      )}
    </div>
  )
}
