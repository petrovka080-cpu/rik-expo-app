const mockRpc = jest.fn();
const mockGetAvailability = jest.fn();
const mockRecordBranch = jest.fn();
const mockRegisterPath = jest.fn();
const mockResolveMode = jest.fn();
const mockSetAvailability = jest.fn();
const mockRecordCatchDiscipline = jest.fn();
const mockBeginPdfLifecycleObservation = jest.fn(() => ({
  success: jest.fn(),
  error: (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
}));

jest.mock("../../lib/documents/pdfRpcRollout", () => ({
  getPdfRpcRolloutAvailability: (...args: unknown[]) => mockGetAvailability(...args),
  recordPdfRpcRolloutBranch: (...args: unknown[]) => mockRecordBranch(...args),
  registerPdfRpcRolloutPath: (...args: unknown[]) => mockRegisterPath(...args),
  resolvePdfRpcRolloutMode: (...args: unknown[]) => mockResolveMode(...args),
  setPdfRpcRolloutAvailability: (...args: unknown[]) => mockSetAvailability(...args),
}));

jest.mock("../../lib/observability/catchDiscipline", () => ({
  recordCatchDiscipline: (...args: unknown[]) => mockRecordCatchDiscipline(...args),
}));

jest.mock("../../lib/pdf/pdfLifecycle", () => ({
  beginPdfLifecycleObservation: () => mockBeginPdfLifecycleObservation(),
}));

type ServiceConfig<Result = unknown> = {
  label: string;
  rolloutId: string;
  rpcName: string;
  sourceKind: string;
  failureMessage: string;
  load: () => {
    getSource: (params: Record<string, unknown>) => Promise<Result>;
  };
  params: () => Record<string, unknown>;
  envelope: () => unknown;
};

const createSupabase = () => ({
  rpc: (...args: unknown[]) => mockRpc(...args),
});

const buildIncomingFormEnvelope = () => ({
  document_type: "warehouse_incoming_form" as const,
  version: "v1" as const,
  generated_at: "2026-03-30T10:00:00.000Z",
  document_id: "incoming-1",
  source_branch: "canonical" as const,
  header: {
    incoming_id: "incoming-1",
    id: "incoming-1",
    display_no: "INC-001",
    warehouseman_fio: "Warehouse User",
  },
  rows: [
    { code: "MAT-001", material_name: "Pipe", qty_received: 3, uom: "pcs" },
  ],
  totals: {
    lines_count: 1,
    qty_total: 3,
  },
  meta: {},
});

const buildIncomingMaterialsEnvelope = () => ({
  document_type: "warehouse_incoming_materials_report" as const,
  version: "v1" as const,
  generated_at: "2026-03-30T10:00:00.000Z",
  document_id: "incoming-materials-range",
  source_branch: "canonical" as const,
  header: {
    range_from: "2026-03-29T00:00:00.000Z",
    range_to: "2026-03-30T23:59:59.999Z",
  },
  rows: [
    { material_code: "MAT-001", material_name: "Pipe", uom: "pcs", sum_total: 5, docs_cnt: 2, lines_cnt: 3 },
  ],
  totals: {
    docs_total: 2,
    rows_count: 1,
    qty_total: 5,
  },
  meta: {},
});

const buildDayMaterialsEnvelope = () => ({
  document_type: "warehouse_day_materials_report" as const,
  version: "v1" as const,
  generated_at: "2026-03-30T10:00:00.000Z",
  document_id: "day-materials-range",
  source_branch: "canonical" as const,
  header: {
    range_from: "2026-03-30T00:00:00.000Z",
    range_to: "2026-03-30T23:59:59.999Z",
  },
  rows: [
    {
      material_code: "MAT-001",
      material_name: "Pipe",
      uom: "pcs",
      sum_in_req: 2,
      sum_free: 1,
      sum_over: 0,
      sum_total: 3,
      docs_cnt: 1,
      lines_cnt: 2,
    },
  ],
  totals: {
    docs_total: 1,
    rows_count: 1,
    qty_total: 3,
  },
  meta: {},
});

const buildObjectWorkEnvelope = () => ({
  document_type: "warehouse_object_work_report" as const,
  version: "v1" as const,
  generated_at: "2026-03-30T10:00:00.000Z",
  document_id: "object-work-range",
  source_branch: "canonical" as const,
  header: {
    range_from: "2026-03-29T00:00:00.000Z",
    range_to: "2026-03-30T23:59:59.999Z",
  },
  rows: [
    {
      object_id: "object-1",
      object_name: "Object 1",
      work_name: "Work 1",
      docs_cnt: 2,
      req_cnt: 2,
      active_days: 1,
      uniq_materials: 3,
      recipients_text: "Recipient",
      top3_materials: "MAT-001",
    },
  ],
  totals: {
    docs_total: 2,
    rows_count: 1,
  },
  meta: {},
});

const services: ServiceConfig[] = [
  {
    label: "warehouse incoming form",
    rolloutId: "warehouse_incoming_source_v1",
    rpcName: "pdf_warehouse_incoming_source_v1",
    sourceKind: "rpc:pdf_warehouse_incoming_source_v1",
    failureMessage: "pdf_warehouse_incoming_source_v1 failed: Could not find the function public.pdf_warehouse_incoming_source_v1",
    load: () => {
      const subject =
        require("./warehouse.incomingForm.pdf.service") as typeof import("./warehouse.incomingForm.pdf.service");
      return { getSource: subject.getWarehouseIncomingFormPdfSource };
    },
    params: () => ({
      incomingId: "incoming-1",
      supabase: createSupabase(),
      repIncoming: [],
      warehousemanFio: "Warehouse User",
      matNameByCode: {},
      orgName: "RIK",
      warehouseName: "Warehouse",
    }),
    envelope: buildIncomingFormEnvelope,
  },
  {
    label: "warehouse day materials",
    rolloutId: "warehouse_day_materials_source_v1",
    rpcName: "pdf_warehouse_day_materials_source_v1",
    sourceKind: "rpc:pdf_warehouse_day_materials_source_v1",
    failureMessage: "pdf_warehouse_day_materials_source_v1 failed: Could not find the function public.pdf_warehouse_day_materials_source_v1",
    load: () => {
      const subject =
        require("./warehouse.dayMaterialsReport.pdf.service") as typeof import("./warehouse.dayMaterialsReport.pdf.service");
      return { getSource: subject.getWarehouseDayMaterialsReportPdfSource };
    },
    params: () => ({
      supabase: createSupabase(),
      range: {
        pdfFrom: "2026-03-30",
        pdfTo: "2026-03-30",
        rpcFrom: "2026-03-30T00:00:00.000Z",
        rpcTo: "2026-03-30T23:59:59.999Z",
      },
      legacyDocsTotal: 1,
    }),
    envelope: buildDayMaterialsEnvelope,
  },
  {
    label: "warehouse incoming materials",
    rolloutId: "warehouse_incoming_materials_source_v1",
    rpcName: "pdf_warehouse_incoming_materials_source_v1",
    sourceKind: "rpc:pdf_warehouse_incoming_materials_source_v1",
    failureMessage: "pdf_warehouse_incoming_materials_source_v1 failed: Could not find the function public.pdf_warehouse_incoming_materials_source_v1",
    load: () => {
      const subject =
        require("./warehouse.incomingMaterialsReport.pdf.service") as typeof import("./warehouse.incomingMaterialsReport.pdf.service");
      return { getSource: subject.getWarehouseIncomingMaterialsReportPdfSource };
    },
    params: () => ({
      supabase: createSupabase(),
      range: {
        pdfFrom: "2026-03-29",
        pdfTo: "2026-03-30",
        rpcFrom: "2026-03-29T00:00:00.000Z",
        rpcTo: "2026-03-30T23:59:59.999Z",
      },
      legacyDocsTotal: 2,
      nameByCode: {},
    }),
    envelope: buildIncomingMaterialsEnvelope,
  },
  {
    label: "warehouse object work",
    rolloutId: "warehouse_object_work_source_v1",
    rpcName: "pdf_warehouse_object_work_source_v1",
    sourceKind: "rpc:pdf_warehouse_object_work_source_v1",
    failureMessage: "pdf_warehouse_object_work_source_v1 failed: Could not find the function public.pdf_warehouse_object_work_source_v1",
    load: () => {
      const subject =
        require("./warehouse.objectWorkReport.pdf.service") as typeof import("./warehouse.objectWorkReport.pdf.service");
      return { getSource: subject.getWarehouseObjectWorkReportPdfSource };
    },
    params: () => ({
      supabase: createSupabase(),
      range: {
        pdfFrom: "2026-03-29",
        pdfTo: "2026-03-30",
        rpcFrom: "2026-03-29T00:00:00.000Z",
        rpcTo: "2026-03-30T23:59:59.999Z",
      },
      legacyDocsTotal: 2,
      objectId: null,
    }),
    envelope: buildObjectWorkEnvelope,
  },
];

describe("warehouse pdf source services rpc-only boundary", () => {
  beforeEach(() => {
    jest.resetModules();
    mockRpc.mockReset();
    mockGetAvailability.mockReset();
    mockRecordBranch.mockReset();
    mockRegisterPath.mockReset();
    mockResolveMode.mockReset();
    mockSetAvailability.mockReset();
    mockRecordCatchDiscipline.mockReset();
    mockBeginPdfLifecycleObservation.mockReset();
    mockBeginPdfLifecycleObservation.mockImplementation(() => ({
      success: jest.fn(),
      error: (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
    }));
    mockResolveMode.mockReturnValue("auto");
    mockGetAvailability.mockReturnValue("unknown");
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
  });

  it.each(services)("loads $label PDF source from canonical rpc only", async (service) => {
    mockRpc.mockResolvedValueOnce({
      data: service.envelope(),
      error: null,
    });

    const { getSource } = service.load();
    const result = await getSource(service.params());

    expect(mockRegisterPath).toHaveBeenCalledWith(service.rolloutId, "auto");
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith(
      service.rpcName,
      expect.any(Object),
    );
    expect((result as { source: string }).source).toBe(service.sourceKind);
    expect((result as { branchMeta: Record<string, unknown> }).branchMeta).toEqual({
      sourceBranch: "rpc_v1",
      rpcVersion: "v1",
      payloadShapeVersion: "v1",
    });
    expect(mockSetAvailability).toHaveBeenCalledWith(service.rolloutId, "available");
    expect(mockRecordBranch).toHaveBeenCalledWith(service.rolloutId, {
      source: service.sourceKind,
      branchMeta: {
        sourceBranch: "rpc_v1",
        rpcVersion: "v1",
        payloadShapeVersion: "v1",
      },
    });
    expect(mockRecordCatchDiscipline).not.toHaveBeenCalled();
  });

  it.each(services)("hard-fails and stays rpc-only when $label rpc errors", async (service) => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: {
        message: `Could not find the function public.${service.rpcName}`,
        code: "PGRST202",
      },
    });

    const { getSource } = service.load();

    await expect(getSource(service.params())).rejects.toThrow(service.failureMessage);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockSetAvailability).toHaveBeenCalledWith(service.rolloutId, "missing", {
      errorMessage: service.failureMessage,
    });
    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "warehouse",
        surface: "warehouse_pdf_source",
        event: "warehouse_pdf_source_failed",
        kind: "critical_fail",
        sourceKind: service.sourceKind,
        errorStage: "source_load",
        extra: expect.objectContaining({
          pdfSourceFamily: service.rolloutId,
          failureReason: "rpc_error",
          rpcMode: "auto",
          publishState: "error",
          fallbackUsed: false,
        }),
      }),
    );
  });

  it.each(services)("rejects force_off mode for $label because legacy fallback branches were removed", async (service) => {
    mockResolveMode.mockReturnValue("force_off");

    const { getSource } = service.load();

    await expect(getSource(service.params())).rejects.toThrow(
      `${service.rpcName} is force_off but legacy fallback branches were removed`,
    );

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "warehouse_pdf_source_failed",
        kind: "critical_fail",
        extra: expect.objectContaining({
          pdfSourceFamily: service.rolloutId,
          rpcMode: "force_off",
          publishState: "error",
          fallbackUsed: false,
        }),
      }),
    );
  });
});
