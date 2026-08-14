import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { User, UserSchema } from "../users/users.model"
import { PolymarketClient } from "./polymarket.client"
import {
  PolymarketAccount,
  PolymarketAccountSchema,
} from "./polymarket-account.model"
import { PolymarketAccountRepository } from "./polymarket-account.repository"
import { PolymarketAccountService } from "./polymarket-account.service"
import { PolymarketCredentialCipher } from "./polymarket-credential-cipher.service"
import { PolymarketController } from "./polymarket.controller"
import { PolymarketFundingGateway } from "./polymarket-funding.gateway"
import { PolymarketFundingService } from "./polymarket-funding.service"
import { PolymarketProvisioningGateway } from "./polymarket-provisioning.gateway"
import { PolymarketService } from "./polymarket.service"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PolymarketAccount.name, schema: PolymarketAccountSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PolymarketController],
  providers: [
    PolymarketClient,
    PolymarketService,
    PolymarketAccountRepository,
    PolymarketAccountService,
    PolymarketCredentialCipher,
    PolymarketProvisioningGateway,
    PolymarketFundingGateway,
    PolymarketFundingService,
  ],
  exports: [
    PolymarketClient,
    PolymarketService,
    PolymarketAccountService,
    PolymarketFundingService,
  ],
})
export class PolymarketModule {}
