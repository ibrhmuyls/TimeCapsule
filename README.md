# Time Capsule on Arc

Seal a message with a time-lock so nobody can read it before the date you choose, then open it when the time comes. Each capsule costs 0.01 USDC on Arc Testnet.

Built with [Arc Studio](https://studio.arc.io)

## Features

- Seal a message until a date you pick, with quick presets and starter templates.
- Optional passphrase, so only people who know it can read the message after it opens.
- Explore the latest capsules, find one by number, and see your own capsules.
- Live countdown and progress for every capsule.
- Share a capsule by link or Telegram, and add the opening time to your calendar.

## Tech stack

- React, Vite, TypeScript, Tailwind CSS
- wagmi, viem, ConnectKit
- Solidity and Foundry
- drand time-lock encryption (tlock-js)

## Development

Prerequisites: Bun and Foundry.

```bash
bun install
bun run dev
```

Other commands:

```bash
bun run build
bun run contracts:build
bun run contracts:test
```

### Environment variables

- `VITE_TIME_CAPSULE_ADDRESS`: address of the deployed TimeCapsule contract on Arc Testnet.
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS`: optional outside Arc Studio. Only used by backend tooling.

## Notes

This is a testnet demo. Test USDC has no monetary value. Messages are encrypted in the browser, and only the encrypted data is stored onchain, which is public. The contract has no admin, never holds funds, and capsules cannot be edited, deleted or refunded. This is not legal advice.
