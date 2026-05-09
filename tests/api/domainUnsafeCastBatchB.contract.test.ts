import fs from "fs";
import path from "path";

import { adaptAccountantInboxScopeEnvelope } from "../../src/screens/accountant/accountant.inbox.service";
import {
  adaptDirectorProposalScopeEnvelope,
  isDirectorPendingProposalsScopeResponse,
} from "../../src/screens/director/director.proposals.repo";
import {
  ContractorWorkPdfSourceError,
  parseContractorWorkPdfSourceEnvelope,
} from "../../src/screens/contractor/contractorPdfSource.service";

const repoRoot = path.resolve(__dirname, "../..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("S_AUDIT_NIGHT_BATTLE_134 domain unsafe cast reduction", () => {
  it("maps accountant inbox rows through a typed DTO adapter", () => {
    const envelope = adaptAccountantInboxScopeEnvelope({
      rows: [
        {
          proposal_id: "proposal-1",
          proposal_no: "P-1",
          supplier: "Supplier",
          invoice_amount: "120.5",
          outstanding_amount: null,
          invoice_currency: null,
          payments_count: "2",
          has_invoice: true,
          payment_eligible: false,
          last_paid_at: "1711756800000",
        },
      ],
      meta: {
        total_row_count: 1,
      },
    });

    expect(envelope.rows).toEqual([
      expect.objectContaining({
        proposal_id: "proposal-1",
        proposal_no: "P-1",
        supplier: "Supplier",
        invoice_amount: 120.5,
        outstanding_amount: 0,
        invoice_currency: "KGS",
        payments_count: 2,
        has_invoice: true,
        payment_eligible: false,
        last_paid_at: 1711756800000,
      }),
    ]);
    expect(envelope.meta.total_row_count).toBe(1);
  });

  it("keeps empty and malformed accountant inbox rows as honest empty output", () => {
    expect(adaptAccountantInboxScopeEnvelope({ rows: [], meta: {} })).toEqual({
      rows: [],
      meta: {},
    });
    expect(
      adaptAccountantInboxScopeEnvelope({
        rows: [
          "bad-row",
          { proposal_id: null, proposal_no: "drop-me" },
          { proposal_id: "proposal-2", payments_count: "not-a-number" },
        ],
        meta: null,
      }).rows,
    ).toEqual([
      expect.objectContaining({
        proposal_id: "proposal-2",
        payments_count: 0,
      }),
    ]);
  });

  it("parses director pending proposal envelopes without untyped service blobs", () => {
    const payload = {
      document_type: "director_pending_proposals_scope",
      version: "v1",
      heads: [
        {
          id: "proposal-1",
          submitted_at: "2026-05-09T00:00:00Z",
          pretty: "P-1",
          items_count: 2,
        },
      ],
      meta: {
        returned_head_count: 1,
        total_head_count: 1,
      },
    };

    expect(isDirectorPendingProposalsScopeResponse(payload)).toBe(true);
    expect(adaptDirectorProposalScopeEnvelope(payload)).toEqual(payload);
  });

  it("rejects malformed director pending proposal envelopes", () => {
    expect(isDirectorPendingProposalsScopeResponse({ rows: [] })).toBe(false);
    expect(() =>
      adaptDirectorProposalScopeEnvelope({
        document_type: "director_pending_proposals_scope",
        version: "v1",
        heads: ["bad-head"],
        meta: {},
      }),
    ).toThrow("director_pending_proposals_scope_v1.heads[] must be an object");
  });

  it("parses contractor PDF source payloads with nullable optional fields", () => {
    const envelope = parseContractorWorkPdfSourceEnvelope({
      document_type: "contractor_work_pdf",
      version: "v1",
      mode: "summary",
      work: {
        progress_id: "progress-1",
        qty_planned: "3",
        qty_done: null,
        qty_left: "bad-number",
      },
      header: {
        contractor_org: "Contractor",
        unit_price: "42",
        total_price: null,
      },
      materials: [
        {
          mat_code: "MAT-1",
          name: "",
          uom: null,
          qty_fact: "5",
        },
      ],
      log: null,
    });

    expect(envelope).toEqual(
      expect.objectContaining({
        document_type: "contractor_work_pdf",
        version: "v1",
        mode: "summary",
        work: expect.objectContaining({
          progress_id: "progress-1",
          qty_planned: 3,
          qty_done: 0,
          qty_left: 0,
        }),
        header: expect.objectContaining({
          contractor_org: "Contractor",
          unit_price: 42,
          total_price: 0,
        }),
        materials: [
          {
            mat_code: "MAT-1",
            name: "MAT-1",
            uom: null,
            qty_fact: 5,
          },
        ],
        log: null,
      }),
    );
  });

  it("rejects malformed contractor PDF source payloads", () => {
    expect(() =>
      parseContractorWorkPdfSourceEnvelope({
        document_type: "contractor_work_pdf",
        version: "v1",
        mode: "summary",
        work: {},
        header: {},
        materials: [],
      }),
    ).toThrow(ContractorWorkPdfSourceError);

    expect(() =>
      parseContractorWorkPdfSourceEnvelope({
        document_type: "contractor_work_pdf",
        version: "v1",
        mode: "history",
        work: { progress_id: "progress-1" },
        header: {},
        materials: [],
        log: null,
      }),
    ).toThrow("pdf_contractor_work_source_v1 missing history log payload");
  });

  it("keeps selected production files free of selected unsafe cast patterns", () => {
    const selectedFiles = [
      "src/screens/accountant/accountant.inbox.service.ts",
      "src/screens/director/director.proposals.repo.ts",
      "src/screens/director/director.repository.ts",
      "src/lib/api/director.ts",
      "src/screens/contractor/contractor.loadWorksService.ts",
      "src/screens/contractor/contractorPdfSource.service.ts",
    ];

    for (const file of selectedFiles) {
      expect(read(file)).not.toMatch(/as any|unknown as|@ts-ignore|@ts-expect-error/);
    }
  });
});
