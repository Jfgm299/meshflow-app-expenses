import { Module } from "@nestjs/common";
import { CoreModule } from "../core/core.module";
import { ScheduledTransactionsController } from "./scheduled-transactions.controller";
import { ScheduledTransactionsRepository } from "./scheduled-transactions.repository";
import { ScheduledTransactionsService } from "./scheduled-transactions.service";

@Module({
  imports: [CoreModule],
  controllers: [ScheduledTransactionsController],
  providers: [ScheduledTransactionsRepository, ScheduledTransactionsService]
})
export class ScheduledTransactionsModule {}
