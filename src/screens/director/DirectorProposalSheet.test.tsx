import React from "react";
import { Text } from "react-native";
import TestRenderer from "react-test-renderer";

import {
  getProposalIntegritySummaryLabel,
  getProposalItemIntegrityLabel,
} from "../../lib/api/proposalIntegrity";
import DirectorProposalSheet from "./DirectorProposalSheet";

jest.mock("@/src/ui/FlashList", () => ({
  FlashList: ({ ListHeaderComponent, data, renderItem, ListFooterComponent }: Record<string, unknown>) => (
    (() => {
      const React = require("react");
      return (
        <>
          {ListHeaderComponent as React.ReactNode}
          {Array.isArray(data)
            ? data.map((item, index) => (
                <React.Fragment key={index}>
                  {(renderItem as ({ item }: { item: unknown }) => React.ReactNode)({ item })}
                </React.Fragment>
              ))
            : null}
          {typeof ListFooterComponent === "function"
            ? (ListFooterComponent as () => React.ReactNode)()
            : (ListFooterComponent as React.ReactNode)}
        </>
      );
    })()
  ),
}));

jest.mock("../../ui/DeleteAllButton", () => () => null);
jest.mock("../../ui/RejectItemButton", () => () => null);
jest.mock("../../ui/SendPrimaryButton", () => () => null);
jest.mock("./DirectorProposalAttachments", () => () => null);
jest.mock("./DirectorProposalRequestContext", () => () => null);
jest.mock("../../features/ai/aiAnalyticInsights", () => ({
  buildProposalAnalyticSummary: jest.fn(() => null),
  loadProposalAnalyticInsights: jest.fn(async () => []),
}));

const flattenText = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(flattenText).join("");
  if (value == null || typeof value === "boolean") return "";
  return String(value);
};

describe("DirectorProposalSheet", () => {
  it("renders degraded proposal summary and row label", async () => {
    const degradedItem = {
      id: 1,
      request_item_id: "ri-1",
      rik_code: "MAT-1",
      name_human: "Broken line",
      uom: "pcs",
      app_code: "APP-1",
      total_qty: 2,
      price: 10,
      request_item_integrity_state: "source_missing" as const,
      request_item_integrity_reason: "request_item_missing" as const,
    };

    let renderer: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <DirectorProposalSheet
          pidStr="proposal-1"
          items={[degradedItem]}
          loaded
          totalSum={20}
          screenLock={false}
          decidingId={null}
          actingPropItemId={null}
          propReturnId={null}
          propApproveId={null}
          approveDisabled
          files={[]}
          busyAtt={false}
          attError=""
          reqItemNoteById={{}}
          propReqIds={[]}
          reqMetaById={{}}
          isPdfBusy={false}
          onRefreshAttachments={jest.fn()}
          onOpenAttachment={jest.fn()}
          onRejectItem={jest.fn(async () => {})}
          onReturn={jest.fn()}
          onPdf={jest.fn(async () => {})}
          onExcel={jest.fn(async () => {})}
          onApprove={jest.fn(async () => {})}
        />,
      );
    });

    const textContent = renderer!.root
      .findAllByType(Text)
      .map((node) => flattenText(node.props.children))
      .join("\n");

    expect(textContent).toContain(getProposalIntegritySummaryLabel([degradedItem]) ?? "");
    expect(textContent).toContain(getProposalItemIntegrityLabel(degradedItem) ?? "");

    await TestRenderer.act(async () => {
      renderer!.unmount();
    });
  });
});
