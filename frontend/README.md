# Verity Frontend

The client-side application for Verity, built with **Next.js (App Router)** and **React 19**. Provides the social feed, prediction market trading interface, smart wallet onboarding, and real-time activity updates.

## Pages

| Route | What it does |
|---|---|
| `/` | Home feed — unified stream of normal posts and prediction market cards |
| `/markets/[id]` | Market detail — full trading interface with buy/sell, LP, voting, comments, resolution status |
| `/explore` | Browse and filter markets by category |
| `/profile/[id]` | Public user profile — posts, bio, signal stats |
| `/wallet` | Wallet dashboard — USDC balance, positions, transaction history |
| `/notifications` | Activity feed — likes, comments, reshares, market events (backed by MongoDB) |
| `/how-it-works` | Product guide — lifecycle explanation, glossary, earning mechanics |
| `/posts/[id]` | Single post detail with threaded comments |

## Component Architecture

```
components/
├── feed/        # FeedShell, FeedTabs, ComposeBox — main feed orchestration
├── post/        # PostCard, MarketCard — individual feed item rendering
├── markets/     # MarketDetail — full trading view with swap card, LP panel, resolution UI
├── social/      # CommentModal — threaded comment dialog
├── wallet/      # PrivyOnboardingModal — 4-step onboarding flow (wallet → username → fund → success)
├── profile/     # PublicProfileView — user profile display
├── layout/      # Sidebar, RightPanel, MobileNav, MobileLeaderboardButton, ThemeToggle
├── providers/   # AppProviders — Privy, SmartWallets, QueryClient, ThemeProvider, Toaster
└── ui/          # Reusable generic components (buttons, inputs, modals, badges, skeletons)
```

## Key Hooks

| Hook | Purpose |
|---|---|
| `useMarketLiquidity` | Pre-market funding, LP deposits, token buying — handles USDC approve + Router contract calls via smart wallet |
| `useMarketResolution` | Propose/dispute resolution through the Resolver contract, bond management |
| `useUsdcTransfer` | Direct USDC transfers on Arc Testnet |
| `useUsdcBalance` | Read USDC balance from chain for the connected wallet |
| `usePrivyWallet` | Extract the smart wallet address from the Privy SDK |
| `useWalletProfile` | Fetch/cache the authenticated user's backend profile |
| `useFeed` | Load feed items from the API with market-only filtering |
| `useDailyVotes` | Track remaining free daily votes (10/day cap) |
| `useSocket` | Socket.IO connection for real-time feed/market/user room events |
| `useUserPortfolio` | Fetch user positions and trade history across markets |

## Web3 Stack

- **Privy** — email-based login, embedded wallet creation, smart wallet (Account Abstraction / ERC-4337)
- **Viem** — direct RPC reads (balances, prices, LP shares, allowances) and transaction encoding
- **Arc Testnet** — custom chain definition (`chainId: 5042002`), USDC at `0x3600...0000`
- **Contract ABIs** — defined in `src/lib/arc.ts` for Factory, FPMM, Resolver, Vault, Router, ERC20, ERC1155

## State Management

- **Zustand** — lightweight global stores
- **TanStack Query** — API fetching, caching, mutations, and optimistic UI updates via custom hooks in `store/verity/`

## Styling

- **Tailwind CSS v4** with custom theme tokens (HSL-based dark/light mode)
- **Geist font family** (Sans + Mono) via `next/font/google`
- Custom design system: `.verity-card`, `.verity-pill`, `.verity-blob` utility classes
- `next-themes` for system/dark/light theme switching

## Getting Started

```bash
# From monorepo root
pnpm install

# Configure environment
cd frontend
cp .env.example .env

# Start dev server
pnpm run dev    # http://localhost:3000
```

### Build

```bash
pnpm run build
```
