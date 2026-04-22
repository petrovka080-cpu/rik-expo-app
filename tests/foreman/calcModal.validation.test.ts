import type { Field } from "../../src/components/foreman/useCalcFields";
import {
  deriveCanCalculate,
  deriveLossState,
  getCalcParseKeys,
  normalizeLossInputOnBlur,
  parseCalcFields,
  synchronizeCalcModalFields,
} from "../../src/components/foreman/calcModal.validation";

const fields: Field[] = [
  {
    key: "length_m",
    label: "Length",
    required: true,
    usedInNorms: true,
    uiPriority: "core",
  },
  {
    key: "height_m",
    label: "Height",
    required: true,
    usedInNorms: true,
    uiPriority: "core",
  },
  {
    key: "area_m2",
    label: "Area",
    uiPriority: "derived",
    editable: false,
  },
];

describe("calcModal.validation", () => {
  it("derives loss state and blur normalization deterministically", () => {
    expect(deriveLossState("")).toEqual({ lossValue: 0, lossInvalid: false });
    expect(deriveLossState("7,5")).toEqual({ lossValue: 7.5, lossInvalid: false });
    expect(deriveLossState("oops")).toEqual({ lossValue: 0, lossInvalid: true });
    expect(normalizeLossInputOnBlur("7,50", deriveLossState("7,50"))).toBe("7.5");
  });

  it("synchronizes visible fields and drops stale errors", () => {
    const synced = synchronizeCalcModalFields({
      fields,
      inputs: {
        orphan: "gone",
        length_m: "5",
      },
      measures: {
        orphan: 9,
        length_m: 5,
      },
      errors: {
        orphan: "stale",
        length_m: "bad",
      },
      autoRuleContext: {
        workTypeCode: "WT-FACADE",
        filmTouched: false,
        manualKeys: new Set<string>(),
      },
    });

    expect(synced.inputs.orphan).toBeUndefined();
    expect(synced.errors.orphan).toBeUndefined();
    expect(synced.measures.area_m2).toBeUndefined();
  });

  it("parses required keys, formats valid values, and derives auto fields", () => {
    const fieldMap = new Map(fields.map((field) => [field.key, field]));
    const parsed = parseCalcFields({
      keys: ["length_m", "height_m"],
      inputs: {
        length_m: " 5 ",
        height_m: " 3 ",
      },
      measures: {},
      errors: {},
      fieldMap,
      autoRuleContext: {
        workTypeCode: "WT-FACADE",
        filmTouched: false,
        manualKeys: new Set<string>(),
      },
      showErrors: true,
    });

    expect(parsed.valid).toBe(true);
    expect(parsed.inputs.length_m).toBe("5");
    expect(parsed.inputs.height_m).toBe("3");
    expect(parsed.measures.area_m2).toBe(15);
  });

  it("keeps invalid and missing fields explicit for validation semantics", () => {
    const fieldMap = new Map(fields.map((field) => [field.key, field]));
    const parsed = parseCalcFields({
      keys: ["length_m", "height_m"],
      inputs: {
        length_m: "",
        height_m: "bad",
      },
      measures: {},
      errors: {},
      fieldMap,
      autoRuleContext: {
        workTypeCode: "WT-FACADE",
        filmTouched: false,
        manualKeys: new Set<string>(),
      },
      showErrors: true,
    });

    expect(parsed.valid).toBe(false);
    expect(parsed.errors.length_m).toBe("Заполните поле");
    expect(parsed.errors.height_m).toBe("Некорректное значение");
  });

  it("classifies parse participation and calculate eligibility without changing modal rules", () => {
    expect(
      getCalcParseKeys({
        fields: [
          { key: "core", label: "Core", uiPriority: "core" },
          { key: "secondary", label: "Secondary", uiPriority: "secondary" },
          { key: "derived", label: "Derived", uiPriority: "derived", editable: false },
        ],
        inputs: { secondary: "12" },
        showSecondaryFields: false,
      }),
    ).toEqual(["core", "secondary"]);

    expect(
      deriveCanCalculate({
        workTypeCode: "WT-FACADE",
        loadingFields: false,
        calculating: false,
        fields,
        requiredKeys: ["length_m", "height_m"],
        inputs: {
          length_m: "5",
          height_m: "3",
        },
        hasMultiplierField: false,
        hasWastePctField: false,
        lossPct: "5",
        lossState: deriveLossState("5"),
      }),
    ).toBe(true);

    expect(
      deriveCanCalculate({
        workTypeCode: "WT-FACADE",
        loadingFields: false,
        calculating: false,
        fields,
        requiredKeys: ["length_m", "height_m"],
        inputs: {
          length_m: "5",
          height_m: "",
        },
        hasMultiplierField: false,
        hasWastePctField: false,
        lossPct: "bad",
        lossState: deriveLossState("bad"),
      }),
    ).toBe(false);
  });
});
