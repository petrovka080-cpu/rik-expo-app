import fs from "fs";
import path from "path";

import {
  DRAFT_REQUEST_MAX_ITEMS,
  DRAFT_REQUEST_NEXT_ACTION,
  DRAFT_REQUEST_RISK_LEVEL,
  runDraftRequestToolDraftOnly,
} from "../../src/features/ai/tools/draftRequestTool";
import {
  draftRequestInputSchema,
  draftRequestOutputSchema,
} from "../../src/features/ai/schemas/aiToolSchemas";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/features/ai/tools/draftRequestTool.ts");

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;
const directorAuth = { userId: "director-user", role: "director" } as const;

describe("draft_request DRAFT_ONLY tool", () => {
  it("keeps the permanent draft_request schema on project/items input and approval-gated output", () => {
    expect(draftRequestInputSchema).toMatchObject({
      required: ["project_id", "items"],
      additionalProperties: false,
      properties: {
        project_id: expect.objectContaining({ type: "string", minLength: 1 }),
        items: expect.objectContaining({
          type: "array",
          minItems: 1,
          maxItems: DRAFT_REQUEST_MAX_ITEMS,
        }),
        preferred_supplier_id: expect.objectContaining({ type: "string", minLength: 1 }),
        delivery_window: expect.objectContaining({ type: "string", minLength: 1 }),
        notes: expect.objectContaining({ type: "string", minLength: 1 }),
      },
    });
    expect(draftRequestInputSchema.properties).not.toHaveProperty("objectId");
    expect(draftRequestInputSchema.properties).not.toHaveProperty("materials");
    expect(draftRequestOutputSchema).toMatchObject({
      required: [
        "draft_preview",
        "items_normalized",
        "missing_fields",
        "risk_flags",
        "requires_approval",
        "next_action",
        "evidence_refs",
        "risk_level",
        "bounded",
        "persisted",
        "idempotency_required_if_persisted",
        "mutation_count",
        "final_submit",
        "supplier_confirmation",
        "order_created",
        "warehouse_mutation",
      ],
      additionalProperties: false,
      properties: {
        draft_preview: expect.objectContaining({ type: "string", minLength: 1 }),
        items_normalized: expect.objectContaining({ type: "array" }),
        missing_fields: expect.objectContaining({ type: "array" }),
        risk_flags: expect.objectContaining({ type: "array" }),
        requires_approval: expect.objectContaining({ type: "boolean" }),
        next_action: expect.objectContaining({ enum: [DRAFT_REQUEST_NEXT_ACTION] }),
        evidence_refs: expect.objectContaining({ type: "array" }),
        risk_level: expect.objectContaining({ enum: [DRAFT_REQUEST_RISK_LEVEL] }),
      },
    });
    expect(draftRequestOutputSchema.properties).not.toHaveProperty("draftPreview");
    expect(draftRequestOutputSchema.properties).not.toHaveProperty("approvalRequired");
    expect(draftRequestOutputSchema.properties).not.toHaveProperty("evidenceRefs");
  });

  it("returns a bounded draft preview with normalized items, evidence, and approval requirement", async () => {
    const result = await runDraftRequestToolDraftOnly({
      auth: buyerAuth,
      input: {
        project_id: " project-123 ",
        preferred_supplier_id: " supplier-77 ",
        delivery_window: " 2026-05-20 / 2026-05-25 ",
        notes: " Use certified materials ",
        items: [
          {
            material_id: " mat-1 ",
            material_code: " CEM-500 ",
            name: " Cement M500 ",
            quantity: 12,
            unit: " bag ",
          },
          {
            name: " Rebar 12 ",
            quantity: 30,
            unit: " m ",
            notes: " staged delivery ",
          },
        ],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        items_normalized: [
          {
            line: 1,
            material_id: "mat-1",
            material_code: "CEM-500",
            name: "Cement M500",
            quantity: 12,
            unit: "bag",
            evidence_ref: "draft_request:input:item:1",
          },
          {
            line: 2,
            name: "Rebar 12",
            quantity: 30,
            unit: "m",
            notes: "staged delivery",
            evidence_ref: "draft_request:input:item:2",
          },
        ],
        missing_fields: [],
        risk_flags: ["preferred_supplier_requires_approval"],
        requires_approval: true,
        next_action: DRAFT_REQUEST_NEXT_ACTION,
        evidence_refs: [
          "draft_request:input:project",
          "draft_request:input:item:1",
          "draft_request:input:item:2",
        ],
        risk_level: DRAFT_REQUEST_RISK_LEVEL,
        bounded: true,
        persisted: false,
        idempotency_required_if_persisted: true,
        mutation_count: 0,
        final_submit: 0,
        supplier_confirmation: 0,
        order_created: 0,
        warehouse_mutation: 0,
      },
    });
    if (!result.ok) throw new Error("expected draft_request success");
    expect(result.data.draft_preview).toContain("submit_for_approval");
  });

  it("requires auth, visible draft role, and object input before producing a preview", async () => {
    await expect(
      runDraftRequestToolDraftOnly({
        auth: null,
        input: { project_id: "project-1", items: [] },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_REQUEST_AUTH_REQUIRED" },
    });

    await expect(
      runDraftRequestToolDraftOnly({
        auth: { userId: "contractor-user", role: "contractor" },
        input: { project_id: "project-1", items: [] },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_REQUEST_ROLE_NOT_ALLOWED" },
    });

    await expect(
      runDraftRequestToolDraftOnly({
        auth: directorAuth,
        input: "draft",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_REQUEST_INVALID_INPUT" },
    });
  });

  it("has no direct database, model provider, final submit, supplier confirmation, order, or warehouse mutation surface", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/\.(from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/submitRequest|submit_request\s*\(|finalizeRequest|finalize_request/i);
    expect(source).not.toMatch(/confirmSupplier|confirm_supplier/i);
    expect(source).not.toMatch(/createOrder|create_order/i);
    expect(source).not.toMatch(/reserveStock|reserve_stock|applyIssue|apply_issue|warehouseMutation/i);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });
});
