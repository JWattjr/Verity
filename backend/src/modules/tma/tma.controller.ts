import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger"
import {
  LinkTmaAccountDto,
  OpenTmaSessionDto,
  RecordTmaDuelDto,
  SelectClubDto,
  TrackShareClickDto,
  VerifyChannelDto,
} from "./tma.dto"
import { TmaService } from "./tma.service"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"

@ApiTags("tma")
@Controller("tma")
export class TmaController {
  constructor(private readonly tmaService: TmaService) {}

  @Get("config")
  @ApiOperation({ summary: "Get public Telegram Mini App configuration" })
  getConfig() {
    return this.tmaService.getConfig()
  }

  @Post("session")
  @ApiOperation({
    summary: "Verify Telegram initData and open the TMA session",
  })
  openSession(@Body() dto: OpenTmaSessionDto) {
    return this.tmaService.openSession(dto.initData, dto.referralCode)
  }

  @Post("link-account")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Link a verified Telegram identity to the authenticated account",
  })
  linkAccount(@Body() dto: LinkTmaAccountDto, @Request() req: any) {
    return this.tmaService.linkMainAccount(req.user.id, dto.initData)
  }

  @Patch("club")
  @ApiOperation({ summary: "Store the verified Telegram user's club" })
  selectClub(@Body() dto: SelectClubDto) {
    return this.tmaService.selectClub(dto.initData, dto.club)
  }

  @Post("channel")
  @ApiOperation({ summary: "Verify Telegram channel join membership" })
  verifyChannel(@Body() dto: VerifyChannelDto) {
    return this.tmaService.verifyChannelJoined(dto.initData)
  }

  @Post("share-click")
  @ApiOperation({ summary: "Track a verified referral copy or share action" })
  trackShareClick(@Body() dto: TrackShareClickDto) {
    return this.tmaService.trackShareClick(dto.initData, dto.method)
  }

  @Get("admin")
  @ApiOperation({ summary: "Return TMA acquisition metrics as JSON" })
  getAdminMetrics(@Headers("x-tma-admin-key") adminKey?: string) {
    return this.tmaService.getAdminMetrics(adminKey)
  }

  @Post("internal/duels")
  @ApiOperation({
    summary: "Record a post-launch duel and activate an eligible referral",
  })
  recordDuel(
    @Body() dto: RecordTmaDuelDto,
    @Headers("x-tma-internal-secret") internalSecret?: string,
  ) {
    return this.tmaService.recordPostLaunchDuel(
      dto.telegramId,
      dto.matchId,
      internalSecret,
    )
  }
}
