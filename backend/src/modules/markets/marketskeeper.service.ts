import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Market, MarketDocument } from "./markets.model";
import { BlockchainService } from "../blockchain/blockchain.service";

@Injectable()
export class MarketsKeeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketsKeeperService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
    private readonly blockchainService: BlockchainService,
  ) {}

  onModuleInit() {
    this.logger.log("Initializing Pyth Market Resolution Keeper...");
    // Run the keeper loop every 30 seconds
    this.intervalId = setInterval(() => this.processExpiredMarkets(), 30000);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async processExpiredMarkets() {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    try {
      const now = new Date();
      // Find unresolved Pyth markets that have passed their deadline
      const expiredMarkets = await this.marketModel.find({
        isPythMarket: true,
        status: { $in: ["funding_pool", "tradable"] },
        deadline: { $lte: now },
      });

      if (expiredMarkets.length > 0) {
        this.logger.log(`Found ${expiredMarkets.length} expired Pyth markets to resolve.`);
      }

      for (const market of expiredMarkets) {
        try {
          await this.resolveMarket(market);
        } catch (error) {
          this.logger.error(`Failed to auto-resolve market ${market._id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error in keeper loop: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async resolveMarket(market: MarketDocument) {
    this.logger.log(`Auto-resolving Pyth market ${market._id} (${market.question})...`);

    // 1. Fetch price update VAA from Pyth Benchmarks API
    const timestamp = Math.floor(market.deadline.getTime() / 1000);
    const feedId = market.priceFeedId || "";
    if (!feedId) {
      throw new Error(`Market ${market._id} is marked as Pyth market but has no priceFeedId.`);
    }
    const cleanFeedId = feedId.startsWith("0x") ? feedId.slice(2) : feedId;
    const url = `https://benchmarks.pyth.network/v1/updates/price/${timestamp}?ids=${cleanFeedId}`;

    this.logger.log(`Fetching historical VAA from Benchmarks API: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Benchmarks API returned status ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as { binary?: { data?: string[] } };
    const priceUpdate = data.binary?.data;
    if (!priceUpdate || priceUpdate.length === 0) {
      throw new Error("No price update binary found in Benchmarks API response.");
    }

    this.logger.log(`VAA retrieved successfully. Submitting resolution transaction...`);

    // 2. Submit resolution transaction on-chain
    const txHash = await this.blockchainService.resolveMarketWithPyth(market._id.toString(), priceUpdate);
    this.logger.log(`Submitted resolution transaction: ${txHash}. Waiting for confirmation...`);

    // 3. Wait for confirmation
    const receipt = await this.blockchainService.getTransactionReceipt(txHash as `0x${string}`);
    this.logger.log(`Transaction confirmed in block ${receipt.blockNumber}. Fetching on-chain state...`);

    // 4. Query the resolved status and winner from the smart contract
    const onChainState = await this.blockchainService.readOnChainMarketState(market._id.toString());
    if (!onChainState.resolved) {
      throw new Error("On-chain state indicates market is still unresolved.");
    }

    // 5. Update database status
    const winningOutcome = onChainState.winningIsYes ? "YES" : "NO";
    market.status = "resolved";
    market.resolvedOutcome = winningOutcome;
    market.resolvedByAdmin = "0xKeeper"; // Identifier for auto-resolution
    await market.save();

    this.logger.log(`Successfully resolved market ${market._id} to ${winningOutcome} on-chain & database.`);
  }
}
