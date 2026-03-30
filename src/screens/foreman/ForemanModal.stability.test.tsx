import React from "react";
import { Platform } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import ForemanDraftModal from "./ForemanDraftModal";
import ForemanHistoryModal from "./ForemanHistoryModal";
import ForemanSubcontractHistoryModal from "./ForemanSubcontractHistoryModal";
import { s as styles } from "./foreman.styles";

const mockListLinkedRequestsByLink = jest.fn();
const originalPlatformOs = Platform.OS;

jest.mock("react-native-modal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockRNModal(props: Record<string, unknown>) {
    return React.createElement(
      View,
      {
        testID: "rn-modal",
        modalProps: props,
      },
      props.children,
    );
  };
});

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, { testID: `icon:${name}` }, name),
  };
});

jest.mock("@/src/ui/FlashList", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  return {
    FlashList: ({
      data,
      renderItem,
      ListEmptyComponent,
      ...props
    }: {
      data?: unknown[];
      renderItem?: (args: { item: unknown; index: number }) => React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
    }) =>
      React.createElement(
        View,
        {
          testID: "flash-list",
          flashListProps: props,
        },
        Array.isArray(data) && data.length > 0
          ? data.map((item, index) =>
              React.createElement(
                Pressable,
                { key: `row:${index}`, testID: `flash-row:${index}` },
                renderItem ? renderItem({ item, index }) : null,
              ),
            )
          : ListEmptyComponent ?? null,
      ),
  };
});

jest.mock("../../ui/CloseIconButton", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockCloseIconButton(props: { onPress: () => void; accessibilityLabel?: string }) {
    return React.createElement(
      Pressable,
      { onPress: props.onPress, accessibilityLabel: props.accessibilityLabel, testID: "close-icon-btn" },
      React.createElement(Text, null, "x"),
    );
  };
});

jest.mock("../../ui/DeleteAllButton", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockDeleteAllButton(props: { onPress: () => void }) {
    return React.createElement(
      Pressable,
      { onPress: props.onPress, testID: "delete-all-btn" },
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
      { onPress: props.onPress, testID: "send-primary-btn" },
      React.createElement(Text, null, "send"),
    );
  };
});

jest.mock("./foreman.requests", () => ({
  listLinkedRequestsByLink: (...args: unknown[]) => mockListLinkedRequestsByLink(...args),
}));

jest.mock("../subcontracts/subcontracts.shared", () => ({
  STATUS_CONFIG: {
    draft: { label: "Черновик", bg: "#222", fg: "#fff" },
    submitted: { label: "Отправлено", bg: "#333", fg: "#fff" },
  },
  fmtAmount: (value: unknown) => String(value ?? ""),
}));

const renderWithAct = async (element: React.ReactElement) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
};

describe("Foreman modal stability", () => {
  beforeEach(() => {
    mockListLinkedRequestsByLink.mockReset();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "ios",
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
  });

  it("keeps draft modal close and list interaction contract stable", async () => {
    const onClose = jest.fn();
    const renderer = await renderWithAct(
      <ForemanDraftModal
        visible
        onClose={onClose}
        currentDisplayLabel="REQ-1/2026"
        draftSyncStatusLabel="Локально"
        draftSyncStatusDetail={null}
        draftSyncStatusTone="neutral"
        objectName="Object A"
        levelName="1"
        systemName="HVAC"
        zoneName="Zone A"
        items={[{ id: "item-1" } as never]}
        renderReqItem={({ item }) => <>{String(item.id)}</>}
        screenLock={false}
        draftDeleteBusy={false}
        draftSendBusy={false}
        onDeleteDraft={async () => {}}
        onPdf={async () => {}}
        pdfBusy={false}
        onSend={async () => {}}
        availableRecoveryActions={[]}
        onRetryNow={async () => {}}
        onRehydrateFromServer={async () => {}}
        onRestoreLocal={async () => {}}
        onDiscardLocal={async () => {}}
        onClearFailedQueue={async () => {}}
        ui={{ text: "#fff", sub: "#999", btnNeutral: "#333" }}
        styles={styles}
      />,
    );

    const modal = renderer.root.findByProps({ testID: "rn-modal" });
    const flashList = renderer.root.findByProps({ testID: "flash-list" });
    expect(modal.props.modalProps.isVisible).toBe(true);
    expect(modal.props.modalProps.hideModalContentWhileAnimating).toBe(true);
    expect(flashList.props.flashListProps.keyboardShouldPersistTaps).toBe("handled");
    expect(flashList.props.flashListProps.nestedScrollEnabled).toBe(true);

    act(() => {
      modal.props.modalProps.onBackdropPress();
      modal.props.modalProps.onBackButtonPress();
    });

    expect(onClose).toHaveBeenCalledTimes(2);

    act(() => {
      renderer.unmount();
    });
  });

  it("keeps history modal backdrop semantics stable between list and details modes", async () => {
    const onClose = jest.fn();
    const onBackToList = jest.fn();
    const request = {
      id: "req-1",
      display_no: "REQ-1/2026",
      object_name_ru: "Object A",
      created_at: "2026-03-29T10:00:00.000Z",
      status: "draft",
      has_rejected: false,
    } as never;

    const listRenderer = await renderWithAct(
      <ForemanHistoryModal
        visible
        onClose={onClose}
        mode="list"
        selectedRequestId={null}
        onShowDetails={jest.fn()}
        onBackToList={onBackToList}
        onResetView={jest.fn()}
        loading={false}
        requests={[request]}
        resolveStatusInfo={() => ({ label: "Черновик", bg: "#222", fg: "#fff" })}
        onSelect={jest.fn()}
        onReopen={jest.fn()}
        reopenBusyRequestId={null}
        onOpenPdf={jest.fn()}
        isPdfBusy={() => false}
        shortId={() => "req-1"}
        styles={styles}
      />,
    );
    const listModal = listRenderer.root.findByProps({ testID: "rn-modal" });
    act(() => {
      listModal.props.modalProps.onBackdropPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBackToList).not.toHaveBeenCalled();

    const detailsRenderer = await renderWithAct(
      <ForemanHistoryModal
        visible
        onClose={onClose}
        mode="details"
        selectedRequestId="req-1"
        onShowDetails={jest.fn()}
        onBackToList={onBackToList}
        onResetView={jest.fn()}
        loading={false}
        requests={[request]}
        resolveStatusInfo={() => ({ label: "Черновик", bg: "#222", fg: "#fff" })}
        onSelect={jest.fn()}
        onReopen={jest.fn()}
        reopenBusyRequestId={null}
        onOpenPdf={jest.fn()}
        isPdfBusy={() => false}
        shortId={() => "req-1"}
        styles={styles}
      />,
    );
    const detailsModal = detailsRenderer.root.findByProps({ testID: "rn-modal" });
    act(() => {
      detailsModal.props.modalProps.onBackdropPress();
      detailsModal.props.modalProps.onBackButtonPress();
    });
    expect(onBackToList).toHaveBeenCalledTimes(2);

    act(() => {
      listRenderer.unmount();
      detailsRenderer.unmount();
    });
  });

  it("keeps subcontract history modal list/details close contract stable", async () => {
    mockListLinkedRequestsByLink.mockResolvedValue([{ id: "req-1", request_no: "REQ-1/2026" }]);
    const onClose = jest.fn();

    const renderer = await renderWithAct(
      <ForemanSubcontractHistoryModal
        visible
        onClose={onClose}
        loading={false}
        history={[
          {
            id: "sub-1",
            contractor_org: "Contractor A",
            object_name: "Object A",
            work_type: "Works",
            qty_planned: 10,
            uom: "m2",
            status: "draft",
          } as never,
        ]}
        styles={styles}
        ui={{ text: "#fff" }}
      />,
    );

    const modalBefore = renderer.root.findByProps({ testID: "rn-modal" });
    act(() => {
      modalBefore.props.modalProps.onBackdropPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    const pressablesWithHandlers = renderer.root.findAll(
      (node) => typeof node.props?.onPress === "function",
    );
    const rowPressable = pressablesWithHandlers[pressablesWithHandlers.length - 1];
    expect(rowPressable).toBeTruthy();

    await act(async () => {
      await rowPressable!.props.onPress();
    });

    const modalDuringDetails = renderer.root.findByProps({ testID: "rn-modal" });
    act(() => {
      modalDuringDetails.props.modalProps.onBackdropPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    const modalAfterBack = renderer.root.findByProps({ testID: "rn-modal" });
    act(() => {
      modalAfterBack.props.modalProps.onBackdropPress();
    });
    expect(onClose).toHaveBeenCalledTimes(2);

    act(() => {
      renderer.unmount();
    });
  });
});
