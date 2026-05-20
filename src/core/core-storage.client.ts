import { Inject, Injectable } from "@nestjs/common";
import { CORE_STORAGE_CONFIG, type CoreStorageConfig } from "./core-storage.config";
import type { UserContext } from "./user-context";

export const CORE_STORAGE_FETCH = Symbol("CORE_STORAGE_FETCH");

export interface CoreStorageFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type CoreStorageFetch = (url: URL, init: RequestInit) => Promise<CoreStorageFetchResponse>;

export interface CoreStorageRequestOptions {
  method: string;
  path?: string;
  searchParams?: Record<string, string | undefined>;
  body?: unknown;
}

export interface ScopedStorageCollection {
  request<TResult>(options: CoreStorageRequestOptions): Promise<TResult>;
}

const defaultCoreStorageFetch: CoreStorageFetch = async (url, init) => fetch(url, init);

const normalizeBaseUrl = (baseUrl: string): string => (baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

const normalizePath = (path: string | undefined): string => {
  if (!path) {
    return "";
  }

  return path.startsWith("/") ? path.slice(1) : path;
};

@Injectable()
export class CoreStorageClient {
  constructor(
    @Inject(CORE_STORAGE_CONFIG) private readonly config: CoreStorageConfig,
    @Inject(CORE_STORAGE_FETCH) private readonly fetchFn: CoreStorageFetch = defaultCoreStorageFetch
  ) {}

  collection(collectionName: string, userContext: UserContext): ScopedStorageCollection {
    return {
      request: <TResult>(options: CoreStorageRequestOptions): Promise<TResult> =>
        this.request<TResult>(collectionName, userContext, options)
    };
  }

  async request<TResult>(collectionName: string, userContext: UserContext, options: CoreStorageRequestOptions): Promise<TResult> {
    const url = new URL(`collections/${encodeURIComponent(collectionName)}/${normalizePath(options.path)}`, normalizeBaseUrl(this.config.baseUrl));
    url.searchParams.set("userId", userContext.userId);

    for (const [key, value] of Object.entries(options.searchParams ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }

    const init: RequestInit = {
      method: options.method,
      headers: {
        "content-type": "application/json",
        "x-meshflow-user-id": userContext.userId
      }
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    const response = await this.fetchFn(url, init);

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Core Storage request failed (${response.status} ${response.statusText}): ${message}`);
    }

    return (await response.json()) as TResult;
  }
}

export const CORE_STORAGE_FETCH_PROVIDER = {
  provide: CORE_STORAGE_FETCH,
  useValue: defaultCoreStorageFetch
} as const;
