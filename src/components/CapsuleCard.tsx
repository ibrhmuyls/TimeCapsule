import { useReadContract } from 'wagmi'
import { Hourglass } from 'lucide-react'
import { useNowSeconds } from '@/hooks/useNow'
import { CAPSULE_CHAIN, TIME_CAPSULE_ADDRESS, formatDuration, timeCapsuleAbi } from '@/lib/timeCapsule'
import { CapsuleActions } from '@/components/CapsuleActions'
import { OpenPanel } from '@/components/OpenPanel'

const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`

export function CapsuleCard({ id, highlight = false }: { id: bigint; highlight?: boolean }) {
  const now = useNowSeconds()

  const { data, isLoading, isError } = useReadContract({
    address: TIME_CAPSULE_ADDRESS,
    abi: timeCapsuleAbi,
    functionName: 'getCapsule',
    args: [id],
    chainId: CAPSULE_CHAIN.id,
    query: { enabled: !!TIME_CAPSULE_ADDRESS },
  })

  if (isLoading) {
    return <div className="glass h-28 animate-pulse rounded-2xl" />
  }
  if (isError || !data) {
    return (
      <div className="glass rounded-2xl p-4 text-sm" style={{ color: 'var(--muted)' }}>
        Capsule #{id.toString()} was not found.
      </div>
    )
  }

  const [creator, createdAt, unlockAt, ciphertext] = data
  const total = Math.max(1, Number(unlockAt) - Number(createdAt))
  const progress = Math.min(1, Math.max(0, (now - Number(createdAt)) / total))
  const remaining = Number(unlockAt) - now
  const unlocked = remaining <= 0

  return (
    <article className="glass rounded-2xl p-4" style={highlight ? { borderColor: 'var(--border-strong)' } : undefined}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="display text-lg font-semibold">Capsule #{id.toString()}</h3>
          <p className="mono text-[11px]" style={{ color: 'var(--subtle)' }}>by {short(creator)}</p>
        </div>
        <CapsuleActions id={id.toString()} unlockAt={Number(unlockAt)} locked={!unlocked} />
      </header>

      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full"
        style={{ background: 'var(--surface-muted)' }}
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Time until the capsule opens"
      >
        <div
          className="h-full origin-left rounded-full transition-transform duration-1000 ease-linear"
          style={{ background: unlocked ? 'var(--success)' : 'var(--accent)', transform: `scaleX(${progress})` }}
        />
      </div>
      <p className="mt-1.5 text-xs tabular-nums" style={{ color: 'var(--subtle)' }}>
        Sealed {new Date(Number(createdAt) * 1000).toLocaleString()} · Opens {new Date(Number(unlockAt) * 1000).toLocaleString()}
      </p>

      {unlocked ? (
        <OpenPanel ciphertext={ciphertext} />
      ) : (
        <div className="glass-inner mt-3 flex items-center gap-2 rounded-xl p-3 text-sm" style={{ color: 'var(--ink-2)' }}>
          <Hourglass className="size-4" />
          <span className="tabular-nums">Locked. Opens in {formatDuration(remaining)}</span>
        </div>
      )}
    </article>
  )
}
