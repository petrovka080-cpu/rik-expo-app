import fs from "fs";
import path from "path";

import {
  DRAFT_REPORT_MAX_EVIDENCE_REFS,
  DRAFT_REPORT_NEXT_ACTION,
  DRAFT_REPORT_RISK_LEVEL,
  runDraftReportToolDraftOnly,
} from "../../src/features/ai/tools/draftReportTool";
import type { DraftReportToolAuthContext } from "../../src/features/ai/tools/draftReportTool";
import {
  draftReportInputSchema,
  draftReportOutputSchema,
} from "../../src/features/ai/schemas/aiToolSchemas";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/features/ai/tools/draftReportTool.ts");

const foremanAuth = {
  userId: "foreman-user",
  role: "foreman",
} satisfies DraftReportToolAuthContext;
const accountantAuth = {
  userId: "accountant-user",
  role: "accountant",
} satisfies DraftReportToolAuthContext;

describe("draft_report DRAFT_ONLY tool", () => {
  it("keeps the permanent draft_report schema on object/report-kind input and approval-gated output", () => {
    expect(draftReportInputSchema).toMatchObject({
      required: ["object_id", "report_kind"],
      additionalProperties: false,
      properties: {
        object_id: expect.objectContaining({ type: "string", minLength: 1 }),
        report_kind: expect.objectContaining({
          enum: ["daily", "materials", "progress", "finance_readonly"],
        }),
        period_start: expect.objectContaining({ type: "string", minLength: 10 }),
        period_end: expect.objectContaining({ type: "string", minLength: 10 }),
        notes: expect.objectContaining({ type: "string", minLength: 1 }),
        source_evidence_refs: expect.objectContaining({
          type: "array",
          maxItems: DRAFT_REPORT_MAX_EVIDENCE_REFS,
        }),
      },
    });
    expect(draftReportInputSchema.properties).not.toHaveProperty("objectId");
    expect(draftReportInputSchema.properties).not.toHaveProperty("reportKind");
    expect(draftReportOutputSchema).toMatchObject({
      required: [
        "draft_preview",
        "report_kind",
        "sections_normalized",
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
        "report_published",
        "finance_mutation",
        "raw_finance_rows_exposed",
      ],
      additionalProperties: false,
      properties: {
        draft_preview: expect.objectContaining({ type: "string", minLength: 1 }),
        report_kind: expect.objectContaining({
          enum: ["daily", "materials", "progress", "finance_readonly"],
        }),
        sections_normalized: expect.objectContaining({ type: "array" }),
        requires_approval: expect.objectContaining({ type: "boolean" }),
        next_action: expect.objectContaining({ enum: [DRAFT_REPORT_NEXT_ACTION] }),
        risk_level: expect.objectContaining({ enum: [DRAFT_REPORT_RISK_LEVEL] }),
      },
    });
    expect(draftReportOutputSchema.properties).not.toHaveProperty("draftPreview");
    expect(draftReportOutputSchema.properties).not.toHaveProperty("approvalRequired");
    expect(draftReportOutputSchema.properties).not.toHaveProperty("evidenceRefs");
  });

  it("returns a bounded report draft preview with sections, evidence, and approval requirement", async () => {
    const result = await runDraftReportToolDraftOnly({
      auth: foremanAuth,
      input: {
        object_id: " object-17 ",
        report_kind: "materials",
        period_start: "2026-05-01T08:00:00Z",
        period_end: "2026-05-12",
        notes: " prepare material report ",
        source_evidence_refs: [" report:materials:1 ", "warehouse:stock_scope:item:2"],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        report_kind: "materials",
        sections_normalized: [
          {
            section: "materials_used",
            title: "materials used",
            status: "draft_placeholder",
            evidence_ref: "draft_report:section:materials_used",
          },
          {
            section: "material_gaps",
            title: "material gaps",
            status: "draft_placeholder",
            evidence_ref: "draft_report:section:material_gaps",
          },
          {
            section: "warehouse_follow_up",
            title: "warehouse follow up",
            status: "draft_placeholder",
            evidence_ref: "draft_report:section:warehouse_follow_up",
          },
        ],
        missing_fields: [],
        risk_flags: ["draft_ready_for_approval_review"],
        requires_approval: true,
        next_action: DRAFT_REPORT_NEXT_ACTION,
        evidence_refs: [
          "draft_report:input:object",
          "report:materials:1",
          "warehouse:stock_scope:item:2",
          "draft_report:section:materials_used",
          "draft_report:section:material_gaps",
          "draft_report:section:warehouse_follow_up",
        ],
        risk_level: DRAFT_REPORT_RISK_LEVEL,
        bounded: true,
        persisted: false,
        idempotency_required_if_persisted: true,
        mutation_count: 0,
        final_submit: 0,
        report_published: 0,
        finance_mutation: 0,
        raw_finance_rows_exposed: false,
      },
    });
    if (!result.ok) throw new Error("expected draft_report success");
    expect(result.data.draft_preview).toContain("submit_for_approval");
  });

  it("requires auth, visible draft role, and object input before producing a preview", async () => {
    await expect(
      runDraftReportToolDraftOnly({
        auth: null,
        input: { object_id: "object-1", report_kind: "daily" },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_REPORT_AUTH_REQUIRED" },
    });

    await expect(
      runDraftReportToolDraftOnly({
        auth: { userId: "unknown-user", role: "unknown" },
        input: { object_id: "object-1", report_kind: "daily" },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_REPORT_AUTH_REQUIRED" },
    });

    await expect(
      runDraftReportToolDraftOnly({
        auth: foremanAuth,
        input: "draft",
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_REPORT_INVALID_INPUT" },
    });
  });

  it("has no direct database, model provider, final submit, publication, or finance mutation surface", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/\.(from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/publishReport|publish_report|finalizeReport|finalize_report/i);
    expect(source).not.toMatch(/submitReport|submit_report\s*\(/i);
    expect(source).not.toMatch(/changePayment|change_payment|paymentStatus|raw_accounting_rows/i);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });

  it("allows finance-readonly drafts only for finance-capable roles", async () => {
    await expect(
      runDraftReportToolDraftOnly({
        auth: foremanAuth,
        input: {
          object_id: "object-1",
          report_kind: "finance_readonly",
          source_evidence_refs: ["finance:summary:totals"],
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_REPORT_KIND_NOT_ALLOWED" },
    });

    await expect(
      runDraftReportToolDraftOnly({
        auth: accountantAuth,
        input: {
          object_id: "object-1",
          report_kind: "finance_readonly",
          period_start: "2026-05-01",
          period_end: "2026-05-12",
          source_evidence_refs: ["finance:summary:totals"],
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        report_kind: "finance_readonly",
        risk_flags: ["finance_readonly_redacted"],
        raw_finance_rows_exposed: false,
        finance_mutation: 0,
      },
    });
  });
});
