import { useMemo, useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { Check, ExternalLink, KeyRound, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { formatUsdc } from '@/onchain-money'
import { useSealCapsule, type SealStep } from '@/hooks/useSealCapsule'
import { useNowSeconds } from '@/hooks/useNow'
import { CAPSULE_CHAIN, MAX_MESSAGE_BYTES, TIME_CAPSULE_ADDRESS, utf8Length } from '@/lib/timeCapsule'
import { encryptWithPassphrase } from '@/lib/crypto'
import { CapsuleActions } from '@/components/CapsuleActions'

const PRESETS = [
  { label: '2 min', seconds: 120 },
  { label: '1 day', seconds: 86_400 },
  { label: '1 week', seconds: 604_800 },
  { label: '1 year', seconds: 31_536_000 },
]

const TEMPLATES = [
  { label: 'Letter to future me', text: 'Dear future me,\n\nRight now I am...\nI hope that by the time you read this...\n', seconds: 31_536_000 },
  { label: 'Prediction', text: 'My prediction: ...\n\nWhy I believe it: ...\n', seconds: 604_800 },
  { label: 'Birthday surprise', text: 'Happy birthday! I sealed this for you because...\n', seconds: 86_400 },
]

const STEP_LABEL: Record<SealStep, string> = {
  idle: '',
  encrypting: 'Encrypting in your browser...',
  approving: 'Approve 0.01 USDC in your wallet...',
  sealing: 'Confirm sealing in your wallet...',
  done: '',
}

const toLocalInput = (ms: number) => {
  const d = new Date(ms - new Date().getTimezoneOffset() * 60_000)
  return d.toISOString().slice(0, 16)
}

export function SealCard({ onSealed, onViewMine }: { onSealed: () => void; onViewMine: () => void }) {
  const { isConnected } = useAccount()
  const { seal, reset, step, txHash, capsuleId, fee, balance } = useSealCapsule()
  const [message, setMessage] = useState('')
  const [unlockInput, setUnlockInput] = useState(() => toLocalInput(Date.now() + 120_000))
  const [usePassphrase, setUsePassphrase] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [sealedUnlock, setSealedUnlock] = useState(0)

  const bytes = utf8Length(message)
  const unlockMs = useMemo(() => new Date(unlockInput).getTime(), [unlockInput])
  const nowSeconds = useNowSeconds(5000)
  const unlockValid = Number.isFinite(unlockMs) && unlockMs > (nowSeconds + 60) * 1000
  const busy = step === 'encrypting' || step === 'approving' || step === 'sealing'
  const lowBalance = balance !== undefined && fee !== undefined && balance < fee
  const passOk = !usePassphrase || passphrase.length >= 6
  const ready =
    !!TIME_CAPSULE_ADDRESS && fee !== undefined && message.trim().length > 0 && bytes <= MAX_MESSAGE_BYTES && unlockValid && passOk

  const handleSeal = async () => {
    try {
      const unlockAt = Math.floor(unlockMs / 1000)
      const payload = usePassphrase ? await encryptWithPassphrase(message, passphrase) : message
      await seal(payload, unlockAt)
      setSealedUnlock(unlockAt)
      onSealed()
    } catch (error) {
      const text = error instanceof Error ? error.message.toLowerCase() : ''
      if (text.includes('user rejected') || text.includes('denied')) return
      toast.error(text.includes('insufficient') ? 'Not enough USDC. Use "Get test USDC" in the sidebar.' : 'Sealing failed. Please try again.')
    }
  }

  if (step === 'done') {
    const id = capsuleId?.toString()
    return (
      <section className="glass rounded-3xl p-5">
        <div className="flex items-center gap-2" style={{ color: 'var(--success)' }}>
          <Check className="size-5" />
          <span className="text-sm font-semibold">Capsule {id ? `#${id} ` : ''}sealed</span>
        </div>
        <p className="mt-2 text-pretty text-sm" style={{ color: 'var(--ink-2)' }}>
          Nobody can read it until the unlock time, not even you.
          {usePassphrase && ' After it opens, the passphrase is still required to read it. It cannot be recovered.'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1">
          {id && <CapsuleActions id={id} unlockAt={sealedUnlock} locked />}
          {txHash && (
            <a
              href={buildTxExplorerUrl(CAPSULE_CHAIN.id, txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold"
              style={{ color: 'var(--accent-hover)' }}
            >
              Explorer <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <button className="min-h-11 flex-1 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--accent)' }} onClick={onViewMine}>
            View my capsules
          </button>
          <button
            className="min-h-11 flex-1 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--surface-muted)', color: 'var(--ink)' }}
            onClick={() => {
              reset()
              setMessage('')
              setPassphrase('')
            }}
          >
            Seal another
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="glass rounded-3xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-lg" style={{ background: 'rgba(18,45,69,0.08)' }}>
          <Lock className="size-3.5" style={{ color: 'var(--ink)' }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
          Seal a message
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            disabled={busy}
            onClick={() => {
              setMessage(t.text)
              setUnlockInput(toLocalInput(Date.now() + t.seconds * 1000))
            }}
            className="min-h-9 rounded-full px-3 text-xs font-semibold"
            style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="glass-inner rounded-2xl p-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write to your future self, or anyone you share the link with."
          rows={5}
          disabled={busy}
          aria-label="Message"
          className="w-full resize-none bg-transparent text-base outline-none placeholder:text-slate-400"
        />
        <div className="mt-1 text-right text-xs tabular-nums" style={{ color: bytes > MAX_MESSAGE_BYTES ? 'var(--danger)' : 'var(--subtle)' }}>
          {bytes} / {MAX_MESSAGE_BYTES} bytes
        </div>
      </div>

      <div className="glass-inner mt-3 rounded-2xl p-4">
        <label htmlFor="unlock" className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
          Opens on
        </label>
        <input
          id="unlock"
          type="datetime-local"
          value={unlockInput}
          onChange={(e) => setUnlockInput(e.target.value)}
          disabled={busy}
          className="mt-2 block min-h-11 w-full bg-transparent text-base tabular-nums outline-none"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={busy}
              onClick={() => setUnlockInput(toLocalInput(Date.now() + p.seconds * 1000))}
              className="min-h-9 rounded-full px-3 text-xs font-semibold"
              style={{ background: 'var(--surface-muted)', color: 'var(--ink-2)' }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {!unlockValid && <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>Pick a time at least 2 minutes from now.</p>}
      </div>

      <div className="glass-inner mt-3 rounded-2xl p-4">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={usePassphrase}
            disabled={busy}
            onChange={(e) => setUsePassphrase(e.target.checked)}
            className="size-4 accent-[#122d45]"
          />
          <KeyRound className="size-4" style={{ color: 'var(--subtle)' }} />
          Require a passphrase to read
        </label>
        {usePassphrase && (
          <>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              disabled={busy}
              placeholder="At least 6 characters"
              aria-label="Passphrase"
              className="mt-1 min-h-11 w-full bg-transparent text-base outline-none placeholder:text-slate-400"
            />
            <p className="text-xs text-pretty" style={{ color: passOk ? 'var(--subtle)' : 'var(--danger)' }}>
              Share the passphrase separately. If it is lost, the message can never be read.
            </p>
          </>
        )}
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt style={{ color: 'var(--muted)' }}>Fee</dt>
          <dd className="tabular-nums font-semibold">{fee !== undefined ? `${formatUsdc(fee)} USDC` : '...'}</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: 'var(--muted)' }}>Your balance</dt>
          <dd className="tabular-nums" style={{ color: lowBalance ? 'var(--danger)' : 'var(--ink)' }}>
            {balance !== undefined ? `${formatUsdc(balance)} USDC` : isConnected ? '...' : 'Connect wallet'}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        {isConnected ? (
          <button
            disabled={!ready || busy || lowBalance}
            onClick={() => void handleSeal()}
            className="w-full min-h-12 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> {STEP_LABEL[step]}
              </span>
            ) : (
              'Seal for 0.01 USDC'
            )}
          </button>
        ) : (
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button onClick={show} className="w-full min-h-12 rounded-2xl py-3.5 text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
                Connect wallet
              </button>
            )}
          </ConnectKitButton.Custom>
        )}
      </div>
      {lowBalance && (
        <p className="mt-3 text-xs" style={{ color: 'var(--danger)' }}>
          You need at least 0.01 USDC. Use "Get test USDC" in the Arc Studio sidebar.
        </p>
      )}
      {!TIME_CAPSULE_ADDRESS && <p className="mt-3 text-xs" style={{ color: 'var(--danger)' }}>The contract is not deployed yet.</p>}
    </section>
  )
}
