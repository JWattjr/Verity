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
import {
  MatchStatistics,
  SportsOracleService,
} from "../agent/sports-oracle.service"
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
    private readonly sportsOracleService: SportsOracleService,
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
   * Resolves expired EPL proposition markets using deterministic sports statistics.
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

    const markets = expiredMarkets.filter(
      (market) =>
        !(
          market.marketType === "parent" &&
          market.category?.toLowerCase() === "pvp"
        ),
    )
    if (markets.length === 0) return

    this.logger.log(
      `Found ${markets.length} expired markets to resolve via Sports Oracle...`,
    )

    const fixtureGroups = new Map<number, MarketDocument[]>()
    for (const market of markets) {
      const isSportsMarket =
        market.category?.toLowerCase() === "pvp" ||
        market.marketType === "child"
      const fixtureId = market.apiFootballFixtureId
      if (!isSportsMarket || !fixtureId) continue
      const group = fixtureGroups.get(fixtureId) || []
      group.push(market)
      fixtureGroups.set(fixtureId, group)
    }

    const fixtureStats = new Map<number, MatchStatistics>()
    const failedFixtures = new Set<number>()
    for (const [fixtureId, fixtureMarkets] of fixtureGroups) {
      const fixtureMarket = fixtureMarkets[0]
      try {
        const requiredStatistics =
          this.sportsOracleService.requiredStatisticsForMarkets(fixtureMarkets)
        const stats = await this.sportsOracleService.fetchMatchStats(
          fixtureMarket.question,
          fixtureMarket.deadline,
          fixtureId,
          requiredStatistics,
        )
        fixtureStats.set(fixtureId, stats)
      } catch (error) {
        failedFixtures.add(fixtureId)
        this.logger.error(
          `Failed to fetch API-Football fixture ${fixtureId} for ${fixtureMarkets.length} market${fixtureMarkets.length === 1 ? "" : "s"}: ${error.message}`,
        )
      }
    }

    for (const market of markets) {
      const marketIdStr = market._id.toString()
      const isSportsMarket =
        market.category?.toLowerCase() === "pvp" ||
        market.marketType === "child"
      const fixtureId = market.apiFootballFixtureId
      if (isSportsMarket && fixtureId && failedFixtures.has(fixtureId)) {
        continue
      }
      try {
        this.logger.log(
          `Invoking Sports Oracle to resolve market: "${market.question}" (${marketIdStr})`,
        )

        let result: {
          outcome: string
          outcomeIndex?: number
          reasoning: string
          citations: string[]
        }

        if (isSportsMarket) {
          if (!fixtureId) {
            throw new Error("A genuine API-Football fixture ID is required")
          }
          const stats = fixtureStats.get(fixtureId)
          if (!stats) continue
          const evaluation = this.sportsOracleService.evaluateProposition(
            {
              question: market.question,
              yesCondition: market.yesCondition,
              noCondition: market.noCondition,
              optionName: market.optionName,
              optionGroup: market.optionGroup,
              handicap: market.handicap,
              outcomes: market.outcomes,
            },
            stats,
          )
          result = {
            outcome: evaluation.outcome,
            outcomeIndex: evaluation.outcomeIndex,
            reasoning: evaluation.reasoning,
            citations: evaluation.citations,
          }
        } else {
          result = await this.agentService.resolveMarket(
            market.question,
            market.yesCondition,
            market.noCondition,
            market.resolutionSource,
            market.category,
            market.outcomes,
            market.deadline,
          )
        }

        if (result.outcome === "INVALID") {
          this.logger.warn(
            `Oracle returned INVALID for market ${marketIdStr}: ${result.reasoning} Keeping open for manual admin resolution.`,
          )
          continue
        }

        let winningOutcome: any = result.outcome
        let winningIndex = result.outcomeIndex ?? -1

        if (market.outcomes && market.outcomes.length > 0) {
          winningIndex = market.outcomes.findIndex(
            (outcome) =>
              outcome.toLowerCase().trim() ===
              result.outcome.toLowerCase().trim(),
          )
          if (winningIndex < 0) {
            this.logger.warn(
              `Oracle outcome "${result.outcome}" is not an exact stored outcome for market ${marketIdStr}.`,
            )
            continue
          }
          winningOutcome = market.outcomes[winningIndex]
        } else if (result.outcome === "YES" || result.outcome === "NO") {
          winningIndex = result.outcome === "YES" ? 0 : 1
        } else {
          this.logger.warn(
            `Market ${marketIdStr} has no outcome set for oracle result "${result.outcome}".`,
          )
          continue
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
