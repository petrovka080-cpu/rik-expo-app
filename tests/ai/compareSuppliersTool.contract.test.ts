import fs from "fs";
import path from "path";

import {
  COMPARE_SUPPLIERS_MAX_LIMIT,
  COMPARE_SUPPLIERS_NEXT_ACTION,
  runCompareSuppliersToolSafeRead,
} from "../../src/features/ai/tools/compareSuppliersTool";
import {
  compareSuppliersInputSchema,
  compareSuppliersOutputSchema,
} from "../../src/features/ai/schemas/aiToolSchemas";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/features/ai/tools/compareSuppliersTool.ts");

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;
const directorAuth = { userId: "director-user", role: "director" } as const;
const contractorAuth = { userId: "contractor-user", role: "contractor" } as const;

describe("compare_suppliers safe-read tool", () => {
  it("keeps the permanent schema on material_ids/project_id/location/limit and evidence output", () => {
    expect(compareSuppliersInputSchema).toMatchObject({
      required: ["material_ids"],
      additionalProperties: false,
      properties: {
        material_ids: expect.objectContaining({
          type: "array",
          minItems: 1,
          maxItems: 20,
        }),
        project_id: expect.objectContaining({ type: "string", minLength: 1 }),
        location: expect.objectContaining({ type: "string", minLength: 1 }),
        limit: expect.objectContaining({ type: "number", maximum: COMPARE_SUPPLIERS_MAX_LIMIT }),
      },
    });
    expect(compareSuppliersInputSchema.properties).not.toHaveProperty("materialName");
    expect(compareSuppliersInputSchema.properties).not.toHaveProperty("supplierIds");
    expect(compareSuppliersOutputSchema).toMatchObject({
      required: [
        "supplier_cards",
        "price_range",
        "delivery_range",
        "risk_flags",
        "recommendation_summary",
        "evidence_refs",
        "next_action",
        "bounded",
        "mutation_count",
        "no_supplier_confirmation",
        "no_order_created",
        "no_rfq_sent",
        "warehouse_unchanged",
      ],
      additionalProperties: false,
      properties: {
        supplier_cards: expect.objectContaining({ type: "array" }),
        price_range: expect.objectContaining({ type: "object" }),
        delivery_range: expect.objectContaining({ type: "object" }),
        risk_flags: expect.objectContaining({ type: "array" }),
        recommendation_summary: expect.objectContaining({ type: "string", minLength: 1 }),
        evidence_refs: expect.objectContaining({ type: "array" }),
        next_action: expect.objectContaining({ enum: [COMPARE_SUPPLIERS_NEXT_ACTION] }),
      },
    });
  });

  it("runs only as a buyer-visible SAFE_READ with bounded supplier reads and evidence refs", async () => {
    const calls: { query: string; limit: number }[] = [];
    const result = await runCompareSuppliersToolSafeRead({
      auth: buyerAuth,
      input: {
        material_ids: [" MAT-1 ", "MAT-1", "MAT-2"],
        project_id: " PROJECT-7 ",
        location: "Bishkek",
        limit: 99,
      },
      listSuppliers: async (query, limit) => {
        calls.push({ query, limit });
        return [
          {
            id: "supplier-a",
            name: "Supplier A",
            specialization: "cement and rebar",
            address: "Bishkek",
            website: "https://supplier-a.example",
          },
          {
            id: "supplier-b",
            name: "Supplier B",
            specialization: "general materials",
            address: "Osh",
          },
        ];
      },
    });

    expect(calls).toEqual([
      {
        query: "MAT-1 MAT-2 Bishkek",
        limit: COMPARE_SUPPLIERS_MAX_LIMIT,
      },
    ]);
    expect(result).toMatchObject({
      ok: true,
      data: {
        bounded: true,
        mutation_count: 0,
        next_action: COMPARE_SUPPLIERS_NEXT_ACTION,
        evidence_refs: [
          "catalog:compare_suppliers:supplier:1",
          "catalog:compare_suppliers:supplier:2",
        ],
        no_supplier_confirmation: true,
        no_order_created: true,
        no_rfq_sent: true,
        warehouse_unchanged: true,
        price_range: {
          status: "not_available_in_safe_read",
        },
        delivery_range: {
          status: "not_available_in_safe_read",
        },
      },
    });
    if (!result.ok) throw new Error("expected compare_suppliers success");
    expect(result.data.supplier_cards).toEqual([
      {
        supplier_id: "supplier-a",
        supplier_name: "Supplier A",
        summary: "Supplier candidate with specialization evidence, location evidence, public website evidence.",
        risk_flags: [],
        evidence_ref: "catalog:compare_suppliers:supplier:1",
      },
      {
        supplier_id: "supplier-b",
        supplier_name: "Supplier B",
        summary: "Supplier candidate with specialization evidence, location evidence.",
        risk_flags: ["location_match_not_proven"],
        evidence_ref: "catalog:compare_suppliers:supplier:2",
      },
    ]);
    expect(result.data.risk_flags).toEqual([
      "price_evidence_not_available_in_safe_read",
      "delivery_evidence_not_available_in_safe_read",
      "location_match_not_proven",
    ]);
    expect(result.data.recommendation_summary).toContain("2 evidence ref(s)");
  });

  it("requires auth, role visibility, and valid material ids before any read", async () => {
    const reads: string[] = [];
    const listSuppliers = async () => {
      reads.push("read");
      return [];
    };

    await expect(
      runCompareSuppliersToolSafeRead({
        auth: null,
        input: { material_ids: ["MAT-1"] },
        listSuppliers,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "COMPARE_SUPPLIERS_AUTH_REQUIRED" },
    });
    await expect(
      runCompareSuppliersToolSafeRead({
        auth: contractorAuth,
        input: { material_ids: ["MAT-1"] },
        listSuppliers,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "COMPARE_SUPPLIERS_ROLE_NOT_ALLOWED" },
    });
    await expect(
      runCompareSuppliersToolSafeRead({
        auth: directorAuth,
        input: { material_ids: [" "] },
        listSuppliers,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "COMPARE_SUPPLIERS_INVALID_INPUT" },
    });
    expect(reads).toEqual([]);
  });

  it("uses the AI supplier transport boundary and has no direct database, mutation, or model surface", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain('transport/compareSuppliers.transport"');
    expect(source).not.toContain('catalog.facade"');
    expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/\.(from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/createOrder|create_order|confirmSupplier|confirm_supplier|sendRfq|sendRFQ|send_rfq/i);
    expect(source).not.toMatch(/changeWarehouse|change_warehouse|changePayment|change_payment/i);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });
});
