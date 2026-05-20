import { Module } from "@nestjs/common";
import { AccountsModule } from "./accounts/accounts.module";
import { CategoriesModule } from "./categories/categories.module";
import { CoreModule } from "./core/core.module";
import { HealthController } from "./health.controller";
import { TransactionsModule } from "./transactions/transactions.module";

@Module({
  imports: [CoreModule, AccountsModule, CategoriesModule, TransactionsModule],
  controllers: [HealthController]
})
export class AppModule {}
