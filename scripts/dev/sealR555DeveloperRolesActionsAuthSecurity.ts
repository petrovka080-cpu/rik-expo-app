import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;

const MASTER_SHA256 =
  "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const SOURCE = resolve("scripts/dev/sealR555DeveloperRolesActionsAuthSecurity.ts");
const OUTPUT = resolve(
  ".release-runtime/r555/evidence/24B_R555_DEVELOPER_ROLES_SCREENS_ACTIONS_AUTH_SECURITY_SEAL.json",
);
const RECEIPTS = {
  principals: resolve(".release-runtime/r555/evidence/23D_R555_LOCAL_DEVELOPER_PRINCIPALS.json"),
  roles: resolve(".release-runtime/r555/evidence/23A_R555_LOCAL_DEVELOPER_ROLE_MATRIX.json"),
  routes: resolve(".release-runtime/r555/evidence/23B_R555_LOCAL_DEVELOPER_ROUTE_MANIFEST.json"),
  security: resolve(".release-runtime/r555/evidence/23E_R555_AUTH_RBAC_SECURITY_MATRIX.json"),
  normal_soak: resolve(".release-runtime/r555/evidence/23F_R555_AUTH_NORMAL_TTL_SOAK_10_MINUTES.json"),
  short_race: resolve(".release-runtime/r555/evidence/23G_R555_AUTH_SHORT_TTL_COMPILE_RACE.json"),
  action_inventory: resolve(".release-runtime/r555/evidence/24A_R555_INTERACTIVE_ACTION_MANIFEST.json"),
  action_manifest: resolve(".release-runtime/r555/manifests/INTERACTIVE_ACTION_MANIFEST.json"),
} as const;
const PRODUCT_SOURCES = {
  supabase_client: resolve("src/lib/supabaseClient.ts"),
  root_auth_lifecycle: resolve("src/lib/auth/useAuthLifecycle.ts"),
  local_review_banner: resolve("src/components/auth/LocalDeveloperReviewBanner.tsx"),
  root_layout: resolve("app/_layout.tsx"),
  canonical_estimate_client: resolve(
    "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts",
  ),
} as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_DEVELOPER_AUTH_ACTION_SEAL:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function ttlSeconds(): number | null {
  const raw = execFileSync(
    "docker",
    [
      "inspect",
      "supabase_auth_rik-r52-a7-provider-20260824",
      "--format",
      "{{json .Config.Env}}",
    ],
    { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  ).trim();
  const env = JSON.parse(raw) as string[];
  const entry = env.find((value) => value.startsWith("GOTRUE_JWT_EXP="));
  const value = Number(entry?.split("=")[1] ?? Number.NaN);
  return Number.isFinite(value) ? value : null;
}

function main(): void {
  const evidence = Object.fromEntries(
    Object.entries(RECEIPTS).map(([key, path]) => [key, readJson(path)]),
  ) as Record<string, Json>;
  const productHashes = Object.fromEntries(
    Object.entries(PRODUCT_SOURCES).map(([key, path]) => [key, sha256(readFileSync(path))]),
  );
  const latestProductSourceUtc = new Date(
    Math.max(...Object.values(PRODUCT_SOURCES).map((path) => statSync(path).mtimeMs)),
  ).toISOString();
  const normalProductHashes = evidence.normal_soak.product_source_sha256 as Json;
  const rootSource = readFileSync(PRODUCT_SOURCES.root_auth_lifecycle, "utf8");
  const bannerSource = readFileSync(PRODUCT_SOURCES.local_review_banner, "utf8");
  const supabaseSource = readFileSync(PRODUCT_SOURCES.supabase_client, "utf8");
  const checks = {
    principals_10_of_10:
      evidence.principals.status ===
      "GREEN_R555_LOCAL_DEVELOPER_PROVIDER_PRINCIPALS_9_OFFICE_PLUS_1_CONSUMER",
    roles_9_of_9:
      evidence.roles.status === "GREEN_R555_LOCAL_DEVELOPER_ROLE_MATRIX_9_OF_9" &&
      evidence.roles.green === 9 && evidence.roles.denominator === 9,
    routes_23_of_23:
      evidence.routes.status === "GREEN_R555_LOCAL_DEVELOPER_ROUTE_MANIFEST" &&
      evidence.routes.green === 23 && evidence.routes.denominator === 23,
    security_green:
      evidence.security.status === "GREEN_R555_AUTH_RBAC_SECURITY_MATRIX" &&
      Object.values(evidence.security.checks as Json).every(Boolean),
    normal_ttl_soak_green:
      evidence.normal_soak.status === "GREEN_R555_AUTH_NORMAL_TTL_SOAK_10_MINUTES" &&
      evidence.normal_soak.duration_ms >= 600_000 &&
      Object.values(evidence.normal_soak.checks as Json).every(Boolean),
    short_ttl_race_green:
      evidence.short_race.status === "GREEN_R555_AUTH_SHORT_TTL_COMPILE_RACE" &&
      evidence.short_race.normal_ttl_restored === true &&
      Object.values(evidence.short_race.race.checks as Json).every(Boolean),
    normal_ttl_restored_3600: ttlSeconds() === 3_600,
    normal_soak_current_product_source:
      Object.entries(productHashes).every(([key, value]) => normalProductHashes[key] === value),
    short_race_ran_after_current_product_source:
      Date.parse(evidence.short_race.generated_at_utc) >= Date.parse(latestProductSourceUtc),
    one_root_auth_subscription:
      (rootSource.match(/subscribeAuthLifecycleStateChange\(/gu) ?? []).length === 1,
    review_banner_has_no_auth_subscription:
      !bannerSource.includes("onAuthStateChange") && !bannerSource.includes("getSession("),
    one_canonical_supabase_client_factory:
      (supabaseSource.match(/createClient<Database>\(/gu) ?? []).length === 1,
    action_inventory_built:
      evidence.action_inventory.status ===
      "GREEN_R555_INTERACTIVE_ACTION_MANIFEST_INVENTORY_BUILT_DYNAMIC_EVIDENCE_PENDING" &&
      evidence.action_inventory.action_denominator > 0,
    critical_static_selectors_20_of_20:
      evidence.action_inventory.critical_static_selectors_present === 20 &&
      evidence.action_inventory.critical_action_denominator === 20,
    action_dynamic_execution_remains_owned_by_later_phases:
      evidence.action_inventory.dynamic_execution_status === "GLOBAL_RED_PENDING_WEB_ANDROID" &&
      evidence.action_manifest.critical_actions.status ===
        "GLOBAL_RED_PENDING_DYNAMIC_WEB_ANDROID_ACTION_EVIDENCE",
  };
  const green = Object.values(checks).every(Boolean);
  invariant(green, `CHECKS_RED:${Object.entries(checks).filter(([, value]) => !value).map(([key]) => key).join(",")}`);
  const receiptBase = {
    schema: "r555.developer-roles-screens-actions-auth-security-seal.v1",
    generated_at_utc: new Date().toISOString(),
    status: "GREEN_R555_DEVELOPER_ROLES_SCREENS_ACTION_MANIFEST_AUTH_SECURITY_PHASE",
    master_sha256: MASTER_SHA256,
    source_sha256: sha256(readFileSync(SOURCE)),
    product_source_sha256: productHashes,
    latest_product_source_utc: latestProductSourceUtc,
    evidence_sha256: Object.fromEntries(
      Object.entries(RECEIPTS).map(([key, path]) => [key, sha256(readFileSync(path))]),
    ),
    counts: {
      office_principals: "9/9",
      consumer_principals: "1/1",
      roles: "9/9",
      routes: "23/23",
      security_denials: "5/5",
      ordinary_role_denials: "3/3",
      normal_ttl_soak: "60/60",
      short_ttl_compile_race: "1/1",
      interactive_actions_inventoried: evidence.action_inventory.action_denominator,
      critical_static_selectors: "20/20",
      critical_web_dynamic: "OWNED_BY_WEB_COVERAGE_PHASE",
      critical_android_dynamic: "OWNED_BY_ANDROID_COVERAGE_PHASE",
    },
    checks,
    explicit_non_claims: {
      critical_web_dynamic_terminal_green: false,
      critical_android_dynamic_terminal_green: false,
      source_frozen: false,
      global_green: false,
    },
    scope: {
      local_only: true,
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
    },
  };
  atomicJson(OUTPUT, {
    ...receiptBase,
    payload_sha256: sha256(JSON.stringify(receiptBase)),
  });
  process.stdout.write(`${JSON.stringify({
    status: receiptBase.status,
    roles: receiptBase.counts.roles,
    routes: receiptBase.counts.routes,
    normal_soak: receiptBase.counts.normal_ttl_soak,
    short_race: receiptBase.counts.short_ttl_compile_race,
    actions: receiptBase.counts.interactive_actions_inventoried,
    critical_static: receiptBase.counts.critical_static_selectors,
  })}\n`);
}

main();
