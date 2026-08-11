import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { TmaController } from "./tma.controller"
import {
  TmaDuelEvent,
  TmaDuelEventSchema,
  TmaReferral,
  TmaReferralSchema,
  TmaShareClick,
  TmaShareClickSchema,
  TmaUser,
  TmaUserSchema,
} from "./tma.model"
import { TmaService } from "./tma.service"
import { User, UserSchema } from "../users/users.model"
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: TmaUser.name, schema: TmaUserSchema },
      { name: TmaReferral.name, schema: TmaReferralSchema },
      { name: TmaShareClick.name, schema: TmaShareClickSchema },
      { name: TmaDuelEvent.name, schema: TmaDuelEventSchema },
    ]),
  ],
  controllers: [TmaController],
  providers: [TmaService, JwtAuthGuard],
  exports: [TmaService],
})
export class TmaModule {}
