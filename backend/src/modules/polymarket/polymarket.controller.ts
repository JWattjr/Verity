import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common"
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"
import { ListPolymarketEventsDto } from "./polymarket.dto"
import { PolymarketAccountService } from "./polymarket-account.service"
import { PolymarketFundingService } from "./polymarket-funding.service"
import { PolymarketService } from "./polymarket.service"

@ApiTags("polymarket")
@Controller("polymarket")
export class PolymarketController {
  constructor(
    private readonly polymarketService: PolymarketService,
    private readonly accountService: PolymarketAccountService,
    private readonly fundingService: PolymarketFundingService,
  ) {}

  @Get("account")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current user's Polymarket account status" })
  getAccount(@Request() request: { user: { id: string } }) {
    return this.accountService.getAccount(request.user.id)
  }

  @Post("account/provision")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Idempotently provision the current user's Polygon trading account",
  })
  provisionAccount(@Request() request: { user: { id: string } }) {
    return this.accountService.provision(request.user.id)
  }

  @Post("account/funding/address")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create or return the current user's bridge deposit addresses",
  })
  getOrCreateFundingAddress(@Request() request: { user: { id: string } }) {
    return this.fundingService.getOrCreateDepositAddresses(request.user.id)
  }

  @Get("account/funding")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Reconcile bridge transactions and the current pUSD balance",
  })
  reconcileFunding(@Request() request: { user: { id: string } }) {
    return this.fundingService.reconcile(request.user.id)
  }

  @Get("sports")
  @ApiOperation({ summary: "List sports supported by Polymarket" })
  listSports() {
    return this.polymarketService.listSports()
  }

  @Get("sports/market-types")
  @ApiOperation({ summary: "List valid Polymarket sports market types" })
  listSportsMarketTypes() {
    return this.polymarketService.listSportsMarketTypes()
  }

  @Get("events")
  @ApiOperation({ summary: "List active Polymarket sports events" })
  @ApiQuery({ name: "sport", required: false, example: "epl" })
  @ApiQuery({ name: "tagId", required: false, example: "82" })
  @ApiQuery({ name: "marketType", required: false, example: "moneyline" })
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  listEvents(@Query() query: ListPolymarketEventsDto) {
    return this.polymarketService.listSportsEvents(query)
  }
}
