# Verity Admin Console

The administrative control panel and moderation dashboard for Verity. Built with **Next.js (App Router)**, **React 19**, and styled with **Tailwind CSS v4** + shadcn UI primitives.

This app runs independently of the main frontend, providing administrators with tools to manage markets, pre-fund liquidity pools, deploy PvP matchup tournaments, and execute manual resolution overrides.

---

## Authentication Modes

Access to the Admin Console is restricted to accounts flagged with the `"admin"` role in MongoDB. The console supports two sign-in workflows:

1.  **Email OTP Credentials**:
    - Enter the administrator email.
    - A 6-digit verification code is generated. (Logged to the NestJS API terminal console in development).
    - Enter the OTP to receive a signed admin JWT.

---

## Dashboard Console Interface

The Admin Console is structured around a top-level balances overview and a tabbed control center:

### Global Header Components

- **Admin Wallet Status**: Tracks the connected administrative wallet on the **Arc Testnet**, displaying real-time balances for **USDC** (collateral) and **ARC** (gas).
- **Deploy World Cup PvP Matchup (Drawer)**: Creates parent matchup events and launches multiple child prediction markets. Administrators can configure parent match details, toggle builder options (Match Winner, First Team to Score, Red Card, Corners, Goals, Yellow Cards, and Custom), and deploy. The deployment automatically deducts the pre-deposit cost (20 USDC per option) from the admin wallet to bootstrap the liquidity pools.

### Dashboard Action Tabs

#### 1. Moderation Tab

Manage all registered prediction markets, track their status (`open_for_votes`, `qualified`, `funding_pool`, `tradable`, `resolving`), and execute actions:
- **Approve Trading**: Promotes qualified prediction markets to the `funding_pool` stage to register them on-chain.
- **Add Liquidity**: Escrow USDC deposits into pre-market pools to help them reach the **20 USDC** threshold required for `VerityFPMM` activation.
- **Arbitrate Resolve**: Manually settle disputed markets. Select the winning outcome, input the confirming transaction hash, and verify the fee collector address.

#### 2. Metrics Tab

Displays platform usage statistics, on-chain volumes, user engagement rates, and active duels.

#### 3. Coupons Tab

Allows administrators to generate, revoke, and track promotional coupons used for user acquisition or referral boosts.

#### 4. Missions Tab

Allows administrators to configure platform-wide gamification missions, setting rules and rewards to incentivize user activity.

#### 5. Categories Tab

Manage the taxonomy of sports, leagues, and market categories to organize upcoming matchups.

---

## Getting Started

### Installation

```bash
# From monorepo root
pnpm install

# Setup Env
cd admin
cp .env.example .env   # Verify NEXT_PUBLIC_API_URL points to the NestJS API (http://localhost:5050/api)
```

### Run Locally

```bash
pnpm run dev      # Launches dev client on http://localhost:3001
pnpm run build    # Bundles the console app for deployment
```
