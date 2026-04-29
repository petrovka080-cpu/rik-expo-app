import React from "react";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import DirectorProposalRiskSummaryCard from "../../src/components/director/DirectorProposalRiskSummaryCard";
import type { DirectorProposalRiskSummaryContext } from "../../src/shared/ai/directorProposalRiskSummary";

const context: DirectorProposalRiskSummaryContext = {
  proposalId: "proposal-1",
  status: "pending_director_review",
  totalSum: 500,
  attachmentsCount: 1,
  items: [
    {
      id: "line-1",
      name: "Concrete",
      qty: 2,
      uom: "m3",
      price: 250,
      appCode: "MAT-1",
    },
  ],
};

const textContent = (renderer: TestRenderer.ReactTestRenderer): string =>
  renderer.root
    .findAllByType(Text)
    .map((node) => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join("") : String(children ?? "");
    })
    .join("\n");

describe("DirectorProposalRiskSummaryCard", () => {
  it("is hidden by default and does not call AI on render", async () => {
    const provider = jest.fn(async () => ({}));
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <DirectorProposalRiskSummaryCard context={context} provider={provider} />,
      );
    });

    expect(renderer.toJSON()).toBeNull();
    expect(provider).not.toHaveBeenCalled();
  });

  it("requires explicit action and renders advisory mocked result", async () => {
    const provider = jest.fn(async () => ({
      summary: "Price looks consistent; verify attachment totals.",
      riskFlags: ["Attachment total should match line total"],
      suggestedChecks: ["Open proposal attachment before decision"],
      confidenceLabel: "medium",
      limitations: ["Advisory only"],
      safeDisplayText: "Price looks consistent; verify attachment totals.",
      advisoryOnly: true,
      canMutateState: false,
    }));
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <DirectorProposalRiskSummaryCard context={context} enabled provider={provider} />,
      );
    });

    expect(provider).not.toHaveBeenCalled();
    expect(textContent(renderer)).toContain("AI summary is advisory");

    await act(async () => {
      renderer.root.findByProps({ testID: "director-proposal-risk-summary-run" }).props.onPress();
    });

    expect(provider).toHaveBeenCalledTimes(1);
    const renderedText = textContent(renderer);
    expect(renderedText).toContain("Price looks consistent");
    expect(renderedText).toContain("Risk:");
    expect(renderedText).toContain("Check:");
    expect(renderedText).not.toContain("{");
    expect(renderedText).not.toContain("approve");
    expect(renderedText).not.toContain("reject");
    expect(renderedText).not.toContain("pay");
  });

  it("shows a safe error when provider output is invalid", async () => {
    const provider = jest.fn(async () => ({
      summary: "",
      advisoryOnly: true,
      canMutateState: false,
    }));
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <DirectorProposalRiskSummaryCard context={context} enabled provider={provider} />,
      );
    });

    await act(async () => {
      renderer.root.findByProps({ testID: "director-proposal-risk-summary-run" }).props.onPress();
    });

    expect(textContent(renderer)).toContain("AI risk summary output was rejected");
    expect(textContent(renderer)).not.toContain("{");
  });
});
