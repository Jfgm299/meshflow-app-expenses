import { Module } from "@nestjs/common";
import { AccountsRepository } from "../accounts/accounts.repository";
import { CoreModule } from "../core/core.module";
import { RecurringTransactionsRepository } from "../recurring-transactions/recurring-transactions.repository";
import { ScheduledTransactionsRepository } from "../scheduled-transactions/scheduled-transactions.repository";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

@Module({
  imports: [CoreModule],
  controllers: [AnalyticsController],
  providers: [AccountsRepository, TransactionsRepository, RecurringTransactionsRepository, ScheduledTransactionsRepository, AnalyticsService]
})
export class AnalyticsModule {}
