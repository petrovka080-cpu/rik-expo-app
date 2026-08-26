import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;

const PROVIDER_URL = "http://127.0.0.1:54321";
const BACKEND_URL = "http://127.0.0.1:8765";
const CREDENTIALS = resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);
const RECEIPT = resolve(
  ".release-runtime/r552/evidence/07_R552_LOCAL_DEVELOPER_CANONICAL_BACKEND.json",
);
const QUERY = process.argv.slice(2).join(" ").trim() || "бетон";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
function atomicJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main() {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER_URL, "R551_BACKEND_PROBE_PROVIDER_RED");
  const director = Array.isArray(credentials.principals)
    ? credentials.principals.find((entry: Json) => entry.role === "director")
    : null;
  invariant(
    director?.email && director?.password && credentials.publishable_key,
    "R551_BACKEND_PROBE_CREDENTIALS_RED",
  );
  const login = await fetch(`${PROVIDER_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: credentials.publishable_key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: director.email, password: director.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const session = (await login.json().catch(() => null)) as Json | null;
  invariant(login.ok && session?.access_token, "R551_BACKEND_PROBE_LOGIN_RED");
  const response = await fetch(
    `${BACKEND_URL}/search/catalog?query=${encodeURIComponent(QUERY)}&pageSize=100`,
    {
      headers: {
        apikey: credentials.publishable_key,
        Authorization: `Bearer ${session.access_token}`,
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  const payload = (await response.json().catch(() => null)) as Json | null;
  invariant(response.ok, `R551_BACKEND_PROBE_HTTP_${response.status}`);
  invariant(Array.isArray(payload?.items) && payload.items.length > 0, "R551_BACKEND_PROBE_EMPTY");
  invariant(Number(payload?.literalTotalCount) > 0, "R551_BACKEND_PROBE_TOTAL_RED");

  const receiptBase = {
    schema_version: "rik-expo-app-r552.local-developer-canonical-backend.v1",
    generated_utc: new Date().toISOString(),
    status: "GREEN_LOCAL_DEVELOPER_CANONICAL_BACKEND",
    origin: BACKEND_URL,
    query: QUERY,
    returned_items: payload.items.length,
    literal_total: Number(payload.literalTotalCount),
    search_release_id: String(payload.searchIndexReleaseId ?? ""),
    real_provider_session: true,
    credentials_printed: false,
    tokens_captured: false,
    production_requests: 0,
  };
  atomicJson(RECEIPT, {
    ...receiptBase,
    payload_sha256: sha256(JSON.stringify(receiptBase)),
  });
  process.stdout.write(
    `${JSON.stringify({
      status: receiptBase.status,
      returned_items: receiptBase.returned_items,
      literal_total: receiptBase.literal_total,
      query: QUERY,
      first_titles: payload.items.slice(0, 5).map((item: Json) => String(item.titleRu ?? "")),
      credentials_printed: false,
      production_requests: 0,
    })}\n`,
  );
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
