import {
  hasSafeBuiltInAiQuantitySemantics,
  type BuiltInAiQuantitySemanticsRow,
} from "./builtInAi1000QuantitySemantics";

const conditionalRow = (
  override: Partial<BuiltInAiQuantitySemanticsRow> = {},
): BuiltInAiQuantitySemanticsRow => ({
  applicabilityReason: "The design input is required before this row can be calculated.",
  displayQuantity: "0 pcs",
  includedInEstimate: false,
  includedInProcurement: false,
  optional: true,
  priceStatus: "unavailable",
  quantity: 0,
  sourceParameters: {
    conditionalStatus: "blocked_missing_parameters",
    conditionalReason: "outlet_count is not confirmed",
    parameterBlockerIds: ["outlet_count"],
  },
  total: 0,
  unitPrice: 0,
  ...override,
});

describe("Built-in AI 1000 conditional quantity semantics", () => {
  it("accepts a priced positive row and one explicit zero conditional exclusion", () => {
    expect(
      hasSafeBuiltInAiQuantitySemantics(
        conditionalRow({
          displayQuantity: "12 pcs",
          includedInEstimate: true,
          includedInProcurement: true,
          optional: false,
          priceStatus: "priced",
          quantity: 12,
          total: 1200,
          unitPrice: 100,
        }),
      ),
    ).toBe(true);
    expect(hasSafeBuiltInAiQuantitySemantics(conditionalRow())).toBe(true);
  });

  it.each([
    ["required zero row", { optional: false }],
    ["zero row included in estimate", { includedInEstimate: true }],
    ["zero row included in procurement", { includedInProcurement: true }],
    ["zero row with a non-zero total", { total: 1 }],
    ["zero row with a hidden unit-price fallback", { unitPrice: 1 }],
    ["zero row with a stale fallback", { priceStatus: "stale_fallback" }],
    ["zero row without conditional status", { sourceParameters: {} }],
    [
      "zero row without an explicit reason",
      {
        applicabilityReason: null,
        sourceParameters: {
          conditionalStatus: "blocked_missing_parameters",
          parameterBlockerIds: ["outlet_count"],
        },
      },
    ],
    [
      "artificially excluded material without a real blocker",
      {
        sourceParameters: {
          conditionalStatus: "blocked_missing_parameters",
          conditionalReason: "excluded for green",
          parameterBlockerIds: [],
        },
      },
    ],
  ] satisfies Array<
    readonly [string, Partial<BuiltInAiQuantitySemanticsRow>]
  >)("rejects %s", (_label, override) => {
    expect(hasSafeBuiltInAiQuantitySemantics(conditionalRow(override))).toBe(
      false,
    );
  });
});
