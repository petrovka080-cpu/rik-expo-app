import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260929190000_consumer_estimate_marketplace_full_estimate_handoff.sql",
);

describe("consumer estimate marketplace full estimate handoff", () => {
  const migration = readFileSync(migrationPath, "utf8");

  it("keeps the staging Marketplace bridge independent from the local canonical database", () => {
    expect(migration).toContain("whole_app_staging owns Marketplace");
    expect(migration).not.toContain("public.estimate_revision%rowtype");
    expect(migration).not.toContain("references public.estimate_revision");
    expect(migration).toContain("p_items jsonb");
    expect(migration).toContain("p_expected_row_count integer");
  });

  it("requires every row to carry exact canonical lineage and a positive quantity", () => {
    expect(migration).toContain("canonical_revision_id");
    expect(migration).toContain("canonical_release_id");
    expect(migration).toContain("canonical_artifact_id");
    expect(migration).toContain("canonical_row_sha256");
    expect(migration).toContain("(item ->> 'qty')::numeric <= 0");
    expect(migration).toContain("jsonb_typeof(item -> 'included_in_estimate')");
  });

  it("fails closed rather than silently publishing a shortened operation", () => {
    expect(migration).toContain("v_item_count <> p_expected_row_count");
    expect(migration).toContain("full estimate row count mismatch");
    expect(migration).toContain("count(distinct item ->> 'rik_code')");
    expect(migration).toContain("full estimate row identity is not unique");
  });

  it("publishes atomically and preserves idempotent identity", () => {
    expect(migration).toContain("insert into public.market_listings");
    expect(migration).toContain("insert into public.consumer_estimate_marketplace_handoffs");
    expect(migration).toContain("v_existing.items_json <> v_items");
    expect(migration).toContain("consumer marketplace idempotency identity conflict");
  });
});
