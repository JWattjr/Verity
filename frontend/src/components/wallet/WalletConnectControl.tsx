'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { AlertTriangle, ChevronDown, Wallet } from 'lucide-react'

export default function WalletConnectControl() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted
        const connected = ready && account && chain
        const wrongNetwork = connected && chain.unsupported

        if (!ready) {
          return (
            <button
              className="verity-pill flex h-11 w-full items-center justify-center bg-inverse px-4 text-sm font-semibold tracking-[-0.18px] text-inverse-text opacity-70"
              type="button"
            >
              Wallet
            </button>
          )
        }

        if (!connected) {
          return (
            <button
              className="verity-pill flex h-11 w-full items-center justify-center gap-2 bg-inverse px-4 text-sm font-semibold tracking-[-0.18px] text-inverse-text transition-opacity hover:opacity-90"
              onClick={openConnectModal}
              type="button"
            >
              <Wallet className="h-4 w-4" />
              Connect
            </button>
          )
        }

        if (wrongNetwork) {
          return (
            <button
              className="verity-pill flex h-11 w-full items-center justify-center gap-2 bg-ember-orange px-4 text-sm font-semibold tracking-[-0.18px] text-white transition-colors hover:bg-coral-red"
              onClick={openChainModal}
              type="button"
            >
              <AlertTriangle className="h-4 w-4" />
              Switch
            </button>
          )
        }

        return (
          <button
            className="verity-pill flex h-11 w-full items-center justify-center gap-2 bg-parchment-card px-4 text-sm font-semibold tracking-[-0.18px] text-charcoal-primary shadow-[var(--shadow-subtle)] transition-colors hover:bg-stone-surface"
            onClick={openAccountModal}
            type="button"
          >
            {account.displayName}
            <ChevronDown className="h-4 w-4" />
          </button>
        )
      }}
    </ConnectButton.Custom>
  )
}
