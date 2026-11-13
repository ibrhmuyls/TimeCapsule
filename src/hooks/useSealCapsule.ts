import { useCallback, useState } from 'react'
import { erc20Abi } from 'viem'
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi'
import { getUsdc } from '@/onchain-facts'
import { CAPSULE_CHAIN, TIME_CAPSULE_ADDRESS, sealMessage, timeCapsuleAbi } from '@/lib/timeCapsule'

export type SealStep = 'idle' | 'encrypting' | 'approving' | 'sealing' | 'done'

const usdc = getUsdc(CAPSULE_CHAIN.id)

export function useSealCapsule() {
  const { address, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: CAPSULE_CHAIN.id })
  const [step, setStep] = useState<SealStep>('idle')
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>()
  const [capsuleId, setCapsuleId] = useState<bigint | undefined>()

  const { data: fee } = useReadContract({
    address: TIME_CAPSULE_ADDRESS,
    abi: timeCapsuleAbi,
    functionName: 'FEE',
    chainId: CAPSULE_CHAIN.id,
    query: { enabled: !!TIME_CAPSULE_ADDRESS },
  })

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: usdc?.address as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CAPSULE_CHAIN.id,
    query: { enabled: !!address && !!usdc },
  })

  const seal = useCallback(
    async (message: string, unlockAtSec: number) => {
      if (!TIME_CAPSULE_ADDRESS || !usdc || !address || !publicClient || fee === undefined) {
        throw new Error('Wallet or contract is not ready.')
      }
      try {
        if (chainId !== CAPSULE_CHAIN.id) await switchChainAsync({ chainId: CAPSULE_CHAIN.id })

        setStep('encrypting')
        const ciphertext = await sealMessage(message, unlockAtSec)

        const usdcAddress = usdc.address as `0x${string}`
        const allowance = await publicClient.readContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, TIME_CAPSULE_ADDRESS],
        })
        if (allowance < fee) {
          setStep('approving')
          const approveHash = await writeContractAsync({
            address: usdcAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [TIME_CAPSULE_ADDRESS, fee],
            chainId: CAPSULE_CHAIN.id,
          })
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }

        setStep('sealing')
        const hash = await writeContractAsync({
          address: TIME_CAPSULE_ADDRESS,
          abi: timeCapsuleAbi,
          functionName: 'createCapsule',
          args: [BigInt(unlockAtSec), ciphertext],
          chainId: CAPSULE_CHAIN.id,
        })
        setTxHash(hash)
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') throw new Error('Transaction reverted.')

        const count = await publicClient.readContract({
          address: TIME_CAPSULE_ADDRESS,
          abi: timeCapsuleAbi,
          functionName: 'getCapsuleIdsByCreator',
          args: [address],
        })
        setCapsuleId(count[count.length - 1])
        setStep('done')
        void refetchBalance()
      } catch (error) {
        setStep('idle')
        throw error
      }
    },
    [address, chainId, fee, publicClient, refetchBalance, switchChainAsync, writeContractAsync],
  )

  const reset = useCallback(() => {
    setStep('idle')
    setTxHash(undefined)
    setCapsuleId(undefined)
  }, [])

  return { seal, reset, step, txHash, capsuleId, fee, balance }
}
