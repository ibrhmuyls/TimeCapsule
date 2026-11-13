import { useReadContract } from 'wagmi'
import { formatUsdc } from '@/onchain-money'
import { CAPSULE_CHAIN, TIME_CAPSULE_ADDRESS, timeCapsuleAbi } from '@/lib/timeCapsule'

export function Stats() {
  const common = { address: TIME_CAPSULE_ADDRESS, abi: timeCapsuleAbi, chainId: CAPSULE_CHAIN.id } as const
  const { data: count } = useReadContract({
    ...common,
    functionName: 'capsuleCount',
    query: { enabled: !!TIME_CAPSULE_ADDRESS, refetchInterval: 15_000 },
  })
  const { data: fee } = useReadContract({ ...common, functionName: 'FEE', query: { enabled: !!TIME_CAPSULE_ADDRESS } })

  const items = [
    { label: 'Sealed', value: count !== undefined ? count.toString() : '...' },
    { label: 'Fee', value: fee !== undefined ? `${formatUsdc(fee)} USDC` : '...' },
    { label: 'Network', value: 'Arc Testnet' },
  ]

  return (
    <dl className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.label} className="glass rounded-2xl px-3 py-2.5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--subtle)' }}>{item.label}</dt>
          <dd className="display mt-0.5 truncate text-base font-semibold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
