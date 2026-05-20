import { Module } from "@nestjs/common";
import { CoreModule } from "../core/core.module";
import { RecurringTransactionsRepository } from "../recurring-transactions/recurring-transactions.repository";
import { ScheduledTransactionsRepository } from "../scheduled-transactions/scheduled-transactions.repository";
import { TransactionsRepository } from "../transactions/transactions.repository";
import { DueProcessingService } from "./due-processing.service";
import { InternalJobsController } from "./internal-jobs.controller";

@Module({
  imports: [CoreModule],
  controllers: [InternalJobsController],
  providers: [DueProcessingService, RecurringTransactionsRepository, ScheduledTransactionsRepository, TransactionsRepository]
})
export class InternalJobsModule {}
