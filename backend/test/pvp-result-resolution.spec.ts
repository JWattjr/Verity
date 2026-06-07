import { Types } from "mongoose"
import { PvpService } from "../src/modules/pvp/pvp.service"

describe("PvP result resolution", () => {
  it("awards Result XP and gives first-win boosts only to the referrer", async () => {
    const user1Id = new Types.ObjectId()
    const user2Id = new Types.ObjectId()
    const referrerId = new Types.ObjectId()

    const user1 = {
      _id: user1Id,
      username: "perfect-player",
      referredById: referrerId,
      arenaXp: 0,
      doubleBoostRemaining: 0,
      hasWonFirstPvpDuel: false,
      pvpTicketsSubmittedCount: 0,
      pvpMatchesWonCount: 0,
      pvpMatchesLostCount: 0,
      pvpMatchesDrawnCount: 0,
      save: jest.fn(),
    }
    const user2 = {
      _id: user2Id,
      username: "opponent",
      referredById: null,
      arenaXp: 0,
      doubleBoostRemaining: 0,
      hasWonFirstPvpDuel: false,
      pvpTicketsSubmittedCount: 0,
      pvpMatchesWonCount: 0,
      pvpMatchesLostCount: 0,
      pvpMatchesDrawnCount: 0,
      save: jest.fn(),
    }
    const referrer = {
      _id: referrerId,
      username: "referrer",
      arenaXp: 0,
      doubleBoostRemaining: 0,
      save: jest.fn(),
    }

    const userModel = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2)
        .mockResolvedValueOnce(referrer),
      findByIdAndUpdate: jest.fn(),
    }
    const socketGateway = {
      broadcastToRoom: jest.fn(),
    }
    const notificationsService = {
      createNotification: jest.fn(),
    }
    const service = new PvpService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      userModel as any,
      socketGateway as any,
      notificationsService as any,
      null as any,
      null as any,
    )

    const match = {
      _id: new Types.ObjectId(),
      user1Id,
      user2Id,
      status: "matched",
      winnerId: null,
      resolvedAt: null,
      save: jest.fn(),
    }
    const ticket1 = {
      picks: Array.from({ length: 7 }, () => ({ isCorrect: true })),
      doubleBoostActive: true,
      status: "matched",
      score: 0,
      xpEarned: 0,
      save: jest.fn(),
    }
    const ticket2 = {
      picks: [
        ...Array.from({ length: 3 }, () => ({ isCorrect: true })),
        ...Array.from({ length: 4 }, () => ({ isCorrect: false })),
      ],
      doubleBoostActive: false,
      status: "matched",
      score: 0,
      xpEarned: 0,
      save: jest.fn(),
    }

    await (service as any).resolveMatch(match, ticket1, ticket2)

    expect(ticket1.score).toBe(7)
    expect(ticket1.xpEarned).toBe(144)
    expect(ticket2.score).toBe(3)
    expect(ticket2.xpEarned).toBe(30)
    expect(user1.arenaXp).toBe(144)
    expect(user2.arenaXp).toBe(30)
    expect(user1.doubleBoostRemaining).toBe(0)
    expect(referrer.doubleBoostRemaining).toBe(2)
    expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled()
    expect(match.winnerId).toEqual(user1Id)
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      referrerId.toString(),
      user1Id.toString(),
      "pvp_boost",
      "Referral XP Boosts Awarded!",
      expect.stringContaining("2 Arena XP boosts"),
      user1Id.toString(),
    )
  })

  it("keeps equal scores as a draw and awards 50 Result XP each", async () => {
    const user1Id = new Types.ObjectId()
    const user2Id = new Types.ObjectId()
    const createUser = (_id: Types.ObjectId, username: string) => ({
      _id,
      username,
      referredById: null,
      arenaXp: 0,
      doubleBoostRemaining: 0,
      hasWonFirstPvpDuel: false,
      pvpTicketsSubmittedCount: 0,
      pvpMatchesWonCount: 0,
      pvpMatchesLostCount: 0,
      pvpMatchesDrawnCount: 0,
      save: jest.fn(),
    })
    const user1 = createUser(user1Id, "player-one")
    const user2 = createUser(user2Id, "player-two")
    const service = new PvpService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      {
        findById: jest
          .fn()
          .mockResolvedValueOnce(user1)
          .mockResolvedValueOnce(user2),
      } as any,
      { broadcastToRoom: jest.fn() } as any,
      { createNotification: jest.fn() } as any,
      null as any,
      null as any,
    )
    const match = {
      _id: new Types.ObjectId(),
      user1Id,
      user2Id,
      status: "matched",
      winnerId: user1Id,
      resolvedAt: null,
      save: jest.fn(),
    }
    const createTicket = () => ({
      picks: [
        ...Array.from({ length: 4 }, () => ({ isCorrect: true })),
        ...Array.from({ length: 3 }, () => ({ isCorrect: false })),
      ],
      doubleBoostActive: false,
      status: "matched",
      score: 0,
      xpEarned: 0,
      save: jest.fn(),
    })
    const ticket1 = createTicket()
    const ticket2 = createTicket()

    await (service as any).resolveMatch(match, ticket1, ticket2)

    expect(match.winnerId).toBeNull()
    expect(ticket1.score).toBe(4)
    expect(ticket2.score).toBe(4)
    expect(ticket1.xpEarned).toBe(50)
    expect(ticket2.xpEarned).toBe(50)
    expect(user1.pvpMatchesDrawnCount).toBe(1)
    expect(user2.pvpMatchesDrawnCount).toBe(1)
  })
})
