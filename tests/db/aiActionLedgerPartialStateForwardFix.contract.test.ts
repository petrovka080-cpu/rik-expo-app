import {
  buildAiActionLedgerPartialStateForwardFix,
  isAiActionLedgerPartialState,
} from "../../scripts/db/forwardFixAiActionLedgerPartialState";

describe("AI action ledger partial state forward-fix package", () => {
  it("only marks STATE_D as partial-state forward-fix territory", () => {
    expect(isAiActionLedgerPartialState("STATE_D_PARTIAL_OBJECTS_HISTORY_MISSING")).toBe(true);
    expect(isAiActionLedgerPartialState("STATE_A_OBJECTS_AND_HISTORY_PRESENT")).toBe(false);
    expect(isAiActionLedgerPartialState("STATE_B_OBJECTS_PRESENT_HISTORY_MISSING")).toBe(false);
    expect(isAiActionLedgerPartialState("STATE_C_OBJECTS_MISSING_HISTORY_MISSING")).toBe(false);
    expect(isAiActionLedgerPartialState("STATE_E_HISTORY_PRESENT_OBJECTS_MISSING")).toBe(false);
    expect(isAiActionLedgerPartialState(null)).toBe(false);
  });

  it("does not apply a forward-fix package while DB inspection is unavailable", async () => {
    const result = await buildAiActionLedgerPartialStateForwardFix({}, process.cwd());

    expect(result).toMatchObject({
      status: "BLOCKED_HISTORY_REPAIR_STATE_NOT_ALLOWED",
      forwardFixPackageCreated: false,
      forwardFixApplied: false,
      destructiveMigration: false,
      unboundedDml: false,
      secretsPrinted: false,
      rawRowsPrinted: false,
    });
  });
});
