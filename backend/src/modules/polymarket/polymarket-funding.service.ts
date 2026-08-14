import { ConflictException, Injectable } from "@nestjs/common"
import type { Address } from "viem"
import { PolymarketAccountRepository } from "./polymarket-account.repository"
import {
  PolymarketAccountRecord,
  PolymarketBridgeAddresses,
  PolymarketFundingView,
  PolymarketProvisioningStatus,
} from "./polymarket-account.types"
import { PolymarketFundingGateway } from "./polymarket-funding.gateway"

const PUSD_SCALE = 1_000_000n

@Injectable()
export class PolymarketFundingService {
  constructor(
    private readonly repository: PolymarketAccountRepository,
    private readonly gateway: PolymarketFundingGateway,
  ) {}

  async getOrCreateDepositAddresses(
    userId: string,
  ): Promise<PolymarketFundingView> {
    let account = this.ready(await this.repository.ensure(userId))
    if (!account.bridgeAddresses) {
      const bridgeAddresses = await this.gateway.createDepositAddresses(
        account.depositWalletAddress as Address,
      )
      account = await this.repository.updateFunding(userId, {
        bridgeAddresses,
      })
    }
    return this.view(account)
  }

  async reconcile(userId: string): Promise<PolymarketFundingView> {
    let account = this.ready(await this.repository.ensure(userId))
    const [pusdBalanceBaseUnits, fundingTransactions] = await Promise.all([
      this.gateway.getPusdBalance(account.depositWalletAddress as Address),
      account.bridgeAddresses
        ? this.gateway.getTransactions(account.bridgeAddresses)
        : Promise.resolve([]),
    ])
    const fundingReconciledAt = new Date()
    account = await this.repository.updateFunding(userId, {
      pusdBalanceBaseUnits,
      fundingTransactions,
      fundingReconciledAt,
    })
    return this.view(account)
  }

  private ready(account: PolymarketAccountRecord): PolymarketAccountRecord {
    if (
      account.status !== PolymarketProvisioningStatus.Ready ||
      !account.depositWalletAddress
    ) {
      throw new ConflictException(
        "Polymarket account provisioning must be complete before funding.",
      )
    }
    return account
  }

  private view(account: PolymarketAccountRecord): PolymarketFundingView {
    const baseUnits = account.pusdBalanceBaseUnits || "0"
    return {
      depositWalletAddress: account.depositWalletAddress as string,
      bridgeAddresses:
        (account.bridgeAddresses as PolymarketBridgeAddresses | undefined) ||
        null,
      pusdBalance: this.formatPusd(baseUnits),
      pusdBalanceBaseUnits: baseUnits,
      transactions: account.fundingTransactions || [],
      reconciledAt: account.fundingReconciledAt || null,
    }
  }

  private formatPusd(baseUnits: string): string {
    const raw = BigInt(baseUnits)
    const whole = raw / PUSD_SCALE
    const fraction = (raw % PUSD_SCALE)
      .toString()
      .padStart(6, "0")
      .replace(/0+$/, "")
    return fraction ? `${whole}.${fraction}` : whole.toString()
  }
}
