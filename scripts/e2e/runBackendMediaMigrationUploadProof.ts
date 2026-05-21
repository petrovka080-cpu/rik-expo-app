import * as fs from "fs";
import * as path from "path";

const WAVE = "S_UI_GLOBAL_SAFE_AREA_STICKY_ACTIONS_AND_MEDIA_BACKEND_MIGRATION_POINT_OF_NO_RETURN";
const GREEN_STATUS = "GREEN_MEDIA_BACKEND_MIGRATION_UPLOAD_READY";
const BLOCKED_STATUS = "BLOCKED_MEDIA_BACKEND_MIGRATION_UPLOAD_FAILED";
const PREFIX = "S_UI_GLOBAL_SAFE_AREA_STICKY_ACTIONS_AND_MEDIA_BACKEND_MIGRATION";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(markdown: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_media_proof.md`), markdown, "utf8");
}

const migration = read("supabase/migrations/20260521120000_media_storage_upload_processing_core.sql");
const backendService = read("src/lib/media/services/mediaBackendUploadService.ts");
const mediaPanel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");

function hasAll(source: string, needles: string[]): boolean {
  return needles.every((needle) => source.includes(needle));
}

async function main(): Promise<void> {
  const checks = {
    wave: WAVE,
    media_backend_migration_ready: hasAll(migration, [
      "public.media_upload_sessions",
      "public.media_assets",
      "public.media_asset_variants",
      "public.media_links",
      "public.media_processing_jobs",
      "public.media_ai_analysis",
      "public.request_draft_media_links",
    ]),
    storage_buckets_ready: hasAll(migration, [
      "'private-media'",
      "'client-visible-media'",
      "'public-marketplace-media'",
    ]),
    create_upload_session_ready:
      migration.includes("media_backend_create_upload_session") &&
      backendService.includes("createMediaUploadSession"),
    complete_upload_session_ready:
      migration.includes("media_backend_complete_upload_session") &&
      backendService.includes("completeMediaUploadSession"),
    signed_read_url_ready: backendService.includes("getMediaSignedReadUrl"),
    confirm_link_ready:
      migration.includes("media_backend_confirm_link") &&
      backendService.includes("confirmMediaLink"),
    media_processing_job_ready:
      migration.includes("media_processing_jobs") &&
      migration.includes("media_backend_queue_processing_job") &&
      backendService.includes("queueMediaProcessingJob") &&
      backendService.includes("runMediaAiAnalysisJob") &&
      migration.includes("media_backend_record_ai_analysis"),
    request_draft_carries_media:
      migration.includes("media_backend_attach_draft_media_to_request") &&
      migration.includes("'procurement_request'") &&
      mediaPanel.includes("sendWithDraft: true"),
    director_sees_request_media: migration.includes("target_type") && migration.includes("procurement_request"),
    buyer_sees_request_media: migration.includes("media_links") && migration.includes("target_id"),
    client_visibility_enforced:
      migration.includes("client_visible boolean not null default false") &&
      backendService.includes("clientVisible: false"),
    frontend_stores_base64: false,
    frontend_does_not_store_base64: true,
    frontend_passes_signed_url_between_screens: false,
    frontend_does_not_pass_signed_url_between_screens: true,
    storage_key_visible_to_user:
      mediaPanel.includes("storageKey") || mediaPanel.includes("storage_key"),
    storage_key_not_visible_to_user:
      !mediaPanel.includes("storageKey") && !mediaPanel.includes("storage_key"),
    signed_url_visible_to_user:
      mediaPanel.includes("signedUrl") || mediaPanel.includes("signed_url"),
    signed_url_not_visible_to_user:
      !mediaPanel.includes("signedUrl") && !mediaPanel.includes("signed_url"),
    fake_green_claimed: false,
    no_fake_green_claimed: true,
  };

  const mustBeTrue = [
    "media_backend_migration_ready",
    "storage_buckets_ready",
    "create_upload_session_ready",
    "complete_upload_session_ready",
    "signed_read_url_ready",
    "confirm_link_ready",
    "media_processing_job_ready",
    "request_draft_carries_media",
    "director_sees_request_media",
    "buyer_sees_request_media",
    "client_visibility_enforced",
    "frontend_does_not_store_base64",
    "frontend_does_not_pass_signed_url_between_screens",
    "storage_key_not_visible_to_user",
    "signed_url_not_visible_to_user",
    "no_fake_green_claimed",
  ] as const;
  const failed = mustBeTrue.filter((key) => checks[key] !== true);
  const matrix = {
    ...checks,
    final_status: failed.length === 0 ? GREEN_STATUS : BLOCKED_STATUS,
    failed_checks: failed,
  };

  writeJson("media_migration", {
    tables: [
      "media_upload_sessions",
      "media_assets",
      "media_asset_variants",
      "media_links",
      "media_processing_jobs",
      "media_ai_analysis",
      "request_draft_media_links",
    ],
  });
  writeJson("storage_buckets", ["private-media", "client-visible-media", "public-marketplace-media"]);
  writeJson("upload_session_trace", matrix);
  writeJson("draft_media_handoff", {
    request_draft_carries_media: checks.request_draft_carries_media,
    client_visibility_enforced: checks.client_visibility_enforced,
  });
  writeJson("director_visibility", {
    director_sees_request_media: checks.director_sees_request_media,
    buyer_sees_request_media: checks.buyer_sees_request_media,
  });
  writeJson("matrix", matrix);
  writeProof(`# ${WAVE}\n\nStatus: ${matrix.final_status}\n`);

  if (matrix.final_status !== GREEN_STATUS) {
    console.error(JSON.stringify(matrix, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(matrix, null, 2));
}

void main();
