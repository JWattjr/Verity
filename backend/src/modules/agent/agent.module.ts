import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { AgentService } from "./agent.service"
import { SportsOracleService } from "./sports-oracle.service"

@Module({
  imports: [ConfigModule],
  providers: [AgentService, SportsOracleService],
  exports: [AgentService, SportsOracleService],
})
export class AgentModule {}
