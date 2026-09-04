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
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1/11_LOCAL_DEVELOPER_CANONICAL_BACKEND_PROBE.json",
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
  const headers = {
    apikey: credentials.publishable_key,
    Authorization: `Bearer ${session.access_token}`,
  };
  const manifestResponse = await fetch(`${BACKEND_URL}/runtime-manifest`, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  const manifest = (await manifestResponse.json().catch(() => null)) as Json | null;
  invariant(manifestResponse.ok && manifest, `R568_RUNTIME_MANIFEST_HTTP_${manifestResponse.status}`);
  invariant(manifest.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND", "R568_RUNTIME_ROLE_RED");
  invariant(manifest.authMode === "STRICT_SESSION_INTROSPECTION", "R568_RUNTIME_AUTH_MODE_RED");
  invariant(manifest.capability?.status === "ACTIVE", "R568_RUNTIME_CAPABILITY_RED");
  invariant(Number(manifest.capability?.ttlSeconds ?? 0) >= 60 * 60, "R568_RUNTIME_CAPABILITY_TTL_RED");
  invariant(Number(manifest.activeCompileJobCount ?? -1) === 0, "R568_RUNTIME_ACTIVE_JOBS_RED");
  const expectedTuple: Record<string, string> = {
    definitionReleaseId: String(process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID ?? ""),
    searchReleaseId: String(process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID ?? ""),
    sourceHead: String(process.env.EXPO_PUBLIC_BUILD_COMMIT ?? ""),
    frontendSourceTreeHash: String(process.env.EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH ?? ""),
    frontendProductSourceHash: String(process.env.EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH ?? ""),
    frontendJsBundleFingerprint: String(process.env.EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT ?? ""),
    capabilityId: String(process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID ?? ""),
  };
  for (const [key, expected] of Object.entries(expectedTuple)) {
    if (expected) invariant(String(manifest.compatibilityTuple?.[key] ?? "") === expected, `R568_RUNTIME_TUPLE_${key}_RED`);
  }
  const response = await fetch(
    `${BACKEND_URL}/search/catalog?query=${encodeURIComponent(QUERY)}&pageSize=100`,
    {
      headers,
      signal: AbortSignal.timeout(30_000),
    },
  );
  const payload = (await response.json().catch(() => null)) as Json | null;
  invariant(response.ok, `R551_BACKEND_PROBE_HTTP_${response.status}`);
  invariant(Array.isArray(payload?.items) && payload.items.length > 0, "R551_BACKEND_PROBE_EMPTY");
  invariant(Number(payload?.literalTotalCount) > 0, "R551_BACKEND_PROBE_TOTAL_RED");
  const readyItems = payload.items.filter((item: Json) => item.estimateReady === true);
  invariant(
    readyItems.length > 0,
    `R551_BACKEND_PROBE_NO_SELECTABLE_ESTIMATES:${JSON.stringify(
      payload.items.slice(0, 5).map((item: Json) => ({
        catalogId: String(item.catalogId ?? ""),
        reasons: item.contentAdmission?.reasons ?? [],
      })),
    )}`,
  );

  const receiptBase = {
    schema_version: "rik-expo-app-r568.local-developer-canonical-backend.v1",
    generated_utc: new Date().toISOString(),
    status: "GREEN_LOCAL_DEVELOPER_CANONICAL_BACKEND",
    origin: BACKEND_URL,
    query: QUERY,
    returned_items: payload.items.length,
    ready_items: readyItems.length,
    literal_total: Number(payload.literalTotalCount),
    search_release_id: String(payload.searchIndexReleaseId ?? ""),
    runtime_manifest_schema: String(manifest.schemaVersion ?? ""),
    definition_release_id: String(manifest.compatibilityTuple?.definitionReleaseId ?? ""),
    capability_id: String(manifest.compatibilityTuple?.capabilityId ?? ""),
    capability_status: String(manifest.capability?.status ?? ""),
    capability_ttl_seconds: Number(manifest.capability?.ttlSeconds ?? 0),
    active_compile_jobs: Number(manifest.activeCompileJobCount ?? 0),
    frontend_build_identity: manifest.frontendBuildIdentity,
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
      ready_items: receiptBase.ready_items,
      literal_total: receiptBase.literal_total,
      query: QUERY,
      first_titles: payload.items.slice(0, 5).map((item: Json) => String(item.displayTitleRu ?? item.canonicalTitleRu ?? item.titleRu ?? "")),
      definition_release_id: receiptBase.definition_release_id,
      search_release_id: receiptBase.search_release_id,
      capability_id: receiptBase.capability_id,
      capability_status: receiptBase.capability_status,
      capability_ttl_seconds: receiptBase.capability_ttl_seconds,
      active_compile_jobs: receiptBase.active_compile_jobs,
      credentials_printed: false,
      production_requests: 0,
    })}\n`,
  );
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
