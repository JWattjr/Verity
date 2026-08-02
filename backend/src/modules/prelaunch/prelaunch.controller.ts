import { Body, Controller, Get, Headers, Patch, Post } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import {
  OpenPrelaunchSessionDto,
  RecordPrelaunchDuelDto,
  SelectClubDto,
  TrackShareClickDto,
} from "./prelaunch.dto"
import { PrelaunchService } from "./prelaunch.service"

@ApiTags("prelaunch")
@Controller("prelaunch")
export class PrelaunchController {
  constructor(private readonly prelaunchService: PrelaunchService) {}

  @Get("config")
  @ApiOperation({ summary: "Get public Telegram pre-launch configuration" })
  getConfig() {
    return this.prelaunchService.getConfig()
  }

  @Post("session")
  @ApiOperation({
    summary: "Verify Telegram initData and open the pre-launch session",
  })
  openSession(
    @Body() dto: OpenPrelaunchSessionDto,
    @Headers("x-telegram-dev-user") devUserHeader?: string,
  ) {
    return this.prelaunchService.openSession(
      dto.initData,
      dto.referralCode,
      devUserHeader,
    )
  }

  @Patch("club")
  @ApiOperation({ summary: "Store the verified Telegram user's club" })
  selectClub(
    @Body() dto: SelectClubDto,
    @Headers("x-telegram-dev-user") devUserHeader?: string,
  ) {
    return this.prelaunchService.selectClub(
      dto.initData,
      dto.club,
      devUserHeader,
    )
  }

  @Post("share-click")
  @ApiOperation({ summary: "Track a verified referral copy or share action" })
  trackShareClick(
    @Body() dto: TrackShareClickDto,
    @Headers("x-telegram-dev-user") devUserHeader?: string,
  ) {
    return this.prelaunchService.trackShareClick(
      dto.initData,
      dto.method,
      devUserHeader,
    )
  }

  @Get("admin")
  @ApiOperation({ summary: "Return pre-launch acquisition metrics as JSON" })
  getAdminMetrics(@Headers("x-prelaunch-admin-key") adminKey?: string) {
    return this.prelaunchService.getAdminMetrics(adminKey)
  }

  @Post("internal/duels")
  @ApiOperation({
    summary: "Record a post-launch duel and activate an eligible referral",
  })
  recordDuel(
    @Body() dto: RecordPrelaunchDuelDto,
    @Headers("x-prelaunch-internal-secret") internalSecret?: string,
  ) {
    return this.prelaunchService.recordPostLaunchDuel(
      dto.telegramId,
      internalSecret,
    )
  }
}
