import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { MongooseModule } from "@nestjs/mongoose"
import { AgentService } from "./agent.service"
import { SportsOracleService } from "./sports-oracle.service"
import {
  SportsOracleCache,
  SportsOracleCacheSchema,
} from "./sports-oracle-cache.model"

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: SportsOracleCache.name, schema: SportsOracleCacheSchema },
    ]),
  ],
  providers: [AgentService, SportsOracleService],
  exports: [AgentService, SportsOracleService],
})
export class AgentModule {}
