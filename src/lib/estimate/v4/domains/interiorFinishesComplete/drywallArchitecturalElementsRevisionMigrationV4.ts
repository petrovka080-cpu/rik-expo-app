import { resolvedEstimateIdentityChecksum } from "../../../createEstimateDraftRevision";
import type { EstimateDraftRevision, EstimateResolvedIdentity } from "../../../estimateDraftRevisionContract";
import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  drywallArchitecturalElementCalculationStrategyIdV4,
  drywallArchitecturalElementProfessionalOwnerIdV4,
} from "./drywallArchitecturalElementsProfessionalV4";
import { DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6 } from "./drywallFlatCeilingExpectedScopeV6";
import {
  DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7,
  drywallDomainCalculationStrategyIdV7,
  drywallDomainProfessionalOwnerIdV7,
} from "./drywallDomainCompletionProfessionalV7";
import { interiorFinishesDomainFactory } from "./domainPackage";
import { INTERIOR_FINISHES_COMPLETE_DOMAIN_ID, INTERIOR_FINISHES_DOMAIN_INVENTORY } from "./inventory";
import { migrateDrywallCeilingBulkheadRevisionV3 } from "./drywallCeilingBulkheadRevisionMigrationV3";

export const DRYWALL_ARCHITECTURAL_ELEMENT_REVISION_MIGRATION_VERSION_V4 =
  "drywall-architectural-element-revision-migration:v4" as const;

const ARCHITECTURAL_AUTHORIZED = new Set(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4);
const FLAT_CEILING_AUTHORIZED = new Set(DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6);
const DOMAIN_COMPLETION_AUTHORIZED = new Set(DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7);
const AUTHORIZED = new Set([...ARCHITECTURAL_AUTHORIZED, ...FLAT_CEILING_AUTHORIZED, ...DOMAIN_COMPLETION_AUTHORIZED]);

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
  const catalogId = catalogIdFromRevision(revision);
  return catalogId !== null && ARCHITECTURAL_AUTHORIZED.has(catalogId);
}

export function isDrywallFlatCeilingRevisionV6(revision: EstimateDraftRevision): boolean {
  const catalogId = catalogIdFromRevision(revision);
  return catalogId !== null && FLAT_CEILING_AUTHORIZED.has(catalogId);
}

export function isDrywallDomainCompletionRevisionV7(revision: EstimateDraftRevision): boolean {
  const catalogId = catalogIdFromRevision(revision);
  return catalogId !== null && DOMAIN_COMPLETION_AUTHORIZED.has(catalogId);
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
  const domainCompletion = DOMAIN_COMPLETION_AUTHORIZED.has(catalogId);
  const owner = domainCompletion ? drywallDomainProfessionalOwnerIdV7(catalogId) : drywallArchitecturalElementProfessionalOwnerIdV4(catalogId);
  const strategy = domainCompletion ? drywallDomainCalculationStrategyIdV7(catalogId) : drywallArchitecturalElementCalculationStrategyIdV4(catalogId);
  const flatCeiling = FLAT_CEILING_AUTHORIZED.has(catalogId);
  const semanticVersion = domainCompletion ? "7.0.0" : flatCeiling ? "6.0.0" : "4.0.0";
  const formulaGraphVersion = domainCompletion ? "FormulaGraphV7" : flatCeiling ? "FormulaGraphV6" : "FormulaGraphV4";
  const canonicalSchemaId = `canonical:${schema.schema_id}:${catalogId}`;
  const prior = revision.resolvedIdentity;
  const alreadyCanonical = prior?.requestedCatalogWorkId === catalogId && prior.passportId === owner &&
    prior.semanticOwner === owner && prior.calculationStrategyId === strategy && prior.formulaGraphVersion === formulaGraphVersion &&
    prior.legacyFallbackUsed !== true &&
    revision.boq.rows.length > 0 && revision.boq.rows.every((row) =>
      row.sourceParameters?.professionalDomainFactoryV1 === true && row.sourceParameters?.catalogId === catalogId &&
      row.sourceParameters?.semanticOwner === owner && row.sourceParameters?.calculationStrategyId === strategy);
  if (alreadyCanonical) return revision;
  const identityWithoutChecksum: Omit<EstimateResolvedIdentity, "checksum"> = {
    requestedCatalogWorkId: catalogId,
    passportId: owner,
    passportVersion: semanticVersion,
    parameterSchemaId: canonicalSchemaId,
    parameterSchemaVersion: schema.schema_version,
    calculationStrategyId: strategy,
    calculationProfileId: strategy,
    calculationProfileVersion: semanticVersion,
    canonicalModelId: inventory.canonical_technology_id,
    canonicalModelVersion: interiorFinishesDomainFactory.package.manifest.domain_version,
    selectedScope: prior?.selectedScope ?? null,
    scopePresetId: prior?.scopePresetId ?? null,
    resolvedParameters: revision.params,
    formulaGraphVersion,
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
          ...(flatCeiling ? { drywallFlatCeilingRevisionMigratedV6: true, formulaGraphVersion: "FormulaGraphV6", resourceGraphVersion: "ResourceGraphV6" } : {}),
          ...(domainCompletion ? { drywallDomainCompletionRevisionMigratedV7: true, formulaGraphVersion: "FormulaGraphV7", resourceGraphVersion: "ResourceGraphV7" } : {}),
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
