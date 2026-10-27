import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260416093000_director_approve_enum_recovery_h1_1.sql",
);

const readMigration = () => fs.readFileSync(migrationPath, "utf8");

describe("director approve enum recovery migration", () => {
  it("normalizes request enum statuses through text before empty fallback", () => {
    const source = readMigration();

    expect(source).toContain("coalesce(r.status::text, '')");
    expect(source).toContain("coalesce(ri.status::text, '')");
    expect(source).toContain("coalesce(p.status::text, '')");
    expect(source).not.toMatch(/coalesce\(\s*r\.status\s*,\s*''\s*\)/);
    expect(source).not.toMatch(/coalesce\(\s*ri\.status\s*,\s*''\s*\)/);
    expect(source).not.toMatch(/coalesce\(\s*p\.status\s*,\s*''\s*\)/);
  });

  it("writes a valid request_status_enum target instead of lowercase approved", () => {
    const source = readMigration();

    expect(source).toContain("v_target_status public.request_status_enum");
    expect(source).toContain("U&'\\041A \\0437\\0430\\043A\\0443\\043F\\043A\\0435'::public.request_status_enum");
    expect(source).toContain("status = v_target_status");
    expect(source).not.toContain("status = 'approved'");
    expect(source).not.toContain("status = ''");
  });

  it("hardens the proposal request item integrity guard used by approve pipeline", () => {
    const source = readMigration();

    expect(source).toContain("create or replace function public.proposal_request_item_integrity_v1");
    expect(source).toContain("ri.status::text as request_item_status");
    expect(source).toContain("perform public.proposal_request_item_integrity_guard_v1(p_proposal_id)");
  });

  it("preserves the director approve RPC contract and grants", () => {
    const source = readMigration();

    expect(source).toContain("create or replace function public.director_approve_request_v1");
    expect(source).toContain("create or replace function public.director_approve_pipeline_v1");
    expect(source).toContain("grant execute on function public.director_approve_request_v1(text, text) to authenticated");
    expect(source).toContain(
      "grant execute on function public.director_approve_pipeline_v1(text, text, text, text) to authenticated",
    );
    expect(source).toContain("notify pgrst, 'reload schema'");
  });
});
