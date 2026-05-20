import { Module } from "@nestjs/common";
import { AccountsModule } from "./accounts/accounts.module";
import { CoreModule } from "./core/core.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [CoreModule, AccountsModule],
  controllers: [HealthController]
})
export class AppModule {}
