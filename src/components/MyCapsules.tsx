import { ConnectKitButton } from 'connectkit'
import { useAccount, useReadContract } from 'wagmi'
import { CAPSULE_CHAIN, TIME_CAPSULE_ADDRESS, timeCapsuleAbi } from '@/lib/timeCapsule'
import { CapsuleCard } from '@/components/CapsuleCard'

export function MyCapsules({ refreshKey }: { refreshKey: number }) {
  const { address } = useAccount()

  const { data: ids, isLoading } = useReadContract({
    address: TIME_CAPSULE_ADDRESS,
    abi: timeCapsuleAbi,
    functionName: 'getCapsuleIdsByCreator',
    args: address ? [address] : undefined,
    chainId: CAPSULE_CHAIN.id,
    query: { enabled: !!TIME_CAPSULE_ADDRESS && !!address },
    scopeKey: String(refreshKey),
  })

  if (!address) {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <p className="mb-3 text-sm" style={{ color: 'var(--muted)' }}>Connect your wallet to see the capsules you sealed.</p>
        <ConnectKitButton />
      </div>
    )
  }
  if (isLoading) return <div className="glass h-28 animate-pulse rounded-2xl" />

  const mine = ids ? [...ids].reverse() : []
  if (mine.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--muted)' }}>You have not sealed a capsule yet.</p>
  }
  return (
    <div className="space-y-3">
      {mine.map((id) => (
        <CapsuleCard key={id.toString()} id={id} />
      ))}
    </div>
  )
}
