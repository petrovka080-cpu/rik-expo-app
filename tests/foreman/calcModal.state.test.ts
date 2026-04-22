import type { Field } from "../../src/components/foreman/useCalcFields";
import {
  deriveCalcModalViewState,
  partitionCalcModalFields,
} from "../../src/components/foreman/calcModal.state";
import { deriveLossState } from "../../src/components/foreman/calcModal.validation";

const fields: Field[] = [
  { key: "area_m2", label: "Area", uiPriority: "core", usedInNorms: true },
  { key: "length_m", label: "Length", uiPriority: "secondary" },
  { key: "volume_m3", label: "Volume", uiPriority: "derived", editable: false },
];

describe("calcModal.state", () => {
  it("partitions fields into core, additional, and derived groups", () => {
    const groups = partitionCalcModalFields(fields);
    expect(groups.coreFields.map((field) => field.key)).toEqual(["area_m2"]);
    expect(groups.additionalFields.map((field) => field.key)).toEqual(["length_m"]);
    expect(groups.derivedFields.map((field) => field.key)).toEqual(["volume_m3"]);
  });

  it("derives ui-ready modal state without changing calculate and send rules", () => {
    const viewState = deriveCalcModalViewState({
      workTypeCode: "WT-CONC",
      fields,
      loadingFields: false,
      calculating: false,
      addingToRequest: false,
      inputs: {
        area_m2: "12",
      },
      measures: {
        area_m2: 12,
      },
      rows: [{ rik_code: "R-1", section: "main", qty: 1 } as never],
      lossPct: "5",
      lossTouched: false,
      lossState: deriveLossState("5"),
    });

    expect(viewState.requiredKeys).toEqual(["area_m2"]);
    expect(viewState.canCalculate).toBe(true);
    expect(viewState.canSend).toBe(true);
    expect(viewState.lossError).toBeNull();
    expect(viewState.multiplier).toBe(1.05);
  });
});
