import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { CLASS_TEMPLATES, type ContextResolutionResult } from "./foreman.context";
import type { FormContextUiModel } from "./foreman.locator.adapter";
import type { ForemanRequestSummary } from "../../lib/catalog_api";
import type { PickedRow, CalcRow } from "./foreman.types";
import { s as styles } from "./foreman.styles";
import { UI } from "./foreman.ui";
import {
  ForemanMaterialsMainSections,
  ForemanMaterialsModalStack,
} from "./ForemanMaterialsContent.sections";

let latestEditorProps: Record<string, unknown> | null = null;
let latestHistoryBarProps: Record<string, unknown> | null = null;
let latestHistoryModalProps: Record<string, unknown> | null = null;
let latestCatalogModalProps: Record<string, unknown> | null = null;
let latestCalcModalProps: Record<string, unknown> | null = null;
let latestDraftModalProps: Record<string, unknown> | null = null;
let latestWarehouseFioModalProps: Record<string, unknown> | null = null;

jest.mock("./ForemanEditorSection", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockForemanEditorSection(props: Record<string, unknown>) {
    latestEditorProps = props;
    return React.createElement(View, { testID: "foreman-editor-section" });
  };
});

jest.mock("./ForemanHistoryBar", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockForemanHistoryBar(props: Record<string, unknown>) {
    latestHistoryBarProps = props;
    return React.createElement(View, { testID: "foreman-history-bar" });
  };
});

jest.mock("./ForemanHistoryModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockForemanHistoryModal(props: Record<string, unknown>) {
    latestHistoryModalProps = props;
    return React.createElement(View, { testID: "foreman-history-modal" });
  };
});

jest.mock("./ForemanSubcontractHistoryModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockForemanSubcontractHistoryModal() {
    return React.createElement(View, { testID: "foreman-subcontract-history-modal" });
  };
});

jest.mock("../../components/foreman/CatalogModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockCatalogModal(props: Record<string, unknown>) {
    latestCatalogModalProps = props;
    return React.createElement(View, { testID: "catalog-modal" });
  };
});

jest.mock("../../components/foreman/WorkTypePicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockWorkTypePicker() {
    return React.createElement(View, { testID: "work-type-picker" });
  };
});

jest.mock("../../components/foreman/CalcModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockCalcModal(props: Record<string, unknown>) {
    latestCalcModalProps = props;
    return React.createElement(View, { testID: "calc-modal" });
  };
});

jest.mock("./ForemanAiQuickModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockForemanAiQuickModal() {
    return React.createElement(View, { testID: "ai-quick-modal" });
  };
});

jest.mock("./ForemanDraftModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockForemanDraftModal(props: Record<string, unknown>) {
    latestDraftModalProps = props;
    return React.createElement(View, { testID: "draft-modal" });
  };
});

jest.mock("../warehouse/components/WarehouseFioModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockWarehouseFioModal(props: Record<string, unknown>) {
    latestWarehouseFioModalProps = props;
    return React.createElement(View, { testID: "warehouse-fio-modal" });
  };
});

const renderWithAct = async (element: React.ReactElement) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
};

const contextResult: ContextResolutionResult = {
  config: CLASS_TEMPLATES.multilevel_building,
  resolvedBy: "default",
  confidence: "high",
  warnings: [],
};

const formUi: FormContextUiModel = {
  locator: {
    label: "Этаж",
    placeholder: "Выберите этаж",
    options: [{ code: "L1", name: "1 этаж" }],
    isHidden: false,
    isValidValue: () => true,
  },
  zone: {
    label: "Зона",
    placeholder: "Введите зону",
    options: [{ code: "Z1", name: "Секция A" }],
    isHidden: false,
    isValidValue: () => true,
  },
};

const historyRequests: ForemanRequestSummary[] = [
  {
    id: "req-1",
    display_no: "REQ-1/2026",
    status: "draft",
    object_name_ru: "Object A",
  },
];

const makeMainSectionsProps = (): React.ComponentProps<typeof ForemanMaterialsMainSections> => ({
  contentTopPad: 24,
  onScroll: jest.fn(),
  foreman: "Foreman",
  onOpenFioModal: jest.fn(),
  objectType: "building",
  objectDisplayName: "Object A",
  level: "1",
  system: "HVAC",
  zone: "A-1",
  contextResult,
  formUi,
  objOptions: [{ code: "OBJ", name: "Object A" }],
  sysOptions: [{ code: "SYS", name: "HVAC" }],
  onObjectChange: jest.fn(),
  onLevelChange: jest.fn(),
  onSystemChange: jest.fn(),
  onZoneChange: jest.fn(),
  ensureHeaderReady: jest.fn(() => true),
  isDraftActive: true,
  canStartDraftFlow: true,
  showHint: jest.fn(),
  busy: false,
  onOpenCatalog: jest.fn(),
  closeCatalog: jest.fn(),
  onCalcPress: jest.fn(),
  onAiQuickPress: jest.fn(),
  onOpenDraft: jest.fn(),
  closeDraft: jest.fn(),
  currentDisplayLabel: "REQ-1/2026",
  itemsCount: 2,
  draftSyncStatusLabel: "Synced",
  draftSyncStatusDetail: null,
  draftSyncStatusTone: "neutral",
  draftSendBusy: false,
  headerAttention: null,
  onOpenRequestHistory: jest.fn(),
  onOpenSubcontractHistory: jest.fn(),
  historyVisible: true,
  historyMode: "list",
  historySelectedRequestId: null,
  onHistoryShowDetails: jest.fn(),
  onHistoryBackToList: jest.fn(),
  onHistoryResetView: jest.fn(),
  historyLoading: false,
  historyRequests,
  resolveStatusInfo: () => ({ label: "Черновик", bg: "#222", fg: "#fff" }),
  onHistorySelect: jest.fn(),
  onHistoryReopen: jest.fn(),
  historyReopenBusyId: null,
  onOpenHistoryPdf: jest.fn(),
  isHistoryPdfBusy: jest.fn(() => false),
  shortId: (id: string) => id,
  closeHistory: jest.fn(),
  ui: UI,
  styles,
});

const makeModalStackProps = (): React.ComponentProps<typeof ForemanMaterialsModalStack> => ({
  subcontractHistoryVisible: false,
  closeSubcontractHistory: jest.fn(),
  subcontractHistoryLoading: false,
  subcontractHistory: [],
  catalogVisible: true,
  closeCatalog: jest.fn(),
  rikQuickSearch: jest.fn(async () => []),
  onCommitToDraft: jest.fn(async (_rows: PickedRow[]) => {}),
  onOpenDraft: jest.fn(),
  itemsCount: 2,
  workTypePickerVisible: false,
  closeWorkTypePicker: jest.fn(),
  onSelectWorkType: jest.fn(),
  calcVisible: true,
  closeCalc: jest.fn(),
  backToWorkTypePicker: jest.fn(),
  selectedWorkType: { code: "WT-1", name: "Монтаж" },
  onAddCalcToRequest: jest.fn(async (_rows: CalcRow[]) => {}),
  aiQuickVisible: false,
  closeAiQuick: jest.fn(),
  aiQuickMode: "compose",
  aiQuickText: "",
  onAiQuickTextChange: jest.fn(),
  onAiQuickParse: jest.fn(async () => {}),
  onAiQuickApply: jest.fn(async () => {}),
  onAiQuickBackToCompose: jest.fn(),
  onAiQuickSelectCandidate: jest.fn(),
  aiQuickLoading: false,
  aiQuickApplying: false,
  aiQuickCanApply: false,
  onlineConfigured: true,
  aiQuickError: "",
  aiQuickNotice: "",
  aiQuickPreview: [],
  aiQuickOutcomeType: "idle",
  aiQuickReviewGroups: [],
  aiQuickQuestions: [],
  aiQuickSessionHint: "",
  aiUnavailableReason: "",
  aiQuickDegradedMode: false,
  currentDisplayLabel: "REQ-1/2026",
  draftOpen: true,
  closeDraft: jest.fn(),
  draftSyncStatusLabel: "Synced",
  draftSyncStatusDetail: null,
  draftSyncStatusTone: "neutral",
  objectName: "Object A",
  levelName: "1",
  systemName: "HVAC",
  zoneName: "A-1",
  items: [{
    id: "row-1",
    request_id: "req-1",
    name_human: "Материал",
    qty: 2,
    uom: "шт",
    status: "draft",
    supplier_hint: null,
    app_code: null,
    note: null,
    rik_code: "R-1",
    line_no: 1,
  }],
  renderReqItem: ({ item }) => <>{String(item.id)}</>,
  screenLock: false,
  draftDeleteBusy: false,
  draftSendBusy: false,
  onDeleteDraft: jest.fn(async () => {}),
  onPdf: jest.fn(async () => {}),
  pdfBusy: false,
  onSendDraft: jest.fn(async () => {}),
  availableDraftRecoveryActions: [],
  onRetryDraftSync: jest.fn(async () => {}),
  onRehydrateDraftFromServer: jest.fn(async () => {}),
  onRestoreLocalDraft: jest.fn(async () => {}),
  onDiscardLocalDraft: jest.fn(async () => {}),
  onClearFailedQueueTail: jest.fn(async () => {}),
  isFioConfirmVisible: true,
  foreman: "Foreman",
  handleFioConfirm: jest.fn(async (_fio: string) => {}),
  isFioLoading: false,
  foremanHistory: ["Foreman"],
  ui: UI,
  styles,
});

describe("ForemanMaterialsContent sections", () => {
  beforeEach(() => {
    latestEditorProps = null;
    latestHistoryBarProps = null;
    latestHistoryModalProps = null;
    latestCatalogModalProps = null;
    latestCalcModalProps = null;
    latestDraftModalProps = null;
    latestWarehouseFioModalProps = null;
  });

  it("keeps materials main-section callback wiring stable after extraction", async () => {
    const props = makeMainSectionsProps();
    await renderWithAct(<ForemanMaterialsMainSections {...props} />);

    const editorProps = latestEditorProps as {
      setCatalogVisible: (value: boolean) => void;
      setDraftOpen: (value: boolean) => void;
    };
    const historyBarProps = latestHistoryBarProps as {
      onOpenRequestHistory: () => void;
      onOpenSubcontractHistory: () => void;
    };
    const historyModalProps = latestHistoryModalProps as {
      visible: boolean;
      onSelect: (request: ForemanRequestSummary) => void;
      onOpenPdf: (reqId: string) => void;
    };

    act(() => {
      editorProps.setCatalogVisible(true);
      editorProps.setCatalogVisible(false);
      editorProps.setDraftOpen(true);
      editorProps.setDraftOpen(false);
      historyBarProps.onOpenRequestHistory();
      historyBarProps.onOpenSubcontractHistory();
      historyModalProps.onSelect(historyRequests[0]);
      historyModalProps.onOpenPdf("req-1");
    });

    expect(props.onOpenCatalog).toHaveBeenCalledTimes(1);
    expect(props.closeCatalog).toHaveBeenCalledTimes(1);
    expect(props.onOpenDraft).toHaveBeenCalledTimes(1);
    expect(props.closeDraft).toHaveBeenCalledTimes(1);
    expect(props.onOpenRequestHistory).toHaveBeenCalledTimes(1);
    expect(props.onOpenSubcontractHistory).toHaveBeenCalledTimes(1);
    expect(props.onHistorySelect).toHaveBeenCalledWith(historyRequests[0]);
    expect(props.onOpenHistoryPdf).toHaveBeenCalledWith("req-1");
    expect(historyModalProps.visible).toBe(true);
  });

  it("keeps materials modal-stack actions routed through explicit props", async () => {
    const props = makeModalStackProps();
    await renderWithAct(<ForemanMaterialsModalStack {...props} />);

    const catalogModalProps = latestCatalogModalProps as {
      onOpenDraft: () => void;
      onCommitToDraft: (rows: PickedRow[]) => Promise<void>;
    };
    const calcModalProps = latestCalcModalProps as {
      onBack: () => void;
      onAddToRequest: (rows: CalcRow[]) => Promise<void>;
    };
    const draftModalProps = latestDraftModalProps as {
      onSend: () => Promise<void>;
      onPdf: () => Promise<void>;
    };
    const fioModalProps = latestWarehouseFioModalProps as {
      onConfirm: (fio: string) => Promise<void>;
    };

    const pickedRows: PickedRow[] = [{ rik_code: "R-1", name: "Материал", qty: "2", note: "" }];
    const calcRows: CalcRow[] = [{ rik_code: "R-2", qty: 3 }];

    await act(async () => {
      catalogModalProps.onOpenDraft();
      await catalogModalProps.onCommitToDraft(pickedRows);
      calcModalProps.onBack();
      await calcModalProps.onAddToRequest(calcRows);
      await draftModalProps.onSend();
      await draftModalProps.onPdf();
      await fioModalProps.onConfirm("Иванов И.И.");
    });

    expect(props.onOpenDraft).toHaveBeenCalledTimes(1);
    expect(props.onCommitToDraft).toHaveBeenCalledWith(pickedRows);
    expect(props.backToWorkTypePicker).toHaveBeenCalledTimes(1);
    expect(props.onAddCalcToRequest).toHaveBeenCalledWith(calcRows);
    expect(props.onSendDraft).toHaveBeenCalledTimes(1);
    expect(props.onPdf).toHaveBeenCalledTimes(1);
    expect(props.handleFioConfirm).toHaveBeenCalledWith("Иванов И.И.");
  });
});
