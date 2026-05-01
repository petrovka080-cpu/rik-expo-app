import http from "http";

import {
  handleBffStagingServerRequest,
  type BffStagingBoundaryResponse,
  type BffStagingRequestEnvelope,
} from "./stagingBffServerBoundary";
import { createBffReadonlyDbReadPorts } from "./stagingBffReadonlyDbPorts";
import type { BffReadPorts } from "../../src/shared/scale/bffReadPorts";

const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 64 * 1024;

type StagingBffHttpConfig = {
  port: number;
  serverAuthSecretConfigured: boolean;
  mutationRoutesEnabled: boolean;
  idempotencyMetadataRequired: true;
  rateLimitMetadataRequired: true;
};

type StagingBffHttpEnv = Partial<NodeJS.ProcessEnv>;

type StagingBffHttpServerOptions = {
  readPortsFactory?: (env: StagingBffHttpEnv) => BffReadPorts | undefined;
};

const jsonHeaders = {
  "content-type": "application/json",
  "cache-control": "no-store",
} as const;

const parseBooleanFlag = (value: string | undefined): boolean => value === "true";

export function resolveBffStagingHttpConfig(env: StagingBffHttpEnv = process.env): StagingBffHttpConfig {
  const parsedPort = Number(env.PORT);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? Math.trunc(parsedPort) : DEFAULT_PORT;
  const mutationFlagEnabled = parseBooleanFlag(env.BFF_MUTATION_ENABLED);
  const idempotencyMetadataEnabled = parseBooleanFlag(env.BFF_IDEMPOTENCY_METADATA_ENABLED);
  const rateLimitMetadataEnabled = parseBooleanFlag(env.BFF_RATE_LIMIT_METADATA_ENABLED);

  return {
    port,
    serverAuthSecretConfigured: typeof env.BFF_SERVER_AUTH_SECRET === "string" && env.BFF_SERVER_AUTH_SECRET.length > 0,
    mutationRoutesEnabled: mutationFlagEnabled && idempotencyMetadataEnabled && rateLimitMetadataEnabled,
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

const hasAcceptedServerAuth = (
  request: http.IncomingMessage,
  env: StagingBffHttpEnv = process.env,
): boolean => {
  const secret = env.BFF_SERVER_AUTH_SECRET;
  if (typeof secret !== "string" || secret.length === 0) return false;
  return request.headers.authorization === `Bearer ${secret}`;
};

export function createBffStagingHttpServer(
  env: StagingBffHttpEnv = process.env,
  options: StagingBffHttpServerOptions = {},
): http.Server {
  const config = resolveBffStagingHttpConfig(env);
  const readPorts = (options.readPortsFactory ?? createBffReadonlyDbReadPorts)(env);

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

      if (isApiRoute(path) && !config.serverAuthSecretConfigured) {
        sendJson(response, 503, {
          ok: false,
          error: {
            code: "BFF_AUTH_NOT_CONFIGURED",
            message: "Server auth is not configured",
          },
        });
        return;
      }

      if (isApiRoute(path) && !hasAcceptedServerAuth(request, env)) {
        sendJson(response, 401, {
          ok: false,
          error: {
            code: "BFF_AUTH_REQUIRED",
            message: "Authentication envelope is required",
          },
        });
        return;
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
        config: {
          mutationRoutesEnabled: config.mutationRoutesEnabled,
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
        mutationRoutesEnabled: config.mutationRoutesEnabled,
        readPortsConfigured: Boolean(createBffReadonlyDbReadPorts(env)),
      }),
    );
  });
  return server;
}

if (require.main === module) {
  startBffStagingHttpServer();
}
