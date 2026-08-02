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
  PrelaunchReferral,
  PrelaunchReferralDocument,
  PrelaunchShareClick,
  PrelaunchShareClickDocument,
  PrelaunchUser,
  PrelaunchUserDocument,
} from "./prelaunch.model"
import { getPublicPrelaunchConfig, PRELAUNCH_CONFIG } from "./prelaunch.config"
import {
  VerifiedTelegramUser,
  verifyTelegramInitData,
} from "./telegram-init-data"

type ShareMethod = "copy" | "share"

@Injectable()
export class PrelaunchService {
  constructor(
    @InjectModel(PrelaunchUser.name)
    private readonly userModel: Model<PrelaunchUserDocument>,
    @InjectModel(PrelaunchReferral.name)
    private readonly referralModel: Model<PrelaunchReferralDocument>,
    @InjectModel(PrelaunchShareClick.name)
    private readonly shareClickModel: Model<PrelaunchShareClickDocument>,
    private readonly configService: ConfigService,
  ) {}

  getConfig() {
    return getPublicPrelaunchConfig()
  }

  async openSession(
    initData: string,
    referralCode?: string,
    devUserHeader?: string,
  ) {
    const telegramUser = this.authenticate(initData, devUserHeader)
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
        if (error?.code !== 11000) throw error
        user = await this.userModel.findOne({ telegramId: telegramUser.id })
      }
    } else if (user.username !== telegramUser.username) {
      user.username = telegramUser.username
      await user.save()
    }

    if (!user) {
      throw new ServiceUnavailableException(
        "Could not create the Telegram pre-launch account.",
      )
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

  async selectClub(initData: string, club: string, devUserHeader?: string) {
    const telegramUser = this.authenticate(initData, devUserHeader)
    const normalizedClub = club.trim()
    const allowed = PRELAUNCH_CONFIG.PREMIER_LEAGUE_CLUBS.some(
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

  async trackShareClick(
    initData: string,
    method: ShareMethod,
    devUserHeader?: string,
  ) {
    const telegramUser = this.authenticate(initData, devUserHeader)
    const exists = await this.userModel.exists({ telegramId: telegramUser.id })
    if (!exists) {
      throw new NotFoundException("Open the Mini App before sharing.")
    }

    await this.shareClickModel.create({
      telegramId: telegramUser.id,
      method,
    })
    return { tracked: true, method }
  }

  async getAdminMetrics(adminKey?: string) {
    this.assertAdminKey(adminKey)

    const [
      totalUsers,
      clubRows,
      rawReferrals,
      activatedReferrals,
      shareClicks,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.aggregate<{ _id: string | null; count: number }>([
        { $group: { _id: "$club", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      this.referralModel.countDocuments(),
      this.referralModel.countDocuments({ status: "activated" }),
      this.shareClickModel.countDocuments(),
    ])

    return {
      totalUsers,
      usersByClub: clubRows.map((row) => ({
        club: row._id ?? "Unselected",
        users: row.count,
      })),
      rawReferrals,
      activatedReferrals,
      shareClicks,
      generatedAt: new Date().toISOString(),
    }
  }

  async recordPostLaunchDuel(telegramId: string, internalSecret?: string) {
    this.assertInternalSecret(internalSecret)

    if (
      new Date() < PRELAUNCH_CONFIG.LAUNCH_AT &&
      this.configService.get<string>("NODE_ENV") === "production"
    ) {
      throw new BadRequestException(
        "Pre-launch duels cannot activate referral tickets.",
      )
    }

    const user = await this.userModel.findOneAndUpdate(
      { telegramId },
      { $inc: { postLaunchDuels: 1 } },
      { new: true },
    )
    if (!user) throw new NotFoundException("Telegram user was not found.")

    let activated = false
    if (user.postLaunchDuels >= 2) {
      activated = await this.activateReferralTicket(telegramId)
    }

    return {
      telegramId,
      postLaunchDuels: user.postLaunchDuels,
      referralActivated: activated,
    }
  }

  private authenticate(
    initData: string,
    devUserHeader?: string,
  ): VerifiedTelegramUser {
    if (this.isDevAuthAllowed() && devUserHeader) {
      try {
        const parsed = JSON.parse(devUserHeader) as {
          id?: string | number
          username?: string
        }
        const id = String(parsed.id ?? "")
        if (!/^\d+$/.test(id)) throw new Error("invalid id")
        return {
          id,
          username: parsed.username?.trim() || "local_player",
          firstName: null,
          lastName: null,
        }
      } catch {
        throw new UnauthorizedException(
          "The local Telegram test identity is invalid.",
        )
      }
    }

    const botToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN", "")
    const maxAgeSeconds = Number(
      this.configService.get<string>(
        "TELEGRAM_INIT_DATA_MAX_AGE_SECONDS",
        "86400",
      ),
    )
    return verifyTelegramInitData(initData, botToken, maxAgeSeconds)
  }

  private async buildSession(user: PrelaunchUserDocument) {
    const [rawReferrals, activatedReferrals] = await Promise.all([
      this.referralModel.countDocuments({ referrerId: user.telegramId }),
      this.referralModel.countDocuments({
        referrerId: user.telegramId,
        status: "activated",
      }),
    ])
    const maxTickets = PRELAUNCH_CONFIG.MAX_TICKETS_PER_USER
    const ticketsEarned = Math.min(activatedReferrals, maxTickets)
    const pendingCapacity = Math.max(0, maxTickets - ticketsEarned)
    const ticketsPending = Math.min(
      Math.max(0, rawReferrals - activatedReferrals),
      pendingCapacity,
    )

    return {
      config: getPublicPrelaunchConfig(),
      user: {
        telegramId: user.telegramId,
        username: user.username,
        club: user.club,
        joinedAt: user.joinedAt.toISOString(),
        referredBy: user.referredBy,
      },
      referrals: {
        rawReferrals,
        activatedReferrals,
        ticketsEarned,
        ticketsPending,
        capProgress: Math.min(rawReferrals, maxTickets),
        capPercent: Math.min(
          100,
          Math.round((rawReferrals / maxTickets) * 100),
        ),
      },
      referralLink: this.createReferralLink(user.telegramId),
    }
  }

  private createReferralLink(telegramId: string) {
    const configured = this.configService
      .get<string>("TELEGRAM_BOT_USERNAME", "")
      .trim()
      .replace(/^@/, "")
    const botUsername = configured || "verity_local_bot"
    return `https://t.me/${botUsername}?start=ref_${telegramId}`
  }

  private parseReferralCode(referralCode?: string) {
    if (!referralCode) return null
    const match = /^ref_(\d+)$/.exec(referralCode.trim())
    return match?.[1] ?? null
  }

  private async activateReferralTicket(referredId: string) {
    const referral = await this.referralModel.findOne({
      referredId,
      status: "pending",
    })
    if (!referral) return false

    for (
      let slot = 1;
      slot <= PRELAUNCH_CONFIG.MAX_TICKETS_PER_USER;
      slot += 1
    ) {
      try {
        const activated = await this.referralModel.findOneAndUpdate(
          { _id: referral._id, status: "pending" },
          {
            $set: {
              status: "activated",
              activatedAt: new Date(),
              ticketSlot: slot,
            },
          },
          { new: true },
        )
        if (activated) return true
        return false
      } catch (error: any) {
        if (error?.code !== 11000) throw error
      }
    }

    return false
  }

  private isDevAuthAllowed() {
    return (
      this.configService.get<string>("NODE_ENV") !== "production" &&
      this.configService.get<string>("ALLOW_TELEGRAM_DEV_AUTH", "false") ===
        "true"
    )
  }

  private assertAdminKey(value?: string) {
    const expected = this.configService.get<string>("PRELAUNCH_ADMIN_KEY", "")
    if (!expected || value !== expected) {
      throw new ForbiddenException("The pre-launch admin key is invalid.")
    }
  }

  private assertInternalSecret(value?: string) {
    const expected = this.configService.get<string>(
      "PRELAUNCH_INTERNAL_SECRET",
      "",
    )
    if (!expected || value !== expected) {
      throw new ForbiddenException("The pre-launch service key is invalid.")
    }
  }
}
