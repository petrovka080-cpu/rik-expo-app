import {
  inspectAiActionLedgerMigrationState,
  type AiActionLedgerMigrationState,
} from "./inspectAiActionLedgerMigrationState";

export type AiActionLedgerPartialStateForwardFix = {
  status:
    | "BLOCKED_AI_ACTION_LEDGER_PARTIAL_STATE_FORWARD_FIX_REQUIRED"
    | "BLOCKED_HISTORY_REPAIR_STATE_NOT_ALLOWED";
  inspectedState: AiActionLedgerMigrationState | null;
  forwardFixPackageCreated: boolean;
  forwardFixApplied: false;
  destructiveMigration: false;
  unboundedDml: false;
  secretsPrinted: false;
  rawRowsPrinted: false;
  exactReason: string;
};

export function isAiActionLedgerPartialState(state: AiActionLedgerMigrationState | null): boolean {
  return state === "STATE_D_PARTIAL_OBJECTS_HISTORY_MISSING";
}

export async function buildAiActionLedgerPartialStateForwardFix(
  env: Record<string, string | undefined> = process.env,
  projectRoot = process.cwd(),
): Promise<AiActionLedgerPartialStateForwardFix> {
  const inspection = await inspectAiActionLedgerMigrationState(env, projectRoot);
  if (!isAiActionLedgerPartialState(inspection.state)) {
    return {
      status: "BLOCKED_HISTORY_REPAIR_STATE_NOT_ALLOWED",
      inspectedState: inspection.state,
      forwardFixPackageCreated: false,
      forwardFixApplied: false,
      destructiveMigration: false,
      unboundedDml: false,
      secretsPrinted: false,
      rawRowsPrinted: false,
      exactReason: "Forward-fix package is only valid for STATE_D_PARTIAL_OBJECTS_HISTORY_MISSING.",
    };
  }
  return {
    status: "BLOCKED_AI_ACTION_LEDGER_PARTIAL_STATE_FORWARD_FIX_REQUIRED",
    inspectedState: inspection.state,
    forwardFixPackageCreated: true,
    forwardFixApplied: false,
    destructiveMigration: false,
    unboundedDml: false,
    secretsPrinted: false,
    rawRowsPrinted: false,
    exactReason: "Partial AI action ledger DB state requires a separately reviewed additive forward-fix package.",
  };
}

if (require.main === module) {
  void buildAiActionLedgerPartialStateForwardFix()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode =
        result.status === "BLOCKED_AI_ACTION_LEDGER_PARTIAL_STATE_FORWARD_FIX_REQUIRED" ? 2 : 0;
    })
    .catch(() => {
      process.stdout.write(
        `${JSON.stringify(
          {
            status: "BLOCKED_HISTORY_REPAIR_STATE_NOT_ALLOWED",
            inspectedState: null,
            forwardFixPackageCreated: false,
            forwardFixApplied: false,
            destructiveMigration: false,
            unboundedDml: false,
            secretsPrinted: false,
            rawRowsPrinted: false,
            exactReason: "Forward-fix package builder failed before producing a sanitized result.",
          },
          null,
          2,
        )}\n`,
      );
      process.exitCode = 2;
    });
}
