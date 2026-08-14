import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Address, createPublicClient, http } from "viem"
import { polygon } from "viem/chains"
import {
  PolymarketBridgeAddresses,
  PolymarketBridgeTransaction,
} from "./polymarket-account.types"

const DEFAULT_BRIDGE_URL = "https://bridge.polymarket.com"
const PUSD = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB" as Address
const BUILDER_CODE_PATTERN = /^0x[a-fA-F0-9]{64}$/
const erc20BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const

interface CreateDepositResponse {
  address?: Partial<PolymarketBridgeAddresses>
}

interface BridgeStatusResponse {
  transactions?: Array<Record<string, unknown>>
}

@Injectable()
export class PolymarketFundingGateway {
  private readonly baseUrl: string
  private readonly requestTimeoutMs: number

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService
      .get<string>("POLYMARKET_BRIDGE_API_URL", DEFAULT_BRIDGE_URL)
      .replace(/\/$/, "")
    this.requestTimeoutMs = this.positiveInteger(
      this.configService.get<string>("POLYMARKET_REQUEST_TIMEOUT_MS"),
      10000,
    )
  }

  async createDepositAddresses(
    depositWalletAddress: Address,
  ): Promise<PolymarketBridgeAddresses> {
    const response = await this.request<CreateDepositResponse>("/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: depositWalletAddress }),
    })
    const addresses = response.address
    if (
      !addresses?.evm ||
      !addresses.svm ||
      !addresses.btc ||
      !addresses.tron
    ) {
      throw new BadGatewayException(
        "Polymarket Bridge returned incomplete deposit addresses.",
      )
    }
    return {
      evm: addresses.evm,
      svm: addresses.svm,
      btc: addresses.btc,
      tron: addresses.tron,
    }
  }

  async getPusdBalance(depositWalletAddress: Address): Promise<string> {
    const balance = await createPublicClient({
      chain: polygon,
      transport: http(
        this.configService.get<string>("POLYGON_RPC_URL") || undefined,
      ),
    }).readContract({
      address: PUSD,
      abi: erc20BalanceAbi,
      functionName: "balanceOf",
      args: [depositWalletAddress],
    })
    return balance.toString()
  }

  async getTransactions(
    addresses: PolymarketBridgeAddresses,
  ): Promise<PolymarketBridgeTransaction[]> {
    const bridgeAddresses = [
      addresses.evm,
      addresses.svm,
      addresses.btc,
      addresses.tron,
    ]
    const responses = await Promise.all(
      bridgeAddresses.map((address) =>
        this.request<BridgeStatusResponse>(
          `/status/${encodeURIComponent(address)}?limit=50`,
        ),
      ),
    )
    const transactions = responses.flatMap((response) =>
      (response.transactions || []).map((transaction) =>
        this.transaction(transaction),
      ),
    )
    return Array.from(
      new Map(
        transactions.map((transaction) => [
          `${transaction.txHash}:${transaction.createdTimeMs}`,
          transaction,
        ]),
      ).values(),
    )
      .sort((left, right) => right.createdTimeMs - left.createdTimeMs)
      .slice(0, 100)
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs)
    try {
      const builderCode = this.builderCode()
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(builderCode ? { "X-Builder-Code": builderCode } : {}),
          ...init?.headers,
        },
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new BadGatewayException(
          `Polymarket Bridge API returned HTTP ${response.status}.`,
        )
      }
      return (await response.json()) as T
    } catch (error) {
      if (error instanceof BadGatewayException) throw error
      const reason =
        error instanceof Error && error.name === "AbortError"
          ? "request timed out"
          : "request failed"
      throw new BadGatewayException(`Polymarket Bridge API ${reason}.`)
    } finally {
      clearTimeout(timeout)
    }
  }

  private builderCode(): string | undefined {
    const code = this.configService
      .get<string>("POLYMARKET_BUILDER_CODE")
      ?.trim()
    if (code && !BUILDER_CODE_PATTERN.test(code)) {
      throw new InternalServerErrorException(
        "POLYMARKET_BUILDER_CODE must be a bytes32 hex value.",
      )
    }
    return code || undefined
  }

  private transaction(
    transaction: Record<string, unknown>,
  ): PolymarketBridgeTransaction {
    return {
      fromChainId: this.scalar(transaction.fromChainId, ""),
      fromTokenAddress: this.scalar(transaction.fromTokenAddress, ""),
      fromAmountBaseUnit: this.scalar(transaction.fromAmountBaseUnit, "0"),
      toChainId: this.scalar(transaction.toChainId, ""),
      toTokenAddress: this.scalar(transaction.toTokenAddress, ""),
      status: this.scalar(transaction.status, ""),
      txHash: this.scalar(transaction.txHash, ""),
      createdTimeMs:
        typeof transaction.createdTimeMs === "number"
          ? transaction.createdTimeMs
          : Number(this.scalar(transaction.createdTimeMs, "0")),
    }
  }

  private scalar(value: unknown, fallback: string): string {
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : fallback
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
  }
}
