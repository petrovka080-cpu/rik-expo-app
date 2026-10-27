import React from "react";
import { Text } from "react-native";
import TestRenderer from "react-test-renderer";

import { getProposalIntegritySummaryLabel, getProposalItemIntegrityLabel } from "../../../lib/api/proposalIntegrity";
import { BuyerPropDetailsSheetBody } from "./BuyerPropDetailsSheetBody";

jest.mock("../../../ui/FlashList", () => ({
  FlashList: ({ ListHeaderComponent, data, renderItem }: Record<string, unknown>) => (
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
        </>
      );
    })()
  ),
}));

jest.mock("../../../features/ai/aiAnalyticInsights", () => ({
  buildProposalAnalyticSummary: jest.fn(() => null),
  loadProposalAnalyticInsights: jest.fn(async () => []),
}));

jest.mock("../../../ui/SectionBlock", () => {
  return function MockSectionBlock(props: Record<string, unknown>) {
    return <>{props.children as React.ReactNode}</>;
  };
});

const flattenText = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(flattenText).join("");
  if (value == null || typeof value === "boolean") return "";
  return String(value);
};

describe("BuyerPropDetailsSheetBody", () => {
  it("renders degraded proposal summary and row label", async () => {
    const degradedLine = {
      request_item_id: "ri-1",
      name_human: "Broken line",
      qty: 2,
      uom: "pcs",
      price: 10,
      note: "note",
      request_item_integrity_state: "source_cancelled" as const,
      request_item_integrity_reason: "request_item_cancelled" as const,
    };

    let renderer: TestRenderer.ReactTestRenderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <BuyerPropDetailsSheetBody
          s={{
            smallBtn: {},
            reqNoteBox: {},
            reqNoteLine: {},
            dirMobCard: {},
            dirMobMain: {},
            dirMobTitle: {},
            dirMobMeta: {},
            dirMobNote: {},
          } as never}
          head={{ id: "proposal-1", status: "approved" }}
          propViewBusy={false}
          propViewLines={[degradedLine]}
          isReqContextNote={() => false}
          extractReqContextLines={() => []}
          propAttBusy={false}
          propAttErr=""
          attachments={[]}
          onReloadAttachments={jest.fn()}
          onAttachFile={jest.fn()}
          onOpenAttachment={jest.fn()}
        />,
      );
    });

    const textContent = renderer!.root
      .findAllByType(Text)
      .map((node) => flattenText(node.props.children))
      .join("\n");

    expect(textContent).toContain(getProposalIntegritySummaryLabel([degradedLine]) ?? "");
    expect(textContent).toContain(getProposalItemIntegrityLabel(degradedLine) ?? "");

    await TestRenderer.act(async () => {
      renderer!.unmount();
    });
  });
});
