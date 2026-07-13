import type { AiEstimateMigrationContext, AiEstimateMigrationKind } from "./AiEstimateMigrationRegistry";
import { findAiEstimateMigration } from "./AiEstimateMigrationRegistry";

export function migrateAiEstimateRecord(input: {
  kind: AiEstimateMigrationKind;
  records: readonly unknown[];
  context: AiEstimateMigrationContext;
}) {
  const migration = findAiEstimateMigration(input.kind);
  if (!migration) throw new Error(`AI_ESTIMATE_MIGRATION_NOT_REGISTERED:${input.kind}`);
  if (migration.destructive) throw new Error(`AI_ESTIMATE_DESTRUCTIVE_MIGRATION_FORBIDDEN:${input.kind}`);
  return migration.migrate({
    records: input.records,
    context: input.context,
  });
}
