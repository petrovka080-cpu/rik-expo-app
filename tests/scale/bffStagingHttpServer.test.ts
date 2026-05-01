import http from "http";

import {
  createBffStagingHttpServer,
  resolveBffStagingHttpConfig,
} from "../../scripts/server/stagingBffHttpServer";

const listen = (server: http.Server): Promise<number> =>
  new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) resolve(address.port);
    });
  });

const close = (server: http.Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const requestJson = async (
  port: number,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; authorization?: string } = {},
): Promise<{ status: number; body: unknown; headers: Headers }> => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.authorization ? { authorization: init.authorization } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
};

describe("staging BFF HTTP server wrapper", () => {
  it("resolves Render-safe defaults without enabling mutation routes", () => {
    expect(resolveBffStagingHttpConfig({})).toEqual({
      port: 3000,
      serverAuthSecretConfigured: false,
      mutationRoutesEnabled: false,
      idempotencyMetadataRequired: true,
      rateLimitMetadataRequired: true,
    });
    expect(
      resolveBffStagingHttpConfig({
        PORT: "10000",
        BFF_SERVER_AUTH_SECRET: "secret",
        BFF_MUTATION_ENABLED: "true",
        BFF_IDEMPOTENCY_METADATA_ENABLED: "false",
        BFF_RATE_LIMIT_METADATA_ENABLED: "true",
      }),
    ).toEqual(
      expect.objectContaining({
        port: 10000,
        serverAuthSecretConfigured: true,
        mutationRoutesEnabled: false,
      }),
    );
  });

  it("serves health and readiness without requiring a secret for Render checks", async () => {
    const server = createBffStagingHttpServer({});
    const port = await listen(server);

    try {
      const health = await requestJson(port, "/health");
      expect(health.status).toBe(200);
      expect(health.headers.get("cache-control")).toBe("no-store");
      expect(health.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({ status: "ok", productionTouched: false }),
        }),
      );

      const ready = await requestJson(port, "/ready");
      expect(ready.status).toBe(200);
      expect(ready.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            status: "ready",
            mutationRoutesEnabledByDefault: false,
            appRuntimeBffEnabled: false,
          }),
        }),
      );
    } finally {
      await close(server);
    }
  });

  it("requires server auth for API routes and does not log or return raw credentials", async () => {
    const server = createBffStagingHttpServer({ BFF_SERVER_AUTH_SECRET: "server-secret" });
    const port = await listen(server);

    try {
      const unauthorized = await requestJson(port, "/api/staging-bff/read/request-proposal-list", {
        method: "POST",
        body: { input: { pageSize: 25 } },
      });
      expect(unauthorized.status).toBe(401);
      expect(JSON.stringify(unauthorized.body)).not.toContain("server-secret");

      const noPorts = await requestJson(port, "/api/staging-bff/read/request-proposal-list", {
        method: "POST",
        authorization: "Bearer server-secret",
        body: { input: { pageSize: 25 } },
      });
      expect(noPorts.status).toBe(503);
      expect(noPorts.body).toEqual({
        ok: false,
        error: {
          code: "BFF_READ_PORTS_UNAVAILABLE",
          message: "Read ports are not configured",
        },
      });
    } finally {
      await close(server);
    }
  });

  it("keeps mutation routes disabled unless all safety flags are explicitly enabled", async () => {
    const server = createBffStagingHttpServer({
      BFF_SERVER_AUTH_SECRET: "server-secret",
      BFF_MUTATION_ENABLED: "true",
      BFF_IDEMPOTENCY_METADATA_ENABLED: "true",
      BFF_RATE_LIMIT_METADATA_ENABLED: "false",
    });
    const port = await listen(server);

    try {
      const response = await requestJson(port, "/api/staging-bff/mutation/proposal-submit", {
        method: "POST",
        authorization: "Bearer server-secret",
        body: {
          input: {
            idempotencyKey: "opaque-key",
            payload: { email: "person@example.test", token: "secret-token-value" },
          },
          metadata: {
            idempotencyKeyStatus: "present_redacted",
            rateLimitKeyStatus: "present_redacted",
          },
        },
      });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        ok: false,
        error: {
          code: "BFF_MUTATION_ROUTES_DISABLED",
          message: "Mutation routes are disabled by default",
        },
      });
      expect(JSON.stringify(response.body)).not.toContain("person@example.test");
      expect(JSON.stringify(response.body)).not.toContain("secret-token-value");
    } finally {
      await close(server);
    }
  });
});
