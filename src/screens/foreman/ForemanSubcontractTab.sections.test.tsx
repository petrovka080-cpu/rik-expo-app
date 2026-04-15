import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import type { ForemanRequestSummary, ReqItemRow } from "../../lib/catalog_api";
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
let latestWorkTypePickerProps: Record<string, unknown> | null = null;
let latestCalcModalProps: Record<string, unknown> | null = null;
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

jest.mock("../../components/foreman/WorkTypePicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockWorkTypePicker(props: Record<string, unknown>) {
    latestWorkTypePickerProps = props;
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
  workTypePickerVisible: true,
  onCloseWorkTypePicker: jest.fn(),
  onSelectWorkType: jest.fn(),
  calcVisible: true,
  onCloseCalc: jest.fn(),
  onBackFromCalc: jest.fn(),
  selectedWorkType: { code: "WT-1", name: "Монтаж" },
  onAddCalcToRequest: jest.fn(async (_rows: Record<string, unknown>[]) => {}),
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

describe("ForemanSubcontractTab sections", () => {
  beforeEach(() => {
    latestHistoryBarProps = null;
    latestPeriodPickerProps = null;
    latestCatalogModalProps = null;
    latestWorkTypePickerProps = null;
    latestCalcModalProps = null;
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
    const workTypePickerProps = latestWorkTypePickerProps as {
      onSelect: (workType: { code: string; name: string } | null) => void;
    };
    const calcModalProps = latestCalcModalProps as {
      onBack: () => void;
      onAddToRequest: (rows: Record<string, unknown>[]) => Promise<void>;
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
    const calcRows = [{ rik_code: "R-3", qty: 4 }];

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
      workTypePickerProps.onSelect({ code: "WT-2", name: "Смета" });
      calcModalProps.onBack();
      await calcModalProps.onAddToRequest(calcRows);
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
    expect(props.onOpenDraftFromCatalog).toHaveBeenCalledTimes(1);
    expect(props.onCommitCatalogToDraft).toHaveBeenCalledWith(pickedRows);
    expect(props.onSelectWorkType).toHaveBeenCalledWith({ code: "WT-2", name: "Смета" });
    expect(props.onBackFromCalc).toHaveBeenCalledTimes(1);
    expect(props.onAddCalcToRequest).toHaveBeenCalledWith(calcRows);
    expect(props.onShowRequestDetails).toHaveBeenCalledWith(requestHistory[0]);
    expect(props.onSelectRequest).toHaveBeenCalledWith(requestHistory[0]);
    expect(props.onReopenRequest).toHaveBeenCalledWith(requestHistory[0]);
    expect(props.onOpenRequestPdf).toHaveBeenCalledWith("req-1");
    expect(props.onCloseSubcontractHistory).toHaveBeenCalledTimes(1);
    expect(historyModalProps.mode).toBe("list");
    expect(historyModalProps.selectedRequestId).toBeNull();
    expect(historyModalProps.reopenBusyRequestId).toBeNull();
    expect(subcontractHistoryProps.visible).toBe(true);
  });
});
