import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { Market, MarketDocument } from "./markets.model"
import { AgentService } from "../agent/agent.service"
import { SocketGateway } from "../socket/socket.gateway"
import { PvpService } from "../pvp/pvp.service"

@Injectable()
export class MarketsKeeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketsKeeperService.name)
  private intervalId: NodeJS.Timeout | null = null
  private isProcessing = false

  constructor(
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
    private readonly agentService: AgentService,
    private readonly socketGateway: SocketGateway,
    private readonly pvpService: PvpService,
  ) {}

  onModuleInit() {
    this.logger.log("Initializing EPL PvP Market Resolution Keeper...")
    // Run the keeper loop every 30 seconds
    this.intervalId = setInterval(() => this.processExpiredMarkets(), 30000)
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  async processExpiredMarkets() {
    if (this.isProcessing) {
      return
    }
    this.isProcessing = true

    try {
      await this.processLockTimes()
      await this.processSubjectiveMarkets()
    } catch (error) {
      this.logger.error(`Error in keeper loop: ${error.message}`)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Automatically locks PvP events that have passed their lockTime (kickoff)
   * and matches any remaining queued tickets with bot profiles.
   */
  async processLockTimes() {
    const now = new Date()
    const activeParents = await this.marketModel.find({
      category: "pvp",
      marketType: "parent",
      status: "tradable",
      lockTime: { $lte: now },
    })

    for (const parent of activeParents) {
      try {
        const parentIdStr = parent._id.toString()
        this.logger.log(
          `LockTime reached for EPL match: ${parent.question} (${parentIdStr}). Locking and pairing queued tickets...`,
        )

        // Match any tickets still queued with bots
        await this.pvpService.matchRemainingTicketsWithBot(parentIdStr)

        // Mark parent as closed/locked
        parent.status = "closed"
        await parent.save()

        // Also update child markets
        await this.marketModel.updateMany(
          { parentMarketId: parent._id, status: "tradable" },
          { $set: { status: "closed" } },
        )

        this.socketGateway.broadcastToRoom("feed", "feed-updated", {})
        this.socketGateway.broadcastToRoom(
          `market:${parentIdStr}`,
          "market-updated",
          { marketId: parentIdStr },
        )
      } catch (err: any) {
        this.logger.error(
          `Error locking EPL match ${parent._id}: ${err.message}`,
        )
      }
    }
  }

  /**
   * Resolves expired EPL proposition markets using AI agent search.
   */
  async processSubjectiveMarkets() {
    const now = new Date()
    // Find unresolved child markets or single markets that have passed their deadline
    const expiredMarkets = await this.marketModel.find({
      status: { $in: ["tradable", "closed", "resolving"] },
      deadline: { $lte: now },
    })

    if (expiredMarkets.length === 0) {
      return
    }

    this.logger.log(
      `Found ${expiredMarkets.length} expired markets to resolve via AI...`,
    )

    for (const market of expiredMarkets) {
      const marketIdStr = market._id.toString()
      try {
        this.logger.log(
          `Invoking AI Agent to resolve market: "${market.question}" (${marketIdStr})`,
        )

        const result = await this.agentService.resolveMarket(
          market.question,
          market.yesCondition,
          market.noCondition,
          market.resolutionSource,
          market.category,
          market.outcomes,
          market.deadline,
        )

        if (result.outcome === "INVALID") {
          this.logger.warn(
            `AI Agent returned INVALID for market ${marketIdStr}. Keeping open for manual admin resolution.`,
          )
          continue
        }

        let winningOutcome: any = result.outcome
        let winningIndex = 0

        if (
          market.outcomeCount &&
          market.outcomeCount >= 2 &&
          market.outcomes &&
          market.outcomes.length > 0
        ) {
          const idx = market.outcomes.findIndex(
            (o) =>
              o.toLowerCase().trim() === result.outcome.toLowerCase().trim(),
          )
          if (idx !== -1) {
            winningIndex = idx
            winningOutcome = market.outcomes[idx]
          } else if (market.outcomeCount === 2) {
            if (result.outcome === "YES") {
              winningIndex = 0
              winningOutcome = market.outcomes[0] || "YES"
            } else if (result.outcome === "NO") {
              winningIndex = 1
              winningOutcome = market.outcomes[1] || "NO"
            }
          }
        } else {
          winningOutcome = result.outcome === "NO" ? "NO" : "YES"
          winningIndex = winningOutcome === "YES" ? 0 : 1
        }

        // Update market in DB
        market.status = "resolved"
        market.resolvedOutcome = winningOutcome as any
        market.winningOutcomeIndex = winningIndex
        market.proposalReasoning = result.reasoning
        market.proposalCitations = result.citations
        market.resolvedByAdmin = "AI_Agent"
        await market.save()

        this.logger.log(
          `Market ${marketIdStr} resolved as "${winningOutcome}" (Index: ${winningIndex}). Resolving PvP duels...`,
        )

        // Resolve PvP duels associated with this market
        await this.pvpService.resolvePvpMatchesForMarket(
          marketIdStr,
          winningOutcome,
        )

        // If all child markets of a parent are resolved, mark parent as resolved too
        if (market.parentMarketId) {
          const unresolvedChildren = await this.marketModel.countDocuments({
            parentMarketId: market.parentMarketId,
            status: { $ne: "resolved" },
          })
          if (unresolvedChildren === 0) {
            await this.marketModel.findByIdAndUpdate(market.parentMarketId, {
              status: "resolved",
              resolvedOutcome: "RESOLVED",
            })
          }
        }

        // Broadcast real-time updates
        this.socketGateway.broadcastToRoom("feed", "feed-updated", {})
        this.socketGateway.broadcastToRoom(
          `market:${marketIdStr}`,
          "market-updated",
          { marketId: marketIdStr },
        )
      } catch (error: any) {
        this.logger.error(
          `Failed to resolve market ${marketIdStr}: ${error.message}`,
        )
      }
    }
  }
}
