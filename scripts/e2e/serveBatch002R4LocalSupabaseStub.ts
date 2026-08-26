import { appendFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";

const PORT = Number(process.env.BATCH002_R4_LOCAL_SUPABASE_PORT ?? 8173);
const AUDIT_LOG = resolve(process.env.BATCH002_R4_LOCAL_SUPABASE_AUDIT_LOG
  ?? ".release-runtime/real-professional-estimates-r4/evidence/05-web/batch002/runtime/local_supabase_audit.jsonl");
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const LOCAL_EMPTY_READ_TABLES = new Set([
  "company_members",
  "user_profiles",
  "companies",
  "market_listings",
]);
const LOCAL_CATALOG_M3_FIXTURE = [{
  id: "batch002-r54-catalog-material-001",
  rik_code: "BATCHMATERIAL-R54-001",
  kind: "material",
  name_human: "Batchmaterial mineral insulation board 50 mm",
  uom_code: "m3",
  tags: ["batch002", "r54", "local-e2e"],
  sector_code: "construction",
}];
const LOCAL_CATALOG_M2_FIXTURE = [{
  id: "batch001-r56-catalog-material-m2-001",
  rik_code: "BATCHMATERIAL-M2-R56-001",
  kind: "material",
  name_human: "Batchmaterial compatible sheet 12.5 mm",
  uom_code: "m2",
  tags: ["batch001", "r56", "local-e2e", "compatible-m2"],
  sector_code: "construction",
}];
const LOCAL_CATALOG_M_FIXTURE = [{
  id: "batch004-r56-catalog-material-m-001",
  rik_code: "BATCHMATERIAL-M-R56-001",
  kind: "material",
  name_human: "Batchmateriallinear compatible framing profile",
  uom_code: "m",
  tags: ["batch004", "r56", "local-e2e", "compatible-m"],
  sector_code: "construction",
}];

const user = {
  id: OWNER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "batch002-r4-local-proof@example.invalid",
  email_confirmed_at: "2026-08-19T00:00:00.000Z",
  phone: "",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-08-19T00:00:00.000Z",
  updated_at: "2026-08-19T00:00:00.000Z",
};

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function localProofSession() {
  const issuedAt = Math.floor(Date.now() / 1_000) - 60;
  const expiresAt = issuedAt + 86_400;
  return {
    access_token: `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({
      aud: "authenticated",
      exp: expiresAt,
      iat: issuedAt,
      sub: OWNER_ID,
      role: "authenticated",
      email: user.email,
    })}.proof`,
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: expiresAt,
    refresh_token: "batch002-r52-local-refresh-disabled",
    user,
  };
}

function send(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info,content-profile,accept-profile,prefer",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(status === 204 ? undefined : JSON.stringify(body));
}

mkdirSync(dirname(AUDIT_LOG), { recursive: true });
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  appendFileSync(AUDIT_LOG, `${JSON.stringify({
    at: new Date().toISOString(),
    method: request.method ?? "GET",
    path: `${url.pathname}${url.search}`,
    authorizationPresent: Boolean(request.headers.authorization),
    apikeyPresent: Boolean(request.headers.apikey),
    remoteAddress: request.socket.remoteAddress ?? null,
  })}\n`, "utf8");
  if (request.method === "OPTIONS") return send(response, 204, null);
  if (request.method === "GET" && url.pathname === "/health") return send(response, 200, { status: "LOCAL_ONLY" });
  if (request.method === "GET" && url.pathname === "/auth/v1/user") return send(response, 200, user);
  if (request.method === "POST" && url.pathname === "/auth/v1/token") return send(response, 200, localProofSession());
  if (request.method === "GET" && url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.slice("/rest/v1/".length);
    if (LOCAL_EMPTY_READ_TABLES.has(table)) return send(response, 200, []);
    if (table === "catalog_items") {
      const query = decodeURIComponent(url.search).toLocaleLowerCase("ru-RU");
      if (query.includes("batchmateriallinear")) return send(response, 200, LOCAL_CATALOG_M_FIXTURE);
      if (query.includes("batchmaterialm2")) return send(response, 200, LOCAL_CATALOG_M2_FIXTURE);
      return send(response, 200, query.includes("batchmaterial") ? LOCAL_CATALOG_M3_FIXTURE : []);
    }
    if (table === "rik_items") return send(response, 200, []);
  }
  if (request.method === "POST" && url.pathname.startsWith("/rest/v1/rpc/rik_quick_")) return send(response, 200, []);
  if (request.method === "POST" && url.pathname === "/rest/v1/rpc/get_my_role") return send(response, 200, "consumer");
  if (request.method === "POST" && url.pathname === "/rest/v1/rpc/ensure_my_profile") return send(response, 200, null);
  return send(response, 404, { error: "LOCAL_SUPABASE_STUB_ROUTE_NOT_ALLOWED", path: url.pathname });
});

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`${JSON.stringify({ status: "READY_LOCAL_ONLY", port: PORT, auditLog: AUDIT_LOG })}\n`);
});
