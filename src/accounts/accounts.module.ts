import { Module } from "@nestjs/common";
import { CoreModule } from "../core/core.module";
import { AccountsController } from "./accounts.controller";
import { AccountsRepository } from "./accounts.repository";
import { AccountsService } from "./accounts.service";

@Module({
  imports: [CoreModule],
  controllers: [AccountsController],
  providers: [AccountsRepository, AccountsService]
})
export class AccountsModule {}
