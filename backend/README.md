# Verity Backend

The NestJS 11 API server powering Verity's social sports prediction arena. Handles user authentication, PvP matchmaking duels, on-chain market verification, liquidity pool management, and automated market resolution.

## Module Overview

The backend is organized into domain modules under `src/modules/`:

| Module            | Purpose                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| **auth**          | Coordinates passwordless Email OTP verification via Resend and secure local JWT generation.              |
| **users**         | Wallet profiles, usernames, signal point tracking, follower counts, active boosts                        |
| **posts**         | Social event post containers                                                                             |
| **markets**       | Market creation, free voting, USDC trading (buy/sell), position tracking                                 |
| **liquidity**     | LP pool initialization, deposits, withdrawals, 24h lock enforcement, on-chain state sync                 |
| **blockchain**    | Viem-based on-chain reads/writes, Account Abstraction calldata decoder, transaction receipt verification |
| **agent**         | AI resolution agent — web search via DuckDuckGo, outcome analysis via Claude/Gemini/OpenAI/DeepSeek      |
| **notifications** | Activity feed: matchup results, boost awards, market resolution events                                    |
| **socket**        | Socket.IO WebSocket gateway for real-time feed/market/user broadcasts                                    |
| **comments**      | Threaded comment system on posts                                                                         |
| **circle-wallet** | Circle WaaS smart wallet provisioning and Circle Batching/Nanopayments payouts service                   |
| **pvp**           | Player-vs-Player Matchups Arena: coordinates duels, queues tickets, matches opponents, and scores duels  |
| **coupons**       | Handles promotional duel boost coupons                                                                   |
| **missions**      | Database onboarding milestones rewarding Arena XP                                                        |
| **categories**    | System-wide tag groupings for prediction feeds                                                           |
| **polymarket**    | Typed public sports metadata and active-event discovery through Polymarket's Gamma API                    |

### Cross-Cutting (`src/common/`)

- **`JwtAuthGuard`**: Restricts endpoints to authenticated JWT holders. Database-first lookup resolves active user smart wallets instantly.
- **`HttpExceptionFilter`**: Standardized error response formatting.
- **`ResponseInterceptor`**: Wraps all successful responses in a consistent envelope.

## Legacy Market Resolution Keeper

> Disabled for the Polymarket migration. The Arc/custom-contract environment settings used by this path have been removed from this branch.

The `MarketsKeeperService` runs a background loop every **30 seconds** that:

1. **Promotes qualified markets** — checks escrow balances on-chain and auto-transitions markets to `tradable` when they reach the 20 USDC threshold.
2. **Resolves Pyth markets** — fetches historical price VAAs from the Pyth Benchmarks API and submits resolution transactions.
3. **Resolves subjective markets** — invokes the AI agent to search the web, analyze evidence, and propose YES/NO outcomes. Monitors the dispute window and auto-finalizes undisputed proposals.

## Legacy On-Chain Integration

The `BlockchainService` uses **Viem** to interact with four smart contracts on Arc Testnet:

- Reads: escrow balances, pool states, LP shares, market prices, proposal statuses, dispute windows
- Writes: market registration, resolution proposals, finalization (via admin wallet)
- **AA/Safe decoder**: `getCallSequence()` recursively unwraps nested calldata from EntryPoint `handleOps`, Smart Account `execute`/`executeBatch`, and Safe `execTransaction` to correctly verify transactions from smart wallets

## Legacy Nanopayments & Fee Distribution (Circle Batching)

Verity implements a hybrid database/on-chain micro-fee routing system utilizing the **Circle Gateway Client (`@circle-fin/x402-batching/client`)** to payout accumulated fees to Liquidity Providers and Creator/Treasury addresses.

### Flow Architecture

1. **Fee Accumulation**:
   - Every trade executed via the Fixed Product Market Maker (`VerityFPMM`) incurs a 2.0% fee.
   - The fee is split: **60% to LPs** and **40% to Creator/Treasury**.
   - These are calculated off-chain and logged in the database (`LpFeeLedger` for LP fees, and individual `MarketTrade` documents for Creator royalties).

2. **LP Fee Payouts (`LpFeeService`)**:
   - A background queue (`processPendingLpFees()`) regularly scans for trades with pending fees.
   - It updates users' accrued balances in the `LpFeeLedger` collection.
   - When an LP's accrued fees meet the configured threshold, the service calls the `NanopaymentsService` to execute a payout.
   - LPs can also trigger a manual claim via the `/liquidity/claim-fees` endpoint.

3. **Creator Royalties (`RoyaltyService`)**:
   - The royalty queue monitors finalized trades and groups creator royalties by recipient address.
   - It issues batched payouts to creator wallets using the `NanopaymentsService`.

4. **Circle Gateway Batching (`NanopaymentsService`)**:
   - Interacts with Circle's X402 Batching client.
   - Historically checked the Gateway balance and used a developer-controlled treasury signer to top up the batching gateway.
   - Executes off-chain batched withdrawals to target user wallets, completing the gas-efficient distribution of USDC micro-payouts.

## Getting Started

### Install & Configure

```bash
# From monorepo root
pnpm install

# Configure environment
cd backend
cp .env.example .env
```

Required environment variables:

```env
MONGODB_URI=mongodb://localhost:27017/verity
PORT=5050
JWT_SECRET=<secure-secret>

# PvP Welcome Boost Configuration
NEW_USER_CUTOFF_DATE=

# Circle WaaS & Resend Configuration
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=
CIRCLE_BLOCKCHAIN=MATIC
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Polymarket public sports catalogue
POLYMARKET_GAMMA_API_URL=https://gamma-api.polymarket.com
POLYMARKET_REQUEST_TIMEOUT_MS=10000
POLYMARKET_PUBLIC_CACHE_TTL_MS=15000
POLYGON_RPC_URL=
POLYMARKET_CREDENTIAL_ENCRYPTION_KEY=
POLYMARKET_BUILDER_API_KEY=
POLYMARKET_BUILDER_SECRET=
POLYMARKET_BUILDER_PASSPHRASE=
POLYMARKET_BUILDER_CODE=

# AI Agent (optional — defaults to mock)
LLM_PROVIDER=claude   # Options: claude | gemini | openai | deepseek | mock
CLAUDE_API_KEY=
CLAUDE_MODEL=
GEMINI_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=

```

### Available Scripts

```bash
pnpm run dev              # Start in watch mode (http://localhost:5050/api)
pnpm run build            # Production build
pnpm run seed             # Populate DB with mock data
pnpm run extract-abis     # Retained legacy diagnostic script; requires archived contract artifacts
pnpm run test             # Unit tests
```

### API Documentation

Swagger UI is served at `http://localhost:5050/api/docs` when the dev server is running.

## Telegram account linking and duel events

Linking requires proof of both identities. Send the signed Telegram Mini App
`initData` while authenticated with the main Verity account:

```http
POST /api/tma/link-account
Authorization: Bearer <verity-jwt>
Content-Type: application/json

{"initData":"<window.Telegram.WebApp.initData>"}
```

Resolved PvP matches call the TMA service directly. The internal recovery
endpoint also requires the unique MongoDB match ID, so replaying the same match
for the same Telegram user is a no-op:

```http
POST /api/tma/internal/duels
x-tma-internal-secret: <TMA_INTERNAL_SECRET>
Content-Type: application/json

{"telegramId":"123456789","matchId":"<resolved-match-object-id>"}
```

Ticket activation uses MongoDB transactions. Production MongoDB must be a
replica set (MongoDB Atlas satisfies this requirement).

Account linking also mirrors the Telegram referral into the main-user
`referredById` relationship. Linking order does not matter: a newly linked
referred user connects immediately when the referrer is already linked, and a
referrer who links later backfills already-linked invitees. Existing main-app
referral attribution is preserved and never overwritten.
