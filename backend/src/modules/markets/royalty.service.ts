import { Injectable, Logger } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { MarketTrade, MarketTradeDocument } from "./markets.model"
import { BlockchainService } from "../blockchain/blockchain.service"

@Injectable()
export class RoyaltyService {
  private readonly logger = new Logger(RoyaltyService.name)

  constructor(
    @InjectModel(MarketTrade.name)
    private readonly marketTradeModel: Model<MarketTradeDocument>,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Process and pay out the creator royalty for a verified trade in real-time.
   * Creator royalty is 50% of the platform fee (which is 40% of the total trade fee).
   */
  async processTradeRoyalty(trade: MarketTradeDocument): Promise<void> {
    if (trade.feeUsdc <= 0 || trade.royaltyPaid) {
      return
    }

    const marketIdStr = trade.marketId.toString()
    try {
      // Calculate royalty (50% of the 40% treasury fee = 20% of total feeUsdc)
      const royaltyAmount = Number((trade.feeUsdc * 0.40 * 0.50).toFixed(6))
      if (royaltyAmount <= 0) {
        this.logger.log(`Royalty amount for trade ${trade._id} is zero after rounding. Marking as paid.`)
        trade.royaltyPaid = true
        trade.royaltyAmountUsdc = 0
        await trade.save()
        return
      }

      // Query the on-chain pool creator address
      const poolState = await this.blockchainService.getPoolState(marketIdStr)
      const creatorAddress = poolState.creatorAddress

      if (!creatorAddress || creatorAddress === "0x0000000000000000000000000000000000000000") {
        this.logger.warn(`No valid creator found for market ${marketIdStr} of trade ${trade._id}. Skipping.`)
        return
      }

      const adminAddress = this.blockchainService.getAdminAddress()
      let txHash = "self_split"

      // Skip on-chain transfer if the creator is the admin/treasury itself
      if (creatorAddress.toLowerCase() !== adminAddress.toLowerCase()) {
        txHash = await this.blockchainService.transferUsdcFromTreasury(
          creatorAddress,
          royaltyAmount,
        )
        this.logger.log(
          `Paid creator royalty of ${royaltyAmount} USDC to ${creatorAddress} for trade ${trade._id}. Tx: ${txHash}`,
        )
      } else {
        this.logger.log(
          `Creator is admin/treasury for trade ${trade._id}. Skipping self-transfer.`,
        )
      }

      // Update trade database record
      trade.royaltyPaid = true
      trade.royaltyPaidTxHash = txHash
      trade.royaltyAmountUsdc = royaltyAmount
      await trade.save()
    } catch (error) {
      this.logger.error(
        `Failed to process creator royalty for trade ${trade._id}: ${error.message}`,
      )
    }
  }
}
