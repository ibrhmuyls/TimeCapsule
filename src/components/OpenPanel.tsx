import { useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Loader2, LockOpen } from 'lucide-react'
import type { Hex } from 'viem'
import { openMessage } from '@/lib/timeCapsule'
import { decryptWithPassphrase, isPassphraseProtected } from '@/lib/crypto'

/** Decrypts an unlocked capsule. Asks for the passphrase when the author added one. */
export function OpenPanel({ ciphertext }: { ciphertext: Hex }) {
  const [stage, setStage] = useState<'closed' | 'passphrase' | 'open'>('closed')
  const [stored, setStored] = useState('')
  const [plain, setPlain] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const handleOpen = async () => {
    setBusy(true)
    setError(undefined)
    try {
      const text = await openMessage(ciphertext)
      if (isPassphraseProtected(text)) {
        setStored(text)
        setStage('passphrase')
      } else {
        setPlain(text)
        setStage('open')
      }
    } catch {
      setError('The time-lock key is not published yet. Wait a few seconds and try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleUnlock = async () => {
    setBusy(true)
    setError(undefined)
    try {
      setPlain(await decryptWithPassphrase(stored, passphrase))
      setStage('open')
    } catch {
      setError('Wrong passphrase.')
    } finally {
      setBusy(false)
    }
  }

  if (stage === 'open') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="glass-inner mt-3 rounded-xl p-3"
      >
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--success)' }}>
          <LockOpen className="size-3.5" /> Opened
        </div>
        <p className="whitespace-pre-wrap break-words text-pretty text-sm">{plain}</p>
      </motion.div>
    )
  }

  if (stage === 'passphrase') {
    return (
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          void handleUnlock()
        }}
      >
        <div className="glass-inner flex items-center gap-2 rounded-xl px-3">
          <KeyRound className="size-4 shrink-0" style={{ color: 'var(--subtle)' }} />
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="This capsule needs a passphrase"
            aria-label="Passphrase"
            className="min-h-11 w-full bg-transparent text-base outline-none placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={busy || passphrase.length === 0}
          className="min-h-11 w-full rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {busy ? 'Decrypting...' : 'Unlock message'}
        </button>
        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      </form>
    )
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => void handleOpen()}
        disabled={busy}
        className="min-h-11 w-full rounded-xl text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: 'var(--accent)' }}
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> Decrypting...</span>
        ) : (
          'Open capsule'
        )}
      </button>
      {error && <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
