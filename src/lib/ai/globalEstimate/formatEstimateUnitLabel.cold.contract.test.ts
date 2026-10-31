import { PROFESSIONAL_UNIT_REGISTRY, getProfessionalUnitDefinition, resolveProfessionalUnitDefinition } from "../../estimate/professionalUnitRegistry";
import { formatEstimateUnitLabel } from "./formatEstimateUnitLabel";

describe("cold registered-unit display without initializing normalized alias machinery", () => {
  it("does not Unicode-normalize the registry merely to display known Russian labels", () => {
    jest.isolateModules(() => {
      const { formatEstimateUnitLabel: coldFormat } = require("./formatEstimateUnitLabel") as typeof import("./formatEstimateUnitLabel");
      const normalization = jest.spyOn(String.prototype, "normalize");
      try {
        for (const [input, label] of [["м³", "м³"], ["м²", "м²"], ["шт.", "шт."], ["чел.-ч", "чел.-ч"],
          ["маш.-ч", "маш.-ч"], ["пог. м", "пог. м"], ["кг", "кг"], ["м³ бетона", "м³ бетона"], ["м", "м"]]) {
          expect(coldFormat(input)).toBe(label);
        }
        expect(normalization).not.toHaveBeenCalled();
      } finally {
        normalization.mockRestore();
      }
    });
  });
  it("matches the unchanged canonical/normalized resolver for every registered code, alias and display label", () => {
    for (const entry of PROFESSIONAL_UNIT_REGISTRY) {
      for (const input of [entry.code, ...entry.aliases, entry.displayRu]) {
        const expected = getProfessionalUnitDefinition(input)?.displayRu ?? resolveProfessionalUnitDefinition(input)?.displayRu ?? input;
        expect({ input, label: formatEstimateUnitLabel(input) }).toEqual({ input, label: expected });
      }
    }
  });
  it.each([
    ["  М³  ", "м³"], ["ＳＱ＿Ｍ", "м²"], ["SQ M", "м²"], ["m3/hour", "м³/ч"],
    ["ratio", "коэф."], ["t*km", "т·км"], ["kwh", "кВт·ч"], ["kWh", "кВт·ч"],
    ["person_hour", "чел.-ч"], ["service_hour", "ч"], ["pair", "пара"],
    ["custom_unknown_unit", "custom_unknown_unit"], ["", ""],
  ])("preserves normalized/compatibility/custom fallback: %s", (input, label) => {
    expect(formatEstimateUnitLabel(input)).toBe(label);
  });
});
