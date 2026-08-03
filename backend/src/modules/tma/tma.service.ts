import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import {
  TmaReferral,
  TmaReferralDocument,
  TmaShareClick,
  TmaShareClickDocument,
  TmaUser,
  TmaUserDocument,
} from "./tma.model"
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
    private readonly userModel: Model<TmaUserDocument>,
    @InjectModel(TmaReferral.name)
    private readonly referralModel: Model<TmaReferralDocument>,
    @InjectModel(TmaShareClick.name)
    private readonly shareClickModel: Model<TmaShareClickDocument>,
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
      const referrerExists = await this.userModel.exists({
        telegramId: referrerId,
      })
      if (referrerExists) validReferrerId = referrerId
    }

    let user = await this.userModel.findOne({ telegramId: telegramUser.id })
    let created = false

    if (!user) {
      try {
        user = await this.userModel.create({
          telegramId: telegramUser.id,
          username: telegramUser.username,
          referredBy: validReferrerId,
        })
        created = true
      } catch (error: any) {
        if (error?.code === 11000) {
          user = await this.userModel.findOne({ telegramId: telegramUser.id })
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

  async selectClub(initData: string, club: string) {
    const telegramUser = this.authenticate(initData)
    const normalizedClub = club.trim()
    const allowed = TMA_CONFIG.PREMIER_LEAGUE_CLUBS.some(
      (entry) => entry.name === normalizedClub,
    )
    if (!allowed) {
      throw new BadRequestException("Select a current Premier League club.")
    }

    const user = await this.userModel.findOneAndUpdate(
      { telegramId: telegramUser.id },
      { $set: { club: normalizedClub, username: telegramUser.username } },
      { new: true },
    )
    if (!user) {
      throw new NotFoundException("Open the Mini App before selecting a club.")
    }

    return this.buildSession(user)
  }

  async trackShareClick(initData: string, method: ShareMethod) {
    const telegramUser = this.authenticate(initData)
    const exists = await this.userModel.exists({ telegramId: telegramUser.id })
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
      this.userModel.countDocuments(),
      this.referralModel.countDocuments(),
      this.referralModel.countDocuments({ status: "activated" }),
      this.userModel.aggregate<{ _id: string | null; count: number }>([
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

  async recordPostLaunchDuel(telegramId: string, internalSecret?: string) {
    this.assertInternalSecret(internalSecret)

    const user = await this.userModel.findOne({ telegramId })
    if (!user) {
      return { telegramId, postLaunchDuels: 0, referralActivated: false }
    }

    user.postLaunchDuels += 1
    await user.save()

    let activated = false

    if (user.postLaunchDuels >= 2 && user.referredBy) {
      const referral = await this.referralModel.findOne({
        referredId: telegramId,
        referrerId: user.referredBy,
      })

      if (referral && referral.status === "pending") {
        const activeCount = await this.referralModel.countDocuments({
          referrerId: user.referredBy,
          status: "activated",
        })

        if (activeCount < TMA_CONFIG.MAX_TICKETS_PER_USER) {
          const nextSlot = activeCount + 1
          const updated = await this.referralModel.findOneAndUpdate(
            {
              _id: referral._id,
              status: "pending",
            },
            {
              $set: {
                status: "activated",
                ticketSlot: nextSlot,
                activatedAt: new Date(),
              },
            },
            { new: true },
          )
          if (updated) activated = true
        }
      }
    }

    return {
      telegramId,
      postLaunchDuels: user.postLaunchDuels,
      referralActivated: activated,
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
    const [rawReferrals, activatedReferrals] = await Promise.all([
      this.referralModel.countDocuments({ referrerId: user.telegramId }),
      this.referralModel.countDocuments({
        referrerId: user.telegramId,
        status: "activated",
      }),
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
        joinedAt: (user as any).createdAt ?? new Date().toISOString(),
        referredBy: user.referredBy,
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
    return `https://t.me/${username}?start=ref_${telegramId}`
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
