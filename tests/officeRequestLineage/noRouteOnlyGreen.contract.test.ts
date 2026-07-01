import fs from "node:fs";
import path from "node:path";
import { buildRequestLineageAudit } from "../../src/features/office/requestLineageSnapshot";
import { createSnapshot, createStages } from "./lineageTestHelpers";

const ROOT = process.cwd();

describe("office request lineage no route-only green", () => {
  it("rejects downstream route visibility without business data", () => {
    const snapshot = createSnapshot("ai_estimate");
    const { audit } = buildRequestLineageAudit({
      snapshots: [snapshot],
      stagesByKind: {
        ai_estimate: createStages({
          accountant_view: {
            visibleInUi: true,
            items: [],
            itemsVerified: false,
            amountsVerified: false,
          },
        }),
      },
    });

    expect(audit.no_route_only_green).toBe(false);
    expect(audit.failureReasons).toContain("no_route_only_green");
  });

  it("keeps the live lineage gate wired as a no-build command", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    expect(packageJson.scripts?.["gate:office-request-lineage-live"]).toBe(
      "tsx scripts/gates/runOfficeRequestLineageLiveGate.ts",
    );
  });

  it("keeps foreman planned price wired through local draft sync and the RPC contract", () => {
    const mapperSource = fs.readFileSync(
      path.join(ROOT, "src/lib/foremanAiEstimate/mapAiEstimateToForemanDraft.ts"),
      "utf8",
    );
    const localDraftSource = fs.readFileSync(
      path.join(ROOT, "src/screens/foreman/foreman.localDraft.ts"),
      "utf8",
    );
    const syncSource = fs.readFileSync(
      path.join(ROOT, "src/lib/api/requestDraftSync.service.ts"),
      "utf8",
    );
    const migrationSource = fs.readFileSync(
      path.join(ROOT, "supabase/migrations/20260702090000_request_sync_draft_v2_price_lineage_v1.sql"),
      "utf8",
    );

    expect(mapperSource).toContain("price: Number.isFinite(Number(row.unitPrice))");
    expect(localDraftSource).toContain("price: item.price ?? null");
    expect(syncSource).toContain("price: asNonNegativeNumberOrNull(line.price)");
    expect(migrationSource).toContain("v_price");
    expect(migrationSource).toContain("price = case when v_has_price and v_price is not null then v_price else price end");
    expect(migrationSource).toContain("'price', ri.price");
  });
});
