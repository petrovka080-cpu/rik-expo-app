import React from "react";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import DirectorFinanceContent from "./DirectorFinanceContent";
import type { DirectorFinanceCanonicalScope } from "./director.readModels";

jest.mock("./director.finance", () => ({
  money: (value: number) => String(Number(value ?? 0)),
}));

jest.mock("@/src/ui/FlashList", () => {
   
  const mockReact = require("react");
   
  const mockReactNative = require("react-native");
  return {
    FlashList: function MockFlashList(props: {
      data?: unknown[];
      renderItem?: (args: { item: unknown; index: number }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
    }) {
      const data = Array.isArray(props.data) ? props.data : [];
      return mockReact.createElement(
        mockReactNative.View,
        null,
        props.ListHeaderComponent ?? null,
        data.length
          ? data.map((item, index) =>
              mockReact.createElement(
                mockReactNative.View,
                { key: String(index) },
                props.renderItem ? props.renderItem({ item, index }) : null,
              ),
            )
          : (props.ListEmptyComponent ?? null),
      );
    },
  };
});

const canonicalScope: DirectorFinanceCanonicalScope = {
  mode: "canonical",
  semantics: "invoice_level_obligations",
  summary: {
    approvedTotal: 1200,
    paidTotal: 900,
    debtTotal: 300,
    overpaymentTotal: 0,
    overdueCount: 1,
    overdueAmount: 300,
    criticalCount: 0,
    criticalAmount: 0,
    debtCount: 1,
    partialCount: 1,
    partialPaidTotal: 100,
  },
  suppliers: [
    {
      supplierId: "supplier-1",
      supplierName: "Supplier Canonical",
      approvedTotal: 1200,
      paidTotal: 900,
      debtTotal: 300,
      overpaymentTotal: 0,
      invoiceCount: 2,
      overdueCount: 1,
      criticalCount: 0,
      semanticsMode: "invoice_level_obligations",
      sourceVersion: "v4",
    },
  ],
  objects: [],
  obligations: {
    semantics: "invoice_level_obligations",
    approved: 1200,
    paid: 900,
    debt: 300,
    overpaymentCompensationApplied: false,
    debtFormulaHint: "Debt hint",
  },
  spend: {
    semantics: "allocation_level_spend",
    approved: 777,
    paid: 555,
    toPay: 222,
    overpay: 0,
    allocationCoverageHint: "Spend hint",
  },
  spendBreakdown: {
    header: {
      approved: 777,
      paid: 555,
      toPay: 222,
      overpay: 0,
    },
    kindRows: [],
    overpaySuppliers: [],
  },
  metricSourceMap: [],
  workInclusion: {
    spendRowsSource: "v_director_finance_spend_kinds_v3",
    obligationsSource: "list_accountant_inbox_fact",
    observedKinds: ["materials"],
    workKindSupported: true,
    workKindPresent: false,
    materialsPresent: true,
    servicesPresent: false,
    obligationsWorkInclusion: "conditional_when_proposal_or_invoice_exists",
    spendWorkInclusion: "included_by_kind_rows",
    explanation: "Kinds explanation",
  },
  uiExplainer: {
    title: "Finance explainer",
    obligationsSummary: "Obligations summary",
    spendSummary: "Spend summary",
    differenceSummary: "Difference summary",
    workSummary: "Work summary",
  },
  diagnostics: {
    sourceVersion: "director_finance_panel_scope_v4",
    payloadShapeVersion: "v4",
    usedFallback: false,
    displayMode: "canonical_v3",
    owner: "backend",
    generatedAt: "2026-04-08T00:00:00.000Z",
    financeSummarySource: "summary_v4",
    supplierSource: "supplier_rows_v4",
    objectSource: "object_rows_v4",
    spendSource: "panel_spend_header",
  },
};

const baseProps = {
  finLoading: false,
  finScope: canonicalScope,
  finKindName: "",
  finKindList: [],
  finSupplier: null,
  finSupplierLoading: false,
  supplierPdfBusy: false,
  FIN_CRITICAL_DAYS: 14,
  pushFin: jest.fn(),
  openSupplier: jest.fn(),
  openFinKind: jest.fn(),
  onSupplierPdf: jest.fn(async () => undefined),
  fmtDateOnly: (value?: string | null) => String(value ?? ""),
};

describe("DirectorFinanceContent wave3 canonical cutover", () => {
  it("renders home totals from canonical server scope", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <DirectorFinanceContent
          {...baseProps}
          finPage="home"
        />,
      );
    });

    const textContent = renderer.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ");

    expect(textContent).toContain("1200");
    expect(textContent).toContain("300");
    expect(textContent).toContain("777");
    expect(textContent).toContain("222");
  });

  it("uses canonical supplier debt rows in the debt modal", () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <DirectorFinanceContent
          {...baseProps}
          finPage="debt"
        />,
      );
    });

    act(() => {
      renderer.root.findByProps({ testID: "director-finance-debt-suppliers-toggle" }).props.onPress();
    });

    const textContent = renderer.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ");

    expect(textContent).toContain("Supplier Canonical");
    expect(textContent).toContain("300");
  });
});
