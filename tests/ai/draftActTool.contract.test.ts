import fs from "fs";
import path from "path";

import {
  DRAFT_ACT_MAX_EVIDENCE_REFS,
  DRAFT_ACT_MAX_WORK_ITEMS,
  DRAFT_ACT_NEXT_ACTION,
  DRAFT_ACT_RISK_LEVEL,
  runDraftActToolDraftOnly,
} from "../../src/features/ai/tools/draftActTool";
import type { DraftActToolAuthContext } from "../../src/features/ai/tools/draftActTool";
import {
  draftActInputSchema,
  draftActOutputSchema,
} from "../../src/features/ai/schemas/aiToolSchemas";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/features/ai/tools/draftActTool.ts");

const contractorAuth = {
  userId: "contractor-user",
  role: "contractor",
} satisfies DraftActToolAuthContext;

const foremanAuth = {
  userId: "foreman-user",
  role: "foreman",
} satisfies DraftActToolAuthContext;

describe("draft_act DRAFT_ONLY tool", () => {
  it("keeps the permanent draft_act schema on subcontract/work input and approval-gated output", () => {
    expect(draftActInputSchema).toMatchObject({
      required: ["subcontract_id", "act_kind", "work_summary"],
      additionalProperties: false,
      properties: {
        subcontract_id: expect.objectContaining({ type: "string", minLength: 1 }),
        act_kind: expect.objectContaining({
          enum: ["work_completion", "materials_handover", "subcontract_progress"],
        }),
        work_summary: expect.objectContaining({ type: "string", minLength: 1 }),
        work_items: expect.objectContaining({
          type: "array",
          maxItems: DRAFT_ACT_MAX_WORK_ITEMS,
        }),
        period_start: expect.objectContaining({ type: "string", minLength: 10 }),
        period_end: expect.objectContaining({ type: "string", minLength: 10 }),
        source_evidence_refs: expect.objectContaining({
          type: "array",
          maxItems: DRAFT_ACT_MAX_EVIDENCE_REFS,
        }),
      },
    });
    expect(draftActInputSchema.properties).not.toHaveProperty("subcontractId");
    expect(draftActInputSchema.properties).not.toHaveProperty("workSummary");
    expect(draftActInputSchema.properties).not.toHaveProperty("documentId");

    expect(draftActOutputSchema).toMatchObject({
      required: [
        "draft_preview",
        "act_kind",
        "draft_sections",
        "work_items_normalized",
        "missing_data",
        "missing_fields",
        "risk_flags",
        "requires_review",
        "requires_approval_for_send",
        "requires_approval",
        "next_action",
        "evidence_refs",
        "risk_level",
        "role_scope",
        "role_scoped",
        "bounded",
        "persisted",
        "idempotency_required_if_persisted",
        "mutation_count",
        "final_pdf_send",
        "external_share",
        "final_status_change",
        "signature",
        "payment_status_change",
        "final_submit",
        "act_signed",
        "contractor_confirmation",
        "payment_mutation",
        "warehouse_mutation",
      ],
      additionalProperties: false,
      properties: {
        draft_preview: expect.objectContaining({ type: "string", minLength: 1 }),
        act_kind: expect.objectContaining({
          enum: ["work_completion", "materials_handover", "subcontract_progress"],
        }),
        draft_sections: expect.objectContaining({ type: "array" }),
        work_items_normalized: expect.objectContaining({ type: "array" }),
        missing_data: expect.objectContaining({ type: "array" }),
        requires_review: expect.objectContaining({ type: "boolean" }),
        requires_approval_for_send: expect.objectContaining({ type: "boolean" }),
        requires_approval: expect.objectContaining({ type: "boolean" }),
        next_action: expect.objectContaining({ enum: [DRAFT_ACT_NEXT_ACTION] }),
        risk_level: expect.objectContaining({ enum: [DRAFT_ACT_RISK_LEVEL] }),
        role_scope: expect.objectContaining({
          enum: [
            "director_control_subcontract_scope",
            "foreman_subcontract_scope",
            "contractor_own_subcontract_scope",
          ],
        }),
      },
    });
    expect(draftActOutputSchema.properties).not.toHaveProperty("draftPreview");
    expect(draftActOutputSchema.properties).not.toHaveProperty("approvalRequired");
    expect(draftActOutputSchema.properties).not.toHaveProperty("evidenceRefs");
  });

  it("returns a bounded contractor-scoped act draft preview with evidence and approval requirement", async () => {
    const result = await runDraftActToolDraftOnly({
      auth: contractorAuth,
      input: {
        subcontract_id: " subcontract-42 ",
        act_kind: "work_completion",
        work_summary: " completed third floor masonry ",
        period_start: "2026-05-01T09:00:00Z",
        period_end: "2026-05-12",
        source_evidence_refs: [" contractor:task:own:1 ", "document:act-source:7"],
        work_items: [
          {
            name: " Masonry ",
            quantity: 18,
            unit: "m2",
            notes: " accepted visually ",
          },
          {
            name: " Cleanup ",
            quantity: 1,
            unit: "lot",
          },
        ],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        act_kind: "work_completion",
        draft_sections: [
          {
            section: "work_summary",
            title: "work summary",
            status: "draft_placeholder",
            evidence_ref: "draft_act:section:work_summary",
          },
          {
            section: "work_items",
            title: "work items",
            status: "draft_placeholder",
            evidence_ref: "draft_act:section:work_items",
          },
          {
            section: "review_and_send_boundary",
            title: "review and send boundary",
            status: "draft_placeholder",
            evidence_ref: "draft_act:section:review_and_send_boundary",
          },
        ],
        work_items_normalized: [
          {
            line: 1,
            name: "Masonry",
            quantity: 18,
            unit: "m2",
            notes: "accepted visually",
            evidence_ref: "draft_act:input:work_item:1",
          },
          {
            line: 2,
            name: "Cleanup",
            quantity: 1,
            unit: "lot",
            evidence_ref: "draft_act:input:work_item:2",
          },
        ],
        missing_data: [],
        missing_fields: [],
        risk_flags: ["contractor_own_subcontract_scope_only"],
        requires_review: true,
        requires_approval_for_send: true,
        requires_approval: true,
        next_action: DRAFT_ACT_NEXT_ACTION,
        evidence_refs: [
          "draft_act:input:subcontract",
          "contractor:task:own:1",
          "document:act-source:7",
          "draft_act:input:work_item:1",
          "draft_act:input:work_item:2",
          "draft_act:section:work_summary",
          "draft_act:section:work_items",
          "draft_act:section:review_and_send_boundary",
        ],
        risk_level: DRAFT_ACT_RISK_LEVEL,
        role_scope: "contractor_own_subcontract_scope",
        role_scoped: true,
        bounded: true,
        persisted: false,
        idempotency_required_if_persisted: true,
        mutation_count: 0,
        final_pdf_send: 0,
        external_share: 0,
        final_status_change: 0,
        signature: 0,
        payment_status_change: 0,
        final_submit: 0,
        act_signed: 0,
        contractor_confirmation: 0,
        payment_mutation: 0,
        warehouse_mutation: 0,
      },
    });
    if (!result.ok) throw new Error("expected draft_act success");
    expect(result.data.draft_preview).toContain("submit_for_approval");
  });

  it("requires auth, visible draft role, and object input before producing a preview", async () => {
    await expect(
      runDraftActToolDraftOnly({
        auth: null,
        input: { subcontract_id: "subcontract-1", act_kind: "work_completion", work_summary: "done" },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_ACT_AUTH_REQUIRED" },
    });

    await expect(
      runDraftActToolDraftOnly({
        auth: { userId: "buyer-user", role: "buyer" },
        input: { subcontract_id: "subcontract-1", act_kind: "work_completion", work_summary: "done" },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_ACT_ROLE_NOT_ALLOWED" },
    });

    await expect(
      runDraftActToolDraftOnly({
        auth: foremanAuth,
        input: "draft",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_ACT_INVALID_INPUT" },
    });
  });

  it("has no direct database, model provider, final submit, signature, payment, or warehouse mutation surface", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/\.(from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/submitAct|submit_act\s*\(|finalizeAct|finalize_act/i);
    expect(source).not.toMatch(/signAct|sign_act|approveAct|approve_act/i);
    expect(source).not.toMatch(/changePayment|change_payment|paymentStatus|raw_accounting_rows/i);
    expect(source).not.toMatch(/reserveStock|reserve_stock|applyIssue|apply_issue/i);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });
});
