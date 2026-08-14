import type { Types } from "mongoose"

export enum PolymarketProvisioningStatus {
  Uninitialized = "uninitialized",
  CircleWalletReady = "circle_wallet_ready",
  ClobCredentialsReady = "clob_credentials_ready",
  DepositWalletDerived = "deposit_wallet_derived",
  DeploymentPending = "deployment_pending",
  ApprovalsPending = "approvals_pending",
  Ready = "ready",
  FailedRetryable = "failed_retryable",
  FailedTerminal = "failed_terminal",
}

export interface PolymarketApprovalState {
  spender: string
  collateralApproved: boolean
  conditionalTokensApproved: boolean
  checkedAt: Date
}

export interface PolymarketBridgeAddresses {
  evm: string
  svm: string
  btc: string
  tron: string
}

export interface PolymarketBridgeTransaction {
  fromChainId: string
  fromTokenAddress: string
  fromAmountBaseUnit: string
  toChainId: string
  toTokenAddress: string
  status: string
  txHash: string
  createdTimeMs: number
}

export interface PolymarketAccountRecord {
  _id?: Types.ObjectId
  userId: Types.ObjectId
  chainId: number
  circleBlockchain: string
  status: PolymarketProvisioningStatus
  circleWalletIdempotencyKey: string
  circleWalletId?: string | null
  circleWalletAddress?: string | null
  clobCredentialsEncrypted?: string | null
  clobCredentialNonce: number
  depositWalletAddress?: string | null
  deploymentTransactionHash?: string | null
  approvalTransactionHash?: string | null
  approvals: PolymarketApprovalState[]
  bridgeAddresses?: PolymarketBridgeAddresses | null
  pusdBalanceBaseUnits?: string | null
  fundingTransactions?: PolymarketBridgeTransaction[]
  fundingReconciledAt?: Date | null
  provisioningLeaseId?: string | null
  provisioningLeaseUntil?: Date | null
  provisioningAttempts: number
  lastErrorCode?: string | null
  lastErrorMessage?: string | null
  lastErrorAt?: Date | null
  readyAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export interface PolymarketFundingView {
  depositWalletAddress: string
  bridgeAddresses: PolymarketBridgeAddresses | null
  pusdBalance: string
  pusdBalanceBaseUnits: string
  transactions: PolymarketBridgeTransaction[]
  reconciledAt: Date | null
}

export interface PolymarketAccountView {
  status: PolymarketProvisioningStatus
  chainId: number
  circleBlockchain: string
  circleWalletAddress: string | null
  depositWalletAddress: string | null
  deploymentTransactionHash: string | null
  approvalTransactionHash: string | null
  approvals: PolymarketApprovalState[]
  provisioning: boolean
  lastError: { code: string; message: string; at: Date | null } | null
  readyAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface CirclePolygonWallet {
  id: string
  address: `0x${string}`
}

export interface ClobCredentialPayload {
  key: string
  secret: string
  passphrase: string
}

export interface DepositWalletDeploymentResult {
  transactionHash: string | null
}

export interface TradingApprovalResult {
  approvals: PolymarketApprovalState[]
  transactionHash: string | null
}
