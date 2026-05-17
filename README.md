# Verity

Verity is a social prediction app built with a MERN-style architecture: Next.js/React on the frontend, plus a modular Express, Node.js, TypeScript, and MongoDB backend. It supports normal social posts plus opinion market posts where users can cast free YES/NO opinions or back a side with Arc testnet USDC.

## Current MVP

- Wallet identity with RainbowKit and Arc testnet support
- MongoDB-backed profiles, posts, market posts, comments, likes, reshares, and free votes
- JWT auth endpoints for email/password registration and login
- Normal posts with like, comment, reshare, and share actions
- Opinion market posts with free upvote/downvote sentiment
- Arc testnet USDC balance reads from the connected wallet
- Market creation fee and trading fee defaults
- USDC-backed buy/sell ledger for YES and NO positions
- Market detail pages with rules, USDC sentiment, trade ticket, position summary, and payout preview

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- MongoDB, Express, Node.js, Mongoose
- RainbowKit, wagmi, viem
- Arc testnet USDC ERC20 reads and transfers

## Project Structure

```text
backend/
  src/
    config/
    middlewares/
    modules/
      auth/
      comments/
      interactions/
      markets/
      posts/
      users/
    utils/
    app.ts
    server.ts
src/
  api/
    auth.ts
    client.ts
    users.ts
    verity.ts
  app/
  components/
  hooks/
  lib/
```

## Environment

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Frontend variables:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_TESTNET_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_TESTNET_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_VERITY_TREASURY_ADDRESS=
```

Backend defaults live in `backend/.env`:

```bash
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/verity
JWT_SECRET=replace-with-a-long-random-secret-before-production
JWT_EXPIRES_IN=7d
```

Do not commit `.env.local`, private keys, or production secrets.

## MongoDB Setup

This workstation does not currently expose `mongod` on PATH or a `MongoDB` Windows service. Install MongoDB Community Server for Windows, then start the service from Services or run MongoDB manually before starting the backend.

The default local connection string is:

```text
mongodb://127.0.0.1:27017/verity
```

## Backend Development

Install backend dependencies:

```bash
cd backend
npm install
```

Run the API:

```bash
npm run dev
```

Health check:

```text
GET http://localhost:5000/health
```

## Frontend Development

Install frontend dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`. If that port is busy, run:

```bash
npm run dev -- --port 3001
```

## API Endpoints

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET   /api/users/wallet/:walletAddress
PATCH /api/users/:id

GET  /api/posts
POST /api/posts
POST /api/posts/market

GET  /api/comments?postId=:postId
POST /api/comments

POST /api/interactions/like
POST /api/interactions/reshare

GET  /api/markets/:marketId/positions?profileId=:profileId
GET  /api/markets/:marketId/trades
POST /api/markets/:marketId/free-vote
POST /api/markets/:marketId/trade
```

## Migration Mapping

| Previous responsibility | MERN replacement |
| --- | --- |
| Hosted Postgres tables | MongoDB collections via Mongoose models |
| Client data SDK | `src/api/*` REST service layer |
| Auth provider | JWT endpoints in `backend/src/modules/auth` |
| Row-level policies | Express validation, services, and middleware |
| SQL migrations | Mongoose schemas and indexes |
| Realtime channels | Not used in current MVP; add Socket.io module if needed |

## Checks

```bash
npm run lint
npm run build
cd backend && npm run build
```

All should pass before pushing changes.

## Product Rules

Normal posts:

- Like, comment, reshare, share
- No market
- No USDC backing

Opinion market posts:

- Question, category, deadline, resolution source, YES condition, NO condition, status
- Free upvote means YES
- Free downvote means NO
- YES/NO buttons in the trade ticket are for USDC-backed positions
- Market sentiment reflects USDC-backed opinions only

## Known Limitations

- USDC-backed buys transfer Arc testnet USDC to the treasury address, but there is not yet an escrow smart contract.
- Sell orders currently update the in-app ledger only. They do not transfer USDC back on-chain.
- Payout preview is an estimate based on in-app shares and assumes a correct outcome pays `$1` per share.
- Pricing is currently based on simple implied market share, not a production AMM or order book.
- Market resolution, oracle/AI settlement, payouts, fee splitting, and dispute flows are not implemented yet.
