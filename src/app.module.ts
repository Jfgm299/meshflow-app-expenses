import { Module } from "@nestjs/common";
import { AccountsModule } from "./accounts/accounts.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { CategoriesModule } from "./categories/categories.module";
import { CoreModule } from "./core/core.module";
import { HealthController } from "./health.controller";
import { InternalJobsModule } from "./internal-jobs/internal-jobs.module";
import { RecurringTransactionsModule } from "./recurring-transactions/recurring-transactions.module";
import { ScheduledTransactionsModule } from "./scheduled-transactions/scheduled-transactions.module";
import { TransactionsModule } from "./transactions/transactions.module";

@Module({
  imports: [CoreModule, AccountsModule, CategoriesModule, TransactionsModule, RecurringTransactionsModule, ScheduledTransactionsModule, InternalJobsModule, AnalyticsModule],
  controllers: [HealthController]
})
export class AppModule {}
