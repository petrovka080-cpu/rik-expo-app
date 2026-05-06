import {
  buildDirectorFinanceRpcReadonlyQueryPlan,
  createDirectorFinanceRpcReadonlyDbPort,
} from "../../scripts/server/stagingBffDirectorFinanceRpcPort";

describe("director finance BFF readonly RPC DB port", () => {
  it("creates no port when BFF_DATABASE_READONLY_URL is missing", () => {
    expect(createDirectorFinanceRpcReadonlyDbPort({})).toBeUndefined();
  });

  it("creates a redacted readonly RPC port when DB URL is present", () => {
    const port = createDirectorFinanceRpcReadonlyDbPort({
      BFF_DATABASE_READONLY_URL: "postgres://readonly:secret@example.invalid/db",
    });

    expect(port).toEqual(
      expect.objectContaining({
        runDirectorFinanceRpc: expect.any(Function),
      }),
    );
    expect(JSON.stringify(port)).not.toContain("postgres://");
    expect(JSON.stringify(port)).not.toContain("secret");
  });

  it("builds parameterized SELECT-only plans for all director finance RPC operations", () => {
    const plans = [
      buildDirectorFinanceRpcReadonlyQueryPlan({
        operation: "director.finance.summary.v1",
        args: { p_from: "2026-01-01", p_to: "2026-01-31", p_due_days: 7, p_critical_days: 14 },
      }),
      buildDirectorFinanceRpcReadonlyQueryPlan({
        operation: "director.finance.summary.v2",
        args: {
          p_object_id: "00000000-0000-0000-0000-000000000001",
          p_date_from: "2026-01-01",
          p_date_to: "2026-01-31",
        },
      }),
      buildDirectorFinanceRpcReadonlyQueryPlan({
        operation: "director.finance.panel_scope.v1",
        args: { p_from: "2026-01-01", p_to: "2026-01-31", p_due_days: 7, p_critical_days: 14 },
      }),
      buildDirectorFinanceRpcReadonlyQueryPlan({
        operation: "director.finance.panel_scope.v2",
        args: {
          p_object_id: "00000000-0000-0000-0000-000000000001",
          p_date_from: "2026-01-01",
          p_date_to: "2026-01-31",
          p_limit: 50,
          p_offset: 0,
        },
      }),
      buildDirectorFinanceRpcReadonlyQueryPlan({
        operation: "director.finance.panel_scope.v3",
        args: {
          p_object_id: "00000000-0000-0000-0000-000000000001",
          p_date_from: "2026-01-01",
          p_date_to: "2026-01-31",
          p_due_days: 7,
          p_critical_days: 14,
          p_limit: 50,
          p_offset: 0,
        },
      }),
      buildDirectorFinanceRpcReadonlyQueryPlan({
        operation: "director.finance.panel_scope.v4",
        args: {
          p_object_id: "00000000-0000-0000-0000-000000000001",
          p_date_from: "2026-01-01",
          p_date_to: "2026-01-31",
          p_due_days: 7,
          p_critical_days: 14,
          p_limit: 50,
          p_offset: 0,
        },
      }),
      buildDirectorFinanceRpcReadonlyQueryPlan({
        operation: "director.finance.supplier_scope.v1",
        args: {
          p_supplier: "supplier-redacted",
          p_kind_name: "kind-redacted",
          p_from: "2026-01-01",
          p_to: "2026-01-31",
          p_due_days: 7,
          p_critical_days: 14,
        },
      }),
      buildDirectorFinanceRpcReadonlyQueryPlan({
        operation: "director.finance.supplier_scope.v2",
        args: {
          p_supplier: "supplier-redacted",
          p_kind_name: "kind-redacted",
          p_object_id: "00000000-0000-0000-0000-000000000001",
          p_from: "2026-01-01",
          p_to: "2026-01-31",
          p_due_days: 7,
          p_critical_days: 14,
        },
      }),
    ];

    expect(plans.map((plan) => plan.operation)).toEqual([
      "director.finance.summary.v1",
      "director.finance.summary.v2",
      "director.finance.panel_scope.v1",
      "director.finance.panel_scope.v2",
      "director.finance.panel_scope.v3",
      "director.finance.panel_scope.v4",
      "director.finance.supplier_scope.v1",
      "director.finance.supplier_scope.v2",
    ]);

    for (const plan of plans) {
      expect(plan.readOnly).toBe(true);
      expect(plan.sql.toLowerCase().startsWith("select ")).toBe(true);
      expect(plan.sql).toContain("public.director_finance_");
      expect(plan.sql).toMatch(/\$1::/);
      expect(plan.sql).not.toMatch(/;|\b(insert|update|delete|truncate|alter|drop|create|grant|revoke|call|copy|merge)\b/i);
      expect(plan.sql).not.toContain("supplier-redacted");
      expect(plan.sql).not.toContain("00000000-0000-0000-0000-000000000001");
      expect(plan.values.length).toBeGreaterThan(0);
    }
  });
});
