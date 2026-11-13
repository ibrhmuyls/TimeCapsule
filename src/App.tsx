import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Info } from 'lucide-react'
import { SealCard } from '@/components/SealCard'
import { Explore } from '@/components/Explore'
import { MyCapsules } from '@/components/MyCapsules'
import { Stats } from '@/components/Stats'

type Tab = 'seal' | 'explore' | 'mine'

const TABS: { id: Tab; label: string }[] = [
  { id: 'seal', label: 'Seal' },
  { id: 'explore', label: 'Explore' },
  { id: 'mine', label: 'My capsules' },
]

const startTab = (): Tab => (new URLSearchParams(window.location.search).has('capsule') ? 'explore' : 'seal')

export default function App() {
  const [tab, setTab] = useState<Tab>(startTab)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="min-h-dvh px-4 pb-24 pt-6">
      <div className="mx-auto max-w-md space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="display text-3xl font-bold text-balance">Time Capsule</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Seal a message. Nobody opens it early.</p>
          </div>
          <ConnectKitButton />
        </header>

        <Stats />

        <nav className="glass grid grid-cols-3 gap-1 rounded-2xl p-1" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className="min-h-11 rounded-xl text-sm font-semibold transition-colors"
              style={tab === t.id ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--ink-2)' }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'seal' && <SealCard onSealed={() => setRefreshKey((k) => k + 1)} onViewMine={() => setTab('mine')} />}
        {tab === 'explore' && <Explore />}
        {tab === 'mine' && <MyCapsules refreshKey={refreshKey} />}

        <aside className="glass flex gap-3 rounded-2xl p-4 text-xs text-pretty" style={{ color: 'var(--ink-2)' }}>
          <Info className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
          <p>
            Arc Testnet demo. Test USDC has no monetary value. Your message is encrypted in your browser with a time-lock, and only the
            encrypted data is stored onchain, which is public. The contract has no admin and never holds funds. Sealed capsules cannot be
            edited, deleted or refunded. This is not legal advice.
          </p>
        </aside>
      </div>
    </div>
  )
}
