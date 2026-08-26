import fs from "node:fs";
import path from "node:path";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { ConsumerRepairRequestStickyActions } from "../../src/features/consumerRepair/ConsumerRepairRequestChrome";

jest.mock("@expo/vector-icons", () => {
  const mockReact = jest.requireActual("react") as typeof import("react");
  return {
    Ionicons: ({ name }: { name: string }) => mockReact.createElement("MockIonicon", { name }),
  };
});

function source(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function visibleText(tree: ReturnType<TestRenderer.ReactTestRenderer["toJSON"]>): string {
  if (!tree) return "";
  if (Array.isArray(tree)) return tree.map(visibleText).join(" ");
  return (tree.children ?? [])
    .map((child) => typeof child === "string" ? child : visibleText(child))
    .join(" ");
}

function renderedTestIdCount(
  tree: ReturnType<TestRenderer.ReactTestRenderer["toJSON"]>,
  testID: string,
): number {
  if (!tree) return 0;
  if (Array.isArray(tree)) return tree.reduce((sum, child) => sum + renderedTestIdCount(child, testID), 0);
  return (tree.props?.testID === testID ? 1 : 0)
    + (tree.children ?? []).reduce(
      (sum, child) => sum + (typeof child === "string" ? 0 : renderedTestIdCount(child, testID)),
      0,
    );
}

describe("request estimate inline bottom actions", () => {
  it("renders exactly one inline owner with stable actions and no sticky bar", () => {
    const onMakePdf = jest.fn();
    const onApproveDraft = jest.fn();
    const onDeleteDraft = jest.fn();
    const noop = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ConsumerRepairRequestStickyActions
          approved={false}
          sent={false}
          hasBundle
          hasSnapshot
          onOpenPdf={noop}
          onMakePdf={onMakePdf}
          onCreateNew={noop}
          onDeleteDraft={onDeleteDraft}
          onApproveDraft={onApproveDraft}
          onPrepareDraft={noop}
        />,
      );
    });

    const tree = renderer.toJSON();
    expect(renderedTestIdCount(tree, "consumer-repair-bottom-actions")).toBe(1);
    expect(renderer.root.findAllByProps({ testID: "app.sticky-action-bar" })).toHaveLength(0);
    expect(renderedTestIdCount(tree, "consumer-estimate-make-pdf")).toBe(1);
    expect(renderedTestIdCount(tree, "consumer-repair-approve")).toBe(1);
    expect(renderedTestIdCount(tree, "consumer-repair-delete-draft")).toBe(1);
    expect(visibleText(tree)).toContain("PDF");
    expect(visibleText(tree)).toContain("Подтвердить смету");
    expect(visibleText(tree)).toContain("Удалить черновик");
    expect(visibleText(tree)).not.toContain("Скачать PDF");
    expect(visibleText(tree)).not.toContain("Удалить смету");
    expect(visibleText(tree)).not.toMatch(/backend|release|revision|child|server|BATCH|ППР/iu);

    act(() => renderer.root.findAllByProps({ testID: "consumer-estimate-make-pdf" })[0].props.onPress());
    act(() => renderer.root.findAllByProps({ testID: "consumer-repair-approve" })[0].props.onPress());
    act(() => renderer.root.findAllByProps({ testID: "consumer-repair-delete-draft" })[0].props.onPress());
    expect(onMakePdf).toHaveBeenCalledTimes(1);
    expect(onApproveDraft).toHaveBeenCalledTimes(1);
    expect(onDeleteDraft).not.toHaveBeenCalled();
    expect(renderedTestIdCount(renderer.toJSON(), "consumer-repair-delete-confirmation")).toBe(1);
    act(() => renderer.root.findAllByProps({ testID: "consumer-repair-delete-cancel" })[0].props.onPress());
    expect(renderedTestIdCount(renderer.toJSON(), "consumer-repair-delete-confirmation")).toBe(0);
    act(() => renderer.root.findAllByProps({ testID: "consumer-repair-delete-draft" })[0].props.onPress());
    act(() => renderer.root.findAllByProps({ testID: "consumer-repair-delete-confirm" })[0].props.onPress());
    expect(onDeleteDraft).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it("places the sole footer after delivery and history in the request scroll", () => {
    const view = source("src/features/consumerRepair/ConsumerRepairRequestScreenView.tsx");
    const chrome = source("src/features/consumerRepair/ConsumerRepairRequestChrome.tsx");
    const requestStyles = source("src/features/consumerRepair/ConsumerRepairRequestScreen.styles.ts");
    const appScroll = source("src/components/layout/AppScreenScroll.tsx");
    const viewModel = source("src/features/consumerRepair/requestEstimateViewModel.ts");

    expect(chrome).not.toContain("AppStickyActionBar");
    expect(chrome.indexOf("<ConsumerRepairDeliveryFieldsCard"))
      .toBeLessThan(chrome.indexOf("<ConsumerRepairHistory"));
    expect(view.indexOf("<ConsumerRepairRequestContent"))
      .toBeLessThan(view.indexOf("<ConsumerRepairRequestStickyActions"));
    expect(view.indexOf("<ConsumerRepairRequestStickyActions"))
      .toBeLessThan(view.indexOf("</AppScreenScroll>"));
    expect(view.match(/<ConsumerRepairRequestStickyActions/g)).toHaveLength(1);
    expect(view).not.toContain("<AppScreen hasStickyAction");
    expect(requestStyles).not.toMatch(/content:\s*\{[^}]*paddingBottom:/su);
    expect(appScroll).toContain("paddingBottom: APP_LAYOUT.scrollBottomPaddingPx");
    for (const sectionId of ["materials", "labor", "equipment", "logistics"]) {
      expect(viewModel).toContain(`id === "${sectionId}"`);
    }
  });
});
