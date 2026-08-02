import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import {
  PrelaunchReferral,
  PrelaunchReferralSchema,
  PrelaunchShareClick,
  PrelaunchShareClickSchema,
  PrelaunchUser,
  PrelaunchUserSchema,
} from "./prelaunch.model"
import { PrelaunchController } from "./prelaunch.controller"
import { PrelaunchService } from "./prelaunch.service"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrelaunchUser.name, schema: PrelaunchUserSchema },
      { name: PrelaunchReferral.name, schema: PrelaunchReferralSchema },
      { name: PrelaunchShareClick.name, schema: PrelaunchShareClickSchema },
    ]),
  ],
  controllers: [PrelaunchController],
  providers: [PrelaunchService],
  exports: [PrelaunchService],
})
export class PrelaunchModule {}
