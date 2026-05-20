import { Module } from "@nestjs/common";
import { AccountsModule } from "./accounts/accounts.module";
import { CategoriesModule } from "./categories/categories.module";
import { CoreModule } from "./core/core.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [CoreModule, AccountsModule, CategoriesModule],
  controllers: [HealthController]
})
export class AppModule {}
