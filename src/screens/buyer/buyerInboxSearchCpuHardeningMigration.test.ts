import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417053000_r3_e_buyer_inbox_search_cpu_hardening.sql",
);
const safeDeleteMigrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260417053500_r3_e_buyer_inbox_search_rebuild_safe_delete.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");
const safeDeleteSource = fs.readFileSync(safeDeleteMigrationPath, "utf8");
const combinedSource = `${source}\n${safeDeleteSource}`;
const lowerSource = source.toLowerCase();

const extractFunction = (functionName: string): string => {
  const signature = `create or replace function public.${functionName}`;
  const start = lowerSource.indexOf(signature.toLowerCase());
  expect(start).toBeGreaterThanOrEqual(0);
  const end = lowerSource.indexOf("$$;", start);
  expect(end).toBeGreaterThan(start);
  return lowerSource.slice(start, end);
};

describe("R3.E buyer inbox search CPU hardening migration", () => {
  it("adds a prepared buyer inbox search projection with rebuild metadata", () => {
    expect(source).toContain(
      "create table if not exists public.buyer_summary_inbox_search_v1",
    );
    expect(source).toContain("request_item_id text primary key");
    expect(source).toContain("search_document text not null");
    expect(source).toContain("search_hash text not null");
    expect(source).toContain(
      "create table if not exists public.buyer_summary_inbox_search_meta_v1",
    );
    expect(source).toContain(
      "create or replace function public.buyer_summary_inbox_search_rebuild_v1()",
    );
    expect(source).toContain("delete from public.buyer_summary_inbox_search_v1");
    expect(safeDeleteSource).toContain("delete from public.buyer_summary_inbox_search_v1");
    expect(safeDeleteSource).toContain("where true;");
    expect(safeDeleteSource).toContain("'safe_delete', true");
    expect(source).toContain("buyer_summary_inbox_search_v1_document_trgm_idx");
  });

  it("preserves legacy search semantics through a delimited normalized document", () => {
    const documentHelper = extractFunction("buyer_summary_inbox_search_document_v1(");
    const matchHelper = extractFunction("buyer_summary_inbox_search_match_v1(");

    expect(documentHelper).toContain("chr(31)");
    expect(documentHelper).toContain("lower(coalesce(p_request_id");
    expect(documentHelper).toContain("coalesce(p_request_id_old");
    expect(documentHelper).toContain("lower(coalesce(p_name_human");
    expect(documentHelper).toContain("lower(coalesce(p_object_name");
    expect(documentHelper).toContain("lower(coalesce(p_rik_code");
    expect(documentHelper).toContain("lower(coalesce(p_app_code");
    expect(documentHelper).toContain("lower(coalesce(p_note");
    expect(matchHelper).toContain("like ('%' || p_search_text || '%')");
  });

  it("clones the pre-existing public function as the proof-only legacy build source", () => {
    expect(source).toContain(
      "pg_get_functiondef('public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid)'::regprocedure)",
    );
    expect(source).toContain(
      "'FUNCTION public.buyer_summary_inbox_scope_build_source_v1('",
    );
    expect(source).toContain("execute v_def");
    expect(combinedSource).toContain("public.buyer_summary_inbox_scope_build_source_v1");
  });

  it("switches only the public buyer inbox search path to the prepared projection", () => {
    const publicScope = extractFunction("buyer_summary_inbox_scope_v1(");

    expect(publicScope).toContain("search_matches as");
    expect(publicScope).toContain("from public.buyer_summary_inbox_search_v1 s");
    expect(publicScope).toContain("s.search_document like ('%' || si.search_text || '%')");
    expect(publicScope).toContain("sp.search_hash = gr.search_hash_runtime");
    expect(publicScope).toContain(
      "public.buyer_summary_inbox_search_match_v1(gr.search_document_runtime, si.search_text)",
    );
    expect(publicScope).not.toContain("or lower(coalesce(gr.name_human");
    expect(publicScope).not.toContain("or lower(coalesce(gr.object_name");
    expect(publicScope).not.toContain("or lower(coalesce(gr.note");
  });

  it("keeps buyer inbox output contract and status gating in place", () => {
    const publicScope = extractFunction("buyer_summary_inbox_scope_v1(");

    expect(publicScope).toContain("'document_type', 'buyer_summary_inbox_scope'");
    expect(publicScope).toContain("'rows_source', 'buyer_summary_inbox_scope_v1'");
    expect(publicScope).toContain("'legacy_rows_source'");
    expect(publicScope).toContain("request_ready");
    expect(publicScope).toContain("item_ready");
    expect(publicScope).toContain("rejected_like");
    expect(publicScope).toContain("latest_rework");
    expect(publicScope).toContain("row_number() over");
  });

  it("adds migration-time and runtime parity proof helpers", () => {
    expect(source).toContain("create temp table r3_e_before");
    expect(source).toContain("create temp table r3_e_after");
    expect(source).toContain("R3.E buyer inbox search parity failed during migration");

    const cpuProof = extractFunction("buyer_summary_inbox_r3e_cpu_proof_v1()");
    const parityProof = extractFunction("buyer_summary_inbox_r3e_parity_v1(");

    expect(cpuProof).toContain("'public_uses_search_projection'");
    expect(cpuProof).toContain("'public_has_raw_name_human_like'");
    expect(cpuProof).toContain("'public_has_raw_note_like'");
    expect(cpuProof).toContain("'build_source_keeps_legacy_search'");
    expect(cpuProof).toContain("'projection_has_trgm_index'");
    expect(parityProof).toContain("'diff_count'");
    expect(parityProof).toContain("'is_drift_free'");
    expect(parityProof).toContain("buyer_summary_inbox_scope_build_source_v1");
  });

  it("does not rewrite unrelated buyer, warehouse, director, finance, PDF, or UI paths", () => {
    expect(combinedSource).not.toContain("create or replace function public.buyer_rfq_create");
    expect(combinedSource).not.toContain("create or replace function public.list_buyer_inbox");
    expect(combinedSource).not.toContain("create or replace function public.warehouse_");
    expect(combinedSource).not.toContain("create or replace function public.director_");
    expect(lowerSource).not.toContain("finance");
    expect(lowerSource).not.toContain("pdf");
    expect(lowerSource).not.toContain(".tsx");
  });

  it("restores release metadata and grants", () => {
    expect(source).toContain(
      "comment on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid)",
    );
    expect(source).toContain(
      "grant execute on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) to authenticated",
    );
    expect(source).toContain(
      "grant execute on function public.buyer_summary_inbox_r3e_cpu_proof_v1() to authenticated",
    );
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
