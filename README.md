# Verity

Verity is a social prediction and opinion market platform. It is structured as a **pnpm monorepo** consisting of a modern Next.js frontend and a modular, highly scalable NestJS backend.

Users can share normal social posts, create opinion/prediction market posts with YES/NO resolution criteria, cast free sentiment votes, or purchase USDC-backed YES/NO positions using the Arc Testnet.

---

## Technical Stack

### Monorepo Structure

- **Package Manager:** `pnpm` with Workspaces
- **Frontend:** Next.js (App Router), React 19, Tailwind CSS, Radix UI, Lucide Icons
- **Web3 Integration:** RainbowKit, Wagmi, Viem (Arc Testnet USDC transfers & reads)
- **Backend:** NestJS 11 (Modular architectural patterns, Dependency Injection)
- **Database:** MongoDB via Mongoose (ODM), MongoDB Indexing
- **Validation & Security:** `class-validator`, `class-transformer`, JWT authentication

---

## Project Structure

```text
Verity/
├── frontend/                  # Next.js Application
│   ├── src/
│   │   ├── api/              # API Clients & Service Layer
│   │   ├── app/              # Next.js App Router Pages
│   │   ├── components/       # UI & Domain Components
│   │   ├── hooks/            # Custom React Hooks
│   │   └── lib/              # Shared Helper Utilities
│   └── package.json
│
├── backend/                   # NestJS Application
│   ├── src/
│   │   ├── common/           # HTTP Filters, Guards, Response Interceptors
│   │   ├── modules/          # Modular NestJS Domain Modules
│   │   │   ├── auth/         # JWT and Account Authentication
│   │   │   ├── comments/     # Posts Comments
│   │   │   ├── interactions/ # Likes & Reshares
│   │   │   ├── markets/      # Predictions, Trades, Votes, Positions
│   │   │   ├── posts/        # Feed Posts
│   │   │   └── users/        # Wallet Profiles & Meta
│   │   ├── main.ts           # NestJS Server Entry Point
│   │   └── seed.ts           # MongoDB Seeding & Mock Database Generator
│   └── package.json
│
├── package.json               # Monorepo Workspace Scripts
├── pnpm-workspace.yaml        # Monorepo Packages Declaration
└── pnpm-lock.yaml
```

---

## Getting Started

### 1. Prerequisites

Ensure you have Node.js (v18+) and `pnpm` installed on your machine. You will also need a running local instance of MongoDB (default: `mongodb://127.0.0.1:27017/verity`).

### 2. Install Monorepo Dependencies

From the root of the workspace, run:

```bash
pnpm install:all
```

### 3. Setup Environment Variables

#### Frontend Environment

Create a `frontend/.env.local` file from the example:

```bash
cp frontend/.env.example frontend/.env.local
```

Add the necessary variables (e.g. WalletConnect Project ID):

- `NEXT_PUBLIC_API_URL` (default: `http://localhost:5050/api`)
- `NEXT_PUBLIC_APP_URL` (default: `http://localhost:3000`)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

#### Backend Environment

Create a `backend/.env` file from the example:

```bash
cp backend/.env.example backend/.env
```

Ensure database connection strings and JWT credentials are set:

- `MONGODB_URI` (default: `mongodb://127.0.0.1:27017/verity`)
- `PORT` (default: `5050`)
- `JWT_SECRET` (generate a secure secret)

---

## Development Workflow

You can start both applications concurrently from the root directory:

### Run Development Servers

- **Concurrently (Frontend & Backend):**
  Use two separate terminal tabs to run:
  ```bash
  pnpm dev:frontend
  pnpm dev:backend
  ```

### Seed Mock Data

To populate your local MongoDB with a clean, fully-functioning dataset (users, posts, active prediction markets, mock votes, and comments):

```bash
pnpm --filter verity-backend seed
```

---

## Core Product Rules & Features

### 1. Social Feed

- **Normal Posts:** Supports standard micro-blogging features including liking, replying, and resharing.
- **Wallet Profiles:** Users are identified securely via their Web3 wallet addresses. Profiles can be edited to include custom names, bios, and avatars.

### 2. Prediction & Signal Markets

- **Creation:** Prediction posts ask a specific Yes/No question and specify a resolution source, YES/NO criteria, a category, and a deadline.
- **AI Quality Review:** The **Verity AI Agent** automatically grades the quality of a prediction question (e.g., verifying it is highly measurable and objective) before allowing creation.
- **Free Voting:** Users can cast daily free sentiment votes (YES/NO) to help qualify markets for review.
- **USDC Trading:** Users can purchase positions on outcome tokens (YES or NO shares) using Arc Testnet USDC.
- **My Wallet Dashboard:** Shows transaction histories, daily vote usage (capped per day), and active prediction positions.

---

## Verification & Build Checks

Before committing or submitting a pull request, run the following verification checks from the monorepo root:

```bash
# Build the Next.js Frontend
pnpm build:frontend

# Build the NestJS Backend
pnpm build:backend
```
