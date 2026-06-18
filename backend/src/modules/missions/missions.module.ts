import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { User, UserSchema } from "../users/users.model"
import { Mission, MissionSchema } from "./missions.model"
import { MissionsService } from "./missions.service"
import { MissionsController } from "./missions.controller"

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Mission.name, schema: MissionSchema },
    ]),
  ],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
