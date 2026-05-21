import * as fs from "fs";
import * as path from "path";

const migrationPath = "supabase/migrations/20260521120000_media_storage_upload_processing_core.sql";
const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("media backend migration schema", () => {
  it("creates storage buckets, upload sessions, assets, links, processing jobs and draft handoff tables", () => {
    const sql = read(migrationPath);

    for (const table of [
      "media_upload_sessions",
      "media_assets",
      "media_asset_variants",
      "media_links",
      "media_processing_jobs",
      "media_ai_analysis",
      "request_draft_media_links",
    ]) {
      expect(sql).toContain(`public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }

    expect(sql).toContain("'private-media'");
    expect(sql).toContain("'client-visible-media'");
    expect(sql).toContain("'public-marketplace-media'");
    expect(sql).toContain("requires_signed_url boolean not null default true");
    expect(sql).toContain("final_linked_by_human boolean not null default false");
    expect(sql).toContain("final_fact boolean not null default false");
  });

  it("adds backend functions for upload completion and draft media handoff", () => {
    const sql = read(migrationPath);

    expect(sql).toContain("media_backend_create_upload_session");
    expect(sql).toContain("media_backend_complete_upload_session");
    expect(sql).toContain("media_backend_attach_draft_media_to_request");
    expect(sql).toContain("media_backend_confirm_link");
    expect(sql).toContain("media_backend_queue_processing_job");
    expect(sql).toContain("media_backend_record_ai_analysis");
    expect(sql).toContain("'procurement_request'");
    expect(sql).toContain("'human_confirmed'");
    expect(sql).toContain("final_fact");
    expect(sql).toContain("client_visible");
    expect(sql).toContain("false");
  });
});
