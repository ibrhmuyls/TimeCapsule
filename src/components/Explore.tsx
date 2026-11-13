import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { Search } from 'lucide-react'
import { CAPSULE_CHAIN, TIME_CAPSULE_ADDRESS, timeCapsuleAbi } from '@/lib/timeCapsule'
import { CapsuleCard } from '@/components/CapsuleCard'

const PAGE = 5

const initialLookup = () => {
  const raw = new URLSearchParams(window.location.search).get('capsule')
  return raw && /^\d+$/.test(raw) ? raw : ''
}

export function Explore() {
  const [input, setInput] = useState(initialLookup)
  const [lookupId, setLookupId] = useState<bigint | undefined>(() => {
    const v = initialLookup()
    return v ? BigInt(v) : undefined
  })
  const [visible, setVisible] = useState(PAGE)

  const { data: count, isLoading } = useReadContract({
    address: TIME_CAPSULE_ADDRESS,
    abi: timeCapsuleAbi,
    functionName: 'capsuleCount',
    chainId: CAPSULE_CHAIN.id,
    query: { enabled: !!TIME_CAPSULE_ADDRESS, refetchInterval: 15_000 },
  })

  const total = count ? Number(count) : 0
  const latest = Array.from({ length: Math.min(visible, total) }, (_, i) => BigInt(total - i))

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
          Find a capsule by number
        </h2>
        <form
          className="glass flex items-center gap-2 rounded-2xl p-2"
          onSubmit={(e) => {
            e.preventDefault()
            setLookupId(/^\d+$/.test(input) ? BigInt(input) : undefined)
          }}
        >
          <Search className="ml-2 size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
          <input
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
            placeholder="Capsule number"
            aria-label="Capsule number"
            className="min-h-11 w-full bg-transparent text-base tabular-nums outline-none placeholder:text-slate-400"
          />
          <button type="submit" className="min-h-11 rounded-xl px-4 text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
            Find
          </button>
        </form>
        {lookupId !== undefined && (
          <div className="mt-3">
            <CapsuleCard id={lookupId} highlight />
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
          Latest capsules
        </h2>
        {isLoading ? (
          <div className="glass h-28 animate-pulse rounded-2xl" />
        ) : total === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No capsules yet. Seal the first one.</p>
        ) : (
          <div className="space-y-3">
            {latest.map((id) => (
              <CapsuleCard key={id.toString()} id={id} />
            ))}
            {visible < total && (
              <button
                onClick={() => setVisible((v) => v + PAGE)}
                className="min-h-11 w-full rounded-xl text-sm font-semibold"
                style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}
              >
                Show more
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
