import { resolvedEstimateIdentityChecksum } from "../../../createEstimateDraftRevision";
import type { EstimateDraftRevision, EstimateResolvedIdentity } from "../../../estimateDraftRevisionContract";
import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  drywallArchitecturalElementCalculationStrategyIdV4,
  drywallArchitecturalElementProfessionalOwnerIdV4,
} from "./drywallArchitecturalElementsProfessionalV4";
import { interiorFinishesDomainFactory } from "./domainPackage";
import { INTERIOR_FINISHES_COMPLETE_DOMAIN_ID, INTERIOR_FINISHES_DOMAIN_INVENTORY } from "./inventory";
import { migrateDrywallCeilingBulkheadRevisionV3 } from "./drywallCeilingBulkheadRevisionMigrationV3";

export const DRYWALL_ARCHITECTURAL_ELEMENT_REVISION_MIGRATION_VERSION_V4 =
  "drywall-architectural-element-revision-migration:v4" as const;

const AUTHORIZED = new Set(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4);

function catalogIdFromRevision(revision: EstimateDraftRevision): string | null {
  const direct = revision.resolvedIdentity?.requestedCatalogWorkId;
  if (direct && AUTHORIZED.has(direct)) return direct;
  const rowCatalogId = revision.boq.rows.map((row) => row.sourceParameters?.catalogId)
    .find((value): value is string => typeof value === "string" && AUTHORIZED.has(value));
  if (rowCatalogId) return rowCatalogId;
  return INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => AUTHORIZED.has(item.catalog_id) && (
    item.work_key === revision.professionalWorkId || item.catalog_id === revision.selectedTemplateId ||
    revision.selectedTemplateId.includes(item.catalog_id)
  ))?.catalog_id ?? null;
}

export function isDrywallArchitecturalElementRevisionV4(revision: EstimateDraftRevision): boolean {
  return catalogIdFromRevision(revision) !== null;
}

/** Normalizes routing metadata only; the immutable BOQ, prices, parameters and artifacts are preserved. */
export function migrateDrywallArchitecturalElementRevisionV4(revision: EstimateDraftRevision): EstimateDraftRevision {
  const catalogId = catalogIdFromRevision(revision);
  if (!catalogId) return revision;
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId);
  if (!inventory) throw new Error(`DRYWALL_ARCHITECTURAL_ELEMENT_MIGRATION_INVENTORY_MISSING:${catalogId}`);
  const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  const schema = technology ? interiorFinishesDomainFactory.schema_by_id.get(technology.parameter_schema_id) : null;
  if (!technology || !schema) throw new Error(`DRYWALL_ARCHITECTURAL_ELEMENT_MIGRATION_ROUTE_MISSING:${catalogId}`);
  const owner = drywallArchitecturalElementProfessionalOwnerIdV4(catalogId);
  const strategy = drywallArchitecturalElementCalculationStrategyIdV4(catalogId);
  const canonicalSchemaId = `canonical:${schema.schema_id}:${catalogId}`;
  const prior = revision.resolvedIdentity;
  const alreadyCanonical = prior?.requestedCatalogWorkId === catalogId && prior.passportId === owner &&
    prior.semanticOwner === owner && prior.calculationStrategyId === strategy && prior.legacyFallbackUsed !== true &&
    revision.boq.rows.length > 0 && revision.boq.rows.every((row) =>
      row.sourceParameters?.professionalDomainFactoryV1 === true && row.sourceParameters?.catalogId === catalogId &&
      row.sourceParameters?.semanticOwner === owner && row.sourceParameters?.calculationStrategyId === strategy);
  if (alreadyCanonical) return revision;
  const identityWithoutChecksum: Omit<EstimateResolvedIdentity, "checksum"> = {
    requestedCatalogWorkId: catalogId,
    passportId: owner,
    passportVersion: "4.0.0",
    parameterSchemaId: canonicalSchemaId,
    parameterSchemaVersion: schema.schema_version,
    calculationStrategyId: strategy,
    calculationProfileId: strategy,
    calculationProfileVersion: "4.0.0",
    canonicalModelId: inventory.canonical_technology_id,
    canonicalModelVersion: interiorFinishesDomainFactory.package.manifest.domain_version,
    selectedScope: prior?.selectedScope ?? null,
    scopePresetId: prior?.scopePresetId ?? null,
    resolvedParameters: revision.params,
    formulaGraphVersion: "FormulaGraphV4",
    normativeCompositionId: prior?.normativeCompositionId,
    semanticFingerprint: prior?.semanticFingerprint,
    compilerVersion: prior?.compilerVersion ?? DRYWALL_ARCHITECTURAL_ELEMENT_REVISION_MIGRATION_VERSION_V4,
    sourceBindingVersions: [
      ...(prior?.sourceBindingVersions ?? []),
      { sourceId: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID, version: interiorFinishesDomainFactory.package.manifest.domain_version },
      { sourceId: "revision-migration", version: DRYWALL_ARCHITECTURAL_ELEMENT_REVISION_MIGRATION_VERSION_V4 },
    ].filter((item, index, all) => all.findIndex((candidate) => candidate.sourceId === item.sourceId && candidate.version === item.version) === index),
    semanticOwner: owner,
    originalPrompt: prior?.originalPrompt ?? revision.rawInput,
    legacyFallbackUsed: false,
    fallbackReason: null,
    projectionOwner: "estimate_draft_revision",
  };
  const resolvedIdentity: EstimateResolvedIdentity = { ...identityWithoutChecksum, checksum: resolvedEstimateIdentityChecksum(identityWithoutChecksum) };
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
          ...(row.sourceParameters ?? {}), professionalDomainFactoryV1: true, registeredProfessionalDomainV4: true,
          legacyRevisionMigratedV4: true, revisionMigrationVersion: DRYWALL_ARCHITECTURAL_ELEMENT_REVISION_MIGRATION_VERSION_V4,
          domainId: INTERIOR_FINISHES_COMPLETE_DOMAIN_ID, domainVersion: interiorFinishesDomainFactory.package.manifest.domain_version,
          catalogId, workKey: inventory.work_key, canonicalTechnologyId: inventory.canonical_technology_id,
          parameterSchemaId: canonicalSchemaId, parameterSchemaVersion: schema.schema_version,
          parameterKeys: schema.parameters.map((parameter) => parameter.parameter_id), semanticOwner: owner,
          professionalEstimatePassportId: owner, calculationStrategyId: strategy,
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

export function migrateInteriorFinishesProfessionalRevisionV4(revision: EstimateDraftRevision): EstimateDraftRevision {
  return migrateDrywallArchitecturalElementRevisionV4(migrateDrywallCeilingBulkheadRevisionV3(revision));
}
