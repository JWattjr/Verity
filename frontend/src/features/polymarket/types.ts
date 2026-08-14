export type PolymarketProvisioningStatus =
  | "uninitialized"
  | "circle_wallet_ready"
  | "clob_credentials_ready"
  | "deposit_wallet_derived"
  | "deployment_pending"
  | "approvals_pending"
  | "ready"
  | "failed_retryable"
  | "failed_terminal"

export interface PolymarketApprovalState {
  spender: string
  collateralApproved: boolean
  conditionalTokensApproved: boolean
  checkedAt: string
}

export interface PolymarketAccount {
  status: PolymarketProvisioningStatus
  chainId: number
  circleBlockchain: string
  circleWalletAddress: string | null
  depositWalletAddress: string | null
  deploymentTransactionHash: string | null
  approvalTransactionHash: string | null
  approvals: PolymarketApprovalState[]
  provisioning: boolean
  lastError: { code: string; message: string; at: string | null } | null
  readyAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface PolymarketBridgeAddresses {
  evm: string
  svm: string
  btc: string
  tron: string
}

export type PolymarketBridgeStatus =
  | "DEPOSIT_DETECTED"
  | "PROCESSING"
  | "ORIGIN_TX_CONFIRMED"
  | "SUBMITTED"
  | "COMPLETED"
  | "FAILED"

export interface PolymarketBridgeTransaction {
  fromChainId: string
  fromTokenAddress: string
  fromAmountBaseUnit: string
  toChainId: string
  toTokenAddress: string
  status: PolymarketBridgeStatus
  txHash: string
  createdTimeMs: number
}

export interface PolymarketFunding {
  depositWalletAddress: string
  bridgeAddresses: PolymarketBridgeAddresses | null
  pusdBalance: string
  pusdBalanceBaseUnits: string
  transactions: PolymarketBridgeTransaction[]
  reconciledAt: string | null
}

export interface PolymarketSport {
  id: string
  sport: string
  name: string | null
  image: string | null
  resolutionSource: string | null
  ordering: string | null
  tagIds: string[]
  primaryTagId: string | null
  seriesId: string | null
}

export interface PolymarketTag {
  id: string
  label: string | null
  slug: string | null
}

export interface PolymarketFeeSchedule {
  exponent: string | null
  rate: string | null
  takerOnly: boolean
  rebateRate: string | null
}

export interface PolymarketOutcome {
  label: string
  price: string | null
  tokenId: string | null
}

export interface PolymarketSportsMarket {
  id: string
  slug: string | null
  question: string | null
  conditionId: string | null
  sportsMarketType: string | null
  image: string | null
  description: string | null
  groupItemTitle: string | null
  outcomes: PolymarketOutcome[]
  active: boolean
  closed: boolean
  acceptingOrders: boolean
  restricted: boolean
  negativeRisk: boolean
  startDate: string | null
  endDate: string | null
  minimumTickSize: string | null
  minimumOrderSize: string | null
  bestBid: string | null
  bestAsk: string | null
  lastTradePrice: string | null
  spread: string | null
  liquidity: string | null
  volume: string | null
  feeType: string | null
  feeSchedule: PolymarketFeeSchedule | null
}

export interface PolymarketSportsEvent {
  id: string
  slug: string | null
  title: string | null
  image: string | null
  description: string | null
  gameId: string | null
  sport: string | null
  startTime: string | null
  endTime: string | null
  live: boolean
  ended: boolean
  score: string | null
  restricted: boolean
  negativeRisk: boolean
  liquidity: string | null
  volume: string | null
  openInterest: string | null
  tags: PolymarketTag[]
  markets: PolymarketSportsMarket[]
}

export interface PolymarketPage<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}
