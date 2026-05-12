import fs from "fs";
import path from "path";

import { runDraftActToolDraftOnly } from "../../src/features/ai/tools/draftActTool";
import { runDraftReportToolDraftOnly } from "../../src/features/ai/tools/draftReportTool";

const ROOT = process.cwd();
const draftReportSourcePath = path.join(ROOT, "src/features/ai/tools/draftReportTool.ts");
const draftActSourcePath = path.join(ROOT, "src/features/ai/tools/draftActTool.ts");

describe("draft document no-send contract", () => {
  it("keeps draft_report and draft_act on the W12 review-only document contract", async () => {
    const report = await runDraftReportToolDraftOnly({
      auth: { userId: "foreman-user", role: "foreman" },
      input: {
        object_id: "object-1",
        report_kind: "daily",
        period_start: "2026-05-01",
        period_end: "2026-05-12",
        source_evidence_refs: ["foreman:own_project:report:1"],
      },
    });
    const act = await runDraftActToolDraftOnly({
      auth: { userId: "contractor-user", role: "contractor" },
      input: {
        subcontract_id: "subcontract-1",
        act_kind: "work_completion",
        work_summary: "own subcontract work ready for review",
        work_items: [{ name: "Masonry", quantity: 4, unit: "m2" }],
        source_evidence_refs: ["contractor:own_act:1"],
      },
    });

    expect(report).toMatchObject({
      ok: true,
      data: {
        draft_sections: expect.arrayContaining([
          expect.objectContaining({ section: "work_summary" }),
        ]),
        missing_data: [],
        requires_review: true,
        requires_approval_for_send: true,
        requires_approval: true,
        next_action: "submit_for_approval",
        mutation_count: 0,
        final_pdf_send: 0,
        external_share: 0,
        final_status_change: 0,
        signature: 0,
        payment_status_change: 0,
        final_submit: 0,
        report_published: 0,
      },
    });
    expect(act).toMatchObject({
      ok: true,
      data: {
        draft_sections: expect.arrayContaining([
          expect.objectContaining({ section: "review_and_send_boundary" }),
        ]),
        missing_data: [],
        requires_review: true,
        requires_approval_for_send: true,
        requires_approval: true,
        next_action: "submit_for_approval",
        role_scope: "contractor_own_subcontract_scope",
        mutation_count: 0,
        final_pdf_send: 0,
        external_share: 0,
        final_status_change: 0,
        signature: 0,
        payment_status_change: 0,
        final_submit: 0,
        act_signed: 0,
      },
    });
  });

  it("keeps accountant report drafts finance-readonly and denies accountant act drafts", async () => {
    await expect(
      runDraftReportToolDraftOnly({
        auth: { userId: "accountant-user", role: "accountant" },
        input: {
          object_id: "finance-scope-1",
          report_kind: "finance_readonly",
          source_evidence_refs: ["finance:summary:redacted"],
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        report_kind: "finance_readonly",
        requires_review: true,
        requires_approval_for_send: true,
        raw_finance_rows_exposed: false,
        finance_mutation: 0,
        payment_status_change: 0,
      },
    });

    await expect(
      runDraftActToolDraftOnly({
        auth: { userId: "accountant-user", role: "accountant" },
        input: {
          subcontract_id: "subcontract-1",
          act_kind: "work_completion",
          work_summary: "should be denied",
          work_items: [{ name: "Work", quantity: 1, unit: "lot" }],
          source_evidence_refs: ["finance:summary:redacted"],
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "DRAFT_ACT_ROLE_NOT_ALLOWED" },
    });
  });

  it("contains no final send, share, signature, status change, payment, provider, or database execution path", () => {
    const source = [
      fs.readFileSync(draftReportSourcePath, "utf8"),
      fs.readFileSync(draftActSourcePath, "utf8"),
    ].join("\n");

    expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/\.(from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/sendFinalPdf|finalPdfSend|externalShare|publishDocument|publishReport/i);
    expect(source).not.toMatch(/applyFinalStatus|changeFinalStatus|setDocumentStatus/i);
    expect(source).not.toMatch(/signDocument|signAct|approveAct|approveReport/i);
    expect(source).not.toMatch(/changePaymentStatus|paymentStatusMutation|executePayment/i);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });
});
