import { Module } from "@nestjs/common";
import { CoreModule } from "../core/core.module";
import { RecurringTransactionsController } from "./recurring-transactions.controller";
import { RecurringTransactionsRepository } from "./recurring-transactions.repository";
import { RecurringTransactionsService } from "./recurring-transactions.service";

@Module({
  imports: [CoreModule],
  controllers: [RecurringTransactionsController],
  providers: [RecurringTransactionsRepository, RecurringTransactionsService]
})
export class RecurringTransactionsModule {}
