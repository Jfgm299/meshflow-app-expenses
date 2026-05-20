export interface CoreStorageConfig {
  baseUrl: string;
}

export const CORE_STORAGE_CONFIG = Symbol("CORE_STORAGE_CONFIG");

export const createCoreStorageConfig = (): CoreStorageConfig => ({
  baseUrl: process.env.CORE_STORAGE_API_BASE_URL ?? "http://localhost:4000/storage"
});
