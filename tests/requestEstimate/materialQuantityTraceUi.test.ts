import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { ProfessionalEstimateDraftPreview } from "../../src/features/requests/components/ProfessionalEstimateDraftPreview";

describe("material quantity trace request UI", () => {
  it("renders material quantity, waste packaging, and formula panels from one draft", () => {
    const draft = buildConsumerRepairAiDraft(
      "водоснабжение села 5 км труба ПНД 110 водонапорная башня 25 м3",
      { currency: "KGS", city: "Bishkek" },
    );
    let renderer: TestRenderer.ReactTestRenderer | null = null;

    act(() => {
      renderer = TestRenderer.create(React.createElement(ProfessionalEstimateDraftPreview, { draft }));
    });

    const root = renderer!.root;
    expect(root.findByProps({ testID: "material-quantity-trace-panel" })).toBeTruthy();
    expect(root.findByProps({ testID: "material-waste-packaging-panel" })).toBeTruthy();
    expect(root.findByProps({ testID: "material-quantity-formula-drawer" })).toBeTruthy();
    const rendered = JSON.stringify(renderer!.toJSON());
    expect(rendered).toContain("Material quantity trace");
    expect(rendered).toContain("Waste and packaging");
    expect(rendered).toContain("Material formulas");
    expect(rendered).toContain("buy=");
    expect(rendered).toContain("package=");
    expect(rendered).toContain("params=");
  });
});
