import { resolvedEstimateIdentityChecksum } from "../../../createEstimateDraftRevision";
import type { EstimateDraftRevision, EstimateResolvedIdentity } from "../../../estimateDraftRevisionContract";
import {
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3,
  drywallCeilingBulkheadCalculationStrategyIdV3,
  drywallCeilingBulkheadProfessionalOwnerIdV3,
} from "./drywallCeilingBulkheadProfessionalV3";
import { interiorFinishesDomainFactory } from "./domainPackage";
import {
  INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
} from "./inventory";

export const DRYWALL_CEILING_BULKHEAD_REVISION_MIGRATION_VERSION_V3 =
  "drywall-ceiling-bulkhead-revision-migration:v3" as const;

const AUTHORIZED = new Set<string>(DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3);

function catalogIdFromRevision(revision: EstimateDraftRevision): string | null {
  const rowCatalogId = revision.boq.rows
    .map((row) => row.sourceParameters?.catalogId)
    .find((value): value is string => typeof value === "string" && AUTHORIZED.has(value));
  const direct = revision.resolvedIdentity?.requestedCatalogWorkId;
  if (direct && AUTHORIZED.has(direct)) return direct;
  if (rowCatalogId) return rowCatalogId;
  return INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) =>
    AUTHORIZED.has(item.catalog_id) && (
      item.work_key === revision.professionalWorkId ||
      item.catalog_id === revision.selectedTemplateId ||
      revision.selectedTemplateId.includes(item.catalog_id)
    ))?.catalog_id ?? null;
}

export function isDrywallCeilingBulkheadRevisionV3(revision: EstimateDraftRevision): boolean {
  return catalogIdFromRevision(revision) !== null;
}

/**
 * Opens both legacy and current revisions in the canonical interior-finishes model.
 * Quantities, prices, row IDs, parameters and artifacts are deliberately preserved;
 * only routing/identity metadata is normalized.
 */
export function migrateDrywallCeilingBulkheadRevisionV3(
  revision: EstimateDraftRevision,
): EstimateDraftRevision {
  const catalogId = catalogIdFromRevision(revision);
  if (!catalogId) return revision;
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId);
  if (!inventory) throw new Error(`DRYWALL_CEILING_BULKHEAD_MIGRATION_INVENTORY_MISSING:${catalogId}`);
  const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = technology
    ? interiorFinishesDomainFactory.schema_by_id.get(technology.parameter_schema_id)
    : null;
  if (!technology || !schema) throw new Error(`DRYWALL_CEILING_BULKHEAD_MIGRATION_ROUTE_MISSING:${catalogId}`);

  const owner = drywallCeilingBulkheadProfessionalOwnerIdV3(catalogId);
  const calculationStrategyId = drywallCeilingBulkheadCalculationStrategyIdV3(catalogId);
  const canonicalSchemaId = `canonical:${schema.schema_id}:${catalogId}`;
  const previousIdentity = revision.resolvedIdentity;
  const alreadyCanonical =
    previousIdentity?.requestedCatalogWorkId === catalogId &&
    previousIdentity.passportId === owner &&
    previousIdentity.semanticOwner === owner &&
    previousIdentity.calculationStrategyId === calculationStrategyId &&
    previousIdentity.legacyFallbackUsed !== true &&
    revision.boq.rows.length > 0 &&
    revision.boq.rows.every((row) =>
      row.sourceParameters?.professionalDomainFactoryV1 === true &&
      row.sourceParameters?.catalogId === catalogId &&
      row.sourceParameters?.semanticOwner === owner &&
      row.sourceParameters?.calculationStrategyId === calculationStrategyId,
    );
  if (alreadyCanonical) return revision;
  const identityWithoutChecksum: Omit<EstimateResolvedIdentity, "checksum"> = {
    requestedCatalogWorkId: catalogId,
    passportId: owner,
    passportVersion: "3.0.0",
    parameterSchemaId: canonicalSchemaId,
    parameterSchemaVersion: schema.schema_version,
    calculationStrategyId,
    calculationProfileId: calculationStrategyId,
    calculationProfileVersion: "3.0.0",
    canonicalModelId: inventory.canonical_technology_id,
    canonicalModelVersion: interiorFinishesDomainFactory.package.manifest.domain_version,
    selectedScope: previousIdentity?.selectedScope ?? null,
    scopePresetId: previousIdentity?.scopePresetId ?? null,
    resolvedParameters: revision.params,
    formulaGraphVersion: "FormulaGraphV3",
    normativeCompositionId: previousIdentity?.normativeCompositionId,
    semanticFingerprint: previousIdentity?.semanticFingerprint,
    compilerVersion: previousIdentity?.compilerVersion ?? DRYWALL_CEILING_BULKHEAD_REVISION_MIGRATION_VERSION_V3,
    sourceBindingVersions: [
      ...(previousIdentity?.sourceBindingVersions ?? []),
      { sourceId: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID, version: interiorFinishesDomainFactory.package.manifest.domain_version },
      { sourceId: "revision-migration", version: DRYWALL_CEILING_BULKHEAD_REVISION_MIGRATION_VERSION_V3 },
    ].filter((item, index, all) => all.findIndex((candidate) =>
      candidate.sourceId === item.sourceId && candidate.version === item.version) === index),
    semanticOwner: owner,
    originalPrompt: previousIdentity?.originalPrompt ?? revision.rawInput,
    legacyFallbackUsed: false,
    fallbackReason: null,
    projectionOwner: "estimate_draft_revision",
  };
  const resolvedIdentity: EstimateResolvedIdentity = {
    ...identityWithoutChecksum,
    checksum: resolvedEstimateIdentityChecksum(identityWithoutChecksum),
  };
  return {
    ...revision,
    selectedTemplateId: owner,
    professionalWorkId: inventory.work_key,
    workSpecificParameterSchemaId: canonicalSchemaId,
    workSpecificParameterSignature: schema.parameters.map((parameter) => parameter.parameter_id),
    legacyRowsCount: 0,
    resolvedIdentity,
    boq: {
      sections: revision.boq.sections.map((section) => ({ ...section, rowIds: [...section.rowIds] })),
      rows: revision.boq.rows.map((row) => ({
        ...row,
        templateId: owner,
        sourceParameters: {
          ...(row.sourceParameters ?? {}),
          professionalDomainFactoryV1: true,
          registeredProfessionalDomainV3: true,
          legacyRevisionMigratedV3: true,
          revisionMigrationVersion: DRYWALL_CEILING_BULKHEAD_REVISION_MIGRATION_VERSION_V3,
          domainId: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID,
          domainVersion: interiorFinishesDomainFactory.package.manifest.domain_version,
          catalogId,
          workKey: inventory.work_key,
          canonicalTechnologyId: inventory.canonical_technology_id,
          parameterSchemaId: canonicalSchemaId,
          parameterSchemaVersion: schema.schema_version,
          parameterKeys: schema.parameters.map((parameter) => parameter.parameter_id),
          semanticOwner: owner,
          professionalEstimatePassportId: owner,
          calculationStrategyId,
        },
      })),
    },
    trace: {
      ...revision.trace,
      selectedTemplateId: owner,
      params: revision.trace.params.map((param) => ({ ...param, affectsRowIds: [...param.affectsRowIds] })),
      rows: revision.trace.rows.map((row) => ({ ...row, sourceParamKeys: [...row.sourceParamKeys] })),
    },
  };
}
