import type { PaymentOrderPdfContract } from "../../lib/api/paymentPdf.service";
import {
  buildAccountantPaymentReportPdfManifestContract,
  buildAccountantPaymentReportPdfSourceModel,
} from "./accountantPaymentReportPdf.shared";

const baseContract = (): PaymentOrderPdfContract => ({
  version: 1,
  flow: "payment_order",
  template: "payment-order-v1",
  title: "Payment Order 77",
  fileName: "payment_order_77.pdf",
  documentType: "payment_order",
  entityId: "77",
  payload: {
    company: {
      company_name: "RIK",
      inn: "123",
      kpp: "456",
      address: "Bishkek",
      bank_name: "Bank",
      bik: "001",
      account: "100",
      corr_account: "200",
      phone: "+996",
      email: "office@example.test",
    },
    header: {
      payment_id: "77",
      proposal_id: "proposal-1",
      paid_at: "2026-04-20T10:00:00.000Z",
      currency: "KGS",
      supplier: "Supplier A",
      invoice_number: "INV-1",
      invoice_date: "2026-04-19",
      purpose: "Materials",
      accountant_fio: "Accountant",
      method: "bank",
      pay_bank: "Bank",
      pay_bik: "001",
      pay_rs: "100",
      pay_inn: "123",
      pay_kpp: "456",
      amount: 150,
      total_paid: 150,
      invoice_total: 200,
      rest: 50,
      overpay_all: 0,
      this_overpay: 0,
      amount_words: "one hundred fifty",
      auto_note: "auto",
      total_lines: 1,
    },
    attachments: [
      {
        name: "invoice.pdf",
        url: "https://example.test/invoice.pdf",
        kind: "invoice",
      },
    ],
    bills: [
      {
        invoiceNumber: "INV-1",
        invoiceDate: "2026-04-19",
        supplier: "Supplier A",
        total: 200,
        groups: [
          {
            typeName: "Materials",
            total: 200,
            paidAll: 150,
            paidThis: 150,
            rest: 50,
            lines: [
              {
                name: "Cement",
                uom: "bag",
                qty: 4,
                price: 50,
                sum: 200,
                paidAll: 150,
                paidThis: 150,
                rest: 50,
              },
            ],
          },
        ],
      },
    ],
  },
});

describe("accountantPaymentReportPdf.shared PDF-ACC-1 manifest", () => {
  it("keeps source_version and artifact_version stable for identical business data", () => {
    const first = buildAccountantPaymentReportPdfManifestContract(baseContract());
    const second = buildAccountantPaymentReportPdfManifestContract(JSON.parse(JSON.stringify(baseContract())));

    expect(second.sourceVersion).toBe(first.sourceVersion);
    expect(second.artifactVersion).toBe(first.artifactVersion);
    expect(second.status).toBe("ready");
    expect(second.lastSuccessfulArtifact).toBeNull();
  });

  it("bumps source_version when meaningful payment data changes", () => {
    const first = buildAccountantPaymentReportPdfManifestContract(baseContract());
    const changed = baseContract();
    changed.payload.header.amount = 175;
    changed.payload.bills[0]!.groups[0]!.lines[0]!.paidThis = 175;

    const second = buildAccountantPaymentReportPdfManifestContract(changed);

    expect(second.sourceVersion).not.toBe(first.sourceVersion);
    expect(second.artifactVersion).not.toBe(first.artifactVersion);
  });

  it("ignores generated transport noise outside the explicit PDF source model", () => {
    const noisy = {
      ...baseContract(),
      generated_at: "2026-04-20T11:00:00.000Z",
      transportMeta: { requestId: "req-1", durationMs: 123 },
    } as PaymentOrderPdfContract;

    const baseline = buildAccountantPaymentReportPdfManifestContract(baseContract());
    const second = buildAccountantPaymentReportPdfManifestContract(noisy);

    expect(second.sourceVersion).toBe(baseline.sourceVersion);
    expect(buildAccountantPaymentReportPdfSourceModel(noisy)).not.toHaveProperty("generated_at");
  });

  it("keeps artifact_version independent from source_version", () => {
    const manifest = buildAccountantPaymentReportPdfManifestContract(baseContract());

    expect(manifest.artifactVersion).not.toBe(manifest.sourceVersion);
    expect(manifest.artifactPath).toContain(manifest.artifactVersion);
    expect(manifest.manifestPath).toContain("accountant/payment-report/manifests/v1");
  });
});
