const mockRpc = jest.fn();
const mockGetAvailability = jest.fn();
const mockRecordBranch = jest.fn();
const mockRegisterPath = jest.fn();
const mockResolveMode = jest.fn();
const mockSetAvailability = jest.fn();
const mockRecordCatchDiscipline = jest.fn();

jest.mock("../supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock("../documents/pdfRpcRollout", () => ({
  getPdfRpcRolloutAvailability: (...args: unknown[]) => mockGetAvailability(...args),
  recordPdfRpcRolloutBranch: (...args: unknown[]) => mockRecordBranch(...args),
  registerPdfRpcRolloutPath: (...args: unknown[]) => mockRegisterPath(...args),
  resolvePdfRpcRolloutMode: (...args: unknown[]) => mockResolveMode(...args),
  setPdfRpcRolloutAvailability: (...args: unknown[]) => mockSetAvailability(...args),
}));

jest.mock("../observability/catchDiscipline", () => ({
  recordCatchDiscipline: (...args: unknown[]) => mockRecordCatchDiscipline(...args),
}));

const buildCanonicalEnvelope = () => ({
  document_type: "payment_order" as const,
  version: "v1" as const,
  generated_at: "2026-03-30T10:00:00.000Z",
  document_id: "payment-order-157",
  source_branch: "canonical" as const,
  header: {
    company: {
      company_name: "RIK",
      inn: "123456789",
      kpp: "123456789",
      address: "Address",
      bank_name: "Bank",
      bik: "BIK",
      account: "ACC",
      corr_account: "CORR",
      phone: "555",
      email: "rik@example.com",
    },
    payment: {
      payment_id: 157,
      proposal_id: "proposal-1",
      paid_at: "2026-03-30T10:00:00.000Z",
      currency: "KGS",
      amount: 8300,
      total_paid: 8300,
      purpose: "Payment purpose",
      accountant_fio: "Accountant",
      method: "bank",
    },
    proposal: {
      proposal_id: "proposal-1",
      invoice_number: "INV-157",
      invoice_date: "2026-03-29",
      invoice_currency: "KGS",
      supplier: "Supplier",
      items_total: 8300,
    },
    supplier: "Supplier",
  },
  rows: [
    {
      proposal_item_id: "item-1",
      invoice_number: "INV-157",
      invoice_date: "2026-03-29",
      supplier: "Supplier",
      name_human: "Pipe",
      uom: "pcs",
      qty: 2,
      price: 2000,
      rik_code: "MAT-001",
    },
    {
      proposal_item_id: "item-2",
      invoice_number: "INV-157",
      invoice_date: "2026-03-29",
      supplier: "Supplier",
      name_human: "Valve",
      uom: "pcs",
      qty: 1,
      price: 4300,
      rik_code: "MAT-002",
    },
  ],
  allocations: [
    { proposal_item_id: "item-1", amount: 4000 },
    { proposal_item_id: "item-2", amount: 4300 },
  ],
  attachments_meta: [],
  totals: {
    amount: 8300,
    total_paid: 8300,
  },
  meta: {},
});

const loadSubject = () =>
  require("./paymentPdf.service") as typeof import("./paymentPdf.service");

describe("paymentPdf.service rpc-only boundary", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRpc.mockReset();
    mockGetAvailability.mockReset();
    mockRecordBranch.mockReset();
    mockRegisterPath.mockReset();
    mockResolveMode.mockReset();
    mockSetAvailability.mockReset();
    mockRecordCatchDiscipline.mockReset();
    mockResolveMode.mockReturnValue("auto");
    mockGetAvailability.mockReturnValue("unknown");
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
  });

  it("loads payment PDF source from canonical rpc only", async () => {
    mockRpc.mockResolvedValueOnce({
      data: buildCanonicalEnvelope(),
      error: null,
    });

    const { getPaymentPdfSource } = loadSubject();
    const result = await getPaymentPdfSource(157);

    expect(mockRegisterPath).toHaveBeenCalledWith("payment_pdf_source_v1", "auto");
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("pdf_payment_source_v1", { p_payment_id: 157 });
    expect(result.source).toBe("rpc:pdf_payment_source_v1");
    expect(result.branchMeta).toEqual({
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    });
    expect(mockSetAvailability).toHaveBeenCalledWith("payment_pdf_source_v1", "available");
    expect(mockRecordBranch).toHaveBeenCalledWith("payment_pdf_source_v1", {
      source: "rpc:pdf_payment_source_v1",
      branchMeta: {
        sourceBranch: "rpc_v1",
        rpcVersion: "v1",
        payloadShapeVersion: "v1",
      },
    });
    expect(mockRecordCatchDiscipline).not.toHaveBeenCalled();
  });

  it("hard-fails and stays rpc-only when canonical rpc errors", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: {
        message: "Could not find the function public.pdf_payment_source_v1",
        code: "PGRST202",
      },
    });

    const { getPaymentPdfSource } = loadSubject();

    await expect(getPaymentPdfSource(157)).rejects.toThrow(
      "pdf_payment_source_v1 failed: Could not find the function public.pdf_payment_source_v1",
    );

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("pdf_payment_source_v1", { p_payment_id: 157 });
    expect(mockSetAvailability).toHaveBeenCalledWith("payment_pdf_source_v1", "missing", {
      errorMessage:
        "pdf_payment_source_v1 failed: Could not find the function public.pdf_payment_source_v1",
    });
    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "accountant",
        surface: "payment_pdf_source",
        event: "payment_pdf_rpc_source_failed",
        kind: "critical_fail",
        sourceKind: "rpc:pdf_payment_source_v1",
        errorStage: "rpc_source",
        extra: expect.objectContaining({
          paymentId: 157,
          failureReason: "rpc_error",
          rpcMode: "auto",
          publishState: "error",
          fallbackUsed: false,
        }),
      }),
    );
  });

  it("rejects force_off mode because legacy fallback branches were removed", async () => {
    mockResolveMode.mockReturnValue("force_off");

    const { getPaymentPdfSource } = loadSubject();

    await expect(getPaymentPdfSource(157)).rejects.toThrow(
      "pdf_payment_source_v1 is force_off but legacy fallback branches were removed",
    );

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "payment_pdf_rpc_source_failed",
        kind: "critical_fail",
        extra: expect.objectContaining({
          paymentId: 157,
          rpcMode: "force_off",
          publishState: "error",
          fallbackUsed: false,
        }),
      }),
    );
  });
});
