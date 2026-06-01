"use client";

import Link from "next/link";
import { CheckCircle2, CircleDollarSign, ExternalLink, Network, Wallet } from "lucide-react";
import { useAuth } from "@/components/providers/AuthModals";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import WalletConnectControl from "@/components/wallet/WalletConnectControl";

function shortAddress(addr?: string | null) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletSummary() {
  const { user, authenticated } = useAuth();
  const { formattedBalance, isLoading } = useUsdcBalance();

  const isConnected = authenticated && !!user;
  const address = user?.walletAddress;

  return (
    <div className="flex flex-col gap-3">
      <WalletConnectControl />

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="verity-card p-5 border border-border bg-surface-solid shadow-[(--shadow-subtle)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-meadow-green">
              <CircleDollarSign className="h-5 w-5" />
              <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em]">
                Arc USDC
              </span>
            </div>
            <Link
              className="verity-pill flex h-8 items-center gap-1.5 bg-parchment-card px-3 text-xs font-semibold tracking-[-0.14px] text-charcoal-primary shadow-[(--shadow-subtle)] transition-colors hover:bg-stone-surface"
              href="https://faucet.circle.com/"
              rel="noreferrer"
              target="_blank"
            >
              Add more
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.9px] text-midnight">
            {isLoading ? "..." : formattedBalance}
          </p>
          <p className="font-mono text-xs text-ash">
            testnet USDC balance
          </p>
        </div>

        <div className="verity-card p-5 border border-border bg-surface-solid shadow-[(--shadow-subtle)]">
          <div className="flex items-center gap-2 text-ash">
            <Wallet className="h-5 w-5" />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em]">
              Wallet
            </span>
          </div>
          <p className="mt-4 break-all font-mono text-sm font-semibold text-charcoal-primary">
            {isConnected ? shortAddress(address) : "Not connected"}
          </p>
          <p className="mt-1 font-mono text-xs text-ash">
            {isConnected ? address : "Connect to create posts and send Upvote/Downvote signals"}
          </p>
        </div>
      </section>

      <section className="verity-card p-5 border border-border bg-surface-solid shadow-[(--shadow-subtle)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-meadow-green" />
            <div>
              <h2 className="font-semibold tracking-[-0.18px] text-charcoal-primary">Arc Testnet</h2>
              <p className="font-mono text-xs text-ash">
                Smart contract wallet (SCA) - gas paid in ARC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-ash">
            <Network className="h-4 w-4" />
            {isConnected ? "Connected (Circle WaaS)" : "Disconnected"}
          </div>
        </div>
      </section>
    </div>
  );
}
