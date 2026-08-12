import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { InjectConnection, InjectModel } from "@nestjs/mongoose"
import { Connection, Model, Types } from "mongoose"
import {
  TmaDuelEvent,
  TmaDuelEventDocument,
  TmaReferral,
  TmaReferralDocument,
  TmaShareClick,
  TmaShareClickDocument,
  TmaUser,
  TmaUserDocument,
} from "./tma.model"
import { User, UserDocument } from "../users/users.model"
import { getPublicTmaConfig, TMA_CONFIG } from "./tma.config"
import {
  VerifiedTelegramUser,
  verifyTelegramInitData,
} from "./telegram-init-data"

type ShareMethod = "copy" | "share"

@Injectable()
export class TmaService {
  constructor(
    @InjectModel(TmaUser.name)
    private readonly tmaUserModel: Model<TmaUserDocument>,
    @InjectModel(TmaReferral.name)
    private readonly referralModel: Model<TmaReferralDocument>,
    @InjectModel(TmaShareClick.name)
    private readonly shareClickModel: Model<TmaShareClickDocument>,
    @InjectModel(TmaDuelEvent.name)
    private readonly duelEventModel: Model<TmaDuelEventDocument>,
    @InjectModel(User.name)
    private readonly mainUserModel: Model<UserDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  getConfig() {
    return getPublicTmaConfig()
  }

  async openSession(initData: string, referralCode?: string) {
    const telegramUser = this.authenticate(initData)
    const referrerId = this.parseReferralCode(referralCode)

    if (referrerId === telegramUser.id) {
      throw new BadRequestException("You cannot refer your own account.")
    }

    let validReferrerId: string | null = null
    if (referrerId) {
      const referrerExists = await this.tmaUserModel.exists({
        telegramId: referrerId,
      })
      if (referrerExists) validReferrerId = referrerId
    }

    let user = await this.tmaUserModel.findOne({ telegramId: telegramUser.id })
    let created = false

    if (!user) {
      try {
        user = await this.tmaUserModel.create({
          telegramId: telegramUser.id,
          username: telegramUser.username,
          referredBy: validReferrerId,
        })
        created = true
      } catch (error: any) {
        if (error?.code === 11000) {
          user = await this.tmaUserModel.findOne({
            telegramId: telegramUser.id,
          })
        } else {
          throw error
        }
      }
    } else if (
      telegramUser.username &&
      user.username !== telegramUser.username
    ) {
      user.username = telegramUser.username
      await user.save()
    }

    if (!user) {
      throw new ServiceUnavailableException("Could not initialize session.")
    }

    if (created && validReferrerId) {
      try {
        await this.referralModel.create({
          referrerId: validReferrerId,
          referredId: telegramUser.id,
          status: "pending",
        })
      } catch (error: any) {
        if (error?.code !== 11000) throw error
      }
    }

    return this.buildSession(user)
  }

  async linkMainAccount(mainUserId: string, initData: string) {
    const telegramUser = this.authenticate(initData)
    const session = await this.connection.startSession()

    try {
      let linkedUser: UserDocument | null = null
      let incomingReferralLinked = false
      let waitingReferralsLinked = 0

      await session.withTransaction(async () => {
        const [mainUser, tmaUser, existingTelegramOwner] = await Promise.all([
          this.mainUserModel.findById(mainUserId).session(session),
          this.tmaUserModel
            .findOne({ telegramId: telegramUser.id })
            .session(session),
          this.mainUserModel
            .findOne({ telegramId: telegramUser.id })
            .session(session),
        ])

        if (!mainUser) {
          throw new NotFoundException("The Verity account does not exist.")
        }
        if (!tmaUser) {
          throw new NotFoundException(
            "Open the Telegram Mini App before linking your account.",
          )
        }
        if (mainUser.telegramId && mainUser.telegramId !== telegramUser.id) {
          throw new ConflictException(
            "This Verity account is already linked to another Telegram account.",
          )
        }
        if (
          existingTelegramOwner &&
          existingTelegramOwner._id.toString() !== mainUserId
        ) {
          throw new ConflictException(
            "This Telegram account is already linked to another Verity account.",
          )
        }

        if (tmaUser.referredBy && !mainUser.referredById) {
          const referrerMainAccount = await this.mainUserModel
            .findOne({ telegramId: tmaUser.referredBy })
            .session(session)
          if (
            referrerMainAccount &&
            referrerMainAccount._id.toString() !== mainUserId
          ) {
            mainUser.referredById = referrerMainAccount._id
            incomingReferralLinked = true
          }
        }

        mainUser.telegramId = telegramUser.id
        linkedUser = await mainUser.save({ session })

        // Linking order must not matter. If this user referred people before
        // linking their own account, connect any already-linked invitees now.
        const waitingTmaUsers = await this.tmaUserModel
          .find({
            referredBy: telegramUser.id,
            telegramId: { $ne: telegramUser.id },
          })
          .select("telegramId")
          .session(session)
        const waitingTelegramIds = waitingTmaUsers.map(
          (waitingUser) => waitingUser.telegramId,
        )

        if (waitingTelegramIds.length > 0) {
          const updateResult = await this.mainUserModel.updateMany(
            {
              telegramId: { $in: waitingTelegramIds },
              referredById: null,
            },
            { $set: { referredById: mainUser._id } },
            { session },
          )
          waitingReferralsLinked = updateResult.modifiedCount
        }
      })

      return {
        linked: true as const,
        telegramId: telegramUser.id,
        mainUserId: linkedUser!._id.toString(),
        referrals: {
          incomingLinked: incomingReferralLinked,
          waitingLinked: waitingReferralsLinked,
        },
      }
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          "This Telegram account is already linked to another Verity account.",
        )
      }
      throw error
    } finally {
      await session.endSession()
    }
  }

  async selectClub(initData: string, club: string) {
    const telegramUser = this.authenticate(initData)
    const normalizedClub = club.trim()
    const allowed = TMA_CONFIG.PREMIER_LEAGUE_CLUBS.some(
      (entry) => entry.name === normalizedClub,
    )
    if (!allowed) {
      throw new BadRequestException("Select a current Premier League club.")
    }

    const user = await this.tmaUserModel.findOneAndUpdate(
      { telegramId: telegramUser.id },
      { $set: { club: normalizedClub, username: telegramUser.username } },
      { new: true },
    )
    if (!user) {
      throw new NotFoundException("Open the Mini App before selecting a club.")
    }

    return this.buildSession(user)
  }

  async verifyChannelJoined(initData: string) {
    const telegramUser = this.authenticate(initData)
    const user = await this.tmaUserModel.findOne({
      telegramId: telegramUser.id,
    })
    if (!user) {
      throw new NotFoundException("Open the Mini App before joining the channel.")
    }

    const botToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN")
    if (botToken && botToken !== "123456:replace_me") {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@Veritysports&user_id=${telegramUser.id}`,
        )
        const data = await response.json()
        const validStatuses = ["creator", "administrator", "member", "restricted"]
        if (data.ok && validStatuses.includes(data.result?.status)) {
          user.channelJoined = true
          await user.save()
        } else {
          throw new BadRequestException(
            "Please join the @Veritysports channel on Telegram first, then click verify.",
          )
        }
      } catch (error) {
        if (error instanceof BadRequestException) throw error
        // Fallback for network issues in development
        user.channelJoined = true
        await user.save()
      }
    } else {
      // Fallback for development/mock mode without live bot token
      user.channelJoined = true
      await user.save()
    }

    return this.buildSession(user)
  }

  async trackShareClick(initData: string, method: ShareMethod) {
    const telegramUser = this.authenticate(initData)
    const exists = await this.tmaUserModel.exists({
      telegramId: telegramUser.id,
    })
    if (!exists) {
      throw new NotFoundException("Open the Mini App before sharing.")
    }

    await this.shareClickModel.create({
      telegramId: telegramUser.id,
      method,
    })

    return { tracked: true as const, method }
  }

  async getAdminMetrics(adminKey?: string) {
    this.assertAdminKey(adminKey)

    const [
      totalUsers,
      totalRawReferrals,
      totalActivatedReferrals,
      clubStats,
      shareStats,
    ] = await Promise.all([
      this.tmaUserModel.countDocuments(),
      this.referralModel.countDocuments(),
      this.referralModel.countDocuments({ status: "activated" }),
      this.tmaUserModel.aggregate<{ _id: string | null; count: number }>([
        { $group: { _id: "$club", count: { $sum: 1 } } },
      ]),
      this.shareClickModel.aggregate<{ _id: ShareMethod; count: number }>([
        { $group: { _id: "$method", count: { $sum: 1 } } },
      ]),
    ])

    const clubBreakdown = Object.fromEntries(
      TMA_CONFIG.PREMIER_LEAGUE_CLUBS.map((club) => [club.name, 0]),
    )
    let unselectedCount = 0

    for (const stat of clubStats) {
      if (!stat._id) {
        unselectedCount = stat.count
      } else if (stat._id in clubBreakdown) {
        clubBreakdown[stat._id] = stat.count
      }
    }

    const shareClicks = {
      copy: 0,
      share: 0,
    }
    for (const stat of shareStats) {
      if (stat._id === "copy" || stat._id === "share") {
        shareClicks[stat._id] = stat.count
      }
    }

    return {
      totalUsers,
      referrals: {
        raw: totalRawReferrals,
        activated: totalActivatedReferrals,
      },
      shareClicks,
      clubs: {
        unselected: unselectedCount,
        breakdown: clubBreakdown,
      },
    }
  }

  async recordPostLaunchDuel(
    telegramId: string,
    matchId: string,
    internalSecret?: string,
  ) {
    this.assertInternalSecret(internalSecret)
    const mainUser = await this.mainUserModel.findOne({ telegramId })
    if (!mainUser) {
      throw new NotFoundException(
        "Link this Telegram identity to a Verity account before recording duels.",
      )
    }
    return this.recordResolvedDuel(mainUser._id, matchId)
  }

  async recordResolvedDuel(
    mainUserId: Types.ObjectId | string,
    matchId: Types.ObjectId | string,
  ) {
    const normalizedMainUserId = new Types.ObjectId(mainUserId.toString())
    const normalizedMatchId = matchId.toString()
    const mainUser = await this.mainUserModel.findById(normalizedMainUserId)

    if (!mainUser?.telegramId) {
      return {
        recorded: false as const,
        reason: "telegram_not_linked" as const,
      }
    }

    const telegramId = mainUser.telegramId
    const mongoSession = await this.connection.startSession()
    let result:
      | {
          recorded: true
          telegramId: string
          matchId: string
          postLaunchDuels: number
          referralActivated: boolean
        }
      | undefined

    try {
      await mongoSession.withTransaction(async () => {
        await this.duelEventModel.create(
          [
            {
              matchId: normalizedMatchId,
              telegramId,
              mainUserId: normalizedMainUserId,
            },
          ],
          { session: mongoSession },
        )

        const user = await this.tmaUserModel.findOneAndUpdate(
          { telegramId },
          { $inc: { postLaunchDuels: 1 } },
          { new: true, session: mongoSession },
        )

        if (!user) {
          result = {
            recorded: true,
            telegramId,
            matchId: normalizedMatchId,
            postLaunchDuels: 0,
            referralActivated: false,
          }
          return
        }

        let referralActivated = false
        if (user.postLaunchDuels >= 2 && user.referredBy) {
          const pendingReferral = await this.referralModel
            .findOne({
              referredId: telegramId,
              referrerId: user.referredBy,
              status: "pending",
            })
            .session(mongoSession)

          if (pendingReferral) {
            const referrer = await this.tmaUserModel.findOneAndUpdate(
              {
                telegramId: user.referredBy,
                $or: [
                  {
                    activatedTicketCount: {
                      $lt: TMA_CONFIG.MAX_TICKETS_PER_USER,
                    },
                  },
                  { activatedTicketCount: { $exists: false } },
                ],
              },
              { $inc: { activatedTicketCount: 1 } },
              { new: true, session: mongoSession },
            )

            if (!referrer) {
              result = {
                recorded: true,
                telegramId,
                matchId: normalizedMatchId,
                postLaunchDuels: user.postLaunchDuels,
                referralActivated: false,
              }
              return
            }

            const updated = await this.referralModel.findOneAndUpdate(
              {
                _id: pendingReferral._id,
                status: "pending",
              },
              {
                $set: {
                  status: "activated",
                  ticketSlot: referrer.activatedTicketCount,
                  activatedAt: new Date(),
                },
              },
              { new: true, session: mongoSession },
            )
            referralActivated = Boolean(updated)
          }
        }

        result = {
          recorded: true,
          telegramId,
          matchId: normalizedMatchId,
          postLaunchDuels: user.postLaunchDuels,
          referralActivated,
        }
      })

      return result!
    } catch (error: any) {
      if (error?.code === 11000) {
        const existingEvent = await this.duelEventModel.exists({
          matchId: normalizedMatchId,
          telegramId,
        })
        if (existingEvent) {
          const user = await this.tmaUserModel.findOne({ telegramId })
          return {
            recorded: false as const,
            reason: "duplicate_match" as const,
            telegramId,
            matchId: normalizedMatchId,
            postLaunchDuels: user?.postLaunchDuels ?? 0,
            referralActivated: false,
          }
        }
      }
      throw error
    } finally {
      await mongoSession.endSession()
    }
  }

  private authenticate(initData: string): VerifiedTelegramUser {
    const botToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN", "")
    const maxAgeSeconds = Number(
      this.configService.get<string>(
        "TELEGRAM_INIT_DATA_MAX_AGE_SECONDS",
        "86400",
      ),
    )
    return verifyTelegramInitData(initData, botToken, maxAgeSeconds)
  }

  private async buildSession(user: TmaUserDocument) {
    const [rawReferrals, activatedReferrals, linkedMainAccount] =
      await Promise.all([
        this.referralModel.countDocuments({ referrerId: user.telegramId }),
        this.referralModel.countDocuments({
          referrerId: user.telegramId,
          status: "activated",
        }),
        this.mainUserModel.exists({ telegramId: user.telegramId }),
      ])
    const maxTickets = TMA_CONFIG.MAX_TICKETS_PER_USER
    const ticketsEarned = Math.min(activatedReferrals, maxTickets)
    const pendingCapacity = Math.max(0, maxTickets - ticketsEarned)
    const ticketsPending = Math.min(
      Math.max(0, rawReferrals - activatedReferrals),
      pendingCapacity,
    )

    return {
      config: getPublicTmaConfig(),
      user: {
        telegramId: user.telegramId,
        username: user.username,
        club: user.club,
        channelJoined: Boolean(user.channelJoined),
        joinedAt: (user as any).createdAt ?? new Date().toISOString(),
        referredBy: user.referredBy,
        mainAccountLinked: Boolean(linkedMainAccount),
      },
      referrals: {
        rawReferrals,
        activatedReferrals,
        ticketsEarned,
        ticketsPending,
        capProgress: ticketsEarned,
        capPercent: Math.round((ticketsEarned / maxTickets) * 100),
      },
      referralLink: this.buildReferralLink(user.telegramId),
    }
  }

  private parseReferralCode(code?: string): string | null {
    if (!code) return null
    const cleaned = code.trim()
    const match = /^ref_(\d+)$/.exec(cleaned)
    if (match) return match[1]
    if (/^\d+$/.test(cleaned)) return cleaned
    return null
  }

  private buildReferralLink(telegramId: string): string {
    const username = this.configService.get<string>(
      "TELEGRAM_BOT_USERNAME",
      "verity_bot",
    )
    // `startapp` opens the Mini App directly and populates
    // initDataUnsafe.start_param, which is what the client reads. `start` would
    // instead open the bot chat and send /start to a bot that does not exist,
    // leaving the referral unattributed.
    return `https://t.me/${username}?startapp=ref_${telegramId}`
  }

  private assertAdminKey(value?: string) {
    const expected = this.configService.get<string>("TMA_ADMIN_KEY", "")
    if (!expected || value !== expected) {
      throw new ForbiddenException("The TMA admin key is invalid.")
    }
  }

  private assertInternalSecret(value?: string) {
    const expected = this.configService.get<string>("TMA_INTERNAL_SECRET", "")
    if (!expected || value !== expected) {
      throw new ForbiddenException("The TMA service key is invalid.")
    }
  }
}
