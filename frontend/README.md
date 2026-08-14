# Verity Frontend

The client-side interface for the Verity social sports prediction matchups arena, built with **Next.js (App Router)**, **React 19**, and styled with **Tailwind CSS v4**. It features a responsive PvP arena feed, ticket builders, on-chain trading modules, automatic Circle Smart Contract Account onboarding, and real-time activity tracking.

---

## Page Routes

| Route            | View Description                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/`              | **Home Feed / PvP Arena**: A stream of upcoming matchups, active matches, and live duels with ticket builders.           |
| `/markets/[id]`  | **Market Detail**: Swapping panels and detail statistics for event-linked child prediction markets.                     |
| `/explore`       | **Market Discovery**: Browse prediction events by category or volume metrics.                                           |
| `/profile/[id]`  | **Public Profile**: User statistics, active positions, rank tier, Arena XP, and past duels/matchups.                     |
| `/portfolio`     | **Portfolio Dashboard**: View USDC balances, portfolio position values, active duels, and historic matches.              |
| `/notifications` | **Activity Center**: Lists comment threads, PvP matchup results, and resolution events.                                  |
| `/posts/[id]`    | **Thread View**: Displays a single PvP matchup thread or event container with its comments.                              |

---

## Component Taxonomy

```
src/components/
25: ├── feed/        # ComposeBox, FeedTabs, FeedShell - main feed coordination
26: ├── post/        # PostCard, MarketCard - individual items rendering
27: ├── markets/     # PvpArenaTab, PvpTicketBuilder, DuelHistory, SwapTicket - trading & duels
28: ├── social/      # CommentModal, CommentThread - interaction dialogs
29: ├── profile/     # ProfileBio, PortfolioPositions - user dashboard blocks
30: ├── layout/      # Sidebar, RightPanel, ThemeToggle - workspace shell
31: ├── providers/   # AppProviders, QueryClient, ThemeProvider, AuthModals - bootstrap wrappers
32: └── ui/          # Button, Input, Modal, Table, Skeleton - generic atomic elements
```

---

## Custom React Hooks

The client uses specialized custom hooks to interface with NestJS REST/WebSocket endpoints and Arc Testnet smart contracts:

| Hook                  | Category      | Description                                                                  |
| --------------------- | ------------- | ---------------------------------------------------------------------------- |
| `useMarketLimits`     | Web3/On-Chain | Queries creator lock minimum (5 USDC) and pool activation minimum (20 USDC). |
| `useMarketLiquidity`  | Web3/On-Chain | Handles pre-market launch funding approvals and LP deposits to `VerityFPMM`. |
| `useMarketResolution` | Web3/On-Chain | Triggers resolution disputes and bond approvals.                             |
| `useUsdcTransfer`     | Web3/On-Chain | Sends USDC directly on-chain using Circle SCA Smart Accounts.                |
| `useUsdcBalance`      | Web3/On-Chain | Queries the smart account's USDC balance.                                    |
| `useWalletProfile`    | API/State     | Manages the authenticated user profile state.                                |
| `useDailyVotes`       | API/State     | Tracks remaining free daily signal votes (capped at 10/day).                 |
| `useFeed`             | API/State     | Fetches feed posts from NestJS with market-only filtering.                   |
| `useSocket`           | WebSocket     | Manages Socket.IO listener rooms for instant updates.                        |
| `useUserPortfolio`    | API/State     | Retrieves positions, trade logs, and balances.                               |

---

## Design System & Styling

Verity v1 is built with a premium look matching modern design aesthetics:

- **Tailwind CSS v4**: Utilizes the latest compiler with custom theme definitions.
- **HSL Color Variables**: Dynamic color palettes defining `.verity-card`, `.verity-pill`, and `.verity-blob` classes supporting light and dark theme toggling.
- **Geist Font Family**: Renders modern typography using `next/font/google` (Geist Sans & Geist Mono).
- **Subtle Animations**: Micro-animations using transitions for interactive hover feedback and transaction wait states.

---

## Getting Started

### Installation

```bash
# From monorepo root
pnpm install

# Setup Env
cd frontend
cp .env.example .env
```

### Environment Parameters

Ensure the following variables are configured in `.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5080/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=34bb558c5125cd9604951f37559e91ff

```

### Development Server

```bash
pnpm run dev      # Launches dev client on http://localhost:3000
pnpm run build    # Compiles and bundles Next.js for production
```
