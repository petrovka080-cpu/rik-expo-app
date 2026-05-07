import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { View } from "react-native";

import type { BuyerScreenSheetsProps } from "../../src/screens/buyer/components/BuyerScreenSheets";
import { BuyerScreenSheets } from "../../src/screens/buyer/components/BuyerScreenSheets";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "ionicon", iconProps: props }),
  };
});

jest.mock("../../src/screens/buyer/components/BuyerSheetShell", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BuyerSheetShell: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(View, { testID: "sheet-shell", shellProps: props }, children),
  };
});

jest.mock("../../src/screens/warehouse/components/WarehouseFioModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockWarehouseFioModal(props: Record<string, unknown>) {
    return React.createElement(View, { testID: "fio-modal", modalProps: props });
  };
});

jest.mock("../../src/screens/buyer/ToastOverlay", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockToastOverlay(props: Record<string, unknown>) {
    return React.createElement(View, { testID: "toast-overlay", toastProps: props });
  };
});

jest.mock("../../src/screens/buyer/components/BuyerInboxSheetBody", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BuyerInboxSheetBody: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "inbox-body", bodyProps: props }, props.footer),
  };
});

jest.mock("../../src/screens/buyer/components/BuyerPropDetailsSheetBody", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BuyerPropDetailsSheetBody: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "proposal-details-body", bodyProps: props }),
  };
});

jest.mock("../../src/screens/buyer/components/BuyerAccountingSheetBody", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BuyerAccountingSheetBody: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "accounting-body", bodyProps: props }),
  };
});

jest.mock("../../src/screens/buyer/components/BuyerReworkSheetBody", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SheetFooterActions: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "sheet-footer", footerProps: props }, props.left, props.center, props.right),
    BuyerReworkSheetBody: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "rework-body", bodyProps: props }),
  };
});

jest.mock("../../src/screens/buyer/components/BuyerRfqSheetBody", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    BuyerRfqSheetBody: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: "rfq-body", bodyProps: props }),
  };
});

jest.mock("../../src/ui/AppButton", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockAppButton(props: Record<string, unknown>) {
    return React.createElement(View, { testID: "app-button", buttonProps: props });
  };
});

jest.mock("../../src/ui/IconSquareButton", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockIconSquareButton(props: Record<string, unknown>) {
    return React.createElement(View, { testID: "icon-square-button", buttonProps: props }, props.children);
  };
});

jest.mock("../../src/ui/SendPrimaryButton", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockSendPrimaryButton(props: Record<string, unknown>) {
    return React.createElement(View, { testID: "send-primary-button", buttonProps: props });
  };
});

const noop = () => undefined;
const asyncNoop = async () => undefined;

function buildProps(overrides: Partial<BuyerScreenSheetsProps> = {}): BuyerScreenSheetsProps {
  const props: BuyerScreenSheetsProps = {
    s: {
      sheetBody: {},
      sendBtnWarnWrap: {},
    },
    isWeb: true,
    sheetKind: "none",
    sheetTitle: "Buyer",
    isSheetOpen: false,
    closeSheet: noop,
    fioModal: {
      visible: false,
      initialFio: "",
      onConfirm: noop,
      loading: false,
      history: [],
    },
    inbox: {
      sheetGroup: null,
      sheetData: [],
      kbOpen: false,
      creating: false,
      needAttachWarn: false,
      showAttachBlock: false,
      setShowAttachBlock: noop,
      requiredSuppliers: [],
      missingAttachSuppliers: [],
      attachMissingCount: 0,
      attachFilledCount: 0,
      attachSlotsTotal: 0,
      pickedIdsLen: 0,
      attachments: {},
      setAttachments: noop,
      renderItemRow: () => null,
      showFooter: false,
      clearPick: noop,
      openRfqSheet: noop,
      handleCreateProposalsBySupplier: noop,
      disableClear: true,
      disableRfq: true,
      disableSend: true,
    },
    proposalDetails: {
      state: {
        propViewId: "proposal-1",
        setPropViewId: noop,
        propViewBusy: false,
        setPropViewBusy: noop,
        propViewLines: [],
        setPropViewLines: noop,
        propViewHead: { id: "proposal-1", status: "draft" },
        setPropViewHead: noop,
      },
      isReqContextNote: () => false,
      extractReqContextLines: () => [],
      propAttBusy: false,
      propAttErrByPid: { "proposal-1": "load failed" },
      propAttByPid: { "proposal-1": [{ id: "att-1", file_name: "doc.pdf" }] },
      loadProposalAttachments: asyncNoop,
      attachFileToProposal: asyncNoop,
      openPropAttachment: noop,
      openProposalPdfFromDetails: noop,
      openAccountingModal: noop,
      openRework: noop,
    },
    accounting: {
      acctProposalId: null,
      setAcctProposalId: noop,
      invNumber: "",
      setInvNumber: noop,
      invDate: "",
      setInvDate: noop,
      invAmount: "",
      setInvAmount: noop,
      invCurrency: "KGS",
      setInvCurrency: noop,
      invFile: null,
      setInvFile: noop,
      acctBusy: false,
      setAcctBusy: noop,
      acctSupp: null,
      setAcctSupp: noop,
      propDocAttached: null,
      setPropDocAttached: noop,
      propDocBusy: false,
      setPropDocBusy: noop,
      invoiceUploadedName: "",
      setInvoiceUploadedName: noop,
      openInvoicePickerWeb: noop,
      pickInvoiceFile: async () => null,
      sendToAccounting: noop,
    },
    rework: {
      rwBusy: false,
      rwPid: null,
      rwReason: "",
      rwItems: [],
      setRwItems: noop,
      rwInvNumber: "",
      setRwInvNumber: noop,
      rwInvDate: "",
      setRwInvDate: noop,
      rwInvAmount: "",
      setRwInvAmount: noop,
      rwInvCurrency: "KGS",
      setRwInvCurrency: noop,
      rwInvFile: null,
      setRwInvFile: noop,
      rwInvUploadedName: "",
      pickInvoiceFile: async () => null,
      rwSaveItems: noop,
      rwSendToDirector: noop,
      rwSendToAccounting: noop,
    },
    rfq: {
      form: {
        rfqBusy: false,
        setRfqBusy: noop,
        rfqDeadlineIso: "2026-04-21T00:00:00.000Z",
        setRfqDeadlineIso: noop,
        rfqDeliveryDays: "3",
        setRfqDeliveryDays: noop,
        rfqPhone: "+996",
        setRfqPhone: noop,
        rfqCountryCode: "KG",
        setRfqCountryCode: noop,
        rfqEmail: "buyer@example.test",
        setRfqEmail: noop,
        rfqCity: "Bishkek",
        setRfqCity: noop,
        rfqAddressText: "Main street",
        setRfqAddressText: noop,
        rfqNote: "note",
        setRfqNote: noop,
        rfqShowItems: true,
        setRfqShowItems: noop,
        rfqVisibility: "open",
        setRfqVisibility: noop,
        rfqPaymentTerms: "cash",
        setRfqPaymentTerms: noop,
        rfqDeliveryType: "delivery",
        setRfqDeliveryType: noop,
        rfqDeliveryWindow: "morning",
        setRfqDeliveryWindow: noop,
        rfqNeedInvoice: true,
        setRfqNeedInvoice: noop,
        rfqNeedWaybill: false,
        setRfqNeedWaybill: noop,
        rfqNeedCert: false,
        setRfqNeedCert: noop,
        rfqRememberContacts: true,
        setRfqRememberContacts: noop,
        rfqCountryCodeTouched: { current: false },
      },
      pickedIdsLen: 2,
      rfqPickedPreview: [{ id: "i1", title: "item", qty: 1, uom: "pcs" }],
      fmtLocal: (iso) => iso,
      setDeadlineHours: noop,
      isDeadlineHoursActive: () => false,
      inferCountryCode: () => "KG",
      publishRfq: noop,
    },
    toast: null,
  };

  return { ...props, ...overrides };
}

describe("BuyerScreenSheets boundary", () => {
  it("exports the sheets as a memoized render boundary", () => {
    const sheetsBoundary = BuyerScreenSheets as unknown as { $$typeof?: symbol };
    expect(sheetsBoundary.$$typeof).toBe(Symbol.for("react.memo"));
  });

  it("keeps proposal details as the only active sheet body for prop_details", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <BuyerScreenSheets {...buildProps({ sheetKind: "prop_details", isSheetOpen: true })} />,
      );
    });

    const proposalBody = renderer.root.findByProps({ testID: "proposal-details-body" });
    expect(proposalBody.props.bodyProps.propAttErr).toBe("load failed");
    expect(proposalBody.props.bodyProps.attachments).toHaveLength(1);
    expect(renderer.root.findAllByProps({ testID: "inbox-body" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: "accounting-body" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: "rework-body" })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: "rfq-body" })).toHaveLength(0);
  });

  it("maps RFQ form state into the RFQ sheet without moving business rules into the screen", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <BuyerScreenSheets {...buildProps({ sheetKind: "rfq", isSheetOpen: true })} />,
      );
    });

    const rfqBody = renderer.root.findByProps({ testID: "rfq-body" });
    expect(rfqBody.props.bodyProps.rfqCity).toBe("Bishkek");
    expect(rfqBody.props.bodyProps.rfqCountryCodeTouchedRef.current).toBe(false);
    expect(rfqBody.props.bodyProps.rfqPickedPreview).toHaveLength(1);
    expect(rfqBody.props.bodyProps.pickedIdsLen).toBe(2);
  });

  it("owns inbox footer actions inside the sheet boundary", () => {
    const createProposals = jest.fn();
    const openRfqSheet = jest.fn();
    const clearPick = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <BuyerScreenSheets
          {...buildProps({
            sheetKind: "inbox",
            isSheetOpen: true,
            inbox: {
              ...buildProps().inbox,
              sheetGroup: { request_id: "req-1", items: [] },
              showFooter: true,
              disableClear: false,
              disableRfq: false,
              disableSend: false,
              clearPick,
              openRfqSheet,
              handleCreateProposalsBySupplier: createProposals,
            },
          })}
        />,
      );
    });

    const footer = renderer.root.findByProps({ testID: "sheet-footer" });
    expect(footer).toBeTruthy();
    expect(renderer.root.findByProps({ testID: "app-button" }).props.buttonProps.onPress).toBe(openRfqSheet);
    expect(renderer.root.findByProps({ testID: "icon-square-button" }).props.buttonProps.onPress).toBe(clearPick);
    expect(renderer.root.findByProps({ testID: "send-primary-button" }).props.buttonProps.onPress).toBe(createProposals);
  });
});
