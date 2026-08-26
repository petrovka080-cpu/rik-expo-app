import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";

type Json = Record<string, any>;

const HOST = "127.0.0.1";
const PORT = 54_329;
const CREDENTIALS = resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8081",
  "http://127.0.0.1:8081",
]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function send(
  response: ServerResponse,
  status: number,
  body: Record<string, unknown>,
  origin?: string | null,
) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<Json> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const value = Buffer.from(chunk);
    bytes += value.length;
    invariant(bytes <= 4_096, "LOCAL_DEVELOPER_BROKER_BODY_TOO_LARGE");
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Json;
}

function loadCredentials() {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.environment === "local_developer", "BROKER_ENVIRONMENT_RED");
  const provider = new URL(String(credentials.provider_url ?? ""));
  invariant(
    provider.protocol === "http:" &&
      ["127.0.0.1", "localhost", "::1"].includes(provider.hostname) &&
      provider.port === "54321",
    "BROKER_PROVIDER_NOT_LOOPBACK",
  );
  invariant(
    /^sb_publishable_[A-Za-z0-9_-]+$/u.test(String(credentials.publishable_key ?? "")),
    "BROKER_PUBLISHABLE_KEY_RED",
  );
  invariant(Array.isArray(credentials.principals), "BROKER_PRINCIPALS_RED");
  return credentials;
}

const credentials = loadCredentials();
const roles = credentials.principals.map((principal: Json) => String(principal.role));
const credentialFingerprint = createHash("sha256")
  .update(readFileSync(CREDENTIALS))
  .digest("hex")
  .slice(0, 12);

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
  const origin = typeof request.headers.origin === "string" ? request.headers.origin : null;

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    send(response, 200, {
      status: "ready",
      environment: "local_developer",
      principal_count: roles.length,
      credential_fingerprint: credentialFingerprint,
    });
    return;
  }

  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      send(response, 403, { error: "origin_forbidden" });
      return;
    }
    response.statusCode = 204;
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Max-Age", "300");
    response.setHeader("Vary", "Origin");
    response.end();
    return;
  }

  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    send(response, 403, { error: "origin_forbidden" });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/roles") {
    send(response, 200, { roles }, origin);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/session") {
    try {
      const body = await readJson(request);
      const role = String(body.role ?? "").trim().toLowerCase();
      const principal = credentials.principals.find(
        (candidate: Json) => candidate.role === role,
      );
      if (!principal) {
        send(response, 400, { error: "role_not_allowed" }, origin);
        return;
      }
      const login = await fetch(
        `${credentials.provider_url}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            apikey: credentials.publishable_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: principal.email,
            password: principal.password,
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      const payload = (await login.json().catch(() => ({}))) as Json;
      if (!login.ok || !payload.access_token || !payload.refresh_token) {
        send(response, 502, { error: "provider_login_failed" }, origin);
        return;
      }
      send(
        response,
        200,
        {
          role,
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
          expires_in: payload.expires_in,
          token_type: payload.token_type,
        },
        origin,
      );
    } catch {
      send(response, 400, { error: "session_request_invalid" }, origin);
    }
    return;
  }

  send(response, 404, { error: "not_found" }, origin);
});

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `${JSON.stringify({
      status: "LOCAL_DEVELOPER_AUTH_BROKER_READY",
      host: HOST,
      port: PORT,
      principal_count: roles.length,
      credential_fingerprint: credentialFingerprint,
      credentials_printed: false,
    })}\n`,
  );
});

const close = () => server.close(() => process.exit(0));
process.once("SIGINT", close);
process.once("SIGTERM", close);
