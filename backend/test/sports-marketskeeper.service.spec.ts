import { MarketsKeeperService } from "../src/modules/markets/marketskeeper.service"

describe("MarketsKeeperService sports request batching", () => {
  it("fetches a failed API-Football fixture only once for all child markets", async () => {
    const fixtureId = 1578044
    const market = (id: string, question: string, optionGroup: string) => ({
      _id: { toString: () => id },
      question,
      category: "pvp",
      marketType: "child",
      apiFootballFixtureId: fixtureId,
      optionGroup,
      deadline: new Date(Date.now() - 60_000),
      outcomes: ["Over", "Under"],
    })
    const markets = [
      market("market-corners", "Home vs Away - Total Corners", "corners"),
      market(
        "market-yellow-cards",
        "Home vs Away - Total Yellow Cards",
        "yellow_cards",
      ),
      market("market-offsides", "Home vs Away - Offsides", "offsides"),
    ]
    const marketModel = {
      find: jest.fn().mockResolvedValue(markets),
    }
    const sportsOracleService = {
      requiredStatisticsForMarkets: jest
        .fn()
        .mockReturnValue(["corners", "offsides"]),
      fetchMatchStats: jest
        .fn()
        .mockRejectedValue(new Error("daily quota is exhausted")),
      evaluateProposition: jest.fn(),
    }
    const service = new MarketsKeeperService(
      marketModel as any,
      { resolveMarket: jest.fn() } as any,
      sportsOracleService as any,
      { broadcastToRoom: jest.fn() } as any,
      { resolvePvpMatchesForMarket: jest.fn() } as any,
    )

    await service.processSubjectiveMarkets()

    expect(sportsOracleService.fetchMatchStats).toHaveBeenCalledTimes(1)
    expect(sportsOracleService.fetchMatchStats).toHaveBeenCalledWith(
      markets[0].question,
      markets[0].deadline,
      fixtureId,
      ["corners", "offsides"],
    )
    expect(sportsOracleService.evaluateProposition).not.toHaveBeenCalled()
  })

  it("does not fetch parent fixture containers", async () => {
    const marketModel = {
      find: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => "parent" },
          question: "Home vs Away",
          category: "pvp",
          marketType: "parent",
          apiFootballFixtureId: 1578044,
          deadline: new Date(Date.now() - 60_000),
        },
      ]),
    }
    const sportsOracleService = {
      requiredStatisticsForMarkets: jest.fn(),
      fetchMatchStats: jest.fn(),
      evaluateProposition: jest.fn(),
    }
    const service = new MarketsKeeperService(
      marketModel as any,
      { resolveMarket: jest.fn() } as any,
      sportsOracleService as any,
      { broadcastToRoom: jest.fn() } as any,
      { resolvePvpMatchesForMarket: jest.fn() } as any,
    )

    await service.processSubjectiveMarkets()

    expect(sportsOracleService.fetchMatchStats).not.toHaveBeenCalled()
  })
})
