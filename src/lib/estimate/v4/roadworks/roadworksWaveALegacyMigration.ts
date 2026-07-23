import type { EstimateDraftRevision, ProfessionalBoqRow } from "../../estimateDraftRevisionContract";
import { createAiEstimateRuntime } from "../../runtime/createAiEstimateRuntime";
import {
  ROADWORKS_WAVE_A_MIGRATION_VERSION,
  getRoadworksWaveAProductionRegistration,
} from "./roadworksWaveAProductionBinding";

export type RoadworksLegacyRowIdMapEntry = {
  legacyRowId: string;
  canonicalRowId: string | null;
  semanticOwnerMatched: boolean;
  priceDisposition: "preserved" | "invalidated" | "not_manual";
};

export type RoadworksWaveALegacyMigrationMetadata = {
  migratedFromLegacy: true;
  legacyWorkId: string;
  canonicalWorkId: string;
  legacyRevisionId: string;
  newRevisionId: string;
  migrationVersion: typeof ROADWORKS_WAVE_A_MIGRATION_VERSION;
  mappedRows: number;
  unmappedRows: number;
  preservedPrices: number;
  invalidatedPrices: number;
  migrationTimestamp: string;
  migrationReason: "legacy_roadwork_edited_after_wave_a_registration";
};

export type RoadworksWaveALegacyMigrationResult = {
  historicalRevision: EstimateDraftRevision;
  revision: EstimateDraftRevision;
  metadata: RoadworksWaveALegacyMigrationMetadata;
  RoadworksLegacyRowIdMap: readonly RoadworksLegacyRowIdMapEntry[];
  unmappedHistoricalRows: readonly ProfessionalBoqRow[];
};

function normalizedSemanticName(value: string): string {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/[^a-zа-яё0-9]+/giu, " ")
    .trim();
}

function manualPrice(row: ProfessionalBoqRow): boolean {
  return row.unitPrice != null && (
    row.priceSource === "user" ||
    row.priceStatus === "USER_PRICE_OVERRIDE" ||
    row.priceStatus === "USER_ENTERED_PRICE"
  );
}

function semanticKey(row: ProfessionalBoqRow): string {
  return `${row.rowType}:${normalizedSemanticName(row.titleRu)}:${row.unit}`;
}

export function migrateLegacyRoadworkEditToWaveA(input: {
  legacyRevision: EstimateDraftRevision;
  canonicalWorkId: string;
  rawInput: string;
  migrationTimestamp: string;
}): RoadworksWaveALegacyMigrationResult {
  const registration = getRoadworksWaveAProductionRegistration(input.canonicalWorkId);
  if (!registration) throw new Error(`ROADWORKS_WAVE_A_REGISTRATION_MISSING:${input.canonicalWorkId}`);
  const historicalRevision = structuredClone(input.legacyRevision);
  const runtime = createAiEstimateRuntime();
  const created = runtime.createDraft({
    estimateDraftId: input.legacyRevision.estimateDraftId,
    rawInput: input.rawInput,
    selectedTemplateId: registration.templateId,
    selectedWorkKey: registration.workId,
    createdAt: input.migrationTimestamp,
  }).revision;
  const canonicalBySemantic = new Map(created.boq.rows.map((row) => [semanticKey(row), row]));
  const usedCanonicalIds = new Set<string>();
  const rowMap: RoadworksLegacyRowIdMapEntry[] = [];
  let preservedPrices = 0;
  let invalidatedPrices = 0;

  for (const legacyRow of input.legacyRevision.boq.rows) {
    const match = canonicalBySemantic.get(semanticKey(legacyRow));
    const uniqueMatch = match && !usedCanonicalIds.has(match.rowId) ? match : null;
    if (uniqueMatch) usedCanonicalIds.add(uniqueMatch.rowId);
    const hasManualPrice = manualPrice(legacyRow);
    if (hasManualPrice && uniqueMatch) preservedPrices += 1;
    if (hasManualPrice && !uniqueMatch) invalidatedPrices += 1;
    rowMap.push({
      legacyRowId: legacyRow.rowId,
      canonicalRowId: uniqueMatch?.rowId ?? null,
      semanticOwnerMatched: Boolean(uniqueMatch),
      priceDisposition: hasManualPrice ? (uniqueMatch ? "preserved" : "invalidated") : "not_manual",
    });
  }

  const mappingByCanonical = new Map(
    rowMap.filter((entry) => entry.canonicalRowId).map((entry) => [entry.canonicalRowId!, entry]),
  );
  const legacyById = new Map(input.legacyRevision.boq.rows.map((row) => [row.rowId, row]));
  const newRevisionId = created.revisionId;
  const metadata: RoadworksWaveALegacyMigrationMetadata = {
    migratedFromLegacy: true,
    legacyWorkId: input.legacyRevision.matchedFamily || input.legacyRevision.selectedTemplateId,
    canonicalWorkId: registration.workId,
    legacyRevisionId: input.legacyRevision.revisionId,
    newRevisionId,
    migrationVersion: ROADWORKS_WAVE_A_MIGRATION_VERSION,
    mappedRows: rowMap.filter((entry) => entry.canonicalRowId).length,
    unmappedRows: rowMap.filter((entry) => !entry.canonicalRowId).length,
    preservedPrices,
    invalidatedPrices,
    migrationTimestamp: input.migrationTimestamp,
    migrationReason: "legacy_roadwork_edited_after_wave_a_registration",
  };
  const rows = created.boq.rows.map((row) => {
    const mapping = mappingByCanonical.get(row.rowId);
    const legacyRow = mapping ? legacyById.get(mapping.legacyRowId) : null;
    const preserve = legacyRow && manualPrice(legacyRow);
    return {
      ...row,
      unitPrice: preserve ? legacyRow.unitPrice : row.unitPrice,
      currency: preserve ? legacyRow.currency : row.currency,
      priceStatus: preserve ? legacyRow.priceStatus : row.priceStatus,
      priceSource: preserve ? legacyRow.priceSource : row.priceSource,
      priceSourceId: preserve ? legacyRow.priceSourceId : row.priceSourceId,
      priceSourceLabel: preserve ? legacyRow.priceSourceLabel : row.priceSourceLabel,
      sourceParameters: {
        ...(row.sourceParameters ?? {}),
        ...metadata,
        legacyRowId: mapping?.legacyRowId ?? null,
      },
    };
  });
  const revision: EstimateDraftRevision = {
    ...created,
    revisionId: newRevisionId,
    previousRevisionId: input.legacyRevision.revisionId,
    boq: { ...created.boq, rows },
    artifacts: {
      snapshotId: null,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: null,
    },
  };
  return {
    historicalRevision,
    revision,
    metadata,
    RoadworksLegacyRowIdMap: rowMap,
    unmappedHistoricalRows: input.legacyRevision.boq.rows.filter(
      (row) => !rowMap.find((entry) => entry.legacyRowId === row.rowId)?.canonicalRowId,
    ),
  };
}
