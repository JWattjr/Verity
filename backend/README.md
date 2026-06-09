# Verity Backend

The NestJS 11 API server powering Verity's social prediction market platform. Handles user authentication, social feed operations, on-chain market verification, liquidity pool management, and automated market resolution.

## Module Overview

The backend is organized into 12 domain modules under `src/modules/`:

| Module            | Purpose                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| **auth**          | Privy JWT token verification, session management                                                         |
| **users**         | Wallet profiles, usernames, signal point tracking, follower counts                                       |
| **posts**         | Social feed CRUD — normal posts and market-linked prediction posts                                       |
| **markets**       | Market creation, free voting (10/day cap), USDC trading (buy/sell), position tracking                    |
| **liquidity**     | LP pool initialization, deposits, withdrawals, 24h lock enforcement, on-chain state sync                 |
| **blockchain**    | Viem-based on-chain reads/writes, Account Abstraction calldata decoder, transaction receipt verification |
| **agent**         | AI resolution agent — web search via DuckDuckGo, outcome analysis via Claude/Gemini/OpenAI/DeepSeek      |
| **notifications** | Activity feed: likes, comments, reshares, market events                                                  |
| **socket**        | Socket.IO WebSocket gateway for real-time feed/market/user broadcasts                                    |
| **comments**      | Threaded comment system on posts                                                                         |
| **interactions**  | Likes and reshares                                                                                       |
| **circle-wallet** | Circle wallet integration utilities                                                                      |

### Cross-Cutting (`src/common/`)

- **`JwtAuthGuard`**: Database-first authentication — looks up the user by Privy DID before hitting the Privy REST API. Users with an existing wallet address are authenticated instantly without external network calls.
- **`HttpExceptionFilter`**: Standardized error response formatting.
- **`ResponseInterceptor`**: Wraps all successful responses in a consistent envelope.

## Market Resolution Keeper

The `MarketsKeeperService` runs a background loop every **30 seconds** that:

1. **Promotes qualified markets** — checks escrow balances on-chain and auto-transitions markets to `tradable` when they reach the 40 USDC threshold.
2. **Resolves Pyth markets** — fetches historical price VAAs from the Pyth Benchmarks API and submits resolution transactions.
3. **Resolves subjective markets** — invokes the AI agent to search the web, analyze evidence, and propose YES/NO outcomes. Monitors the dispute window and auto-finalizes undisputed proposals.

## On-Chain Integration

The `BlockchainService` uses **Viem** to interact with five smart contracts on Arc Testnet:

- Reads: escrow balances, pool states, LP shares, market prices, proposal statuses, dispute windows
- Writes: market registration, resolution proposals, finalization (via admin wallet)
- **AA/Safe decoder**: `getCallSequence()` recursively unwraps nested calldata from EntryPoint `handleOps`, Smart Account `execute`/`executeBatch`, and Safe `execTransaction` to correctly verify transactions from smart wallets

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

# Arc Testnet contract addresses
ARC_RPC_URL=https://rpc.testnet.arc.network
USDC_ADDRESS=0x3600000000000000000000000000000000000000
ROUTER_ADDRESS=0xfd5b97972669Dbd447560B4c7b0eEbe7BD58ff3d
CONDITIONAL_TOKEN_VAULT_ADDRESS=0x53B2404b703B78e0dfca79ffA0BDf7eBCb17E563
FPMM_ADDRESS=0x51203EF25B201A9138603d50711092698C350e24
FACTORY_ADDRESS=0x47248BfD909337F78De56Aaa82d070Eb8964F30F
RESOLVER_ADDRESS=0x8D387a1704E7efb92b315e97db54DA92a6212A1b

# Privy authentication
PRIVY_APP_ID=<your-privy-app-id>
PRIVY_APP_SECRET=<your-privy-app-secret>

# AI Agent (optional — defaults to mock)
LLM_PROVIDER=claude   # claude | gemini | openai | deepseek | mock
DEEPSEEK_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...

# E2E testing (requires gas + USDC)
ADMIN_PRIVATE_KEY=0x...
```

### Available Scripts

```bash
pnpm run dev              # Start in watch mode (http://localhost:5050/api)
pnpm run build            # Production build
pnpm run seed             # Populate DB with mock data
pnpm run extract-abis     # Copy contract ABIs from Foundry artifacts
pnpm run test             # Unit tests
```

### API Documentation

Swagger UI is served at `http://localhost:5050/api/docs` when the dev server is running.
