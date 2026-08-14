"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CircleHelp,
  Copy,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SquareArrowOutUpRight,
  X,
} from "lucide-react"
import {
  useCreatePolymarketDepositAddressesMutation,
  usePolymarketAccountQuery,
  usePolymarketFundingQuery,
  useProvisionPolymarketAccountMutation,
} from "./queries"
import type { PolymarketBridgeTransaction } from "./types"

const PENDING_STATUSES = new Set([
  "DEPOSIT_DETECTED",
  "PROCESSING",
  "ORIGIN_TX_CONFIRMED",
  "SUBMITTED",
])

interface PolymarketFundingPanelProps {
  userId: string
  onClose: () => void
}

export default function PolymarketFundingPanel({
  userId,
  onClose,
}: PolymarketFundingPanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  )
  const [announcement, setAnnouncement] = useState("")
  const accountQuery = usePolymarketAccountQuery(userId)
  const accountReady = accountQuery.data?.status === "ready"
  const fundingQuery = usePolymarketFundingQuery(userId, accountReady)
  const provisionMutation = useProvisionPolymarketAccountMutation(userId)
  const addressesMutation = useCreatePolymarketDepositAddressesMutation(userId)

  const address = fundingQuery.data?.bridgeAddresses?.evm
  const isBusy =
    accountQuery.isLoading ||
    provisionMutation.isPending ||
    addressesMutation.isPending

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  async function copyAddress() {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopyState("copied")
      setAnnouncement("Deposit address copied.")
      window.setTimeout(() => setCopyState("idle"), 1800)
    } catch {
      setCopyState("failed")
      setAnnouncement("Copying was blocked. Select the address manually.")
    }
  }

  async function provisionAccount() {
    try {
      const account = await provisionMutation.mutateAsync()
      setAnnouncement(
        account.status === "ready"
          ? "Polygon trading account is ready."
          : "Account setup did not complete. Review the status and try again.",
      )
    } catch {
      setAnnouncement("Account setup failed. It is safe to try again.")
    }
  }

  async function createDepositRoute() {
    try {
      await addressesMutation.mutateAsync()
      setAnnouncement("Deposit address is ready to copy.")
    } catch {
      setAnnouncement("The deposit route could not be created. Try again.")
    }
  }

  async function refreshFunding() {
    const result = await fundingQuery.refetch()
    setAnnouncement(
      result.isError
        ? "Funding status could not be refreshed."
        : "Funding status refreshed.",
    )
  }

  return (
    <section
      className="verity-funding-panel"
      aria-labelledby="funding-title"
      id="polymarket-funding-panel"
      ref={panelRef}
      tabIndex={-1}
    >
      <p aria-live="polite" className="verity-visually-hidden" role="status">
        {announcement}
      </p>
      <header className="verity-funding-panel__header">
        <div>
          <h2 id="funding-title">FUND YOUR TRADING BALANCE</h2>
          <p>
            Deposit supported USDC through Polymarket&apos;s bridge. It becomes
            pUSD in your Polygon trading wallet.
          </p>
        </div>
        <button
          aria-label="Close funding panel"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" />
        </button>
      </header>

      {accountQuery.isError ? (
        <FundingError
          message={errorMessage(
            accountQuery.error,
            "We could not load your trading account. Try again.",
          )}
          onRetry={() => void accountQuery.refetch()}
        />
      ) : null}

      {!accountQuery.isError && !accountReady ? (
        <div className="verity-funding-setup">
          <div className="verity-funding-setup__mark">
            {isBusy ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <ShieldCheck aria-hidden="true" />
            )}
          </div>
          <div>
            <h3>
              {accountQuery.data?.provisioning || provisionMutation.isPending
                ? "PREPARING YOUR POLYGON ACCOUNT"
                : "YOUR TRADING ACCOUNT ISN’T READY YET"}
            </h3>
            <p>
              Verity creates one Circle-controlled Polygon signer and its
              Polymarket Deposit Wallet. No deposit is made during setup.
            </p>
            {accountQuery.data?.lastError ? (
              <span role="alert">{accountQuery.data.lastError.message}</span>
            ) : null}
            {provisionMutation.isError ? (
              <span role="alert">
                {errorMessage(
                  provisionMutation.error,
                  "Account setup failed. It is safe to try again.",
                )}
              </span>
            ) : null}
          </div>
          <button
            disabled={isBusy || accountQuery.data?.provisioning}
            onClick={() => void provisionAccount()}
            type="button"
          >
            {provisionMutation.isPending ? "PREPARING…" : "PREPARE ACCOUNT"}
          </button>
        </div>
      ) : null}

      {accountReady && fundingQuery.isError ? (
        <FundingError
          message={errorMessage(
            fundingQuery.error,
            "We could not refresh your pUSD balance. Try again.",
          )}
          onRetry={() => void fundingQuery.refetch()}
        />
      ) : null}

      {accountReady && !fundingQuery.isError ? (
        <div className="verity-funding-grid">
          <div className="verity-funding-route">
            <h3>USDC IN, pUSD READY TO TRADE</h3>
            <p>
              Use the EVM route below for supported USDC deposits. Do not send
              assets directly to your Polygon Deposit Wallet.
            </p>

            {fundingQuery.isLoading ? (
              <div className="verity-funding-route-loading" aria-live="polite">
                <Loader2 aria-hidden="true" className="animate-spin" />
                <span>Loading your deposit route…</span>
              </div>
            ) : address ? (
              <div className="verity-funding-address">
                <span title={address}>{address}</span>
                <button onClick={() => void copyAddress()} type="button">
                  {copyState === "copied" ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Copy aria-hidden="true" />
                  )}
                  {copyState === "copied" ? "COPIED" : "COPY ADDRESS"}
                </button>
              </div>
            ) : (
              <button
                className="verity-funding-primary"
                disabled={addressesMutation.isPending || fundingQuery.isLoading}
                onClick={() => void createDepositRoute()}
                type="button"
              >
                {addressesMutation.isPending ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : null}
                {addressesMutation.isPending
                  ? "CREATING ROUTE…"
                  : "CREATE DEPOSIT ADDRESS"}
              </button>
            )}

            {copyState === "failed" ? (
              <p className="verity-funding-inline-error" role="alert">
                Copying was blocked. Select the address and copy it manually.
              </p>
            ) : null}
            {addressesMutation.isError ? (
              <p className="verity-funding-inline-error" role="alert">
                {errorMessage(
                  addressesMutation.error,
                  "The deposit route could not be created. Try again.",
                )}
              </p>
            ) : null}

            <div className="verity-funding-warning">
              <AlertTriangle aria-hidden="true" />
              <div>
                <p>
                  Confirm the source network, token, and current bridge minimum
                  before sending. Unsupported deposits may not be recoverable.
                </p>
                <a
                  href="https://docs.polymarket.com/trading/bridge/deposit"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  VERIFY SUPPORTED ROUTES
                  <SquareArrowOutUpRight aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div className="verity-funding-ledger">
            <div className="verity-funding-ledger__balance">
              <div>
                <span>AVAILABLE TO TRADE</span>
                <strong>
                  {fundingQuery.isLoading
                    ? "—"
                    : fundingQuery.data?.pusdBalance || "0"}
                  <small> pUSD</small>
                </strong>
              </div>
              <button
                aria-label="Refresh funding status"
                disabled={fundingQuery.isFetching}
                onClick={() => void refreshFunding()}
                type="button"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={fundingQuery.isFetching ? "animate-spin" : ""}
                />
              </button>
            </div>

            <div className="verity-funding-ledger__activity">
              <span>BRIDGE ACTIVITY</span>
              {fundingQuery.isLoading ? (
                <div className="verity-funding-empty" aria-live="polite">
                  <Loader2 aria-hidden="true" className="animate-spin" />
                  <p>Checking bridge activity…</p>
                  <small>Waiting for the latest Polymarket status.</small>
                </div>
              ) : fundingQuery.data?.transactions.length ? (
                <ul>
                  {fundingQuery.data.transactions
                    .slice(0, 4)
                    .map((transaction) => (
                      <BridgeTransaction
                        key={`${transaction.txHash}-${transaction.createdTimeMs}`}
                        transaction={transaction}
                      />
                    ))}
                </ul>
              ) : (
                <div className="verity-funding-empty">
                  <span aria-hidden="true" />
                  <p>No deposit detected yet.</p>
                  <small>
                    New deposits are checked automatically while processing.
                  </small>
                </div>
              )}
              {fundingQuery.data?.reconciledAt ? (
                <small className="verity-funding-freshness">
                  Last checked{" "}
                  {formatTime(Date.parse(fundingQuery.data.reconciledAt))}
                </small>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function BridgeTransaction({
  transaction,
}: {
  transaction: PolymarketBridgeTransaction
}) {
  const pending = PENDING_STATUSES.has(transaction.status)
  const complete = transaction.status === "COMPLETED"
  const failed = transaction.status === "FAILED"
  return (
    <li>
      <span
        className={
          complete
            ? "is-complete"
            : pending
              ? "is-pending"
              : failed
                ? "is-failed"
                : "is-unknown"
        }
      >
        {complete ? (
          <CheckCircle2 aria-hidden="true" />
        ) : pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : failed ? (
          <AlertTriangle aria-hidden="true" />
        ) : (
          <CircleHelp aria-hidden="true" />
        )}
      </span>
      <div>
        <strong>{statusLabel(transaction.status)}</strong>
        <small>
          {chainLabel(transaction.fromChainId)} ·{" "}
          {shortHash(transaction.txHash)}
        </small>
        <small>
          {transaction.fromAmountBaseUnit} base units · token{" "}
          {shortHash(transaction.fromTokenAddress)}
        </small>
      </div>
      <time dateTime={new Date(transaction.createdTimeMs).toISOString()}>
        {formatTime(transaction.createdTimeMs)}
      </time>
    </li>
  )
}

function FundingError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="verity-funding-error" role="alert">
      <AlertTriangle aria-hidden="true" />
      <p>{message}</p>
      <button onClick={onRetry} type="button">
        TRY AGAIN
      </button>
    </div>
  )
}

function statusLabel(status: string) {
  const known: Record<string, string> = {
    DEPOSIT_DETECTED: "Deposit detected",
    PROCESSING: "Bridge processing",
    ORIGIN_TX_CONFIRMED: "Source confirmed",
    SUBMITTED: "Submitted to Polygon",
    COMPLETED: "Available to trade",
    FAILED: "Bridge failed",
  }
  return known[status] || "Status unavailable"
}

function chainLabel(chainId: string) {
  const chains: Record<string, string> = {
    "1": "Ethereum",
    "10": "Optimism",
    "137": "Polygon",
    "8453": "Base",
    "42161": "Arbitrum",
  }
  return chains[chainId] || `Chain ${chainId || "unknown"}`
}

function shortHash(hash: string) {
  return hash ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : "Transaction pending"
}

function formatTime(value: number) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  })
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
