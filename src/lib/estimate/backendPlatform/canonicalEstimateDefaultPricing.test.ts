import fs from "node:fs";
import path from "node:path";

import { canonicalEstimateEffectivePriceSnapshotIds } from "./contracts";

describe("canonical estimate automatic compatible price selection", () => {
  it("uses all compatible defaults when no source was selected", () => {
    expect(canonicalEstimateEffectivePriceSnapshotIds({
      requested: [],
      compatibleDefaults: ["snapshot-material", "snapshot-labor", "snapshot-delivery"],
    })).toEqual(["snapshot-material", "snapshot-labor", "snapshot-delivery"]);
  });

  it("never replaces an explicit user or caller selection", () => {
    expect(canonicalEstimateEffectivePriceSnapshotIds({
      requested: ["snapshot-selected"],
      compatibleDefaults: ["snapshot-default"],
    })).toEqual(["snapshot-selected"]);
  });

  it("keeps missing prices honest when no compatible source exists", () => {
    expect(canonicalEstimateEffectivePriceSnapshotIds({
      requested: [],
      compatibleDefaults: [],
    })).toEqual([]);
  });

  it("deduplicates defaults and respects the backend request limit", () => {
    const compatibleDefaults = ["same", "same", ...Array.from(
      { length: 70 },
      (_, index) => `snapshot-${index}`,
    )];
    const selected = canonicalEstimateEffectivePriceSnapshotIds({
      compatibleDefaults,
    });
    expect(selected).toHaveLength(64);
    expect(selected[0]).toBe("same");
    expect(new Set(selected).size).toBe(64);
  });

  it("loads every definition-reachable known price without a global row cutoff", () => {
    const migration = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/20260922040000_estimate_default_compatible_price_snapshots.sql"),
      "utf8",
    );
    const worker = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/functions/canonical-estimate-worker/index.ts"),
      "utf8",
    );
    const ingress = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/functions/canonical-estimate/index.ts"),
      "utf8",
    );
    const local = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
      "utf8",
    );
    const scopedMigration = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/20261007010000_estimate_commercial_cost_scope_price_v2.sql"),
      "utf8",
    );

    expect(migration).toContain("estimate_resolve_compile_price_items_v1");
    expect(migration).toContain("resource.definition_version_id=p_definition_version_id");
    expect(migration).not.toContain("resource.category");
    expect(migration).toContain("snapshot.captured_at<=now()");
    expect(migration).toContain("release.status in ('active','prepared')");
    expect(migration).not.toContain("release.status='active'");
    expect(migration).not.toContain("release.status in ('draft'");
    expect(ingress).toMatch(/requester\.rpc\(\s*"estimate_resolve_default_price_snapshot_ids_v1"/u);
    expect(ingress).toContain("compatibleDefaults: compatibleDefaultPriceSnapshotIds");
    expect(worker).toContain('admin.rpc("estimate_resolve_compile_price_items_v2"');
    expect(worker).not.toContain('.limit(20_000)');
    expect(local).toContain("public.estimate_resolve_compile_price_items_v2($2::uuid,$1::uuid[])");
    expect(scopedMigration).toContain("snapshot.captured_at<=now()");
    expect(scopedMigration).toContain("resource.definition_version_id=p_definition_version_id");
    expect(scopedMigration).not.toContain("resource.category");
    expect(scopedMigration).not.toMatch(/\blimit\s+\d+/iu);
    expect(local).not.toContain("limit 20000");
  });

  it("maps only compatible known strip-foundation prices and leaves the rest missing", () => {
    const migration = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/migrations/20260922050000_strip_foundation_compatible_known_prices.sql"),
      "utf8",
    );
    for (const rowId of [
      "main_concrete",
      "reinforcement",
      "binding_wire",
      "formwork_system",
      "reinforcement_install",
    ]) expect(migration).toContain(`('${rowId}'`);
    expect(migration).toContain("unknownRowsRemainUnpriced");
    expect(migration).toContain("manualPriceOverridePreserved");
    expect(migration).not.toContain("('preparation_concrete'");
    expect(migration).not.toContain("('formwork_install'");
    expect(migration).not.toContain("('concrete_placement'");
  });
});
