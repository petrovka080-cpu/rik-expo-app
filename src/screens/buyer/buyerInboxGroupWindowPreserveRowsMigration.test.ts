import fs from "fs";
import path from "path";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260626104500_buyer_inbox_group_window_preserve_rows.sql",
);

const source = fs.readFileSync(migrationPath, "utf8");
const lowerSource = source.toLowerCase();

const extractPublicScope = (): string => {
  const signature = "create or replace function public.buyer_summary_inbox_scope_v1(";
  const start = lowerSource.indexOf(signature);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = lowerSource.indexOf("$buyer_summary_inbox_group_window$;", start);
  expect(end).toBeGreaterThan(start);
  return lowerSource.slice(start, end);
};

describe("buyer inbox group-window row preservation migration", () => {
  it("keeps p_limit as a request-group window, not a child-row cap", () => {
    const publicScope = extractPublicScope();

    expect(source).toContain(
      "create or replace function public.buyer_summary_inbox_scope_v1(",
    );
    expect(source).toContain(
      "from public.list_buyer_inbox(p_company_id)",
    );
    expect(lowerSource).toContain(
      "selected_groups as",
    );
    expect(lowerSource).toContain(
      "join selected_groups sg",
    );
    expect(lowerSource).toContain(
      "window_contract', 'request_groups",
    );
    expect(lowerSource).toContain(
      "p_limit limits request groups, never child rows inside a visible request",
    );
    expect(publicScope).not.toContain("src.ordinality <= na.limit_groups");
    expect(publicScope).not.toContain("partition by fr.request_id");
  });

  it("ships an authenticated proof helper and reloads PostgREST schema", () => {
    expect(source).toContain(
      "create or replace function public.buyer_summary_inbox_group_window_preserve_rows_proof_v1()",
    );
    expect(source).toContain(
      "grant execute on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) to authenticated",
    );
    expect(source).toContain(
      "grant execute on function public.buyer_summary_inbox_group_window_preserve_rows_proof_v1() to authenticated",
    );
    expect(source).toContain("notify pgrst, 'reload schema'");
    expect(source.trim()).toMatch(/^begin;/);
    expect(source.trim()).toMatch(/commit;$/);
  });
});
