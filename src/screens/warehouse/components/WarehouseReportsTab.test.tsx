import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { formatHistoryRowEventDate } from "./HistoryRowView";
import WarehouseReportsTab from "./WarehouseReportsTab";
import { buildWarehousePdfBusyKey } from "../warehouse.pdf.boundary";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, { testID: `icon:${name}` }, name),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../../../ui/TopRightActionBar", () => {
  const React = require("react");
  const { View, Pressable, Text } = require("react-native");
  return function MockTopRightActionBar(props: { actions: Record<string, unknown>[] }) {
    return React.createElement(
      View,
      { testID: "top-right-actions" },
      props.actions.map((action) =>
        React.createElement(
          Pressable,
          {
            key: String(action.key),
            testID: `top-action:${String(action.key)}`,
            disabled: action.disabled,
            busy: action.busy,
            onPress: action.onPress,
          },
          React.createElement(Text, null, String(action.key)),
        ),
      ),
    );
  };
});

jest.mock("../../../ui/SectionBlock", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockSectionBlock(props: { children?: React.ReactNode }) {
    return React.createElement(View, null, props.children);
  };
});

jest.mock("../../../components/layout/RoleScreenLayout", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockRoleScreenLayout(props: { children?: React.ReactNode }) {
    return React.createElement(View, { testID: "role-screen-layout" }, props.children);
  };
});

jest.mock("../../../ui/StatusBadge", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    StatusBadge: ({ label }: { label: string }) => React.createElement(Text, null, label),
  };
});

jest.mock("../../../ui/ChevronIndicator", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockChevronIndicator() {
    return React.createElement(Text, null, ">");
  };
});

jest.mock("../../../ui/FlashList", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    FlashList: ({
      data,
      renderItem,
      ListHeaderComponent,
    }: {
      data?: unknown[];
      renderItem?: (args: { item: unknown; index: number }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
    }) =>
      React.createElement(
        View,
        { testID: "flash-list" },
        ListHeaderComponent ?? null,
        Array.isArray(data)
          ? data.map((item, index) =>
              React.createElement(View, { key: `row:${index}` }, renderItem?.({ item, index }) ?? null),
            )
          : null,
      ),
  };
});

const createProps = (overrides: Partial<React.ComponentProps<typeof WarehouseReportsTab>> = {}) => ({
  headerTopPad: 0,
  mode: "issue" as const,
  onBack: jest.fn(),
  onSelectMode: jest.fn(),
  periodFrom: "2026-04-01",
  periodTo: "2026-04-30",
  reportsUi: {
    incomingByDay: [],
    vydachaByDay: [
      {
        day: "01 Р°РїСЂРµР»СЏ 2026",
        items: [
          {
            issue_id: 77,
            issue_no: "ISSUE-77",
            who: "РЎРєР»Р°Рґ",
            obj_name: "РћР±СЉРµРєС‚",
          },
        ],
      },
    ],
    openIncomingDetails: jest.fn(),
    openIssueDetails: jest.fn(),
  },
  onOpenPeriod: jest.fn(),
  onRefresh: jest.fn(),
  onPdfRegister: jest.fn(),
  onPdfMaterials: jest.fn(),
  onPdfObjectWork: jest.fn(),
  onPdfDocument: jest.fn(),
  onPdfDayRegister: jest.fn(),
  onPdfDayMaterials: jest.fn(),
  isPdfBusy: jest.fn(() => false),
  ...overrides,
});

describe("WarehouseReportsTab", () => {
  it("surfaces busy state on the top PDF actions and keeps free actions callable", () => {
    const props = createProps({
      isPdfBusy: (key: string) =>
        key ===
        buildWarehousePdfBusyKey({
          kind: "register",
          reportsMode: "issue",
          periodFrom: "2026-04-01",
          periodTo: "2026-04-30",
        }),
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<WarehouseReportsTab {...props} />);
    });

    const registerAction = renderer.root.findByProps({ testID: "top-action:pdf" });
    const materialsAction = renderer.root.findByProps({ testID: "top-action:mat" });
    const objectWorkAction = renderer.root.findByProps({ testID: "top-action:obj" });

    expect(registerAction.props.disabled).toBe(true);
    expect(registerAction.props.busy).toBe(true);
    expect(materialsAction.props.disabled).toBeFalsy();
    expect(objectWorkAction.props.disabled).toBeFalsy();

    act(() => {
      materialsAction.props.onPress();
      objectWorkAction.props.onPress();
    });

    expect(props.onPdfMaterials).toHaveBeenCalledTimes(1);
    expect(props.onPdfObjectWork).toHaveBeenCalledTimes(1);
  });

  it("keeps per-document and per-day PDF buttons busy-scoped instead of freezing the whole screen", () => {
    const props = createProps({
      isPdfBusy: (key: string) =>
        key ===
          buildWarehousePdfBusyKey({
            kind: "document",
            reportsMode: "issue",
            docId: 77,
          }) ||
        key ===
          buildWarehousePdfBusyKey({
            kind: "day-register",
            reportsMode: "issue",
            dayLabel: "01 Р°РїСЂРµР»СЏ 2026",
          }),
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<WarehouseReportsTab {...props} />);
    });

    const dayRow = renderer.root.findByProps({ testID: "warehouse-report-day:01 Р°РїСЂРµР»СЏ 2026" });
    act(() => {
      dayRow.props.onPress();
    });

    const documentButton = renderer.root.findByProps({ testID: "warehouse-report-pdf:77" });
    const dayRegisterButton = renderer.root.findByProps({ testID: "warehouse-day-register-pdf" });
    const dayMaterialsButton = renderer.root.findByProps({ testID: "warehouse-day-materials-pdf" });

    expect(documentButton.props.disabled).toBe(true);
    expect(documentButton.props.accessibilityState).toMatchObject({ busy: true });
    expect(dayRegisterButton.props.disabled).toBe(true);
    expect(dayMaterialsButton.props.disabled).toBe(false);

    act(() => {
      dayMaterialsButton.props.onPress();
    });

    expect(props.onPdfDayMaterials).toHaveBeenCalledWith("01 Р°РїСЂРµР»СЏ 2026");
  });

  it("renders a stable placeholder when the history event date is absent", () => {
    expect(formatHistoryRowEventDate(null)).toBe(formatHistoryRowEventDate(undefined));
  });
});
