import { Module } from "@nestjs/common";
import { CORE_STORAGE_FETCH_PROVIDER, CoreStorageClient } from "./core-storage.client";
import { CORE_STORAGE_CONFIG, createCoreStorageConfig } from "./core-storage.config";
import { TrustedUserGuard } from "./trusted-user.guard";

@Module({
  providers: [
    TrustedUserGuard,
    CoreStorageClient,
    CORE_STORAGE_FETCH_PROVIDER,
    {
      provide: CORE_STORAGE_CONFIG,
      useFactory: createCoreStorageConfig
    }
  ],
  exports: [TrustedUserGuard, CoreStorageClient]
})
export class CoreModule {}
