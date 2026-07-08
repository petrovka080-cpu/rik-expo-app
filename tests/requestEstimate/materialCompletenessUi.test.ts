import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import {
  buildProfessionalBoqMaterialCompletenessPanelModel,
  ProfessionalBoqMaterialCompletenessPanel,
} from "../../src/features/requests/components/ProfessionalBoqMaterialCompletenessPanel";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { validateProfessionalBoqMaterialCompleteness } from "../../src/lib/estimate/validateProfessionalBoqMaterialCompleteness";

describe("material completeness request UI", () => {
  it("renders passed material completeness and no-truncation counters", () => {
    const revision = createEstimateDraftRevision({
      rawInput: "забор из профлиста 80 м высота 2 м столбы через 2.5 м ворота 4 м",
      city: "Bishkek",
      currency: "KGS",
      countryCode: "KG",
      createdAt: "2026-07-08T00:00:00.000Z",
    });
    const buyerHandoffRowIds = revision.boq.rows
      .filter((row) => row.includedInProcurement)
      .filter((row) => row.rowType !== "work" && row.rowType !== "labor")
      .map((row) => row.rowId);
    const validation = validateProfessionalBoqMaterialCompleteness({
      templateId: revision.selectedTemplateId,
      family: revision.matchedFamily,
      prompt: "забор из профлиста 80 м высота 2 м столбы через 2.5 м ворота 4 м",
      rows: revision.boq.rows,
      snapshotRows: revision.boq.rows,
      detailDrawerRowsCount: revision.boq.rows.length,
      pdfRowsCount: revision.boq.rows.length,
      buyerHandoffRowIds,
    });
    const model = buildProfessionalBoqMaterialCompletenessPanelModel(validation);
    let renderer: TestRenderer.ReactTestRenderer | null = null;

    act(() => {
      renderer = TestRenderer.create(React.createElement(ProfessionalBoqMaterialCompletenessPanel, { validation }));
    });

    const root = renderer!.root;
    expect(model.passed).toBe(true);
    expect(model.missingRequiredSlotsCount).toBe(0);
    expect(model.truncationDetected).toBe(false);
    expect(root.findByProps({ testID: "professional-boq-material-completeness-panel" })).toBeTruthy();
    expect(root.findByProps({ testID: "professional-boq-missing-slots-panel" })).toBeTruthy();
    const rendered = JSON.stringify(renderer!.toJSON());
    expect(rendered).toContain("Состав материалов полный");
    expect(rendered).toContain("missing=0");
    expect(rendered).toContain("truncation=false");
  });
});
