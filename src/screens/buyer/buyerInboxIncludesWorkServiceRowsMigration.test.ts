import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260626114000_buyer_inbox_include_work_service_rows.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");
const lowerSource = source.toLowerCase();

const extractListBuyerInboxScope = (): string => {
  const signature = "create or replace function public.list_buyer_inbox(";
  const start = lowerSource.indexOf(signature);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = lowerSource.indexOf("$list_buyer_inbox_include_work_service$;", start);
  expect(end).toBeGreaterThan(start);
  return lowerSource.slice(start, end);
};

describe("buyer inbox material and work/service row migration", () => {
  it("keeps the legacy list_buyer_inbox contract while restoring full request rows", () => {
    const scope = extractListBuyerInboxScope();

    expect(scope).toContain("returns table (");
    expect(scope).toContain("request_item_id uuid");
    expect(scope).toContain("request_id_old integer");
    expect(scope).toContain("where p_company_id is null");
    expect(scope).toContain("'material'");
    expect(scope).toContain("'equipment'");
    expect(scope).toContain("'delivery'");
    expect(scope).toContain("'work'");
    expect(scope).toContain("'labor'");
    expect(scope).toContain("'service'");
    expect(scope).toContain("'subcontract_work'");
    expect(scope).toContain("request_status_norm");
    expect(scope).toContain("request_ready");
    expect(scope).toContain("item_status_ready");
    expect(scope).toContain("item_status_is_draft");
    expect(scope).toContain("when sr.request_ready");
    expect(scope).toContain("or sr.item_status_ready");
    expect(scope).not.toContain("and ri.status not ilike 'draft%'");
    expect(scope).not.toContain("and ri.status not ilike 'черновик%'");
    expect(scope).not.toContain("limit 12");
    expect(scope).not.toContain("limit 500");
    expect(scope).not.toContain("limit_groups");
  });

  it("uses request-level approval to keep every child row after director approval", () => {
    const scope = extractListBuyerInboxScope();

    expect(scope).toContain("or lower(trim(coalesce(r.status::text, ''))) like '%закуп%'");
    expect(scope).toContain("or lower(trim(coalesce(ri.status::text, ''))) like '%закуп%'");
    expect(scope).toContain("when sr.request_ready");
    expect(scope).toContain("then coalesce(nullif(trim(coalesce(sr.request_status, '')), '')");
    expect(scope).toContain("where (\n      sr.request_ready");
    expect(scope).not.toContain("where p_company_id is null\n    and ri.status");
  });

  it("ships a proof helper and reloads PostgREST schema", () => {
    expect(lowerSource).toContain(
      "create or replace function public.buyer_inbox_materials_and_works_proof_v1()",
    );
    expect(lowerSource).toContain(
      "grant execute on function public.list_buyer_inbox(uuid) to authenticated",
    );
    expect(lowerSource).toContain(
      "grant execute on function public.buyer_inbox_materials_and_works_proof_v1() to authenticated",
    );
    expect(lowerSource).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
