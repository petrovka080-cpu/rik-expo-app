import { readFileSync } from "fs";
import { join } from "path";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useForemanScreenController } from "./useForemanScreenController";

const mockUseRouter = jest.fn(() => ({ push: jest.fn() }));
const mockUseIsFocused = jest.fn(() => true);
const mockIsBusy = jest.fn(() => false);
const mockOnScroll = jest.fn();

const mockFetchHistory = jest.fn().mockResolvedValue(undefined);
const mockFetchSubcontractHistory = jest.fn().mockResolvedValue(undefined);
const mockOpenDraft = jest.fn();
const mockCloseDraft = jest.fn();
const mockCloseCatalog = jest.fn();
const mockSetForemanMainTab = jest.fn();
const mockSetSelectedObjectName = jest.fn();
const mockSetForemanHistory = jest.fn();
const mockSetIsFioConfirmVisible = jest.fn();
const mockSetFioBootstrapScopeKey = jest.fn();
const mockSetHeaderAttention = jest.fn();
const mockSetIsFioLoading = jest.fn();
const mockSetDraftSendBusy = jest.fn();
const mockSetDraftDeleteBusy = jest.fn();
const mockSubmitToDirector = jest.fn().mockResolvedValue(undefined);
const mockCommitCatalogToDraft = jest.fn().mockResolvedValue(undefined);
const mockHandleCalcAddToRequest = jest.fn().mockResolvedValue(undefined);
const mockHandleRemoveDraftRow = jest.fn();
const mockSyncPendingQtyDrafts = jest.fn().mockResolvedValue(undefined);
const mockApplyObjectTypeSelection = jest.fn();
const mockApplyLevelSelection = jest.fn();
const mockApplySystemSelection = jest.fn();
const mockApplyZoneSelection = jest.fn();
const mockSetForeman = jest.fn();
const mockOpenRequestById = jest.fn().mockResolvedValue(undefined);
const mockEnsureRequestId = jest.fn().mockResolvedValue("req-1");
const mockRunRequestPdf = jest.fn().mockResolvedValue(undefined);
const mockLoadForemanHistory = jest.fn().mockResolvedValue(["Foreman One"]);
const mockLoadStoredFioState = jest.fn().mockResolvedValue({
  currentFio: "",
  history: ["Foreman One"],
  lastConfirmIso: "2026-04-01T07:00:00.000Z",
});
const mockSaveStoredFioState = jest.fn().mockResolvedValue(["Foreman One"]);
const mockGetUser = jest.fn().mockResolvedValue({
  data: {
    user: {
      id: "user-1",
      email: "foreman@example.com",
      phone: "+996700000000",
      user_metadata: {
        full_name: "Foreman One",
        phone: "+996700000000",
      },
    },
  },
});

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: "ios",
  },
}));

jest.mock("expo-router", () => ({
  useRouter: () => mockUseRouter(),
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockUseIsFocused(),
}));

jest.mock("./ForemanReqItemRow", () => function MockForemanReqItemRow() {
  return null;
});

jest.mock("./ForemanMaterialsContent", () => function MockForemanMaterialsContent() {
  return null;
});

jest.mock("./ForemanSubcontractTab", () => function MockForemanSubcontractTab() {
  return null;
});

jest.mock("./useForemanDicts", () => ({
  useForemanDicts: () => ({
    objOptions: [{ code: "obj-1", name: "Tower A" }],
    lvlOptions: [{ code: "lvl-1", name: "1" }],
    sysOptions: [{ code: "sys-1", name: "HVAC" }],
    zoneOptions: [{ code: "zone-1", name: "Zone 1" }],
    objAllOptions: [{ code: "obj-1", name: "Tower A" }],
    sysAllOptions: [{ code: "sys-1", name: "HVAC" }],
    appOptions: [{ code: "app-1", label: "HVAC" }],
  }),
}));

jest.mock("./foreman.context.resolver", () => ({
  resolveForemanContext: () => ({
    config: {
      systemPriorityTags: [],
      objectClass: "tower",
    },
  }),
}));

jest.mock("./foreman.locator.adapter", () => ({
  adaptFormContext: () => ({
    locator: {
      label: "Этаж",
      isValidValue: (value: string) => value === "" || value === "lvl-1",
      options: [{ code: "lvl-1", name: "1" }],
    },
    zone: {
      label: "Зона",
      isValidValue: (value: string) => value === "" || value === "zone-1",
      options: [{ code: "zone-1", name: "Zone 1" }],
    },
  }),
}));

jest.mock("./foreman.debug", () => ({
  debugForemanLogLazy: jest.fn(),
}));

jest.mock("./foreman.headerRequirements", () => ({
  resolveForemanHeaderRequirements: () => ({
    missing: [],
    focusKey: null,
    message: "",
  }),
}));

jest.mock("./foreman.options", () => ({
  getObjectDisplayName: (_code: string, options: { code: string; name: string }[]) =>
    options[0]?.name ?? "",
}));

jest.mock("./foreman.styles", () => ({
  s: {
    container: { flex: 1 },
    bgGlow: { opacity: 1 },
    cHeader: { paddingTop: 0 },
    cTitle: { fontSize: 20 },
  },
}));

jest.mock("./foreman.ui", () => ({
  FOREMAN_TEXT: {
    fillHeaderTitle: "Fill header",
    readonlyTitle: "Readonly",
    readonlyHint: "Readonly hint",
    submitNeedDraftHint: "Need draft",
    submitEmptyTitle: "Empty",
    submitEmptyHint: "Add items",
    errorTitle: "Error",
    deleteDraftError: "Delete failed",
    sendToDirectorError: "Send failed",
  },
  REQUEST_STATUS_STYLES: {},
  UI: {
    bg: "#000",
    text: "#fff",
    sub: "#999",
  },
}));

jest.mock("./hooks/useForemanHistory", () => ({
  useForemanHistory: () => ({
    historyRequests: [],
    historyLoading: false,
    historyVisible: false,
    fetchHistory: mockFetchHistory,
    closeHistory: jest.fn(),
  }),
}));

jest.mock("./hooks/useForemanSubcontractHistory", () => ({
  useForemanSubcontractHistory: () => ({
    history: [],
    historyLoading: false,
    historyVisible: false,
    fetchHistory: mockFetchSubcontractHistory,
    closeHistory: jest.fn(),
  }),
}));

jest.mock("../shared/useCollapsingHeader", () => ({
  useCollapsingHeader: () => ({
    headerHeight: 84,
    titleSize: 24,
    headerShadow: 0.2,
    onScroll: mockOnScroll,
    contentTopPad: 100,
  }),
}));

jest.mock("../../ui/GlobalBusy", () => ({
  useGlobalBusy: () => ({
    isBusy: mockIsBusy,
  }),
}));

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  },
}));

jest.mock("../../lib/catalog_api", () => ({
  rikQuickSearch: jest.fn(),
}));

jest.mock("../../lib/api/request.repository", () => ({
  reopenRequestDraft: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("./foreman.helpers", () => ({
  buildScopeNote: (objectName: string, levelName: string, systemName: string, zoneName: string) =>
    [objectName, levelName, systemName, zoneName].filter(Boolean).join(" / "),
  loadForemanHistory: (...args: unknown[]) => mockLoadForemanHistory(...args),
  resolveStatusInfo: () => ({ label: "Черновик", bg: "#111", fg: "#fff" }),
  ridStr: (value: unknown) => String(value ?? "").trim(),
  saveForemanToHistory: jest.fn().mockResolvedValue(undefined),
  shortId: (value: string) => value.slice(0, 4),
  toErrorText: (_error: unknown, fallback: string) => fallback,
}));

jest.mock("../../lib/documents/pdfDocument", () => ({
  buildPdfFileName: () => "request.pdf",
}));

jest.mock("../../lib/documents/pdfDocumentActions", () => ({
  getPdfFlowErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

jest.mock("../../lib/documents/pdfDocumentGenerators", () => ({
  generateRequestPdfDocument: jest.fn().mockResolvedValue({ html: "<html />" }),
}));

jest.mock("../../lib/offline/foremanSyncRuntime", () => ({
  buildForemanSyncUiStatus: () => ({
    label: "Синхронизировано",
    detail: null,
    tone: "success",
  }),
}));

jest.mock("../../lib/pdf/pdf.runner", () => ({
  prepareAndPreviewGeneratedPdf: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("./hooks/useForemanDisplayNo", () => ({
  useForemanDisplayNo: () => ({
    displayNoByReq: {},
    setDisplayNoByReq: jest.fn(),
    preloadDisplayNo: jest.fn(),
  }),
}));

jest.mock("./hooks/useForemanDraftBoundary", () => ({
  useForemanDraftBoundary: () => ({
    foreman: "Foreman One",
    setForeman: mockSetForeman,
    objectType: "obj-1",
    level: "lvl-1",
    system: "sys-1",
    zone: "zone-1",
    requestId: "",
    items: [{ id: "row-1", request_id: "", qty: 2, uom: "pcs", app_code: "app-1", name_human: "Brick" }],
    qtyDrafts: {},
    setQtyDrafts: jest.fn(),
    qtyBusyMap: {},
    setRowBusy: jest.fn(),
    requestDetails: null,
    canEditRequestItem: () => true,
    networkOnline: true,
    isDraftActive: true,
    localDraftBootstrapReady: true,
    draftSyncStatus: "synced",
    draftLastSyncAt: null,
    draftLastErrorAt: null,
    draftLastErrorStage: null,
    draftConflictType: "none",
    draftRetryCount: 0,
    pendingOperationsCount: 0,
    draftSyncAttentionNeeded: false,
    availableDraftRecoveryActions: [],
    syncLocalDraftNow: jest.fn().mockResolvedValue({ requestId: "req-1", submitted: { display_no: "REQ-1" } }),
    retryDraftSyncNow: jest.fn().mockResolvedValue(undefined),
    rehydrateDraftFromServer: jest.fn().mockResolvedValue(undefined),
    restoreLocalDraftAfterConflict: jest.fn().mockResolvedValue(undefined),
    discardLocalDraftNow: jest.fn().mockResolvedValue(undefined),
    clearFailedQueueTailNow: jest.fn().mockResolvedValue(undefined),
    discardWholeDraft: jest.fn().mockResolvedValue(undefined),
    ensureRequestId: mockEnsureRequestId,
    syncRequestHeaderMeta: jest.fn().mockResolvedValue(undefined),
    appendLocalDraftRows: jest.fn(() => ({ items: [] })),
    updateLocalDraftQty: jest.fn(() => null),
    removeLocalDraftRow: jest.fn(() => null),
    openRequestById: mockOpenRequestById,
    applyObjectTypeSelection: mockApplyObjectTypeSelection,
    applyLevelSelection: mockApplyLevelSelection,
    applySystemSelection: mockApplySystemSelection,
    applyZoneSelection: mockApplyZoneSelection,
    activeDraftOwnerId: "owner-1",
  }),
}));

jest.mock("./hooks/useForemanPdf", () => ({
  useForemanPdf: () => ({
    runRequestPdf: mockRunRequestPdf,
  }),
}));

jest.mock("./hooks/useForemanActions", () => ({
  useForemanActions: () => ({
    commitCatalogToDraft: mockCommitCatalogToDraft,
    syncPendingQtyDrafts: mockSyncPendingQtyDrafts,
    submitToDirector: mockSubmitToDirector,
    handleRemoveDraftRow: mockHandleRemoveDraftRow,
    handleCalcAddToRequest: mockHandleCalcAddToRequest,
  }),
}));

jest.mock("./foreman.ai", () => ({
  isForemanQuickRequestConfigured: () => true,
}));

jest.mock("./hooks/useForemanBaseUi", () => ({
  useForemanBaseUi: () => ({
    isFioConfirmVisible: false,
    setIsFioConfirmVisible: mockSetIsFioConfirmVisible,
    isFioLoading: false,
    setIsFioLoading: mockSetIsFioLoading,
    fioBootstrapScopeKey: null,
    setFioBootstrapScopeKey: mockSetFioBootstrapScopeKey,
    foremanHistory: ["Foreman One"],
    setForemanHistory: mockSetForemanHistory,
    foremanMainTab: "materials",
    setForemanMainTab: mockSetForemanMainTab,
    headerAttention: null,
    setHeaderAttention: mockSetHeaderAttention,
    selectedObjectName: "Tower A",
    setSelectedObjectName: mockSetSelectedObjectName,
  }),
}));

jest.mock("./hooks/useForemanDraftUi", () => ({
  useForemanDraftUi: () => ({
    draftOpen: false,
    openDraft: mockOpenDraft,
    closeDraft: mockCloseDraft,
    busy: false,
    setBusy: jest.fn(),
    draftDeleteBusy: false,
    setDraftDeleteBusy: mockSetDraftDeleteBusy,
    draftSendBusy: false,
    setDraftSendBusy: mockSetDraftSendBusy,
    calcVisible: false,
    catalogVisible: true,
    openCatalog: jest.fn(),
    closeCatalog: mockCloseCatalog,
    workTypePickerVisible: false,
    closeWorkTypePicker: jest.fn(),
    selectedWorkType: null,
    showCalcForWorkType: jest.fn(),
    closeCalc: jest.fn(),
    backToWorkTypePicker: jest.fn(),
    openWorkTypePicker: jest.fn(),
    screenLock: false,
  }),
}));

jest.mock("./hooks/useForemanHistoryUi", () => ({
  useForemanHistoryUi: () => ({
    requestHistoryMode: "list",
    selectedHistoryRequestId: null,
    showRequestHistoryDetails: jest.fn(),
    backToRequestHistoryList: jest.fn(),
    historyReopenBusyId: null,
    setHistoryReopenBusyId: jest.fn(),
  }),
}));

jest.mock("./hooks/useForemanAiQuickFlow", () => ({
  useForemanAiQuickFlow: () => ({
    aiQuickVisible: false,
    aiQuickMode: "compose",
    aiQuickText: "",
    aiQuickLoading: false,
    aiQuickApplying: false,
    aiQuickError: "",
    aiQuickNotice: "",
    aiQuickPreview: [],
    aiQuickOutcomeType: "idle",
    aiQuickReviewGroups: [],
    aiQuickQuestions: [],
    aiQuickSessionHint: "",
    aiUnavailableReason: "",
    aiQuickDegradedMode: false,
    aiQuickCanApply: false,
    openAiQuick: jest.fn(),
    closeAiQuick: jest.fn(),
    handleAiQuickTextChange: jest.fn(),
    handleAiQuickBackToCompose: jest.fn(),
    handleAiQuickSelectCandidate: jest.fn(),
    handleAiQuickParse: jest.fn().mockResolvedValue(undefined),
    handleAiQuickApply: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("../../lib/storage/fioPersistence", () => ({
  loadStoredFioState: (...args: unknown[]) => mockLoadStoredFioState(...args),
  saveStoredFioState: (...args: unknown[]) => mockSaveStoredFioState(...args),
}));

type ControllerVm = ReturnType<typeof useForemanScreenController> | null;

function Harness(props: { onSnapshot: (value: ControllerVm) => void }) {
  props.onSnapshot(useForemanScreenController());
  return null;
}

const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("useForemanScreenController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: jest.fn() });
    mockUseIsFocused.mockReturnValue(true);
    mockIsBusy.mockReturnValue(false);
    mockFetchHistory.mockResolvedValue(undefined);
    mockFetchSubcontractHistory.mockResolvedValue(undefined);
    mockSubmitToDirector.mockResolvedValue(undefined);
    mockSyncPendingQtyDrafts.mockResolvedValue(undefined);
    mockRunRequestPdf.mockResolvedValue(undefined);
    mockLoadForemanHistory.mockResolvedValue(["Foreman One"]);
    mockLoadStoredFioState.mockResolvedValue({
      currentFio: "",
      history: ["Foreman One"],
      lastConfirmIso: "2026-04-01T07:00:00.000Z",
    });
    mockSaveStoredFioState.mockResolvedValue(["Foreman One"]);
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "foreman@example.com",
          phone: "+996700000000",
          user_metadata: {
            full_name: "Foreman One",
            phone: "+996700000000",
          },
        },
      },
    });
  });

  it("centralizes representative draft, history and tab orchestration without changing screen-facing behavior", async () => {
    let vm: ControllerVm = null;
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<Harness onSnapshot={(value) => { vm = value; }} />);
    });
    await flushAsync();

    expect(vm).not.toBeNull();
    expect(vm?.screenTitle).toBe("Материалы");
    expect(vm?.materialsContentProps.objectDisplayName).toBe("Tower A");
    expect(vm?.materialsContentProps.currentDisplayLabel).toBe("Новый черновик");
    expect(mockLoadForemanHistory).toHaveBeenCalled();
    expect(mockSetForemanHistory).toHaveBeenCalledWith(["Foreman One"]);

    await act(async () => {
      vm?.openSubcontractsTab();
      vm?.closeMainTab();
      vm?.materialsContentProps.onOpenDraft();
      await vm?.materialsContentProps.onOpenRequestHistory();
      vm?.materialsContentProps.onOpenSubcontractHistory();
      vm?.materialsContentProps.onObjectChange("obj-1");
      await vm?.materialsContentProps.onSendDraft();
    });

    expect(mockSetForemanMainTab).toHaveBeenCalledWith("subcontracts");
    expect(mockSetForemanMainTab).toHaveBeenCalledWith(null);
    expect(mockCloseCatalog).toHaveBeenCalledTimes(1);
    expect(mockOpenDraft).toHaveBeenCalledTimes(1);
    expect(mockFetchHistory).toHaveBeenCalledWith("Foreman One");
    expect(mockFetchSubcontractHistory).toHaveBeenCalledTimes(1);
    expect(mockSetSelectedObjectName).toHaveBeenCalledWith("Tower A");
    expect(mockApplyObjectTypeSelection).toHaveBeenCalledWith("obj-1", "Tower A");
    expect(mockSetDraftSendBusy).toHaveBeenNthCalledWith(1, true);
    expect(mockSubmitToDirector).toHaveBeenCalledTimes(1);
    expect(mockCloseDraft).toHaveBeenCalledTimes(1);
    expect(mockSetDraftSendBusy).toHaveBeenLastCalledWith(false);

    await act(async () => {
      renderer.unmount();
    });
  });

  it("keeps the route thin while the src screen owns foreman orchestration", () => {
    // NAV-LAZY: Tab-level (tabs)/foreman.tsx was removed. The only route
    // is now office/foreman.tsx. Verify it stays thin.
    const routeSource = readFileSync(
      join(__dirname, "..", "..", "..", "app", "(tabs)", "office", "foreman.tsx"),
      "utf8",
    );
    const screenSource = readFileSync(
      join(__dirname, "ForemanScreen.tsx"),
      "utf8",
    );

    expect(routeSource).toContain(
      'import { ForemanScreen } from "../../../src/screens/foreman/ForemanScreen";',
    );
    expect(routeSource).toContain("withScreenErrorBoundary");
    expect(routeSource).not.toContain("useForemanScreenController");
    expect(routeSource).not.toContain("ForemanMaterialsContent");
    expect(routeSource).not.toContain("ForemanSubcontractTab");

    expect(screenSource).toContain("useForemanScreenController");
    expect(screenSource).toContain("<ForemanMaterialsContent {...vm.materialsContentProps} />");
    expect(screenSource).toContain("<ForemanSubcontractTab {...vm.subcontractTabProps} />");
    expect(routeSource).not.toContain("useForemanDraftBoundary");
    expect(routeSource).not.toContain("useForemanHistory(");
    expect(routeSource).not.toContain("useForemanSubcontractHistory");
    expect(routeSource).not.toContain("useForemanBaseUi(");
    expect(routeSource).not.toContain("useForemanDraftUi(");
    expect(routeSource).not.toContain("useForemanHistoryUi(");
    expect(routeSource).not.toContain("useForemanActions(");
    expect(routeSource).not.toContain("useForemanAiQuickFlow(");
  });
});
