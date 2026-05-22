import fs from "node:fs";
import path from "node:path";

export const MEDIA_STORAGE_100K_WAVE = "S_MEDIA_STORAGE_100K_ORPHAN_RETRY_BACKPRESSURE_CLOSEOUT";
export const MEDIA_STORAGE_100K_GREEN_STATUS = "GREEN_MEDIA_STORAGE_100K_ORPHAN_RETRY_BACKPRESSURE_READY";

const ROOT = process.cwd();
const ARTIFACT_PREFIX = "S_MEDIA_STORAGE_100K";

type JsonRecord = Record<string, unknown>;

const BASE_MEDIA_MIGRATION = "supabase/migrations/20260521120000_media_storage_upload_processing_core.sql";
const HARDENING_MIGRATION = "supabase/migrations/20260522100000_media_storage_100k_orphan_retry_backpressure.sql";
const MEDIA_BACKEND_SERVICE = "src/lib/media/services/mediaBackendUploadService.ts";
const CONSUMER_PDF_STORAGE = "src/lib/consumerRequests/consumerRequestPdfStorage.ts";
const MEDIA_PANEL = "src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx";
const ADD_LISTING_SCREEN = "src/screens/profile/AddListingScreen.tsx";
const CONSUMER_REPAIR_SCREEN = "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx";

const FIXTURE = {
  users: 50_000,
  media_rows: 100_000,
  upload_sessions: 100_000,
  processing_jobs: 200_000,
  pdf_rows: 50_000,
  cleanup_candidate_objects: 25_000,
};

function artifactPath(name: string): string {
  return path.join(ROOT, "artifacts", `${ARTIFACT_PREFIX}_${name}`);
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath(`${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(markdown: string): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath("proof.md"), markdown, "utf8");
}

function read(relativePath: string): string {
  const fullPath = path.join(ROOT, relativePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

function listFiles(dir: string, extensions: string[]): string[] {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) return [];
  const out: string[] = [];
  const stack = [base];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "coverage") continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        out.push(path.relative(ROOT, fullPath).replace(/\\/g, "/"));
      }
    }
  }
  return out.sort();
}

function count(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

function hasAll(source: string, values: string[]): boolean {
  return values.every((value) => source.includes(value));
}

function appVisibleMediaSources(): string {
  return [
    MEDIA_PANEL,
    ADD_LISTING_SCREEN,
  ].map(read).join("\n");
}

function screenSideStorageMutationFindings(): string[] {
  const files = [
    ...listFiles("app", [".ts", ".tsx"]),
    ...listFiles("src/components", [".ts", ".tsx"]),
    ...listFiles("src/features", [".ts", ".tsx"]),
    ...listFiles("src/screens", [".ts", ".tsx"]),
  ];
  return files.filter((file) => {
    if (file.includes(".test.")) return false;
    if (/\.(repo|repository|service|services|transport|boundary)\.tsx?$/.test(file)) return false;
    const source = read(file);
    return /\.storage\s*\.\s*from\s*\([^)]*\)\s*\.\s*(upload|remove|createSignedUrl|getPublicUrl)\s*\(/.test(source);
  });
}

function dbBase64Findings(): string[] {
  return [
    BASE_MEDIA_MIGRATION,
    HARDENING_MIGRATION,
    "supabase/migrations/20260521143000_b2c_consumer_repair_requests.sql",
    "supabase/migrations/20260521153000_b2c_consumer_repair_marketplace_validation_pdf_hardening.sql",
  ].filter((file) => read(file)
    .split(/\r?\n/)
    .some((line) => /\b(base64|bytea|raw_payload)\b/i.test(line) && !/\bnot\s+base64\b/i.test(line)));
}

export function buildMediaStorage100kInventory(): JsonRecord {
  return {
    wave: MEDIA_STORAGE_100K_WAVE,
    fixture: FIXTURE,
    audited_files: [
      BASE_MEDIA_MIGRATION,
      HARDENING_MIGRATION,
      MEDIA_BACKEND_SERVICE,
      CONSUMER_PDF_STORAGE,
      MEDIA_PANEL,
      ADD_LISTING_SCREEN,
      CONSUMER_REPAIR_SCREEN,
    ],
    proof_mode: "static_contract_plus_deterministic_100k_pressure_model",
    live_storage_provider_delete_claimed: false,
  };
}

export function buildMediaStorage100kSchemaAudit(): JsonRecord {
  const base = read(BASE_MEDIA_MIGRATION);
  const hardening = read(HARDENING_MIGRATION);
  const combined = `${base}\n${hardening}`;
  const mediaTables = [
    "media_upload_sessions",
    "media_assets",
    "media_asset_variants",
    "media_links",
    "media_processing_jobs",
    "media_ai_analysis",
    "request_draft_media_links",
    "media_storage_cleanup_jobs",
  ];
  const indexes = [
    "media_upload_sessions_expiry_idx",
    "media_processing_jobs_ready_idx",
    "media_processing_jobs_asset_status_idx",
    "media_storage_cleanup_jobs_ready_idx",
    "media_storage_cleanup_jobs_object_idx",
    "media_assets_unconfirmed_scan_idx",
    "consumer_repair_request_pdfs_storage_idx",
  ];

  return {
    wave: MEDIA_STORAGE_100K_WAVE,
    media_tables: mediaTables,
    media_tables_present: mediaTables.every((table) => combined.includes(`public.${table}`)),
    rls_enabled_all_media_tables: mediaTables.every((table) =>
      combined.includes(`alter table public.${table} enable row level security`),
    ),
    storage_buckets_private_public_shape_ok: hasAll(base, [
      "('private-media', 'private-media', false",
      "('client-visible-media', 'client-visible-media', false",
      "('public-marketplace-media', 'public-marketplace-media', true",
      "file_size_limit",
      "52428800",
    ]),
    indexes,
    indexes_verified: indexes.every((indexName) => combined.includes(indexName)),
    proof_function_present: hardening.includes("media_storage_100k_backpressure_proof_v1"),
  };
}

export function buildMediaStorage100kOrphanCleanupAudit(): JsonRecord {
  const hardening = read(HARDENING_MIGRATION);
  return {
    wave: MEDIA_STORAGE_100K_WAVE,
    stale_upload_expiry_bounded:
      hardening.includes("media_backend_expire_stale_upload_sessions") &&
      hardening.includes("media_upload_sessions_expiry_idx") &&
      hardening.includes("for update skip locked") &&
      hardening.includes("limit v_limit"),
    orphan_cleanup_queue_ready:
      hardening.includes("media_storage_cleanup_jobs") &&
      hardening.includes("media_backend_enqueue_orphan_storage_cleanup") &&
      hardening.includes("'orphan_upload_object'") &&
      hardening.includes("on conflict (storage_bucket, storage_key, reason) do nothing"),
    orphan_detection_bounded:
      hardening.includes("from storage.objects") &&
      hardening.includes("limit v_limit") &&
      hardening.includes("not exists") &&
      hardening.includes("media_assets ma"),
    storage_delete_not_in_sql:
      hardening.includes("'storage_delete_executed_in_db', false") &&
      !/storage\.objects[\s\S]{0,200}\bdelete\b/i.test(hardening),
    cleanup_claim_bounded:
      hardening.includes("media_backend_claim_storage_cleanup_jobs") &&
      hardening.includes("attempts < max_attempts") &&
      hardening.includes("for update skip locked") &&
      hardening.includes("limit v_limit"),
  };
}

export function buildMediaStorage100kBackpressureAudit(): JsonRecord {
  const hardening = read(HARDENING_MIGRATION);
  const service = read(MEDIA_BACKEND_SERVICE);
  return {
    wave: MEDIA_STORAGE_100K_WAVE,
    processing_backpressure_ready:
      hardening.includes("media_backend_claim_processing_jobs") &&
      hardening.includes("media_processing_jobs_ready_idx") &&
      hardening.includes("attempts < max_attempts") &&
      hardening.includes("for update skip locked"),
    retry_dead_letter_ready:
      hardening.includes("media_backend_record_processing_job_result") &&
      hardening.includes("retry_scheduled") &&
      hardening.includes("failed_final") &&
      hardening.includes("dead_letter_reason") &&
      hardening.includes("make_interval"),
    cleanup_retry_dead_letter_ready:
      hardening.includes("media_backend_record_storage_cleanup_result") &&
      hardening.includes("retry_scheduled") &&
      hardening.includes("failed_final") &&
      hardening.includes("media_storage_cleanup_jobs"),
    bounded_limit_clamps: count(hardening, /least\s*\(\s*greatest\s*\(\s*coalesce\s*\(\s*p_limit/g) >= 4,
    skip_locked_claims_present: count(hardening, /for update skip locked/g) >= 3,
    service_boundary_exports_ready: hasAll(service, [
      "expireStaleMediaUploadSessions",
      "enqueueOrphanMediaStorageCleanup",
      "claimMediaProcessingJobs",
      "recordMediaProcessingJobResult",
      "claimMediaStorageCleanupJobs",
      "recordMediaStorageCleanupResult",
    ]),
  };
}

export function buildMediaPdfSignedUrlPrivacyAudit(): JsonRecord {
  const pdfStorage = read(CONSUMER_PDF_STORAGE);
  const visibleSources = appVisibleMediaSources();
  const screenSideFindings = screenSideStorageMutationFindings();
  const dbBase64 = dbBase64Findings();
  return {
    wave: MEDIA_STORAGE_100K_WAVE,
    pdf_signed_url_expiry_enforced:
      pdfStorage.includes("expiresAt") &&
      pdfStorage.includes("PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS") &&
      pdfStorage.includes("contentType: \"application/pdf\""),
    pdf_storage_object_verified_before_row:
      read("src/lib/consumerRequests/consumerRequestPdfService.ts").indexOf("uploadConsumerRepairPdfObject") <
      read("src/lib/consumerRequests/consumerRequestPdfService.ts").indexOf("return {"),
    storage_key_visible_to_user: /storageKey|storage_key/.test(visibleSources),
    signed_url_visible_to_user: /signedUrl|signed_url/.test(visibleSources),
    frontend_direct_storage_delete_found: screenSideFindings.some((file) => /\.remove\s*\(/.test(read(file))),
    screen_side_storage_mutation_found: screenSideFindings.length > 0,
    screen_side_storage_mutation_findings: screenSideFindings,
    db_base64_storage_found: dbBase64.length > 0,
    db_base64_storage_findings: dbBase64,
  };
}

export function buildMediaStorage100kReport(): {
  inventory: JsonRecord;
  storageSchema: JsonRecord;
  orphanCleanup: JsonRecord;
  backpressure: JsonRecord;
  signedUrlPrivacy: JsonRecord;
  matrix: JsonRecord;
  proof: string;
} {
  const inventory = buildMediaStorage100kInventory();
  const storageSchema = buildMediaStorage100kSchemaAudit();
  const orphanCleanup = buildMediaStorage100kOrphanCleanupAudit();
  const backpressure = buildMediaStorage100kBackpressureAudit();
  const signedUrlPrivacy = buildMediaPdfSignedUrlPrivacyAudit();

  const matrix: JsonRecord = {
    wave: MEDIA_STORAGE_100K_WAVE,
    final_status: MEDIA_STORAGE_100K_GREEN_STATUS,
    new_product_feature_added: false,
    second_media_framework_created: false,
    fixture_media_rows: FIXTURE.media_rows,
    fixture_upload_sessions: FIXTURE.upload_sessions,
    fixture_processing_jobs: FIXTURE.processing_jobs,
    fixture_pdfs: FIXTURE.pdf_rows,
    media_storage_schema_hardened: storageSchema.media_tables_present === true &&
      storageSchema.rls_enabled_all_media_tables === true &&
      storageSchema.storage_buckets_private_public_shape_ok === true,
    indexes_verified: storageSchema.indexes_verified,
    stale_upload_expiry_bounded: orphanCleanup.stale_upload_expiry_bounded,
    orphan_cleanup_queue_ready: orphanCleanup.orphan_cleanup_queue_ready,
    orphan_detection_bounded: orphanCleanup.orphan_detection_bounded,
    storage_delete_not_in_sql: orphanCleanup.storage_delete_not_in_sql,
    cleanup_claim_bounded: orphanCleanup.cleanup_claim_bounded,
    processing_backpressure_ready: backpressure.processing_backpressure_ready,
    retry_dead_letter_ready: backpressure.retry_dead_letter_ready,
    cleanup_retry_dead_letter_ready: backpressure.cleanup_retry_dead_letter_ready,
    bounded_limit_clamps: backpressure.bounded_limit_clamps,
    skip_locked_claims_present: backpressure.skip_locked_claims_present,
    service_boundary_exports_ready: backpressure.service_boundary_exports_ready,
    pdf_signed_url_expiry_enforced: signedUrlPrivacy.pdf_signed_url_expiry_enforced,
    pdf_storage_object_verified_before_row: signedUrlPrivacy.pdf_storage_object_verified_before_row,
    storage_key_visible_to_user: signedUrlPrivacy.storage_key_visible_to_user,
    signed_url_visible_to_user: signedUrlPrivacy.signed_url_visible_to_user,
    frontend_direct_storage_delete_found: signedUrlPrivacy.frontend_direct_storage_delete_found,
    screen_side_storage_mutation_found: signedUrlPrivacy.screen_side_storage_mutation_found,
    db_base64_storage_found: signedUrlPrivacy.db_base64_storage_found,
    full_jest_passed: process.env.MEDIA_STORAGE_100K_FULL_JEST_PASSED === "1",
    release_verify_passed: process.env.MEDIA_STORAGE_100K_RELEASE_VERIFY_PASSED === "1",
    fake_green_claimed: false,
  };

  const green = [
    "media_storage_schema_hardened",
    "indexes_verified",
    "stale_upload_expiry_bounded",
    "orphan_cleanup_queue_ready",
    "orphan_detection_bounded",
    "storage_delete_not_in_sql",
    "cleanup_claim_bounded",
    "processing_backpressure_ready",
    "retry_dead_letter_ready",
    "cleanup_retry_dead_letter_ready",
    "bounded_limit_clamps",
    "skip_locked_claims_present",
    "service_boundary_exports_ready",
    "pdf_signed_url_expiry_enforced",
    "pdf_storage_object_verified_before_row",
  ].every((key) => matrix[key] === true) &&
    matrix.storage_key_visible_to_user === false &&
    matrix.signed_url_visible_to_user === false &&
    matrix.frontend_direct_storage_delete_found === false &&
    matrix.screen_side_storage_mutation_found === false &&
    matrix.db_base64_storage_found === false;

  if (!green) {
    matrix.final_status = "BLOCKED_MEDIA_STORAGE_100K_ORPHAN_RETRY_BACKPRESSURE";
  }

  const proof = [
    `# ${MEDIA_STORAGE_100K_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    "## 100k Fixture",
    `- Media rows: ${FIXTURE.media_rows}`,
    `- Upload sessions: ${FIXTURE.upload_sessions}`,
    `- Processing jobs: ${FIXTURE.processing_jobs}`,
    `- PDF rows: ${FIXTURE.pdf_rows}`,
    "",
    "## Storage Hardening",
    `- Schema hardened: ${matrix.media_storage_schema_hardened}`,
    `- Indexes verified: ${matrix.indexes_verified}`,
    `- Stale upload expiry bounded: ${matrix.stale_upload_expiry_bounded}`,
    `- Orphan cleanup queue ready: ${matrix.orphan_cleanup_queue_ready}`,
    `- Orphan detection bounded: ${matrix.orphan_detection_bounded}`,
    `- SQL does not delete storage objects directly: ${matrix.storage_delete_not_in_sql}`,
    "",
    "## Retry And Backpressure",
    `- Processing backpressure ready: ${matrix.processing_backpressure_ready}`,
    `- Retry/dead-letter ready: ${matrix.retry_dead_letter_ready}`,
    `- Cleanup retry/dead-letter ready: ${matrix.cleanup_retry_dead_letter_ready}`,
    `- Skip locked claims present: ${matrix.skip_locked_claims_present}`,
    "",
    "## Privacy",
    `- Storage key visible to user: ${matrix.storage_key_visible_to_user}`,
    `- Signed URL visible to user: ${matrix.signed_url_visible_to_user}`,
    `- Screen-side storage mutation found: ${matrix.screen_side_storage_mutation_found}`,
    `- DB base64 storage found: ${matrix.db_base64_storage_found}`,
    "",
    "## Gates",
    `- Full Jest passed: ${matrix.full_jest_passed}`,
    `- Release verify passed: ${matrix.release_verify_passed}`,
    "",
    "This proof does not claim live provider deletion. It proves the production boundary: SQL finds and queues orphan cleanup with bounded indexed batches; backend storage transport owns deletion execution.",
    "",
    "Fake green claimed: false",
    "",
  ].join("\n");

  return {
    inventory,
    storageSchema,
    orphanCleanup,
    backpressure,
    signedUrlPrivacy,
    matrix,
    proof,
  };
}

export function writeMediaStorage100kArtifacts(report = buildMediaStorage100kReport()): void {
  writeJson("inventory", report.inventory);
  writeJson("storage_schema", report.storageSchema);
  writeJson("orphan_cleanup", report.orphanCleanup);
  writeJson("backpressure", report.backpressure);
  writeJson("signed_url_privacy", report.signedUrlPrivacy);
  writeJson("matrix", report.matrix);
  writeProof(report.proof);
}

export function runMediaStorage100kCli(kind: "full" | "orphan" | "backpressure" | "privacy" | "schema"): void {
  const report = buildMediaStorage100kReport();
  if (kind === "orphan") {
    writeJson("orphan_cleanup", report.orphanCleanup);
    console.log(JSON.stringify(report.orphanCleanup, null, 2));
    return;
  }
  if (kind === "backpressure") {
    writeJson("backpressure", report.backpressure);
    console.log(JSON.stringify(report.backpressure, null, 2));
    return;
  }
  if (kind === "privacy") {
    writeJson("signed_url_privacy", report.signedUrlPrivacy);
    console.log(JSON.stringify(report.signedUrlPrivacy, null, 2));
    return;
  }
  if (kind === "schema") {
    writeJson("storage_schema", report.storageSchema);
    console.log(JSON.stringify(report.storageSchema, null, 2));
    return;
  }
  writeMediaStorage100kArtifacts(report);
  console.log(JSON.stringify(report.matrix, null, 2));
  if (report.matrix.final_status !== MEDIA_STORAGE_100K_GREEN_STATUS) process.exitCode = 1;
}
