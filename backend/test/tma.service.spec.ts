import { ConfigService } from "@nestjs/config"
import { Types } from "mongoose"
import { TmaService } from "../src/modules/tma/tma.service"

describe("TmaService duel event processing", () => {
  const mainUserId = new Types.ObjectId()
  const matchId = new Types.ObjectId()

  function makeService(overrides: Record<string, any> = {}) {
    const session = {
      withTransaction: jest.fn(async (work: () => Promise<void>) => work()),
      endSession: jest.fn().mockResolvedValue(undefined),
    }
    const dependencies = {
      tmaUserModel: {
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
        find: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            session: jest.fn().mockResolvedValue([]),
          }),
        }),
      },
      referralModel: {
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
        countDocuments: jest.fn(),
      },
      shareClickModel: {},
      duelEventModel: { create: jest.fn(), exists: jest.fn() },
      mainUserModel: {
        findById: jest.fn(),
        findOne: jest.fn(),
        exists: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      },
      connection: { startSession: jest.fn().mockResolvedValue(session) },
      configService: { get: jest.fn() } as Partial<ConfigService>,
      ...overrides,
    }

    const service = new TmaService(
      dependencies.tmaUserModel as any,
      dependencies.referralModel as any,
      dependencies.shareClickModel as any,
      dependencies.duelEventModel as any,
      dependencies.mainUserModel as any,
      dependencies.connection as any,
      dependencies.configService as ConfigService,
    )

    return { service, session, ...dependencies }
  }

  it("does not record a duel until the main account has a Telegram link", async () => {
    const { service, mainUserModel, connection } = makeService()
    mainUserModel.findById.mockResolvedValue({ telegramId: null })

    await expect(
      service.recordResolvedDuel(mainUserId, matchId),
    ).resolves.toEqual({
      recorded: false,
      reason: "telegram_not_linked",
    })
    expect(connection.startSession).not.toHaveBeenCalled()
  })

  it("links only when the caller proves both account identities", async () => {
    const savedUser = {
      _id: mainUserId,
      telegramId: null as string | null,
      save: jest.fn().mockImplementation(async function (this: any) {
        return this
      }),
    }
    const tmaUser = { telegramId: "99112233" }
    const { service, mainUserModel, tmaUserModel } = makeService()
    jest.spyOn(service as any, "authenticate").mockReturnValue({
      id: "99112233",
      username: "verity_test",
      firstName: null,
      lastName: null,
    })
    mainUserModel.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(savedUser),
    })
    mainUserModel.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    })
    tmaUserModel.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(tmaUser),
    })

    await expect(
      service.linkMainAccount(mainUserId.toString(), "signed-init-data"),
    ).resolves.toEqual({
      linked: true,
      telegramId: "99112233",
      mainUserId: mainUserId.toString(),
      referrals: {
        incomingLinked: false,
        waitingLinked: 0,
      },
    })
    expect(savedUser.telegramId).toBe("99112233")
    expect(savedUser.save).toHaveBeenCalled()
  })

  it("mirrors an incoming Telegram referrer that is already linked", async () => {
    const referrerMainUserId = new Types.ObjectId()
    const savedUser = {
      _id: mainUserId,
      telegramId: null as string | null,
      referredById: null as Types.ObjectId | null,
      save: jest.fn().mockImplementation(async function (this: any) {
        return this
      }),
    }
    const { service, mainUserModel, tmaUserModel } = makeService()
    jest.spyOn(service as any, "authenticate").mockReturnValue({
      id: "99112233",
      username: "referred_user",
      firstName: null,
      lastName: null,
    })
    mainUserModel.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(savedUser),
    })
    mainUserModel.findOne
      .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(null) })
      .mockReturnValueOnce({
        session: jest.fn().mockResolvedValue({ _id: referrerMainUserId }),
      })
    tmaUserModel.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue({
        telegramId: "99112233",
        referredBy: "88776655",
      }),
    })

    await expect(
      service.linkMainAccount(mainUserId.toString(), "signed-init-data"),
    ).resolves.toMatchObject({
      referrals: { incomingLinked: true, waitingLinked: 0 },
    })
    expect(savedUser.referredById).toEqual(referrerMainUserId)
  })

  it("backfills linked invitees when their referrer links later", async () => {
    const savedUser = {
      _id: mainUserId,
      telegramId: null as string | null,
      referredById: null,
      save: jest.fn().mockImplementation(async function (this: any) {
        return this
      }),
    }
    const findSession = jest
      .fn()
      .mockResolvedValue([
        { telegramId: "11223344" },
        { telegramId: "22334455" },
      ])
    const tmaUserModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({ session: findSession }),
      }),
    }
    const { service, mainUserModel } = makeService({ tmaUserModel })
    jest.spyOn(service as any, "authenticate").mockReturnValue({
      id: "88776655",
      username: "referrer",
      firstName: null,
      lastName: null,
    })
    mainUserModel.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(savedUser),
    })
    mainUserModel.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    })
    mainUserModel.updateMany.mockResolvedValue({ modifiedCount: 2 })
    tmaUserModel.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue({
        telegramId: "88776655",
        referredBy: null,
      }),
    })

    await expect(
      service.linkMainAccount(mainUserId.toString(), "signed-init-data"),
    ).resolves.toMatchObject({
      referrals: { incomingLinked: false, waitingLinked: 2 },
    })
    expect(mainUserModel.updateMany).toHaveBeenCalledWith(
      {
        telegramId: { $in: ["11223344", "22334455"] },
        referredById: null,
      },
      { $set: { referredById: mainUserId } },
      expect.objectContaining({ session: expect.any(Object) }),
    )
  })

  it("never overwrites an existing main-account referrer", async () => {
    const existingReferrerId = new Types.ObjectId()
    const savedUser = {
      _id: mainUserId,
      telegramId: null as string | null,
      referredById: existingReferrerId,
      save: jest.fn().mockImplementation(async function (this: any) {
        return this
      }),
    }
    const { service, mainUserModel, tmaUserModel } = makeService()
    jest.spyOn(service as any, "authenticate").mockReturnValue({
      id: "99112233",
      username: "referred_user",
      firstName: null,
      lastName: null,
    })
    mainUserModel.findById.mockReturnValue({
      session: jest.fn().mockResolvedValue(savedUser),
    })
    mainUserModel.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    })
    tmaUserModel.findOne.mockReturnValue({
      session: jest.fn().mockResolvedValue({
        telegramId: "99112233",
        referredBy: "88776655",
      }),
    })

    await service.linkMainAccount(mainUserId.toString(), "signed-init-data")

    expect(savedUser.referredById).toEqual(existingReferrerId)
    expect(mainUserModel.findOne).toHaveBeenCalledTimes(1)
  })

  it("reports linked-account status in every TMA session", async () => {
    const { service, referralModel, mainUserModel } = makeService()
    referralModel.countDocuments
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
    mainUserModel.exists.mockResolvedValue({ _id: mainUserId })

    const session = await (service as any).buildSession({
      telegramId: "99112233",
      username: "verity_test",
      club: "Arsenal FC",
      referredBy: null,
      createdAt: new Date("2026-08-11T00:00:00.000Z"),
    })

    expect(session.user.mainAccountLinked).toBe(true)
  })

  it("treats a repeated match event as a no-op", async () => {
    const duplicate = Object.assign(new Error("duplicate"), { code: 11000 })
    const { service, duelEventModel, mainUserModel, tmaUserModel } =
      makeService()
    mainUserModel.findById.mockResolvedValue({ telegramId: "99112233" })
    duelEventModel.create.mockRejectedValue(duplicate)
    duelEventModel.exists.mockResolvedValue({ _id: new Types.ObjectId() })
    tmaUserModel.findOne.mockResolvedValue({ postLaunchDuels: 1 })

    await expect(
      service.recordResolvedDuel(mainUserId, matchId),
    ).resolves.toMatchObject({
      recorded: false,
      reason: "duplicate_match",
      postLaunchDuels: 1,
    })
    expect(tmaUserModel.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it("atomically allocates a ticket when the second unique duel resolves", async () => {
    const pendingReferral = { _id: new Types.ObjectId() }
    const tmaUserModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest
        .fn()
        .mockResolvedValueOnce({
          telegramId: "99112233",
          postLaunchDuels: 2,
          referredBy: "88776655",
        })
        .mockResolvedValueOnce({
          telegramId: "88776655",
          activatedTicketCount: 1,
        }),
    }
    const referralModel = {
      findOne: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(pendingReferral),
      }),
      findOneAndUpdate: jest.fn().mockResolvedValue({
        ...pendingReferral,
        status: "activated",
      }),
    }
    const { service, mainUserModel } = makeService({
      tmaUserModel,
      referralModel,
    })
    mainUserModel.findById.mockResolvedValue({ telegramId: "99112233" })

    await expect(
      service.recordResolvedDuel(mainUserId, matchId),
    ).resolves.toMatchObject({
      recorded: true,
      postLaunchDuels: 2,
      referralActivated: true,
    })
    expect(referralModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: pendingReferral._id, status: "pending" }),
      expect.objectContaining({
        $set: expect.objectContaining({ ticketSlot: 1, status: "activated" }),
      }),
      expect.objectContaining({ new: true }),
    )
    expect(tmaUserModel.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        telegramId: "88776655",
        $or: expect.arrayContaining([
          expect.objectContaining({
            activatedTicketCount: { $lt: 25 },
          }),
        ]),
      }),
      { $inc: { activatedTicketCount: 1 } },
      expect.objectContaining({ new: true }),
    )
  })

  describe("Telegram channel membership verification", () => {
    const telegramUser = {
      id: "99112233",
      username: "verity_test",
      firstName: null,
      lastName: null,
    }

    function makeChannelService() {
      const user = {
        telegramId: telegramUser.id,
        channelJoined: false,
        save: jest.fn().mockImplementation(async function (this: any) {
          return this
        }),
      }
      const { service, tmaUserModel, referralModel, mainUserModel, configService } =
        makeService()

      jest.spyOn(service as any, "authenticate").mockReturnValue(telegramUser)
      tmaUserModel.findOne.mockResolvedValue(user)
      referralModel.countDocuments.mockResolvedValue(0)
      mainUserModel.exists.mockResolvedValue(false)
      configService.get = jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, string> = {
          TELEGRAM_BOT_TOKEN: "real-bot-token",
          TELEGRAM_CHANNEL_USERNAME: "Veritysports",
          NODE_ENV: "production",
        }
        return (values[key] ?? fallback) as any
      })

      return { service, user }
    }

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it("records a joined member and uses the configured channel", async () => {
      const { service, user } = makeChannelService()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            result: { status: "member" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )

      await service.verifyChannelJoined("signed-init-data")

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "getChatMember?chat_id=%40Veritysports&user_id=99112233",
        ),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
      expect(user.channelJoined).toBe(true)
      expect(user.save).toHaveBeenCalled()
    })

    it("does not accept a restricted member when Telegram says is_member is false", async () => {
      const { service, user } = makeChannelService()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            result: { status: "restricted", is_member: false },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )

      await expect(service.verifyChannelJoined("signed-init-data")).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("@Veritysports"),
      })
      expect(user.save).not.toHaveBeenCalled()
    })

    it("surfaces Telegram configuration or permission failures as unavailable", async () => {
      const { service, user } = makeChannelService()
      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error_code: 400,
            description: "Bad Request: member list is inaccessible",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )

      await expect(service.verifyChannelJoined("signed-init-data")).rejects.toMatchObject({
        status: 503,
        message: "Channel verification is temporarily unavailable. Please try again later.",
      })
      expect(user.save).not.toHaveBeenCalled()
    })
  })
})
