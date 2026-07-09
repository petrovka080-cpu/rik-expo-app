import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import type { ForemanRequestSummary, ReqItemRow } from "../../lib/catalog_api";
import {
  type ForemanAiEstimateDraftMapping,
  type ForemanEstimateContext,
} from "../../lib/foremanAiEstimate";
import { s as styles } from "./foreman.styles";
import { UI } from "./foreman.ui";
import type { PickedRow } from "./foreman.types";
import type { Subcontract } from "../subcontracts/subcontracts.shared";
import {
  ApprovedContractsList,
  DraftSheetBody,
  ForemanSubcontractMainSections,
  ForemanSubcontractModalStack,
} from "./ForemanSubcontractTab.sections";

let latestHistoryBarProps: Record<string, unknown> | null = null;
let latestPeriodPickerProps: Record<string, unknown> | null = null;
let latestCatalogModalProps: Record<string, unknown> | null = null;
let latestProfessionalEstimateComposerProps: Record<string, unknown> | null = null;
let latestHistoryModalProps: Record<string, unknown> | null = null;
let latestSubcontractHistoryProps: Record<string, unknown> | null = null;

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, { testID: `icon:${name}` }, name),
  };
});

jest.mock("@/src/ui/FlashList", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FlashList: ({
      data,
      renderItem,
      ListEmptyComponent,
      ListFooterComponent,
      ...props
    }: {
      data?: unknown[];
      renderItem?: (args: { item: unknown; index: number }) => React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
    }) =>
      React.createElement(
        View,
        { testID: "flash-list", flashListProps: props },
        Array.isArray(data) && data.length > 0
          ? data.map((item, index) => React.createElement(View, { key: `row:${index}` }, renderItem ? renderItem({ item, index }) : null))
          : ListEmptyComponent ?? null,
        ListFooterComponent ?? null,
      ),
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

jest.mock("../subcontracts/subcontracts.shared", () => ({
  fmtAmount: (value: unknown) => String(value ?? ""),
}));

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
  return function MockForemanSubcontractHistoryModal(props: Record<string, unknown>) {
    latestSubcontractHistoryProps = props;
    return React.createElement(View, { testID: "foreman-subcontract-history-modal" });
  };
});

jest.mock("../../components/PeriodPickerSheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockPeriodPickerSheet(props: Record<string, unknown>) {
    latestPeriodPickerProps = props;
    return React.createElement(View, { testID: "period-picker-sheet" });
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

jest.mock("../../components/estimate/ProfessionalEstimateComposer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockProfessionalEstimateComposer(props: Record<string, unknown>) {
    latestProfessionalEstimateComposerProps = props;
    return React.createElement(View, { testID: "professional-estimate-composer" });
  };
});

jest.mock("./ForemanDraftSummaryCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockForemanDraftSummaryCard() {
    return React.createElement(View, { testID: "foreman-draft-summary-card" });
  };
});

jest.mock("./ForemanDropdown", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockForemanDropdown() {
    return React.createElement(View, { testID: "foreman-dropdown" });
  };
});

jest.mock("../../ui/DeleteAllButton", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockDeleteAllButton(props: { onPress: () => void }) {
    return React.createElement(
      Pressable,
      { testID: "delete-all-btn", onPress: props.onPress },
      React.createElement(Text, null, "delete"),
    );
  };
});

jest.mock("../../ui/SendPrimaryButton", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockSendPrimaryButton(props: { onPress: () => void }) {
    return React.createElement(
      Pressable,
      { testID: "send-primary-btn", onPress: props.onPress },
      React.createElement(Text, null, "send"),
    );
  };
});

jest.mock("../../ui/CloseIconButton", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockCloseIconButton(props: { onPress: () => void }) {
    return React.createElement(
      Pressable,
      { testID: "close-icon-btn", onPress: props.onPress },
      React.createElement(Text, null, "close"),
    );
  };
});

const renderWithAct = async (element: React.ReactElement) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
};

function flattenText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flattenText).join("");
  if (React.isValidElement<{ children?: unknown }>(value)) return flattenText(value.props.children);
  return "";
}

const subcontract: Subcontract = {
  id: "sub-1",
  created_at: "2026-04-01T10:00:00.000Z",
  status: "approved",
  foreman_name: "Foreman",
  contractor_org: "Подрядчик",
  contractor_inn: null,
  contractor_rep: null,
  contractor_phone: "+996700000000",
  contract_number: "CNT-1",
  contract_date: "2026-04-01",
  object_name: "Object A",
  work_zone: "1 этаж",
  work_type: "HVAC",
  qty_planned: 15,
  uom: "м2",
  date_start: "2026-04-01",
  date_end: "2026-04-10",
  work_mode: "mixed",
  price_per_unit: 100,
  total_price: 1500,
  price_type: "by_volume",
  foreman_comment: null,
  director_comment: null,
};

const requestHistory: ForemanRequestSummary[] = [
  {
    id: "req-1",
    display_no: "REQ-1/2026",
    status: "draft",
    object_name_ru: "Object A",
  },
];

const draftItems: ReqItemRow[] = [
  {
    id: "item-1",
    request_id: "req-1",
    name_human: "Материал",
    qty: 2,
    uom: "шт",
    status: "draft",
    rik_code: "R-1",
    note: null,
    app_code: null,
    supplier_hint: null,
    line_no: 1,
  },
];

const makeMainSectionsProps = (): React.ComponentProps<typeof ForemanSubcontractMainSections> => ({
  approvedContracts: [subcontract],
  approvedContractsLoading: false,
  contentTopPad: 16,
  onScroll: jest.fn(),
  objOptions: [{ code: "OBJ", name: "Object A" }],
  sysOptions: [{ code: "SYS", name: "HVAC" }],
  selectedTemplateId: "sub-1",
  onSelectApprovedContract: jest.fn(),
  busy: false,
  onOpenMaterials: jest.fn(),
  onOpenEstimate: jest.fn(),
  onOpenRequestHistory: jest.fn(),
  onOpenSubcontractHistory: jest.fn(),
  ui: UI,
  styles,
});

const makeModalStackProps = (): React.ComponentProps<typeof ForemanSubcontractModalStack> => ({
  subcontractDetailsVisible: true,
  onCloseSubcontractFlow: jest.fn(),
  modalHeaderTopPad: 20,
  templateContract: subcontract,
  templateObjectName: "Object A",
  templateLevelName: "1 этаж",
  templateSystemName: "HVAC",
  formLevelCode: "L1",
  formSystemCode: "SYS",
  formZoneText: "A-1",
  draftItemsCount: 1,
  lvlOptions: [{ code: "L1", name: "1 этаж" }],
  sysOptions: [{ code: "SYS", name: "HVAC" }],
  onChangeLevelCode: jest.fn(),
  onChangeSystemCode: jest.fn(),
  onChangeZoneText: jest.fn(),
  onOpenCatalog: jest.fn(),
  onOpenCalc: jest.fn(),
  onOpenDraft: jest.fn(),
  displayNo: "REQ-1/2026",
  draftOpen: true,
  onCloseDraft: jest.fn(),
  objectName: "Object A",
  levelName: "1 этаж",
  systemName: "HVAC",
  zoneName: "A-1",
  contractorName: "Подрядчик",
  phoneName: "+996700000000",
  volumeText: "15 м2",
  draftItems,
  saving: false,
  sending: false,
  requestId: "req-1",
  onRemoveDraftItem: jest.fn(),
  onClearDraft: jest.fn(),
  onPdf: jest.fn(),
  onExcel: jest.fn(),
  onSendToDirector: jest.fn(),
  periodPickerVisible: true,
  onClosePeriodPicker: jest.fn(),
  periodInitialFrom: "2026-04-01",
  periodInitialTo: "2026-04-10",
  onClearPeriod: jest.fn(),
  onApplyPeriod: jest.fn(),
  ui: UI,
  catalogVisible: true,
  onCloseCatalog: jest.fn(),
  rikQuickSearch: jest.fn(async () => []),
  onCommitCatalogToDraft: jest.fn(async (_rows: PickedRow[]) => {}),
  onOpenDraftFromCatalog: jest.fn(),
  aiEstimateVisible: true,
  onCloseAiEstimateComposer: jest.fn(),
  aiEstimateContext: {
    objectName: "Object A",
    levelName: "1 этаж",
    systemName: "HVAC",
    zoneName: "A-1",
    sourceScreen: "foreman_subcontract",
  },
  onAddAiEstimateToDraft: jest.fn(async (_mapping: ForemanAiEstimateDraftMapping) => {}),
  requestHistoryVisible: true,
  onCloseRequestHistory: jest.fn(),
  requestHistoryLoading: false,
  requestHistoryRequests: requestHistory,
  resolveRequestStatusInfo: () => ({ label: "Черновик", bg: "#222", fg: "#fff" }),
  onShowRequestDetails: jest.fn(),
  onSelectRequest: jest.fn(),
  onReopenRequest: jest.fn(),
  onOpenRequestPdf: jest.fn(),
  shortId: (id: string) => id,
  styles,
  subcontractHistoryVisible: true,
  onCloseSubcontractHistory: jest.fn(),
  subcontractHistoryLoading: false,
  subcontractHistory: [subcontract],
});

const makeAiEstimateDraftMappingFixture = (
  context: ForemanEstimateContext,
): ForemanAiEstimateDraftMapping => {
  const totals = {
    materialsTotal: 0,
    laborTotal: 0,
    equipmentTotal: 0,
    deliveryTotal: 0,
    taxTotal: 0,
    grandTotal: 0,
    currency: "KGS",
    displayMaterialsTotal: "0 KGS",
    displayLaborTotal: "0 KGS",
    displayTaxTotal: "0 KGS",
    displayGrandTotal: "0 KGS",
  };
  const tax = {
    taxType: "none" as const,
    taxLabel: "Без НДС",
    taxableBase: 0,
    taxAmount: 0,
    included: false,
    requiresLocationPrecision: false,
  };
  const sourceEstimate: ForemanAiEstimateDraftMapping["payload"]["sourceEstimate"] = {
    estimateId: "screen-routing-estimate",
    outputContract: {
      format: "professional_boq",
      detailLevel: "professional_expanded",
      hasIntro: false,
      hasAssumptions: false,
      hasMaterialsSection: true,
      hasLaborSection: true,
      hasGrandTotal: true,
      hasTaxStatus: true,
      hasRegionalRisks: false,
      hasClarifyingQuestions: false,
    },
    locale: {
      countryCode: "KG",
      city: "Bishkek",
      addressPrecision: "city",
      language: "ru",
      locale: "ru-KG",
      unitSystem: "metric",
      currency: "KGS",
      taxMode: "nds",
      taxIncludedByDefault: false,
      source: "explicit_question",
      confidence: "high",
    },
    work: { workKey: "laminate_laying", title: "Укладка ламината", category: "flooring" },
    input: { volume: 12, unit: "sq_m", originalText: "укладка ламината 12 м2" },
    assumptions: [],
    sections: [],
    tax,
    totals,
    regionalRisks: [],
    costIncreaseFactors: [],
    clarifyingQuestions: [],
    sources: [],
    confidence: "high",
    requiresReview: false,
  };

  return {
    source: "foreman_ai_professional_estimate",
    approvalStatus: "draft",
    context,
    payload: {
      version: "structured-estimate-v1",
      id: "screen-routing-payload",
      source: "foreman",
      inputText: sourceEstimate.input.originalText ?? "",
      estimateId: sourceEstimate.estimateId,
      workKey: sourceEstimate.work.workKey,
      workTitle: sourceEstimate.work.title,
      workCategory: sourceEstimate.work.category,
      locale: sourceEstimate.locale,
      sourceEstimate,
      classification: {
        status: "accepted",
        workKey: sourceEstimate.work.workKey,
        domainKey: sourceEstimate.work.category,
        titleRu: sourceEstimate.work.title,
        confidence: 1,
        evidence: [],
      },
      quantity: { status: "accepted", quantity: 12, unit: "sq_m", measurementKind: "area", assumptions: [] },
      boq: {
        sections: [],
        totals: {
          subtotal: 0,
          pricedSubtotal: 0,
          missingPriceRowsCount: 0,
          allPricedRowsHaveSource: true,
          currency: "KGS",
          manualPriceRequired: false,
        },
      },
      presentation: {
        estimateId: sourceEstimate.estimateId,
        workKey: sourceEstimate.work.workKey,
        workTitle: sourceEstimate.work.title,
        workCategory: sourceEstimate.work.category,
        originalText: sourceEstimate.input.originalText,
        localContext: {
          countryCode: "KG",
          locationLabel: "Bishkek",
          currency: "KGS",
          taxLabel: tax.taxLabel,
          confidence: "high",
          displayLine: "Bishkek · KGS",
        },
        assumptions: [],
        sections: [],
        rows: [],
        totals,
        tax,
        sourceConfidence: "high",
        sourceLabels: [],
        costIncreaseFactors: [],
        clarifyingQuestions: [],
        actions: [],
      },
      pdf: { rows: [], tableFormat: true, noMojibakeRequired: true },
      catalogBinding: { searchLabels: [] },
      assumptions: [],
      clarifications: [],
      risks: [],
      sections: [],
      rows: [],
      totals,
      tax,
      fingerprint: "screen-routing-fingerprint",
      visiblePolicy: {
        noInternalKeysVisible: true,
        noGenericRowsVisible: true,
        controlRowsAreNotPaidItems: true,
        uiPdfSameRows: true,
      },
      fakeGreenClaimed: false,
    },
    payloadFingerprint: "screen-routing-fingerprint",
    estimateRevisionId: "screen-routing-revision",
    rows: [],
    requestDraftLines: [],
    buyerPreviewRows: [],
    totals: { estimateTotal: 0, buyerProcurementTotal: 0, currency: "KGS" },
    fakeGreenClaimed: false,
  };
};

describe("ForemanSubcontractTab sections", () => {
  beforeEach(() => {
    latestHistoryBarProps = null;
    latestPeriodPickerProps = null;
    latestCatalogModalProps = null;
    latestProfessionalEstimateComposerProps = null;
    latestHistoryModalProps = null;
    latestSubcontractHistoryProps = null;
  });

  it("keeps approved-contract selection and history bar actions stable after main-section extraction", async () => {
    const props = makeMainSectionsProps();
    const renderer = await renderWithAct(<ForemanSubcontractMainSections {...props} />);

    const approvedContractsList = renderer.root.findByType(ApprovedContractsList);
    const historyBarProps = latestHistoryBarProps as {
      onOpenRequestHistory: () => void;
      onOpenSubcontractHistory: () => void;
    };

    act(() => {
      approvedContractsList.props.onSelect(subcontract);
      historyBarProps.onOpenRequestHistory();
      historyBarProps.onOpenSubcontractHistory();
    });

    expect(props.onSelectApprovedContract).toHaveBeenCalledWith(subcontract);
    expect(props.onOpenRequestHistory).toHaveBeenCalledTimes(1);
    expect(props.onOpenSubcontractHistory).toHaveBeenCalledTimes(1);
  });

  it("renders the subcontract AI estimate entry as readable Russian copy", async () => {
    const renderer = await renderWithAct(<ForemanSubcontractMainSections {...makeMainSectionsProps()} />);
    const materialsButton = renderer.root.findByProps({ testID: "foreman-subcontracts-materials-open" });
    const estimateButton = renderer.root.findByProps({ testID: "foreman-subcontracts-estimate-open" });
    const materialsText = flattenText(materialsButton.props.children);
    const buttonText = flattenText(estimateButton.props.children);

    expect(materialsText).toContain("Материалы");
    expect(buttonText).toContain("Смета");
    expect(materialsText).not.toMatch(/РЎ|Рџ|Рќ|Рњ|Рљ|Рђ|Рў|РЈ|Р¤|вЂ|В·/);
    expect(buttonText).not.toMatch(/РЎ|Рџ|Рќ|Рњ|Рљ|Рђ|Рў|РЈ|Р¤|вЂ|В·/);
  });

  it("keeps the main subcontract materials action wired next to estimate", async () => {
    const props = makeMainSectionsProps();
    const renderer = await renderWithAct(<ForemanSubcontractMainSections {...props} />);

    act(() => {
      renderer.root.findByProps({ testID: "foreman-subcontracts-materials-open" }).props.onPress();
      renderer.root.findByProps({ testID: "foreman-subcontracts-estimate-open" }).props.onPress();
    });

    expect(props.onOpenMaterials).toHaveBeenCalledTimes(1);
    expect(props.onOpenEstimate).toHaveBeenCalledTimes(1);
  });

  it("keeps extracted subcontract modal-stack actions routed through the same callbacks", async () => {
    const props = makeModalStackProps();
    const renderer = await renderWithAct(<ForemanSubcontractModalStack {...props} />);

    const draftSheetBody = renderer.root.findByType(DraftSheetBody);
    const periodPickerProps = latestPeriodPickerProps as {
      onApply: (from: string) => void;
      onClear: () => void;
    };
    const catalogModalProps = latestCatalogModalProps as {
      onOpenDraft: () => void;
      onCommitToDraft: (rows: PickedRow[]) => Promise<void>;
    };
    const aiEstimateProps = latestProfessionalEstimateComposerProps as {
      visible: boolean;
      mode: "foreman";
      context: ForemanEstimateContext;
      onOpenDraft: () => void;
      onDraftCreated: (mapping: ForemanAiEstimateDraftMapping) => Promise<void> | void;
      onClose: () => void;
    };
    const historyModalProps = latestHistoryModalProps as {
      mode: "list";
      selectedRequestId: null;
      reopenBusyRequestId: null;
      onShowDetails: (request: ForemanRequestSummary) => void;
      onSelect: (request: ForemanRequestSummary) => void;
      onReopen: (request: ForemanRequestSummary) => void | Promise<void>;
      onOpenPdf: (reqId: string) => void;
    };
    const subcontractHistoryProps = latestSubcontractHistoryProps as {
      visible: boolean;
      onClose: () => void;
    };

    const pickedRows: PickedRow[] = [{ rik_code: "R-2", name: "Материал 2", qty: "5", note: "" }];
    const aiMapping = makeAiEstimateDraftMappingFixture(aiEstimateProps.context);

    const deleteAllButton = renderer.root.findByProps({ testID: "delete-all-btn" });
    const sendPrimaryButton = renderer.root.findByProps({ testID: "send-primary-btn" });

    await act(async () => {
      deleteAllButton.props.onPress();
      sendPrimaryButton.props.onPress();
      draftSheetBody.props.onPdf();
      draftSheetBody.props.onExcel();
      periodPickerProps.onClear();
      periodPickerProps.onApply("2026-04-05");
      catalogModalProps.onOpenDraft();
      await catalogModalProps.onCommitToDraft(pickedRows);
      aiEstimateProps.onOpenDraft();
      aiEstimateProps.onClose();
      await aiEstimateProps.onDraftCreated(aiMapping);
      historyModalProps.onShowDetails(requestHistory[0]);
      historyModalProps.onSelect(requestHistory[0]);
      await historyModalProps.onReopen(requestHistory[0]);
      historyModalProps.onOpenPdf("req-1");
      subcontractHistoryProps.onClose();
    });

    expect(props.onClearDraft).toHaveBeenCalledTimes(1);
    expect(props.onSendToDirector).toHaveBeenCalledTimes(1);
    expect(props.onPdf).toHaveBeenCalledTimes(1);
    expect(props.onExcel).toHaveBeenCalledTimes(1);
    expect(props.onClearPeriod).toHaveBeenCalledTimes(1);
    expect(props.onApplyPeriod).toHaveBeenCalledWith("2026-04-05");
    expect(props.onOpenDraftFromCatalog).toHaveBeenCalledTimes(2);
    expect(props.onCommitCatalogToDraft).toHaveBeenCalledWith(pickedRows);
    expect(props.onCloseAiEstimateComposer).toHaveBeenCalledTimes(1);
    expect(props.onAddAiEstimateToDraft).toHaveBeenCalledWith(aiMapping);
    expect(props.onShowRequestDetails).toHaveBeenCalledWith(requestHistory[0]);
    expect(props.onSelectRequest).toHaveBeenCalledWith(requestHistory[0]);
    expect(props.onReopenRequest).toHaveBeenCalledWith(requestHistory[0]);
    expect(props.onOpenRequestPdf).toHaveBeenCalledWith("req-1");
    expect(props.onCloseSubcontractHistory).toHaveBeenCalledTimes(1);
    expect(historyModalProps.mode).toBe("list");
    expect(historyModalProps.selectedRequestId).toBeNull();
    expect(historyModalProps.reopenBusyRequestId).toBeNull();
    expect(subcontractHistoryProps.visible).toBe(true);
    expect(aiEstimateProps.visible).toBe(true);
    expect(aiEstimateProps.mode).toBe("foreman");
    expect(aiEstimateProps.context.sourceScreen).toBe("foreman_subcontract");
  });
});
