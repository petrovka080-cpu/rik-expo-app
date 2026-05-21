import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("media backend migration required", () => {
  it("adds a real backend migration instead of a frontend-only media mock", () => {
    const sql = read("supabase/migrations/20260521120000_media_storage_upload_processing_core.sql");
    const mediaPanel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");

    expect(sql).toContain("create table if not exists public.media_upload_sessions");
    expect(sql).toContain("create table if not exists public.media_assets");
    expect(sql).toContain("create table if not exists public.media_links");
    expect(sql).toContain("media_backend_attach_draft_media_to_request");
    expect(mediaPanel).toContain("sendWithDraft: true");
  });
});
