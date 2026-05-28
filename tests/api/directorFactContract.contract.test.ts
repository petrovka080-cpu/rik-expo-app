import fs from "node:fs";
import path from "node:path";

import {
  WITHOUT_LEVEL,
  WITHOUT_OBJECT,
  matchesDirectorObjectIdentity,
  resolveDirectorFactContext,
  type RequestLookupRow,
} from "../../src/lib/api/director_reports.shared";
import {
  DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT,
  DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT,
} from "../../src/lib/api/director_reports.aggregation.contracts";

const repoRoot = path.resolve(__dirname, "..", "..");
const read = (...parts: string[]) => fs.readFileSync(path.join(repoRoot, ...parts), "utf8");

const requestRow = (overrides: Partial<RequestLookupRow> = {}): RequestLookupRow => ({
  id: "request-1",
  request_no: null,
  display_no: null,
  status: "submitted",
  object_id: "legacy-object-id",
  object_name: "legacy object display",
  object_type_code: null,
  object_identity_key: null,
  object_identity_name: null,
  object_identity_status: null,
  object_identity_source: null,
  system_code: null,
  level_code: null,
  zone_code: null,
  object: null,
  submitted_at: null,
  created_at: null,
  note: null,
  comment: null,
  item_count_total: null,
  item_count_active: null,
  item_qty_total: null,
  item_qty_active: null,
  ...overrides,
});

describe("director fact context contract", () => {
  it("is an explicit part of the director reports transport contract", () => {
    expect(DIRECTOR_REPORTS_SERVER_AGGREGATION_CONTRACT.factContextContract).toBe(
      DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT,
    );
    expect(DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT).toEqual(
      expect.objectContaining({
        contractId: "director_fact_context_contract_v1",
        owner: "director_report_transport_scope_v1",
        version: "v1",
      }),
    );
    expect(DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT.requiredResolvedFields).toEqual([
      "object_id_resolved",
      "object_name_resolved",
      "work_name_resolved",
      "level_name_resolved",
      "system_name_resolved",
      "zone_name_resolved",
      "is_without_request",
    ]);
    expect(DIRECTOR_REPORTS_FACT_CONTEXT_CONTRACT.forbiddenClientResponsibilities).toEqual(
      expect.arrayContaining([
        "client_full_table_fact_aggregation",
        "client_report_kpi_recompute",
        "client_purchase_cost_object_matching",
        "client_warehouse_issue_note_as_primary_schema",
        "ui_screen_local_report_calculation",
      ]),
    );
  });

  it("prefers the stable request object identity projection over legacy display text", () => {
    const context = resolveDirectorFactContext({
      request_id: "request-1",
      request: requestRow({
        object_id: "legacy-object-id",
        object_name: "legacy display text",
        object_identity_key: "OBJ-STABLE-001",
        object_identity_name: "Stable construction object",
      }),
      issue_object_id: "issue-object-id",
      issue_object_name: "issue object text",
      request_object_type_name: "object type fallback",
    });

    expect(context.object_id_resolved).toBe("OBJ-STABLE-001");
    expect(context.object_name_resolved).toBe("Stable construction object");
    expect(context.is_without_request).toBe(false);
  });

  it("keeps work and location semantics above generic item-kind fallback", () => {
    const context = resolveDirectorFactContext({
      request_id: "request-1",
      item_kind: "material",
      request: requestRow({
        system_code: "HVAC",
        zone_code: "Cafe hall",
        level_code: "Level 2",
      }),
      request_system_name: "Ventilation",
      request_zone_name: "Kitchen",
    });

    expect(context.work_name_resolved).toBe("Ventilation");
    expect(context.level_name_resolved).toBe("Level 2");
    expect(context.system_name_resolved).toBe("Ventilation");
    expect(context.zone_name_resolved).toBe("Kitchen");
  });

  it("fails closed to explicit without-object/without-level buckets when free-note object fallback is disabled", () => {
    const context = resolveDirectorFactContext({
      request_id: null,
      request_item_id: null,
      issue_note: "free issue note text that must not become primary schema",
      use_free_issue_object_fallback: false,
      item_kind: "material",
    });

    expect(context.object_name_resolved).toBe(WITHOUT_OBJECT);
    expect(context.level_name_resolved).toBe(WITHOUT_LEVEL);
    expect(context.is_without_request).toBe(true);
  });

  it("matches object filters by stable key before falling back to canonical display text", () => {
    expect(
      matchesDirectorObjectIdentity(
        "Stable construction object",
        {
          object_id_resolved: "OBJ-STABLE-001",
          object_name_resolved: "legacy text",
        },
        { "Stable construction object": "OBJ-STABLE-001" },
      ),
    ).toBe(true);

    expect(
      matchesDirectorObjectIdentity(
        "Other construction object",
        {
          object_id_resolved: "OBJ-STABLE-001",
          object_name_resolved: "legacy text",
        },
        { "Other construction object": "OBJ-STABLE-999" },
      ),
    ).toBe(false);
  });

  it("keeps active director report loaders on the backend transport instead of client-side fact parsing", () => {
    const activeSources = [
      read("src", "lib", "api", "directorReportsTransport.service.ts"),
      read("src", "lib", "api", "directorReportsScope.service.ts"),
      read("src", "lib", "api", "director_reports.service.options.ts"),
      read("src", "lib", "api", "director_reports.service.report.ts"),
      read("src", "lib", "api", "director_reports.service.discipline.ts"),
      read("src", "screens", "director", "reports", "useDirectorReportsQuery.ts"),
    ].join("\n");

    expect(activeSources).toContain("loadDirectorReportTransportScope");
    expect(activeSources).not.toContain("fetchAllFactRowsFromTables");
    expect(activeSources).not.toContain("fetchAllFactRowsFromView");
    expect(activeSources).not.toContain("fetchDirectorFactViaAccRpc");
    expect(activeSources).not.toContain("buildPayloadFromFactRows");
    expect(activeSources).not.toContain("buildDisciplinePayloadFromFactRows");
    expect(activeSources).not.toMatch(/\.from\(["']warehouse_issues["']\)/);
    expect(activeSources).not.toMatch(/parseFreeIssueContext\(/);
  });
});
