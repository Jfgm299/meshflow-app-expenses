import { Module } from "@nestjs/common";
import { CoreModule } from "../core/core.module";
import { CategoriesController } from "./categories.controller";
import { CategoriesRepository } from "./categories.repository";
import { CategoriesService } from "./categories.service";

@Module({
  imports: [CoreModule],
  controllers: [CategoriesController],
  providers: [CategoriesRepository, CategoriesService]
})
export class CategoriesModule {}
