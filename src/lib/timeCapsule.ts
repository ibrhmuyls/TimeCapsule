import { parseAbi, hexToString, stringToHex, type Hex } from 'viem'
import { arcTestnet } from 'viem/chains'
import { Buffer, defaultChainInfo, mainnetClient, roundAt, timelockDecrypt, timelockEncrypt } from 'tlock-js'

export const CAPSULE_CHAIN = arcTestnet

/** Deployed TimeCapsule address, set in .env as VITE_TIME_CAPSULE_ADDRESS. */
const rawAddress = import.meta.env.VITE_TIME_CAPSULE_ADDRESS as string | undefined
export const TIME_CAPSULE_ADDRESS =
  rawAddress && /^0x[0-9a-fA-F]{40}$/.test(rawAddress) ? (rawAddress as `0x${string}`) : undefined

export const timeCapsuleAbi = parseAbi([
  'function FEE() view returns (uint256)',
  'function MAX_CIPHERTEXT_BYTES() view returns (uint256)',
  'function createCapsule(uint64 unlockAt, bytes ciphertext) returns (uint256 id)',
  'function capsuleCount() view returns (uint256)',
  'function getCapsule(uint256 id) view returns (address creator, uint64 createdAt, uint64 unlockAt, bytes ciphertext)',
  'function getCapsuleIdsByCreator(address creator) view returns (uint256[])',
  'event CapsuleSealed(uint256 indexed id, address indexed creator, uint64 unlockAt)',
])

/** Plaintext limit in UTF-8 bytes. Leaves room for the time-lock envelope within the 4096-byte onchain cap. */
export const MAX_MESSAGE_BYTES = 1200
export const MAX_CIPHERTEXT_BYTES = 4096

export const utf8Length = (text: string) => new TextEncoder().encode(text).length

/**
 * Encrypts a message so nobody (including us) can read it before `unlockAtSec`.
 * Uses drand timelock encryption: the key only exists once the drand network
 * publishes the randomness round that comes after the unlock time.
 */
export async function sealMessage(text: string, unlockAtSec: number): Promise<Hex> {
  const round = roundAt(unlockAtSec * 1000, defaultChainInfo) + 1
  const armored = await timelockEncrypt(round, Buffer.from(text, 'utf8'), mainnetClient())
  const hex = stringToHex(armored)
  if ((hex.length - 2) / 2 > MAX_CIPHERTEXT_BYTES) {
    throw new Error('Message is too long once encrypted. Shorten it and try again.')
  }
  return hex
}

/** Decrypts a capsule payload. Throws until the unlock time has really passed. */
export async function openMessage(ciphertext: Hex): Promise<string> {
  const plain = await timelockDecrypt(hexToString(ciphertext), mainnetClient())
  return plain.toString('utf8')
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'now'
  const d = Math.floor(totalSeconds / 86400)
  const h = Math.floor((totalSeconds % 86400) / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}
