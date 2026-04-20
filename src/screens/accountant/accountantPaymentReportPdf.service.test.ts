import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import type { PaymentOrderPdfContract } from "../../lib/api/paymentPdf.service";
import { buildAccountantPaymentReportPdfManifestContract } from "./accountantPaymentReportPdf.shared";
import {
  clearAccountantPaymentReportPdfDocumentCacheForTests,
  generateAccountantPaymentReportPdfDocument,
} from "./accountantPaymentReportPdf.service";

const mockPreparePaymentOrderPdf = jest.fn();
const mockExportPaymentOrderPdfContract = jest.fn();
const mockBuildGeneratedPdfDescriptor = jest.fn();
const mockReadStoredJson = jest.fn();
const mockWriteStoredJson = jest.fn();
const mockRemoveStoredValue = jest.fn();
const mockGetInfoAsync = jest.fn();

type PlatformObservabilityTestEvent = {
  screen?: string;
  surface?: string;
  event?: string;
  result?: string;
  durationMs?: number | null;
  cacheLayer?: string | null;
};

type PlatformObservabilityTestGlobal = typeof globalThis & {
  __RIK_PLATFORM_OBSERVABILITY__?: {
    seq: number;
    events: PlatformObservabilityTestEvent[];
  };
};

jest.mock("../../lib/api/paymentPdf.service", () => ({
  preparePaymentOrderPdf: (...args: unknown[]) => mockPreparePaymentOrderPdf(...args),
}));

jest.mock("../../lib/api/pdf_payment", () => ({
  exportPaymentOrderPdfContract: (...args: unknown[]) =>
    mockExportPaymentOrderPdfContract(...args),
}));

jest.mock("../../lib/pdf/pdf.runner", () => ({
  buildGeneratedPdfDescriptor: (...args: unknown[]) =>
    mockBuildGeneratedPdfDescriptor(...args),
}));

jest.mock("../../lib/storage/classifiedStorage", () => ({
  readStoredJson: (...args: unknown[]) => mockReadStoredJson(...args),
  writeStoredJson: (...args: unknown[]) => mockWriteStoredJson(...args),
  removeStoredValue: (...args: unknown[]) => mockRemoveStoredValue(...args),
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
}));

const paymentContract = (amount = 150): PaymentOrderPdfContract => ({
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
      amount,
      total_paid: amount,
      invoice_total: 200,
      rest: 200 - amount,
      overpay_all: 0,
      this_overpay: 0,
      amount_words: "one hundred fifty",
      auto_note: "auto",
      total_lines: 1,
    },
    attachments: [],
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
            paidAll: amount,
            paidThis: amount,
            rest: 200 - amount,
            lines: [
              {
                name: "Cement",
                uom: "bag",
                qty: 4,
                price: 50,
                sum: 200,
                paidAll: amount,
                paidThis: amount,
                rest: 200 - amount,
              },
            ],
          },
        ],
      },
    ],
  },
});

const generatedDescriptor: DocumentDescriptor = {
  uri: "file:///cache/payment_order_77.pdf",
  fileSource: {
    kind: "local-file",
    uri: "file:///cache/payment_order_77.pdf",
  },
  title: "Payment Order 77",
  fileName: "payment_order_77.pdf",
  mimeType: "application/pdf",
  documentType: "payment_order",
  originModule: "accountant",
  source: "generated",
  entityId: "77",
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

async function waitForCallCount(mock: jest.Mock, expected: number) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (mock.mock.calls.length === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

const observabilityGlobal = globalThis as PlatformObservabilityTestGlobal;

function resetObservabilityEvents() {
  observabilityGlobal.__RIK_PLATFORM_OBSERVABILITY__ = {
    seq: 0,
    events: [],
  };
}

function accountantPaymentReportEvents() {
  return (observabilityGlobal.__RIK_PLATFORM_OBSERVABILITY__?.events ?? [])
    .filter((event) =>
      event.screen === "accountant" &&
      event.surface === "accountant_payment_report_pdf" &&
      event.event === "accountant_payment_report_pdf_ready",
    );
}

describe("accountantPaymentReportPdf.service PDF-ACC-1 reuse", () => {
  beforeEach(() => {
    clearAccountantPaymentReportPdfDocumentCacheForTests();
    resetObservabilityEvents();
    mockPreparePaymentOrderPdf.mockReset();
    mockExportPaymentOrderPdfContract.mockReset();
    mockBuildGeneratedPdfDescriptor.mockReset();
    mockReadStoredJson.mockReset();
    mockWriteStoredJson.mockReset();
    mockRemoveStoredValue.mockReset();
    mockGetInfoAsync.mockReset();
    mockReadStoredJson.mockResolvedValue(null);
    mockWriteStoredJson.mockResolvedValue(undefined);
    mockRemoveStoredValue.mockResolvedValue(undefined);
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
    mockExportPaymentOrderPdfContract.mockResolvedValue("file:///cache/payment_order_77.pdf");
    mockPreparePaymentOrderPdf.mockResolvedValue({
      source: "rpc:pdf_payment_source_v1",
      branchMeta: { sourceBranch: "canonical" },
      contract: paymentContract(),
    });
    mockBuildGeneratedPdfDescriptor.mockImplementation(async (args: {
      getUri: () => Promise<string>;
    }) => {
      await args.getUri();
      return generatedDescriptor;
    });
  });

  it("reuses the same accountant payment report PDF for repeat opens without rebuilding", async () => {
    const first = await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });
    const second = await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });

    expect(first.uri).toBe(generatedDescriptor.uri);
    expect(second.uri).toBe(first.uri);
    expect(mockPreparePaymentOrderPdf).toHaveBeenCalledTimes(1);
    expect(mockBuildGeneratedPdfDescriptor).toHaveBeenCalledTimes(1);
    expect(mockExportPaymentOrderPdfContract).toHaveBeenCalledTimes(1);
    expect(mockWriteStoredJson).toHaveBeenCalledTimes(1);
  });

  it("emits repeat cache-hit telemetry inside the sub-300ms budget", async () => {
    await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });
    resetObservabilityEvents();

    await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });
    await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });
    await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });

    const repeatHits = accountantPaymentReportEvents().filter(
      (event) => event.result === "cache_hit" && event.cacheLayer === "memory",
    );
    expect(repeatHits).toHaveLength(3);
    expect(Math.max(...repeatHits.map((event) => Number(event.durationMs ?? 0))))
      .toBeLessThanOrEqual(300);
    expect(mockPreparePaymentOrderPdf).toHaveBeenCalledTimes(1);
  });

  it("registers inFlight before storage/source awaits and coalesces identical requests", async () => {
    const readDeferred = createDeferred<null>();
    mockReadStoredJson.mockReturnValueOnce(readDeferred.promise);

    const first = generateAccountantPaymentReportPdfDocument({ paymentId: 77 });
    const second = generateAccountantPaymentReportPdfDocument({ paymentId: 77 });

    await waitForCallCount(mockReadStoredJson, 1);
    expect(mockReadStoredJson).toHaveBeenCalledTimes(1);
    expect(mockPreparePaymentOrderPdf).not.toHaveBeenCalled();

    readDeferred.resolve(null);
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ uri: generatedDescriptor.uri }),
      expect.objectContaining({ uri: generatedDescriptor.uri }),
    ]);
    expect(mockPreparePaymentOrderPdf).toHaveBeenCalledTimes(1);
    expect(mockBuildGeneratedPdfDescriptor).toHaveBeenCalledTimes(1);
  });

  it("uses persisted ready manifest descriptor without source preparation", async () => {
    const manifest = buildAccountantPaymentReportPdfManifestContract(paymentContract());
    mockReadStoredJson.mockResolvedValueOnce({
      version: 1,
      manifest,
      descriptor: generatedDescriptor,
    });

    const result = await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });

    expect(result.uri).toBe(generatedDescriptor.uri);
    expect(mockPreparePaymentOrderPdf).not.toHaveBeenCalled();
    expect(mockBuildGeneratedPdfDescriptor).not.toHaveBeenCalled();
    expect(mockWriteStoredJson).not.toHaveBeenCalled();
  });

  it("emits persisted warm-hit telemetry inside the sub-800ms budget", async () => {
    const manifest = buildAccountantPaymentReportPdfManifestContract(paymentContract());

    for (let index = 0; index < 3; index += 1) {
      clearAccountantPaymentReportPdfDocumentCacheForTests();
      mockReadStoredJson.mockResolvedValueOnce({
        version: 1,
        manifest,
        descriptor: generatedDescriptor,
      });
      await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });
    }

    const warmHits = accountantPaymentReportEvents().filter(
      (event) => event.result === "cache_hit" && event.cacheLayer === "storage",
    );
    expect(warmHits).toHaveLength(3);
    expect(Math.max(...warmHits.map((event) => Number(event.durationMs ?? 0))))
      .toBeLessThanOrEqual(800);
    expect(mockPreparePaymentOrderPdf).not.toHaveBeenCalled();
  });

  it("removes an unusable persisted artifact and rebuilds through the canonical source path", async () => {
    const manifest = buildAccountantPaymentReportPdfManifestContract(paymentContract());
    mockReadStoredJson.mockResolvedValueOnce({
      version: 1,
      manifest,
      descriptor: generatedDescriptor,
    });
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false });

    const result = await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });

    expect(result.uri).toBe(generatedDescriptor.uri);
    expect(mockRemoveStoredValue).toHaveBeenCalledTimes(1);
    expect(mockPreparePaymentOrderPdf).toHaveBeenCalledTimes(1);
    expect(mockBuildGeneratedPdfDescriptor).toHaveBeenCalledTimes(1);
  });

  it("rebuilds after cache clear when canonical payment data changes", async () => {
    await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });
    clearAccountantPaymentReportPdfDocumentCacheForTests();
    mockPreparePaymentOrderPdf.mockResolvedValueOnce({
      source: "rpc:pdf_payment_source_v1",
      branchMeta: { sourceBranch: "canonical" },
      contract: paymentContract(175),
    });

    await generateAccountantPaymentReportPdfDocument({ paymentId: 77 });

    expect(mockPreparePaymentOrderPdf).toHaveBeenCalledTimes(2);
    expect(mockBuildGeneratedPdfDescriptor).toHaveBeenCalledTimes(2);
  });
});
