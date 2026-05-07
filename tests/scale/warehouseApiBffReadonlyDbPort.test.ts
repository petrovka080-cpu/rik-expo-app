import {
  buildWarehouseApiReadQueryPlans,
  createWarehouseApiBffReadonlyDbPort,
} from "../../scripts/server/stagingBffWarehouseApiReadPort";
import type { WarehouseApiBffRequestDto } from "../../src/screens/warehouse/warehouse.api.bff.contract";

const mutationPattern = /;|\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|call|copy|merge)\b/i;

describe("warehouse API BFF readonly DB port", () => {
  it("creates no port when the readonly DB URL is missing", () => {
    expect(createWarehouseApiBffReadonlyDbPort({})).toBeUndefined();
  });

  it("creates a read port without exposing the DB URL", () => {
    const port = createWarehouseApiBffReadonlyDbPort({
      BFF_DATABASE_READONLY_URL: "postgres://readonly:secret@example.invalid/db",
    });

    expect(port).toEqual(
      expect.objectContaining({
        runWarehouseApiRead: expect.any(Function),
      }),
    );
    expect(JSON.stringify(port)).not.toContain("postgres://");
    expect(JSON.stringify(port)).not.toContain("secret");
  });

  it("builds parameterized SELECT-only plans for all warehouse API read operations", () => {
    const requests: WarehouseApiBffRequestDto[] = [
      {
        operation: "warehouse.api.reports.bundle",
        args: { p_from: "2026-01-01", p_to: "2026-01-31" },
      },
      {
        operation: "warehouse.api.report.issue_lines",
        args: { p_issue_id: 123 },
      },
      {
        operation: "warehouse.api.report.issued_materials_fast",
        args: {
          p_from: "2026-01-01",
          p_to: "2026-01-31",
          p_object_id: "00000000-0000-0000-0000-000000000001",
        },
      },
      {
        operation: "warehouse.api.report.issued_by_object_fast",
        args: {
          p_from: "2026-01-01",
          p_to: "2026-01-31",
          p_object_id: "00000000-0000-0000-0000-000000000001",
        },
      },
      {
        operation: "warehouse.api.report.incoming_v2",
        args: { p_from: "2026-01-01", p_to: "2026-01-31" },
      },
      {
        operation: "warehouse.api.ledger.incoming",
        args: { p_from: "2026-01-01", p_to: "2026-01-31" },
        page: { page: 2, pageSize: 10 },
      },
      {
        operation: "warehouse.api.ledger.incoming_lines",
        args: { incomingId: "00000000-0000-0000-0000-000000000001" },
        page: { page: 1, pageSize: 25 },
      },
      {
        operation: "warehouse.api.incoming.queue",
        args: { p_offset: 100, p_limit: 50 },
      },
      {
        operation: "warehouse.api.incoming.items",
        args: { p_incoming_id: "00000000-0000-0000-0000-000000000003" },
      },
      {
        operation: "warehouse.api.issue.queue",
        args: { p_offset: 150, p_limit: 75 },
      },
      {
        operation: "warehouse.api.issue.items",
        args: { p_request_id: "00000000-0000-0000-0000-000000000004" },
      },
      {
        operation: "warehouse.api.stock.scope",
        args: { p_offset: 40, p_limit: 20 },
      },
      {
        operation: "warehouse.api.uom.material_unit",
        args: { matCode: "MAT-001" },
      },
      {
        operation: "warehouse.api.uom.code",
        args: { unitId: "00000000-0000-0000-0000-000000000002" },
      },
    ];

    const plans = requests.flatMap(buildWarehouseApiReadQueryPlans);

    expect(plans.map((plan) => plan.readOnly).every(Boolean)).toBe(true);
    expect(plans).toHaveLength(16);
    for (const plan of plans) {
      expect(plan.sql.toLowerCase().startsWith("select ")).toBe(true);
      expect(plan.sql).not.toMatch(mutationPattern);
      expect(plan.sql).not.toContain("2026-01-01");
      expect(plan.sql).not.toContain("00000000-0000-0000-0000-000000000001");
      expect(Array.isArray(plan.values)).toBe(true);
    }

    expect(plans.some((plan) => plan.sql.includes("limit $3 offset $4"))).toBe(true);
    expect(plans.some((plan) => plan.sql.includes("limit $2 offset $3"))).toBe(true);
    expect(plans.some((plan) => plan.sql.includes("acc_report_stock"))).toBe(true);
    expect(plans.some((plan) => plan.sql.includes("wh_report_issued_materials_fast"))).toBe(true);
    expect(plans.some((plan) => plan.sql.includes("warehouse_incoming_queue_scope_v1"))).toBe(true);
    expect(plans.some((plan) => plan.sql.includes("warehouse_incoming_items_scope_v1"))).toBe(true);
    expect(plans.some((plan) => plan.sql.includes("warehouse_issue_queue_scope_v4"))).toBe(true);
    expect(plans.some((plan) => plan.sql.includes("warehouse_issue_items_scope_v1"))).toBe(true);
    expect(plans.some((plan) => plan.sql.includes("warehouse_stock_scope_v2"))).toBe(true);
    expect(plans.some((plan) => plan.sql.includes("from public.rik_materials"))).toBe(true);
    expect(plans.some((plan) => plan.sql.includes("from public.rik_uoms"))).toBe(true);
    expect(plans.some((plan) => plan.values.includes("MAT-001"))).toBe(true);
    expect(plans.some((plan) => plan.values.includes(150))).toBe(true);
  });
});
