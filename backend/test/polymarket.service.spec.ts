import { BadRequestException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Test, TestingModule } from "@nestjs/testing"
import { PolymarketClient } from "../src/modules/polymarket/polymarket.client"
import { PolymarketService } from "../src/modules/polymarket/polymarket.service"

describe("PolymarketService", () => {
  let service: PolymarketService
  let client: { get: jest.Mock }

  beforeEach(async () => {
    client = { get: jest.fn() }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolymarketService,
        { provide: PolymarketClient, useValue: client },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined),
          },
        },
      ],
    }).compile()

    service = module.get(PolymarketService)
  })

  it("normalizes sports metadata and chooses a league-specific primary tag", async () => {
    client.get.mockResolvedValue([
      {
        id: 2,
        sport: "epl",
        name: "Premier League",
        image: "https://example.com/epl.png",
        resolution: "https://example.com/results",
        ordering: "home",
        tags: "1,82,306",
        primaryTagId: 306,
        series: "12",
      },
    ])

    await expect(service.listSports()).resolves.toEqual([
      {
        id: "2",
        sport: "epl",
        name: "Premier League",
        image: "https://example.com/epl.png",
        resolutionSource: "https://example.com/results",
        ordering: "home",
        tagIds: ["1", "82", "306"],
        primaryTagId: "306",
        seriesId: "12",
      },
    ])
  })

  it("uses a sport tag, keyset cursor, and normalizes market outcomes", async () => {
    client.get
      .mockResolvedValueOnce([{ sport: "epl", tags: "1,82" }])
      .mockResolvedValueOnce({
        events: [
          {
            id: "event-1",
            slug: "ars-che-2026-08-15",
            title: "Arsenal vs Chelsea",
            image: "https://example.com/ars-che.png",
            description: "Premier League fixture",
            gameId: 901,
            startDate: "2026-08-15T15:00:00Z",
            restricted: true,
            negRisk: true,
            liquidity: 1200.5,
            volume: "9821.25",
            openInterest: 450,
            tags: [{ id: 82, label: "Premier League", slug: "epl" }],
            markets: [
              {
                id: "market-1",
                question: "Will Arsenal win?",
                conditionId: "0xabc",
                outcomes: '["Yes","No"]',
                outcomePrices: '["0.62","0.38"]',
                clobTokenIds: '["token-yes","token-no"]',
                sportsMarketType: "moneyline",
                image: "https://example.com/arsenal.png",
                description: "Resolves to Yes if Arsenal wins.",
                groupItemTitle: "Arsenal",
                active: true,
                closed: false,
                acceptingOrders: true,
                orderPriceMinTickSize: 0.01,
                orderMinSize: 5,
                bestBid: 0.61,
                bestAsk: "0.63",
                lastTradePrice: 0.62,
                spread: 0.02,
                liquidity: "400.75",
                volume: 2100,
                feeType: "sports_fees_v2",
                feeSchedule: {
                  exponent: 1,
                  rate: 0.05,
                  takerOnly: true,
                  rebateRate: 0.15,
                },
              },
            ],
          },
        ],
        next_cursor: "next-page",
      })

    const page = await service.listSportsEvents({
      sport: "EPL",
      cursor: "current-page",
      limit: 20,
    })

    const eventCall = client.get.mock.calls[1] as unknown as [
      string,
      URLSearchParams,
    ]
    const query = eventCall[1]
    expect(eventCall[0]).toBe("/events/keyset")
    expect(query.get("tag_id")).toBe("82")
    expect(query.get("after_cursor")).toBe("current-page")
    expect(page.hasMore).toBe(true)
    expect(page.nextCursor).toBe("next-page")
    expect(page.items[0].gameId).toBe("901")
    expect(page.items[0]).toMatchObject({
      image: "https://example.com/ars-che.png",
      description: "Premier League fixture",
      restricted: true,
      negativeRisk: true,
      liquidity: "1200.5",
      volume: "9821.25",
      openInterest: "450",
      tags: [{ id: "82", label: "Premier League", slug: "epl" }],
    })
    expect(page.items[0].markets[0].outcomes).toEqual([
      { label: "Yes", price: "0.62", tokenId: "token-yes" },
      { label: "No", price: "0.38", tokenId: "token-no" },
    ])
    expect(page.items[0].markets[0].minimumTickSize).toBe("0.01")
    expect(page.items[0].markets[0].minimumOrderSize).toBe("5")
    expect(page.items[0].markets[0]).toMatchObject({
      image: "https://example.com/arsenal.png",
      description: "Resolves to Yes if Arsenal wins.",
      groupItemTitle: "Arsenal",
      bestBid: "0.61",
      bestAsk: "0.63",
      lastTradePrice: "0.62",
      spread: "0.02",
      liquidity: "400.75",
      volume: "2100",
      feeType: "sports_fees_v2",
      feeSchedule: {
        exponent: "1",
        rate: "0.05",
        takerOnly: true,
        rebateRate: "0.15",
      },
    })
  })

  it("filters event markets by sports market type without sending an unsupported query", async () => {
    client.get.mockResolvedValue({
      events: [
        {
          id: "event-1",
          markets: [
            {
              id: "moneyline",
              sportsMarketType: "moneyline",
              active: true,
              closed: false,
              acceptingOrders: true,
            },
            {
              id: "spread",
              sportsMarketType: "spreads",
              active: true,
              closed: false,
              acceptingOrders: true,
            },
          ],
        },
      ],
      next_cursor: null,
    })

    const page = await service.listSportsEvents({
      tagId: "82",
      marketType: "spreads",
      limit: 10,
    })

    const eventCall = client.get.mock.calls[0] as unknown as [
      string,
      URLSearchParams,
    ]
    const query = eventCall[1]
    expect(query.has("sports_market_types")).toBe(false)
    expect(page.items[0].markets.map((market) => market.id)).toEqual(["spread"])
  })

  it("excludes closed or non-order-accepting markets and empty events", async () => {
    client.get.mockResolvedValue({
      events: [
        {
          id: "tradable-event",
          markets: [
            {
              id: "tradable",
              active: true,
              closed: false,
              acceptingOrders: true,
            },
            {
              id: "closed",
              active: true,
              closed: true,
              acceptingOrders: false,
            },
          ],
        },
        {
          id: "empty-event",
          markets: [
            {
              id: "paused",
              active: true,
              closed: false,
              acceptingOrders: false,
            },
          ],
        },
      ],
      next_cursor: null,
    })

    const page = await service.listSportsEvents({ tagId: "82", limit: 10 })

    expect(page.items).toHaveLength(1)
    expect(page.items[0].id).toBe("tradable-event")
    expect(page.items[0].markets.map((market) => market.id)).toEqual([
      "tradable",
    ])
  })

  it("rejects an unknown sport before querying events", async () => {
    client.get.mockResolvedValue([{ sport: "nba", tags: "1,745" }])

    await expect(
      service.listSportsEvents({ sport: "quidditch", limit: 20 }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(client.get).toHaveBeenCalledTimes(1)
  })

  it("requires a sports filter so the endpoint cannot return non-sports events", async () => {
    await expect(
      service.listSportsEvents({ limit: 20 }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(client.get).not.toHaveBeenCalled()
  })

  it("caches public metadata for the configured TTL", async () => {
    client.get.mockResolvedValue([{ sport: "nba", tags: "1,745" }])

    await service.listSports()
    await service.listSports()

    expect(client.get).toHaveBeenCalledTimes(1)
  })
})
