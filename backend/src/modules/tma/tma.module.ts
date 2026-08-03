import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TmaController } from "./tma.controller"
import {
  TmaReferral,
  TmaReferralSchema,
  TmaShareClick,
  TmaShareClickSchema,
  TmaUser,
  TmaUserSchema,
} from "./tma.model"
import { TmaService } from "./tma.service"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TmaUser.name, schema: TmaUserSchema },
      { name: TmaReferral.name, schema: TmaReferralSchema },
      { name: TmaShareClick.name, schema: TmaShareClickSchema },
    ]),
  ],
  controllers: [TmaController],
  providers: [TmaService],
  exports: [TmaService],
})
export class TmaModule {}
