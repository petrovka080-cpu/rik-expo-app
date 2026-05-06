import http from "http";

import { createRedisCacheAdapterFromEnv } from "../../src/shared/scale/cacheAdapters";
import {
  createCacheShadowMonitor,
  resolveCacheShadowRuntimeConfig,
} from "../../src/shared/scale/cacheShadowRuntime";
import {
  createRateEnforcementProviderFromEnv,
  createRateLimitPrivateSmokeRunnerFromEnv,
  createRateLimitShadowMonitor,
  type RateLimitPrivateSmokeRunner,
} from "../../src/shared/scale/rateLimitAdapters";
import {
  buildCacheShadowRuntimeState,
  BFF_MUTATION_ROUTE_ALLOWLIST_ENV_NAME,
  handleBffStagingServerRequest,
  parseBffMutationRouteAllowlist,
  type BffStagingCacheShadowDeps,
  type BffStagingCacheShadowRuntimeState,
  type BffStagingRateLimitShadowDeps,
  type BffStagingBoundaryResponse,
  type BffStagingRequestEnvelope,
  type BffMutationRouteScopeConfig,
} from "./stagingBffServerBoundary";
import { createDirectorFinanceRpcReadonlyDbPort } from "./stagingBffDirectorFinanceRpcPort";
import { createBffReadonlyDbReadPorts } from "./stagingBffReadonlyDbPorts";
import { createBffCatalogRequestMutationPortsFromEnv } from "./stagingBffCatalogRequestMutationPorts";
import { createWarehouseApiBffReadonlyDbPort } from "./stagingBffWarehouseApiReadPort";
import { createCatalogTransportBffReadonlyDbPort } from "./stagingBffCatalogTransportReadPort";
import type { BffReadPorts } from "../../src/shared/scale/bffReadPorts";
import type { BffMutationPorts } from "../../src/shared/scale/bffMutationPorts";
import type { DirectorFinanceBffRpcPort } from "../../src/screens/director/director.finance.bff.handler";
import type { WarehouseApiBffReadPort } from "../../src/screens/warehouse/warehouse.api.bff.handler";
import type { CatalogTransportBffReadPort } from "../../src/lib/catalog/catalog.bff.handler";

const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 64 * 1024;
const DEFAULT_MOBILE_AUTH_TIMEOUT_MS = 3_000;

type StagingBffHttpConfig = {
  port: number;
  serverAuthSecretConfigured: boolean;
  mobileReadonlyAuthEnabled: boolean;
  mobileReadonlyAuthConfigured: boolean;
  mutationRoutesEnabled: boolean;
  mutationRoutesGlobalGateEnabled: boolean;
  mutationRouteScope: BffMutationRouteScopeConfig;
  idempotencyMetadataRequired: true;
  rateLimitMetadataRequired: true;
};

type StagingBffHttpEnv = Partial<NodeJS.ProcessEnv>;

type MobileReadonlyAuthVerifier = (token: string, env: StagingBffHttpEnv) => Promise<boolean>;

type StagingBffHttpServerOptions = {
  readPortsFactory?: (env: StagingBffHttpEnv) => BffReadPorts | undefined;
  directorFinanceRpcPortFactory?: (env: StagingBffHttpEnv) => DirectorFinanceBffRpcPort | undefined;
  warehouseApiReadPortFactory?: (env: StagingBffHttpEnv) => WarehouseApiBffReadPort | undefined;
  catalogTransportReadPortFactory?: (env: StagingBffHttpEnv) => CatalogTransportBffReadPort | undefined;
  mutationPortsFactory?: (env: StagingBffHttpEnv) => BffMutationPorts | undefined;
  mobileReadonlyAuthVerifier?: MobileReadonlyAuthVerifier;
  cacheShadow?: BffStagingCacheShadowDeps | null;
  cacheShadowRuntime?: BffStagingCacheShadowRuntimeState | null;
  rateLimitShadow?: BffStagingRateLimitShadowDeps | null;
  rateLimitPrivateSmoke?: RateLimitPrivateSmokeRunner | null;
};

const jsonHeaders = {
  "content-type": "application/json",
  "cache-control": "no-store",
} as const;

const parseBooleanFlag = (value: string | undefined): boolean => value === "true";

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.trunc(parsed);
};

export function resolveBffStagingHttpConfig(env: StagingBffHttpEnv = process.env): StagingBffHttpConfig {
  const parsedPort = Number(env.PORT);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? Math.trunc(parsedPort) : DEFAULT_PORT;
  const mutationFlagEnabled = parseBooleanFlag(env.BFF_MUTATION_ENABLED);
  const idempotencyMetadataEnabled = parseBooleanFlag(env.BFF_IDEMPOTENCY_METADATA_ENABLED);
  const rateLimitMetadataEnabled = parseBooleanFlag(env.BFF_RATE_LIMIT_METADATA_ENABLED);
  const mutationRouteScope = parseBffMutationRouteAllowlist(env[BFF_MUTATION_ROUTE_ALLOWLIST_ENV_NAME]);
  const mutationRoutesGlobalGateEnabled =
    mutationFlagEnabled && idempotencyMetadataEnabled && rateLimitMetadataEnabled;
  const mobileReadonlyAuthEnabled = parseBooleanFlag(env.BFF_READONLY_MOBILE_AUTH_STAGING_ENABLED);
  const mobileReadonlyAuthConfigured =
    mobileReadonlyAuthEnabled &&
    typeof env.STAGING_SUPABASE_URL === "string" &&
    env.STAGING_SUPABASE_URL.length > 0 &&
    typeof env.STAGING_SUPABASE_ANON_KEY === "string" &&
    env.STAGING_SUPABASE_ANON_KEY.length > 0;

  return {
    port,
    serverAuthSecretConfigured: typeof env.BFF_SERVER_AUTH_SECRET === "string" && env.BFF_SERVER_AUTH_SECRET.length > 0,
    mobileReadonlyAuthEnabled,
    mobileReadonlyAuthConfigured,
    mutationRoutesGlobalGateEnabled,
    mutationRouteScope,
    mutationRoutesEnabled:
      mutationRoutesGlobalGateEnabled &&
      mutationRouteScope.status === "enabled" &&
      mutationRouteScope.enabledOperationCount > 0,
    idempotencyMetadataRequired: true,
    rateLimitMetadataRequired: true,
  };
}

const sendJson = (
  response: http.ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): void => {
  response.writeHead(status, { ...jsonHeaders, ...headers });
  response.end(JSON.stringify(body));
};

const sendBoundaryResponse = (
  response: http.ServerResponse,
  boundaryResponse: BffStagingBoundaryResponse,
): void => {
  sendJson(response, boundaryResponse.status, boundaryResponse.body, boundaryResponse.headers);
};

const readJsonBody = (request: http.IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    let totalBytes = 0;
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        reject(new Error("BFF_BODY_TOO_LARGE"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("BFF_INVALID_JSON"));
      }
    });

    request.on("error", () => reject(new Error("BFF_REQUEST_STREAM_ERROR")));
  });

const isApiRoute = (path: string): boolean => path.startsWith("/api/staging-bff/");
const isReadonlyApiRoute = (path: string): boolean => path.startsWith("/api/staging-bff/read/");

const extractBearerToken = (request: http.IncomingMessage): string | null => {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string") return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
};

const hasAcceptedServerAuth = (
  request: http.IncomingMessage,
  env: StagingBffHttpEnv = process.env,
): boolean => {
  const secret = env.BFF_SERVER_AUTH_SECRET;
  if (typeof secret !== "string" || secret.length === 0) return false;
  return extractBearerToken(request) === secret;
};

const isSupabaseUserEnvelope = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { id?: unknown }).id === "string" &&
  (value as { id: string }).id.length > 0;

const verifySupabaseReadonlyMobileAuth: MobileReadonlyAuthVerifier = async (token, env) => {
  const supabaseUrl = env.STAGING_SUPABASE_URL;
  const supabaseAnonKey = env.STAGING_SUPABASE_ANON_KEY;
  if (
    typeof supabaseUrl !== "string" ||
    supabaseUrl.length === 0 ||
    typeof supabaseAnonKey !== "string" ||
    supabaseAnonKey.length === 0
  ) {
    return false;
  }

  let userUrl: URL;
  try {
    userUrl = new URL("/auth/v1/user", supabaseUrl);
  } catch {
    return false;
  }

  const timeout = parsePositiveInteger(env.BFF_READONLY_MOBILE_AUTH_TIMEOUT_MS, DEFAULT_MOBILE_AUTH_TIMEOUT_MS);
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeout);
  try {
    const authResponse = await fetch(userUrl.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        apikey: supabaseAnonKey,
        authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    if (!authResponse.ok) return false;
    const authBody: unknown = await authResponse.json().catch(() => undefined);
    return isSupabaseUserEnvelope(authBody);
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const hasAcceptedReadonlyMobileAuth = async (
  request: http.IncomingMessage,
  env: StagingBffHttpEnv,
  verifier: MobileReadonlyAuthVerifier,
): Promise<boolean> => {
  const token = extractBearerToken(request);
  if (!token) return false;
  return verifier(token, env);
};

export function createBffStagingHttpServer(
  env: StagingBffHttpEnv = process.env,
  options: StagingBffHttpServerOptions = {},
): http.Server {
  const config = resolveBffStagingHttpConfig(env);
  const readPorts = (options.readPortsFactory ?? createBffReadonlyDbReadPorts)(env);
  const directorFinanceRpcPort =
    (options.directorFinanceRpcPortFactory ?? createDirectorFinanceRpcReadonlyDbPort)(env);
  const warehouseApiReadPort =
    (options.warehouseApiReadPortFactory ?? createWarehouseApiBffReadonlyDbPort)(env);
  const catalogTransportReadPort =
    (options.catalogTransportReadPortFactory ?? createCatalogTransportBffReadonlyDbPort)(env);
  const mutationPorts = (options.mutationPortsFactory ?? createBffCatalogRequestMutationPortsFromEnv)(env);
  const mobileReadonlyAuthVerifier = options.mobileReadonlyAuthVerifier ?? verifySupabaseReadonlyMobileAuth;
  const defaultCacheShadowConfig = resolveCacheShadowRuntimeConfig(env);
  const cacheShadow =
    options.cacheShadow === undefined
      ? defaultCacheShadowConfig.enabled
        ? {
            adapter: createRedisCacheAdapterFromEnv(env, { runtimeEnvironment: "production" }),
            config: defaultCacheShadowConfig,
            monitor: createCacheShadowMonitor(),
          }
        : null
      : options.cacheShadow;
  const cacheShadowRuntime =
    options.cacheShadowRuntime === undefined
      ? buildCacheShadowRuntimeState(defaultCacheShadowConfig, cacheShadow?.adapter)
      : options.cacheShadowRuntime;
  const rateLimitShadow =
    options.rateLimitShadow === undefined
      ? {
          provider: createRateEnforcementProviderFromEnv(env),
          monitor: createRateLimitShadowMonitor(),
        }
      : options.rateLimitShadow;
  const rateLimitPrivateSmoke =
    options.rateLimitPrivateSmoke === undefined
      ? createRateLimitPrivateSmokeRunnerFromEnv(env)
      : options.rateLimitPrivateSmoke;

  return http.createServer(async (request, response) => {
    try {
      const method = request.method === "POST" ? "POST" : request.method === "GET" ? "GET" : null;
      if (!method) {
        sendJson(response, 405, {
          ok: false,
          error: {
            code: "BFF_METHOD_NOT_ALLOWED",
            message: "Method not allowed",
          },
        });
        return;
      }

      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const path = url.pathname;

      if (isApiRoute(path) && !config.serverAuthSecretConfigured && !config.mobileReadonlyAuthConfigured) {
        sendJson(response, 503, {
          ok: false,
          error: {
            code: "BFF_AUTH_NOT_CONFIGURED",
            message: "Server auth is not configured",
          },
        });
        return;
      }

      if (isApiRoute(path)) {
        const serverAuthAccepted = hasAcceptedServerAuth(request, env);
        const mobileReadonlyAuthAccepted =
          !serverAuthAccepted &&
          config.mobileReadonlyAuthConfigured &&
          isReadonlyApiRoute(path) &&
          (await hasAcceptedReadonlyMobileAuth(request, env, mobileReadonlyAuthVerifier));

        if (!serverAuthAccepted && !mobileReadonlyAuthAccepted) {
          sendJson(response, 401, {
            ok: false,
            error: {
              code: "BFF_AUTH_REQUIRED",
              message: "Authentication envelope is required",
            },
          });
          return;
        }
      }

      const body = method === "POST" ? await readJsonBody(request) : undefined;
      const boundaryRequest: BffStagingRequestEnvelope = {
        method,
        path,
        body,
        headers: request.headers as Record<string, unknown>,
      };
      const boundaryResponse = await handleBffStagingServerRequest(boundaryRequest, {
        readPorts,
        directorFinanceRpcPort,
        warehouseApiReadPort,
        catalogTransportReadPort,
        mutationPorts,
        cacheShadow,
        cacheShadowRuntime,
        rateLimitShadow,
        rateLimitPrivateSmoke,
        config: {
          mutationRoutesEnabled: config.mutationRoutesEnabled,
          mutationRouteScope: config.mutationRouteScope,
          idempotencyMetadataRequired: config.idempotencyMetadataRequired,
          rateLimitMetadataRequired: config.rateLimitMetadataRequired,
        },
      });
      sendBoundaryResponse(response, boundaryResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "BFF_HTTP_ERROR";
      const status = message === "BFF_BODY_TOO_LARGE" ? 413 : message === "BFF_INVALID_JSON" ? 400 : 500;
      sendJson(response, status, {
        ok: false,
        error: {
          code: message,
          message: status === 500 ? "Server API boundary request failed" : message,
        },
      });
    }
  });
}

export function startBffStagingHttpServer(env: StagingBffHttpEnv = process.env): http.Server {
  const config = resolveBffStagingHttpConfig(env);
  const server = createBffStagingHttpServer(env);
  server.listen(config.port, () => {
    console.info(
      "[staging-bff] listening",
      JSON.stringify({
        port: config.port,
        serverAuthSecretConfigured: config.serverAuthSecretConfigured,
        mobileReadonlyAuthEnabled: config.mobileReadonlyAuthEnabled,
        mobileReadonlyAuthConfigured: config.mobileReadonlyAuthConfigured,
        mutationRoutesEnabled: config.mutationRoutesEnabled,
        mutationRoutesGlobalGateEnabled: config.mutationRoutesGlobalGateEnabled,
        mutationRouteScopeStatus: config.mutationRouteScope.status,
        enabledMutationRoutes: config.mutationRouteScope.enabledOperationCount,
        readPortsConfigured: Boolean(createBffReadonlyDbReadPorts(env)),
        directorFinanceRpcPortConfigured: Boolean(createDirectorFinanceRpcReadonlyDbPort(env)),
        warehouseApiReadPortConfigured: Boolean(createWarehouseApiBffReadonlyDbPort(env)),
        catalogTransportReadPortConfigured: Boolean(createCatalogTransportBffReadonlyDbPort(env)),
        mutationPortsConfigured: Boolean(createBffCatalogRequestMutationPortsFromEnv(env)),
      }),
    );
  });
  return server;
}

if (require.main === module) {
  startBffStagingHttpServer();
}
