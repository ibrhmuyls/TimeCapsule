/**
 * Optional passphrase layer. The message is encrypted with AES-GCM in the browser
 * before the time-lock is applied, so even after the capsule opens only people who
 * know the passphrase can read it. A lost passphrase cannot be recovered.
 */
const PREFIX = 'arcpw1:'
const PBKDF2_ITERATIONS = 210_000
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export const isPassphraseProtected = (text: string) => text.startsWith(PREFIX)

export async function encryptWithPassphrase(text: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, encoder.encode(text)))
  const packed = new Uint8Array(salt.length + iv.length + cipher.length)
  packed.set(salt, 0)
  packed.set(iv, salt.length)
  packed.set(cipher, salt.length + iv.length)
  return PREFIX + toBase64(packed)
}

/** Throws when the passphrase is wrong. */
export async function decryptWithPassphrase(text: string, passphrase: string): Promise<string> {
  const packed = fromBase64(text.slice(PREFIX.length))
  const salt = packed.slice(0, 16)
  const iv = packed.slice(16, 28)
  const cipher = packed.slice(28)
  const key = await deriveKey(passphrase, salt)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, cipher)
  return decoder.decode(plain)
}
