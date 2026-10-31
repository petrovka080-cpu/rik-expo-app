import {masterRetainedSourceProfileMetadataCompactR1,masterProjectScopeMetadataCompactR1,assertMasterProjectScopeMetadataDeclarationR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {assertCanonicalNewWorkCatalogIdV1,canonicalPublicWorkSqlV1,CANONICAL_PUBLIC_CATALOG_VISIBILITY_V1} from '../../../src/lib/estimate/backendPlatform/canonicalPublicCatalogVisibilityV1';
import { createHash } from "node:crypto";
import { canonicalEstimateOperationReferences } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition";
import { resolveCanonicalEstimateExplicitRowCategory } from
  "../../../src/lib/estimate/backendPlatform/canonicalEstimateRowCategory";
import { resolveProfessionalUnitDefinition } from
  "../../../src/lib/estimate/professionalUnitRegistry";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";
import { buildMasterParameterCalculationConsumers } from
  "../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1";
import { canonicalDefinitionPublicationStableValueR1 as stable } from
  "../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1";
import { buildCanonicalMasterSingleDefinitionSourceOriginR1, canonicalMasterSingleDefinitionSourceOriginMatchesR1 } from
  "../../../src/lib/estimate/backendPlatform/canonicalMasterSingleDefinitionSourceOriginR1";

import { compileFormulaGraph } from
  "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  createCanonicalDefinitionClonePlan,
  assertCanonicalPublisherSuccessorOperationResourcesR1,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
  resolveCanonicalApprovedBaselineLeaf,
  auditPersistedCanonicalDefinition,
  assertCanonicalPublisherParameterOrdinalsUniqueR1,
} from "./canonicalDefinitionPublisherR1";
import {
  masterRetainParentBindingsOptInR1,
  masterAdditionalCapturedExistingRegistryV1,
  masterRetainedParentCaptureSha256R1,
  isMasterRetainedRetiredUnusedParameterR1,
  prepareMasterRetainedBindingRepresentativeR1,
  assertMasterRetainedBindingPlanR1,
  readMasterRetainedBindingPreconditionsR1,
  lockMasterRetainedBindingPreconditionsR1,
  assertMasterRetainedBindingPreflightUnchangedR1,
  type MasterRetainParentBindingsR1,
  assembleMasterExplicitParameterSourcesR1,
  type MasterExplicitParameterSourcesR1,
  buildMasterRetainedSparseBaselineMetadataR1,
} from "./masterSingleDefinitionRetainParentBindingsR1";
import {
  assertMasterSingleDefinitionAppendParentAnchorR1,
  assertMasterSingleDefinitionAppendUnchangedR1,
  assertMasterSingleDefinitionCompositeSourceR1,
  lockMasterSingleDefinitionAppendPreconditionsR1,
  readMasterSingleDefinitionAppendPreconditionsR1,
} from "./masterSingleDefinitionAppendGuardsR1";
import {resolveMasterScopedNormativeRegistryOptInR1,
 readMasterScopedNormativeRegistryPreconditionsR1,assertMasterScopedNormativeRegistryUnchangedR1,
 type MasterCapturedScopedNormativeRegistryR1} from "./masterScopedNormativeRegistryPreimageR1";
import { CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT } from "./catalogFirstEstimateMinimumInputAudit.shared";
import { loadVerifiedProjectSourcePackageBinding } from "./projectSourcePackageBindingR1";
import {
  S279_ADDRESSABLE_SOURCE_KEY,
  S279_SPRINKLER_SOURCE_KEY,
  verifyS279CompleteProjectSourcePackageSetForSuccessor,
  type S279ProjectSourcePackageRole,
} from "./projectSourcePackagePreflightR1";

import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import {masterReviewedNormPackRegistryEvidenceR1, type MasterReviewedNormPackProofR1} from './masterReviewedNormPackRegistryReuseR1';

import {masterTypedPartialQuantityCapabilityR1,masterTypedPartialQuantityReadinessR1,
 validateMasterTypedPartialQuantityBasisR1,assertMasterTypedPartialQuantityRegistryR1,hasMasterTypedPartialQuantityBasisR1,
 type MasterTypedPartialQuantityBasisR1} from './masterTypedPartialQuantityBasisR1';

import {assertMasterOperationCompositionDeclarationR1} from './masterOperationCompositionOnlyR1';
type Json = Record<string, any>;

export type MasterSingleDefinitionSuccessorConfig = Readonly<{
  contract: string;
  stopCode: string;
  applicationName: string;
  expectedBranch: string;
  masterPath: string;
  masterSha256: string;
  parentReleaseId: string;
  parentSearchReleaseId: string;
  currentReleasePath: string;
  outputRoot: string;
  sourcePaths: readonly string[];
  catalogId: string;
  sourceId: string;
  normId: string;
  sourceMetadata: Readonly<{
    source_title: string;
    source_authority: string;
    exact_locator: string;
    use_restriction: string;
    source_kind?: string;
    official_url?: string | null;
    artifact_sha256?: string | null;
    effective_from?: string | null;
  }>;
  projectSourcePackagePath?: string;
  /** Optional exact official-artifact/norm scope preimage; normal/locked/registered. */
  capturedScopedNormativeRegistry?: MasterCapturedScopedNormativeRegistryR1;
  parameterDefinitions: readonly Json[];
  formulaDefinitions: readonly Json[];
  resourceDefinitions: readonly Json[];
  shortInput: Readonly<Json>;
  acceptanceInput: Readonly<Json>;
  runtimeProfileInput?: Readonly<Json>;
  runtimeProfileClassification?: Readonly<Record<string,
    "NORMATIVE" | "ASSUMPTION" | "DERIVED" | "RUNTIME_STRUCTURAL_DEFAULT">>;
  runtimeProfileSourceIds?: Readonly<Record<string, readonly string[]>>;
  verifyCore: () => Promise<Json>;
  /** Optional reviewed target precondition, repeated on the writer connection
   * under its existing transaction lock before any publication writes. */
  verifyTargetPrecondition?: (client: Pick<Client, "query">, phase: "PREFLIGHT" | "LOCKED_BEFORE") => Promise<void>;
  expectedParentShape: readonly [number, number, number];
  benchmarkOrdinal: number;
  validationScenario: string;
  passport: Readonly<{
    canonicalRuName: string;
    workKey: string;
    physicalResultRu: string;
    includedScopeRu: readonly string[];
    excludedScopeRu: readonly string[];
    independentCompletenessMap?: Readonly<Json>;
    /** Explicitly admitted preliminary composition; never mark its unresolved
     * applicable resources as a complete technical scope. */
    unresolvedApplicableResourceRowIds?: readonly string[];
    partialQuantityBasis?: MasterTypedPartialQuantityBasisR1;
  }>;
  applicability: Json;
  binding: Readonly<{
    rowId: string;
    /** Ordinary whole PROJECT_SYSTEM, strict fresh absence and registered reread;
     * never an alias for retained bindings or a missing application norm. */
    ordinaryCompositeSourceV1?:Readonly<{contract:'master-ordinary-composite-source/v1';
      capturedSourcePreimage:Readonly<{sourceKey:string;expected:null}>}>;
    /** Exact CT126 prepared-profile proof in the existing retained successor slot. */
    ct126PreparedWallMigrationR2?: true;
    /** Opt in to multiple resources backed by one composite source locator. */
    additionalRowIds?: readonly string[];
    applicability: Json;
    /** Explicit per-row source columns within the same composite locator. */
    applicabilityByRowId?: Readonly<Record<string, Json>>;
    /** Replace one definition while preserving its exact source-aware bindings. */
    retainParentBindings?: MasterRetainParentBindingsR1;
    /** Exact existing registry rows, reused without rewriting their owner metadata. */
    reuseExistingNormativeRegistry?: MasterExistingNormativeRegistryReuseR1;
  }>;
  locator: Readonly<{
    key: string;
    payload: Json;
  }>;
  search: Readonly<{
    primaryUom: string;
    canonicalNameRu: string;
    aliases: readonly string[];
    shortScopeRu: string;
    keyDistinguishingParameters: readonly string[];
    clarificationFields: readonly string[];
    includedBoundaries: readonly string[];
    excludedBoundaries: readonly string[];
    extraSearchTermsRu: string;
    sourceProvenance: Json;
  }>;
  catalogAppend?: Readonly<{
    /** Opt-in exact arrays for ALL append parameters; emitted source key only.
     * UNRESOLVED maps to []; DERIVED[] requires a real reciprocal new control.
     * Omission preserves historical baseline/hash assembly without defaults. */
    explicitParameterSources?: MasterExplicitParameterSourcesR1;
    /** An explicitly new physical profile may require this exact key to be absent. */
    requireUniqueWorkKey?: true;
    /** Opt-in captured absence for this exact emitted source key. Checked at
     * normal preflight and again under the existing append locks before DML.
     * Omission preserves legacy source-reuse behavior. */
    capturedSourcePreimage?: Readonly<{
      sourceKey: string;
      expected: null;
    }>;
    /** Exact join-group capture from a ROOT-pinned accepted file. Omitted
     * captureScope preserves the historical exact-four rule. A bounded scope
     * must be pinned to the actual capture by the factory/sourcePaths; its
     * declared hash alone is not a generic publication admission. Current DB
     * anchors are checked before and under the existing append locks. */
    capturedJoinGroupMembers?: Readonly<{
      groupId: string;
      captureScope?: Readonly<{
        contract: "master-bounded-join-group-capture/r1";
        memberCount: number;
        maxMembers: 32;
        captureSha256: string;
      }>;
      members: readonly Readonly<{
        catalogId: string;
        ordinal: number;
        definitionVersionId: string;
        approvedTemplateBaselineId: string;
        definitionSha256: string;
        sourceIdentity: string;
        workKey: string;
        searchGroupId: string;
      }>[];
    }>;
    identity: Readonly<{
      namespace: "global";
      domain: string;
      sourceIdentity: string;
      workKey: string;
      titleRu: string;
      denominatorEligible: true;
    }>;
    searchPlacement: Readonly<{
      groupMode: "create" | "join";
      groupId: string;
      groupNameRu: string;
      domainId: string;
      systemId: string;
      subsystemId: string;
      assemblyId: string;
      workFamilyId: string;
      breadcrumb: readonly string[];
      groupOracleDisposition: Json;
      membershipOrdinal: number;
      independentDisposition: Json;
      elementType: "WORK";
      operationKind:
        | "NEW_INSTALLATION"
        | "REPAIR"
        | "REPLACEMENT"
        | "DEMOLITION"
        | "TESTING"
        | "COMMISSIONING"
        | "MAINTENANCE"
        | "DESIGN"
        | "SURVEY"
        | "OTHER";
      technologyVariant: string;
      constructionState: string;
      normativeClassifiers: readonly string[];
      applicabilityTags: readonly string[];
      publicationState: "ADMITTED_BACKEND";
      catalogOrigin: "GLOBAL";
      adjudicationClass: "EFFECTIVE_WORK";
      selectable: true;
    }>;
  }>;
  forbiddenAdjacentMatchers: readonly RegExp[];
  owner: string;
  receiptFileStem: string;
}>;

/** Pure optional append path; retained replacement uses the SAME map assembler.
 * No source discovery, fake runtime profile or alternate publisher is added. */
export function resolveMasterAppendExplicitParameterSourcesR1(
  config: Pick<MasterSingleDefinitionSuccessorConfig, "stopCode" | "sourceId" | "catalogAppend">,
  next: Readonly<{parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[]}>,
): Json | null {
  const append = config.catalogAppend;
  if (append == null || !Object.prototype.hasOwnProperty.call(append, "explicitParameterSources")) return null;
  return assembleMasterExplicitParameterSourcesR1({errorPrefix: `STOP_${config.stopCode}_APPEND_`,
    parameters: next.parameters, newParameterSources: append.explicitParameterSources,
    sourceClosure: [config.sourceId], oldResourceRowIds: [], next});
}

export type MasterExistingNormativeRegistryReuseR1 = Readonly<{
  contract: "master-existing-normative-registry-reuse/r1";
  /** Preserve the original publisher's excerpt hash algorithm explicitly. */
  locatorExcerptHashKind: "SOURCE_LOCATOR_TEXT_SHA256" | "CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1" | "REVIEWED_NORM_PACK_ITEM_SHA256_R1" | "CAPTURED_PARENT_OPERATION_COMPOSITION_ONLY_R1" | "CAPTURED_PARENT_PROJECT_SCOPE_METADATA_ONLY_V1";
  /** Only for an existing reviewed-pack owner whose original metadata has no contract slot. */
  reviewedNormPack?: MasterReviewedNormPackProofR1;
  /** Explicit immutable historical metadata witness for a registered source
   * newly reused by a retained replacement. It never grants activation and
   * never writes consumer metadata over the first publisher's source row. */
  capturedSourceMetadataV1?: Readonly<{
    contract: "master-existing-registry-captured-source-metadata/v1";
    sourceId: string;
    nativeSourceId: string;
    sourceKey: string;
    artifactSha256: string;
    sourceRowSha256: string;
    metadataSha256: string;
    locatorSetSha256: string;
    generatedMetadataSha256: string;
  }>;
  /** Exact current row, including the unconverted PostgreSQL created_at text. */
  source: Readonly<Json>;
  /** Complete current locator rows. No locator creation or partial reuse. */
  locators: readonly Readonly<Json>[];
}>;
export type MasterResolvedExistingRegistryReuseR1 = Readonly<{
  errorPrefix: string;
  declaration: MasterExistingNormativeRegistryReuseR1;
  managedSource: Json;
  locators: readonly Json[];
}>;
/** Historical S2763 stored the canonical locator JSON hash as its excerpt.
 * Resolve this before the source envelope so provenance and persistence agree.
 * Omitted reuse preserves the original Master text-excerpt hash byte for byte. */
export function resolveMasterSingleDefinitionLocatorExcerptSha256R1(
  config: Pick<MasterSingleDefinitionSuccessorConfig, "stopCode" | "binding" | "locator" | "sourceMetadata">,
): string {
  if (!Object.hasOwn(config.binding, "reuseExistingNormativeRegistry"))
    return sha256(config.sourceMetadata.exact_locator);
  const kind = config.binding.reuseExistingNormativeRegistry?.locatorExcerptHashKind;
  if(kind==='CAPTURED_PARENT_PROJECT_SCOPE_METADATA_ONLY_V1'){
    const retained=config.binding.retainParentBindings;
    invariant(retained?.projectScopeMetadataOnlyV1!=null,`STOP_${config.stopCode}_SCOPE_METADATA_REQUIRED`);
    assertMasterProjectScopeMetadataDeclarationR1({catalogId:retained.capturedParent.definition.catalog_id,capture:retained.capturedParent,
      captureSha256:retained.capturedParentSha256,mode:retained.projectScopeMetadataOnlyV1,newParameterSources:retained.newParameterSources});
    const locator=retained.capturedParent.normativeLocators.find(l=>l.locator_key===config.locator.key);
    invariant(locator&&JSON.stringify(stable(locator.locator))===JSON.stringify(stable(config.locator.payload)),`STOP_${config.stopCode}_SCOPE_METADATA_LOCATOR`);
    return locator.excerpt_sha256;
  }
  if(kind==='CAPTURED_PARENT_OPERATION_COMPOSITION_ONLY_R1'){
    const retained=config.binding.retainParentBindings;
    invariant(retained?.operationCompositionOnly!=null,`STOP_${config.stopCode}_OPERATION_ONLY_REQUIRED`);
    invariant(masterRetainedParentCaptureSha256R1(retained.capturedParent)===retained.capturedParentSha256,`STOP_${config.stopCode}_OPERATION_ONLY_CAPTURE_HASH`);
    assertMasterOperationCompositionDeclarationR1({catalogId:retained.capturedParent.definition.catalog_id,capture:retained.capturedParent,
      captureSha256:retained.capturedParentSha256,mode:retained.operationCompositionOnly,newParameterSources:retained.newParameterSources});
    const locator=retained.capturedParent.normativeLocators.find(l=>l.locator_key===config.locator.key);
    invariant(locator&&JSON.stringify(stable(locator.locator))===JSON.stringify(stable(config.locator.payload)),`STOP_${config.stopCode}_OPERATION_ONLY_LOCATOR`);
    return locator.excerpt_sha256;
  }
  if (kind === "SOURCE_LOCATOR_TEXT_SHA256") return sha256(config.sourceMetadata.exact_locator);
  if (kind === "CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1")
    return createHash("sha256").update(stringifyCanonicalEstimateJson(config.locator.payload)).digest("hex");
  if (kind === "REVIEWED_NORM_PACK_ITEM_SHA256_R1") {
    const d = config.binding.reuseExistingNormativeRegistry!;
    const evidence = masterReviewedNormPackRegistryEvidenceR1({proof: d.reviewedNormPack!, source: d.source, locators: d.locators});
    const excerpt = evidence.excerptByLocatorKey[config.locator.key];
    if (!excerpt || JSON.stringify(stable(d.locators.find(l => l.locator_key === config.locator.key)?.locator))
      !== JSON.stringify(stable(config.locator.payload))) throw Error(`STOP_${config.stopCode}_EXISTING_REGISTRY_REVIEWED_LOCATOR_CHANGED`);
    return excerpt;
  }
  throw new Error(`STOP_${config.stopCode}_EXISTING_REGISTRY_EXCERPT_HASH_KIND_REQUIRED`);
}
/** Reuse is explicit, replace-only and new to the retained parent. The existing
 * retention guard still validates the full parent, reference closure and locks.
 * Omission preserves the historical source/locator identity construction. */
export function resolveMasterExistingNormativeRegistryReuseR1(input: Readonly<{
  config: Readonly<{stopCode: string; catalogId?: string; parentReleaseId?: string; parentSearchReleaseId?: string; catalogAppend?: unknown; projectSourcePackagePath?: unknown;
    binding: Readonly<{retainParentBindings?: unknown;
      reuseExistingNormativeRegistry?: MasterExistingNormativeRegistryReuseR1}>}>;
  newSource: Json; newLocators: readonly Json[];
}>): MasterResolvedExistingRegistryReuseR1 | null {
  if (!Object.hasOwn(input.config.binding, "reuseExistingNormativeRegistry")) return null;
  const prefix = `STOP_${input.config.stopCode}_EXISTING_REGISTRY_`;
  const requireThat = (value: unknown, code: string): void => {if (!value) throw new Error(prefix + code);};
  const object = (x: unknown): x is Json => x != null && typeof x === "object" && !Array.isArray(x);
  const same = (a: unknown, b: unknown) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
  const keys = (x: Json, expected: readonly string[]) => same(Object.keys(x).sort(), [...expected].sort());
  const uuid = (x: unknown) => typeof x === "string"
    && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(x);
  requireThat(input.config.catalogAppend == null && input.config.projectSourcePackagePath == null
    && Object.hasOwn(input.config.binding, "retainParentBindings")
    && object(input.config.binding.retainParentBindings), "RETAINED_REPLACEMENT_ONLY");
  const value = input.config.binding.reuseExistingNormativeRegistry;
  const capturedMetadataOptIn = value != null && Object.hasOwn(value, "capturedSourceMetadataV1");
  const reviewedPack = value?.locatorExcerptHashKind === "REVIEWED_NORM_PACK_ITEM_SHA256_R1";
  const operationOnly=value?.locatorExcerptHashKind==='CAPTURED_PARENT_OPERATION_COMPOSITION_ONLY_R1';
  const projectScopeOnly=value?.locatorExcerptHashKind==='CAPTURED_PARENT_PROJECT_SCOPE_METADATA_ONLY_V1';
  const authorityRetained=input.config.binding.retainParentBindings as MasterRetainParentBindingsR1|undefined;
  const authorityOnly=authorityRetained?.truthAuthorityOnlyV1;
  const repairVisibilityOnly=authorityRetained?.monolithicRepairGeometryVisibilityOnlyR60;
  if(authorityOnly||repairVisibilityOnly){
    requireThat(masterRetainedParentCaptureSha256R1(authorityRetained!.capturedParent)===authorityRetained!.capturedParentSha256,
      'AUTHORITY_CAPTURE');
    requireThat(value&&object(value.source)&&Array.isArray(value.locators)
      &&same(authorityRetained!.capturedParent.normativeSources.find(s=>s.id===value.source.id),value.source)
      &&same(authorityRetained!.capturedParent.normativeLocators.filter(l=>l.source_id===value.source.id)
        .slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))),
      value.locators.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)))),'AUTHORITY_EXISTING_REGISTRY_CAPTURE');
    // Validate the ordinary captured authority declaration before reusing a
    // historical registry owner's metadata shape. The generated consumer
    // metadata is never written over that immutable source row.
    const {created_at:_capturedCreatedAt,...capturedManagedSource}=value!.source;
    requireThat(typeof input.config.catalogId==='string'&&input.config.catalogId.length>0
      &&typeof input.config.parentReleaseId==='string'&&input.config.parentReleaseId.length>0,'AUTHORITY_CONSUMER_CONTEXT');
    requireThat(masterRetainParentBindingsOptInR1({config:{...input.config,
      catalogId:String(input.config.catalogId),parentReleaseId:String(input.config.parentReleaseId),
      binding:{...input.config.binding,retainParentBindings:authorityRetained}},
      newSource:capturedManagedSource,newLocators:value!.locators})!=null,'AUTHORITY_DECLARATION_REQUIRED');
  }
  if(projectScopeOnly){
    requireThat(authorityRetained?.projectScopeMetadataOnlyV1!=null&&value&&object(value.source)
      &&typeof input.config.catalogId==='string'&&typeof input.config.parentReleaseId==='string'
      &&typeof input.config.parentSearchReleaseId==='string','SCOPE_METADATA_EXACT_CONTEXT');
    const {created_at:_capturedCreatedAt,...capturedManagedSource}=value!.source;
    requireThat(input.newSource.source_key===value!.source.source_key,'SCOPE_METADATA_SOURCE_KEY');
    requireThat(masterRetainParentBindingsOptInR1({config:{...input.config,catalogId:String(input.config.catalogId),
      parentReleaseId:String(input.config.parentReleaseId),parentSearchReleaseId:String(input.config.parentSearchReleaseId),
      binding:{...input.config.binding,retainParentBindings:authorityRetained}},newSource:capturedManagedSource,newLocators:value!.locators})!=null,
      'SCOPE_METADATA_DECLARATION_REQUIRED');
  }
  if(operationOnly){
    const retained=input.config.binding.retainParentBindings as MasterRetainParentBindingsR1;
    requireThat(retained?.operationCompositionOnly!=null&&masterRetainedParentCaptureSha256R1(retained.capturedParent)===retained.capturedParentSha256,'OPERATION_ONLY_CAPTURE');
    assertMasterOperationCompositionDeclarationR1({catalogId:retained.capturedParent.definition.catalog_id,capture:retained.capturedParent,
      captureSha256:retained.capturedParentSha256,mode:retained.operationCompositionOnly!,newParameterSources:retained.newParameterSources});
    requireThat(input.newSource.source_key===value!.source.source_key&&same(retained.capturedParent.normativeSources.find(s=>s.id===value!.source.id),value!.source),'OPERATION_ONLY_SOURCE');
  }
  requireThat(object(value) && keys(value!, ["contract", "source", "locators", "locatorExcerptHashKind", ...(reviewedPack ? ['reviewedNormPack'] : []),
    ...(capturedMetadataOptIn ? ["capturedSourceMetadataV1"] : [])])
    && value!.contract === "master-existing-normative-registry-reuse/r1"
    && ["SOURCE_LOCATOR_TEXT_SHA256", "CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1", "REVIEWED_NORM_PACK_ITEM_SHA256_R1", "CAPTURED_PARENT_OPERATION_COMPOSITION_ONLY_R1", "CAPTURED_PARENT_PROJECT_SCOPE_METADATA_ONLY_V1"]
      .includes(value!.locatorExcerptHashKind), "EXACT_DECLARATION_REQUIRED");
  const source = value!.source;
  requireThat(object(source) && keys(source, ["id", "source_key", "title_ru", "authority", "official_url",
    "artifact_sha256", "effective_from", "effective_to", "metadata", "created_at"])
    && uuid(source.id) && object(source.metadata)
    && (reviewedPack ? !Object.hasOwn(source.metadata, 'contract')
      : typeof source.metadata.contract === "string" && source.metadata.contract.trim().length > 0)
    && typeof source.created_at === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/u.test(source.created_at),
  "COMPLETE_SOURCE_WITH_RAW_TIMESTAMP_REQUIRED");
  const witness = value!.capturedSourceMetadataV1;
  if (capturedMetadataOptIn) {
    invariant(witness && object(witness) && keys(witness, ["contract", "sourceId", "nativeSourceId", "sourceKey",
      "artifactSha256", "sourceRowSha256", "metadataSha256", "locatorSetSha256", "generatedMetadataSha256"])
      && witness.contract === "master-existing-registry-captured-source-metadata/v1",
    prefix + "CAPTURED_METADATA_EXACT_WITNESS_REQUIRED");
    invariant(!reviewedPack && !operationOnly && !projectScopeOnly && !authorityOnly && !repairVisibilityOnly,
      prefix + "CAPTURED_METADATA_MODE_CONFLICT");
    invariant(uuid(witness.sourceId) && typeof witness.nativeSourceId === "string" && witness.nativeSourceId.length > 0
      && typeof witness.sourceKey === "string" && witness.sourceKey.length > 0
      && [witness.artifactSha256, witness.sourceRowSha256, witness.metadataSha256,
        witness.locatorSetSha256, witness.generatedMetadataSha256].every(hash => /^[a-f0-9]{64}$/u.test(hash)),
    prefix + "CAPTURED_METADATA_WITNESS_SHAPE");
    invariant(source.metadata.activationAllowed === false && object(input.newSource.metadata)
      && input.newSource.metadata.activationAllowed === false
      && input.newSource.metadata.universalProductivityClaimed === false
      && input.newSource.metadata.universalConsumptionClaimed === false,
    prefix + "CAPTURED_METADATA_NO_ACTIVATION");
    invariant(witness.sourceId === source.id && witness.nativeSourceId === source.metadata.sourceId
      && witness.sourceKey === source.source_key && witness.artifactSha256 === source.artifact_sha256
      && witness.sourceRowSha256 === sha256(source) && witness.metadataSha256 === sha256(source.metadata),
    prefix + "CAPTURED_METADATA_SOURCE_DRIFT");
    invariant(Array.isArray(value!.locators) && value!.locators.length > 0 && value!.locators.length <= 32
      && witness.locatorSetSha256 === sha256([...value!.locators].sort((a, b) => String(a.id).localeCompare(String(b.id)))),
    prefix + "CAPTURED_METADATA_LOCATOR_DRIFT");
    invariant(witness.generatedMetadataSha256 === sha256(input.newSource.metadata),
      prefix + "CAPTURED_METADATA_CONSUMER_DRIFT");
  }
  const {created_at: _createdAt, ...managedSource} = source;
  // The original registry contract belongs to its first publisher. Consumer
  // provenance stays in this definition's source envelope; no metadata rewrite.
  requireThat(operationOnly||projectScopeOnly||same(managedSource, {...input.newSource, id: source.id,
    metadata: reviewedPack || authorityOnly || repairVisibilityOnly || capturedMetadataOptIn ? source.metadata : {...input.newSource.metadata, contract: source.metadata.contract}}), "SOURCE_FACTS_OR_METADATA_DRIFT");
  requireThat(Array.isArray(value!.locators) && value!.locators.length > 0
    && value!.locators.length === input.newLocators.length && value!.locators.length <= 32,
  "COMPLETE_LOCATOR_SET_REQUIRED");
  const declared = value!.locators;
  requireThat(declared.every(l => object(l) && keys(l, ["id", "source_id", "locator_key", "locator", "excerpt_sha256"])
    && uuid(l.id) && l.source_id === source.id && typeof l.locator_key === "string"
    && l.locator_key.length > 0 && object(l.locator) && typeof l.excerpt_sha256 === "string"
    && /^[a-f0-9]{64}$/u.test(l.excerpt_sha256))
    && new Set(declared.map(l => l.id)).size === declared.length
    && new Set(declared.map(l => l.locator_key)).size === declared.length, "LOCATOR_IDENTITIES_OR_SHAPE");
  const reviewedEvidence = reviewedPack ? masterReviewedNormPackRegistryEvidenceR1({proof: value!.reviewedNormPack!, source, locators: declared}) : null;
  const ordered = input.newLocators.map(candidate => {
    if (value!.locatorExcerptHashKind === "CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1")
      requireThat(candidate.excerpt_sha256 === createHash("sha256")
        .update(stringifyCanonicalEstimateJson(candidate.locator)).digest("hex"), "LOCATOR_EXCERPT_POLICY_DRIFT");
    if (reviewedEvidence) requireThat(candidate.excerpt_sha256 === reviewedEvidence.excerptByLocatorKey[candidate.locator_key], "LOCATOR_EXCERPT_POLICY_DRIFT");
    const row = declared.find(l => l.locator_key === candidate.locator_key);
    requireThat(row != null && same(row, {...candidate, id: row!.id, source_id: source.id}),
      "LOCATOR_FACTS_OR_EXCERPT_DRIFT");
    if(operationOnly||projectScopeOnly){const retained=input.config.binding.retainParentBindings as MasterRetainParentBindingsR1;
      requireThat(same(retained.capturedParent.normativeLocators.find(l=>l.id===row!.id),row),'OPERATION_ONLY_LOCATOR_CAPTURE');}
    return row!;
  });
  return {errorPrefix: prefix, declaration: value!, managedSource, locators: ordered};
}
/** The same full registry must exist at normal preflight, locked reread and
 * registered-state verification. An absent or partly matching row is refused. */
/** SOURCE-ONLY R24 prototype. Reuse the existing9ef resolver for the
 * auxiliary tuple; do not replace the primary generated020source or emit a
 * second source. The emission below is a metadata witness, never a writer. */
export function resolveMasterAdditionalCapturedExistingRegistryV1(input:Parameters<typeof masterAdditionalCapturedExistingRegistryV1>[0]){
 const a=masterAdditionalCapturedExistingRegistryV1(input);if(!a)return null;
 const source=a.reuse.source,m=a.consumerEmission.sourceMetadata,contract=a.consumerEmission.contract;
 const metadata={contract,sourceKind:m.source_kind??'PROJECT_DOCUMENTATION_REQUIRED',useRestriction:m.use_restriction,
  universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false};
 const result=resolveMasterExistingNormativeRegistryReuseR1({config:{...input.config,binding:{...input.config.binding,
  reuseExistingNormativeRegistry:a.reuse as MasterExistingNormativeRegistryReuseR1}},
  newSource:{id:uuid(`${contract}:${source.source_key}:source`),source_key:source.source_key,title_ru:m.source_title,authority:m.source_authority,
   official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:m.effective_from??null,effective_to:null,metadata},newLocators:a.reuse.locators});
 invariant(result,`STOP_${input.config.stopCode}_ADDITIONAL_EXISTING_RESOLVER_REQUIRED`);return result;
}

export function assertMasterExistingNormativeRegistrySnapshotR1(
  reuse: MasterResolvedExistingRegistryReuseR1 | null,
  actual: Readonly<{newSources: readonly Json[]; newLocators: readonly Json[]}> | null,
): void {
  if (reuse == null) return;
  const encoded = (x: unknown) => JSON.stringify(stable(x));
  if (actual == null || encoded(actual.newSources) !== encoded([reuse.declaration.source]))
    throw new Error(reuse.errorPrefix + "FULL_EXISTING_SOURCE_REQUIRED");
  const rows = (x: readonly Json[]) => [...x].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (encoded(rows(actual.newLocators)) !== encoded(rows(reuse.locators)))
    throw new Error(reuse.errorPrefix + "FULL_EXISTING_LOCATORS_REQUIRED");
}


export type MasterSingleDefinitionCountShape = Readonly<{
  definitions: number;
  parameters: number;
  formulas: number;
  resources: number;
}>;

/** Bounded target snapshot for the existing successor precondition. Full raw
 * database rows are hashed on a stable session timezone; no private rows or
 * alternate calculation/publication path are introduced. */
export async function readMasterSuccessorTargetPreimageR1(client:Pick<Client,'query'>,
 input:{releaseId:string;catalogId:string;sourceId:string;lock?:boolean}):Promise<Json> {
 if(input.lock)await client.query(`lock table public.estimate_cumulative_manifest_entry,
  public.estimate_definition_version,public.estimate_approved_template_baseline,public.estimate_parameter_definition,
  public.estimate_formula_graph,public.estimate_resource_spec,public.estimate_work_normative_binding,
  public.estimate_normative_locator,public.estimate_normative_source,public.estimate_work_identity in share row exclusive mode`);
 const zone=(await client.query("select current_setting('TimeZone') zone")).rows[0].zone;
 await client.query("select set_config('TimeZone','UTC',$1)",[input.lock===true]);
 try {
  const headers=(await client.query(`select m.definition_version_id::text,m.approved_template_baseline_id::text,
   d.definition_version,d.definition_sha256 from public.estimate_cumulative_manifest_entry m
   join public.estimate_definition_version d on d.id=m.definition_version_id where m.release_id=$1 and m.catalog_id=$2`,
   [input.releaseId,input.catalogId])).rows;
  invariant(headers.length===1,'SUCCESSOR_TARGET_PREIMAGE_SINGLE_HEADER');const header=headers[0],id=header.definition_version_id;
  const table=(name:string,where:string)=>`select row_to_json(t)::text raw from public.${name} t where ${where}`;
  const queries:[string,string,unknown[]][]=[
   ['definition',table('estimate_definition_version','t.id=$1'),[id]],
   ['baseline',table('estimate_approved_template_baseline','t.id=$1'),[header.approved_template_baseline_id]],
   ['parameters',table('estimate_parameter_definition','t.definition_version_id=$1'),[id]],
   ['formulas',table('estimate_formula_graph','t.definition_version_id=$1'),[id]],
   ['resources',table('estimate_resource_spec','t.definition_version_id=$1'),[id]],
   ['bindings',table('estimate_work_normative_binding','t.definition_version_id=$1'),[id]],
   ['locators',table('estimate_normative_locator','t.id in(select locator_id from public.estimate_work_normative_binding where definition_version_id=$1)'),[id]],
   ['sources',table('estimate_normative_source','t.id in(select l.source_id from public.estimate_normative_locator l join public.estimate_work_normative_binding b on b.locator_id=l.id where b.definition_version_id=$1)'),[id]],
   ['newSource',table('estimate_normative_source','t.source_key=$1'),[input.sourceId]],
   ['identity',table('estimate_work_identity','t.catalog_id=$1'),[input.catalogId]],
  ],sets:Json={};
  for(const [name,sql,values]of queries){const rows=(await client.query(sql,values)).rows.map(r=>r.raw as string);
   invariant(rows.length<=4096&&rows.every(r=>typeof r==='string'),'SUCCESSOR_TARGET_PREIMAGE_BOUNDED_RAW_ROWS');
   sets[name]={rowCount:rows.length,sha256:sha256(rows.sort().join('\n'))};
  }
  return{contract:'master-successor-target-preimage/r1',catalogId:input.catalogId,sourceId:input.sourceId,header,sets};
 }finally{await client.query("select set_config('TimeZone',$1,$2)",[zone,input.lock===true]);}
}

/** Keep the legacy single-resource path intact. A composite source may instead
 * declare each resource independently; count that declaration, not emitted rows. */
export function resolveMasterSingleDefinitionBindingRowIds(
  config: Pick<MasterSingleDefinitionSuccessorConfig, "binding" | "projectSourcePackagePath">,
  resources: readonly Json[],
  locatorIds: readonly string[],
): readonly string[] {
  if (config.binding.additionalRowIds == null) return [config.binding.rowId];
  invariant(config.projectSourcePackagePath == null, "COMPOSITE_BINDING_PROJECT_PACKAGE_UNSUPPORTED");
  invariant(locatorIds.length === 1, "COMPOSITE_BINDING_REQUIRES_ONE_LOCATOR");
  invariant(Array.isArray(config.binding.additionalRowIds) && config.binding.additionalRowIds.length > 0,
    "COMPOSITE_BINDING_ADDITIONAL_ROWS_REQUIRED");
  const declared = [config.binding.rowId, ...config.binding.additionalRowIds];
  invariant(declared.every(id => typeof id === "string" && id.trim().length > 0),
    "COMPOSITE_BINDING_EMPTY_ROW_ID");
  invariant(new Set(declared).size === declared.length, "COMPOSITE_BINDING_DUPLICATE_ROW_ID");
  const ordinalById = new Map(resources.map((row, index) => [row.row_id,
    typeof row.ordinal === "number" ? row.ordinal : index]));
  invariant(declared.every(id => ordinalById.has(id)), "COMPOSITE_BINDING_UNKNOWN_ROW_ID");
  return [...declared].sort((left, right) => ordinalById.get(left)! - ordinalById.get(right)!);
}

/** Optional source-specific binding metadata. Omitted maps preserve the exact
 * legacy shared applicability; an opted-in map must cover every declared row. */
export function resolveMasterSingleDefinitionBindingApplicabilityByRowId(
  config: Pick<MasterSingleDefinitionSuccessorConfig, "binding" | "projectSourcePackagePath">,
  resources: readonly Json[],
  locatorIds: readonly string[],
): Readonly<Record<string, Json>> {
  const rows = resolveMasterSingleDefinitionBindingRowIds(config, resources, locatorIds);
  if (!Object.prototype.hasOwnProperty.call(config.binding, "applicabilityByRowId")) {
    return Object.fromEntries(rows.map(id => [id, config.binding.applicability]));
  }
  const map = config.binding.applicabilityByRowId;
  invariant(map != null && typeof map === "object" && !Array.isArray(map), "BINDING_APPLICABILITY_MAP_OBJECT_REQUIRED");
  invariant(JSON.stringify(Object.keys(map).sort()) === JSON.stringify([...rows].sort()),
    "BINDING_APPLICABILITY_MAP_EXACT_DECLARED_ROWS_REQUIRED");
  for (const id of rows) {
    invariant(map[id] != null && typeof map[id] === "object" && !Array.isArray(map[id])
      && Object.keys(map[id]).length > 0, "BINDING_APPLICABILITY_ROW_OBJECT_REQUIRED");
  }
  return Object.fromEntries(rows.map(id => [id, map[id]]));
}

/** Remove only retired selection identities from the NEW immutable release.
 * Definitions, source registry, old manifests and saved revisions are untouched. */
export function resolveMasterActiveParentCountsR575(parent:MasterSingleDefinitionCountShape,
  retired:MasterSingleDefinitionCountShape):MasterSingleDefinitionCountShape {
  const result={} as Record<keyof MasterSingleDefinitionCountShape,number>;
  for(const key of ['definitions','parameters','formulas','resources'] as const){
    invariant(Number.isSafeInteger(parent[key]) && Number.isSafeInteger(retired[key])
      && retired[key]>=0 && retired[key]<=parent[key], 'MASTER_ACTIVE_PARENT_RETIREMENT_COUNTS');
    result[key]=parent[key]-retired[key];
  }
  invariant(result.definitions>0,'MASTER_ACTIVE_PARENT_RETIREMENT_EMPTY');
  return result;
}
export async function readMasterAreaRetirementCountsR575(client:Pick<Client,'query'>,releaseId:string){
  const result=await client.query(`with retired as materialized(
    select m.definition_version_id,m.catalog_id,m.entry_sha256
    from public.estimate_cumulative_manifest_entry m where m.release_id=$1 and not (${canonicalPublicWorkSqlV1('m')})
  ) select (select count(*)::int from retired) definitions,
    (select count(*)::int from public.estimate_parameter_definition where definition_version_id in(select definition_version_id from retired)) parameters,
    (select count(*)::int from public.estimate_formula_graph where definition_version_id in(select definition_version_id from retired)) formulas,
    (select count(*)::int from public.estimate_resource_spec where definition_version_id in(select definition_version_id from retired)) resources,
    (select encode(extensions.digest(convert_to(coalesce(string_agg(catalog_id||':'||entry_sha256,'' order by catalog_id),''),'UTF8'),'sha256'),'hex') from retired) snapshot`,[releaseId]);
  invariant(result.rows.length===1,'MASTER_AREA_RETIREMENT_READ');
  const row=result.rows[0] as MasterSingleDefinitionCountShape & {snapshot:string};
  invariant(/^[a-f0-9]{64}$/u.test(row.snapshot),'MASTER_AREA_RETIREMENT_SNAPSHOT');return row;
}
export function resolveMasterSingleDefinitionNextCounts(input: Readonly<{
  parent: MasterSingleDefinitionCountShape;
  previousTarget: Readonly<{ parameters: number; formulas: number; resources: number }> | null;
  nextTarget: Readonly<{ parameters: number; formulas: number; resources: number }>;
}>): MasterSingleDefinitionCountShape {
  if (input.previousTarget == null) {
    return {
      definitions: input.parent.definitions + 1,
      parameters: input.parent.parameters + input.nextTarget.parameters,
      formulas: input.parent.formulas + input.nextTarget.formulas,
      resources: input.parent.resources + input.nextTarget.resources,
    };
  }
  return {
    definitions: input.parent.definitions,
    parameters: input.parent.parameters - input.previousTarget.parameters + input.nextTarget.parameters,
    formulas: input.parent.formulas - input.previousTarget.formulas + input.nextTarget.formulas,
    resources: input.parent.resources - input.previousTarget.resources + input.nextTarget.resources,
  };
}

export function validateMasterFormulaGraphConsistency(
  formulaDefinitions: readonly Json[],
): readonly string[] {
  const errors: string[] = [];
  for (const [index, formula] of formulaDefinitions.entries()) {
    const formulaId = nonEmptyText(formula.formula_id) || `INDEX_${index}`;
    const expression = nonEmptyText(formula.expression_source);
    if (!expression) {
      errors.push(`${formulaId}:EXPRESSION_SOURCE_EMPTY`);
      continue;
    }
    try {
      const compiled = compileFormulaGraph(expression);
      if (sha256(compiled.ast) !== sha256(formula.ast)) {
        errors.push(`${formulaId}:AST_EXPRESSION_DRIFT`);
      }
      const configuredInputs = Array.isArray(formula.input_parameter_ids)
        ? formula.input_parameter_ids.map(String).sort()
        : [];
      const compiledInputs = [...compiled.inputParameterIds].map(String).sort();
      if (JSON.stringify(configuredInputs) !== JSON.stringify(compiledInputs)) {
        errors.push(`${formulaId}:INPUT_PARAMETER_DRIFT`);
      }
    } catch {
      errors.push(`${formulaId}:EXPRESSION_COMPILE_FAILED`);
    }
  }
  return errors;
}

export { buildMasterParameterCalculationConsumers } from
  "../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1";

const CONTENT_PASSPORT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const BASELINE_CONTRACT = "APPROVED_TEMPLATE_BASELINE_R54_V1";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";

/** Append-only local pointer counters. Legacy pointers without this bundle keep their bytes.
 * This prospective patch must be validated before any publication DML, never after commit. */
export function resolveMasterRuntimeAdmissionMetadataR1(
  current: Readonly<Record<string, unknown>>,
  parentDefinitionCount: number,
  nextDefinitionCount: number,
): Readonly<Record<string, unknown>> {
  const integer = (value: unknown, minimum: number, code: string): number => {
    invariant(typeof value === "number" && Number.isSafeInteger(value) && value >= minimum, code);
    return value;
  };
  integer(parentDefinitionCount, 1, "MASTER_POINTER_ADMISSION_PARENT_COUNT");
  integer(nextDefinitionCount, 1, "MASTER_POINTER_ADMISSION_NEXT_COUNT");
  const delta = nextDefinitionCount - parentDefinitionCount;
  invariant(delta === 0 || delta === 1, "MASTER_POINTER_ADMISSION_SINGLE_DEFINITION_DELTA");
  if (delta === 0) return {};
  const fields = ["runtimeAdditionalAdmissions", "currentInventoryRowsIncludingAliases", "denominatorNote"];
  const present = fields.filter(key => Object.prototype.hasOwnProperty.call(current, key)).length;
  if (present === 0) return {};
  invariant(present === fields.length, "MASTER_POINTER_ADMISSION_PARTIAL_METADATA");
  invariant(current.currentRuntimeDefinitions === parentDefinitionCount,
    "MASTER_POINTER_ADMISSION_PARENT_RUNTIME_COUNT");
  const identities = integer(current.identities, 1, "MASTER_POINTER_ADMISSION_HISTORICAL_IDENTITIES");
  const visible = integer(current.visibleCanonicalDefinitions, 0, "MASTER_POINTER_ADMISSION_HISTORICAL_VISIBLE");
  const aliases = integer(current.aliasesRedirects, 0, "MASTER_POINTER_ADMISSION_HISTORICAL_ALIASES");
  invariant(visible + aliases === identities, "MASTER_POINTER_ADMISSION_HISTORICAL_BASIS");
  const admissions = integer(current.runtimeAdditionalAdmissions, 0, "MASTER_POINTER_ADMISSION_COUNTER");
  const inventory = integer(current.currentInventoryRowsIncludingAliases, 1, "MASTER_POINTER_ADMISSION_INVENTORY");
  invariant(identities + admissions === inventory, "MASTER_POINTER_ADMISSION_INVENTORY_BASIS");
  const note = (count: number) => `${identities} is the immutable historical source-identity reconciliation (${visible} canonical owners plus ${aliases} redirects); the current cumulative runtime also preserves ${count} separately identified inherited admissions.`;
  invariant(current.denominatorNote === note(admissions), "MASTER_POINTER_ADMISSION_NOTE");
  integer(admissions + 1, 1, "MASTER_POINTER_ADMISSION_COUNTER_OVERFLOW");
  integer(inventory + 1, 1, "MASTER_POINTER_ADMISSION_INVENTORY_OVERFLOW");
  return {
    runtimeAdditionalAdmissions: admissions + 1,
    currentInventoryRowsIncludingAliases: inventory + 1,
    denominatorNote: note(admissions + 1),
  };
}

/** Historical baseline provenance stays in the baseline. It must not become a
 * current runtime default merely to survive a retained publication. The normal
 * retained guard has already verified the exact capture and declared sources;
 * the existing registered-source preflight checks the assembled plan again. */
export function resolveMasterRetainedBaselineInputClassificationR1(
  parameterId: string,
  runtimeClassification: Readonly<Record<string, string | undefined>>,
  retained?: Pick<MasterRetainParentBindingsR1, "capturedParent"
    | "legacyTemplateAssumptionSources" | "legacyCapturedFixtureSources"> | null,
): string {
  const legacy = retained?.legacyTemplateAssumptionSources;
  const fixture = retained?.legacyCapturedFixtureSources;
  const provenance = legacy ?? fixture;
  if (retained && provenance && Object.hasOwn(provenance.parameterSources, parameterId)) {
    const captured: unknown = retained.capturedParent.baseline.input_classification[parameterId];
    invariant(typeof captured === "string",
      `MASTER_RETAINED_BASELINE_CLASSIFICATION_INVALID:${parameterId}`);
    invariant(legacy ? captured === "ASSUMPTION"
      : captured === "VALIDATION_FIXTURE" || captured === "DERIVED",
    `MASTER_RETAINED_BASELINE_CLASSIFICATION_INVALID:${parameterId}`);
    return captured;
  }
  return runtimeClassification[parameterId] ?? "VALIDATION_FIXTURE";
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
}

/** Receipt readers must use the same canonical byte order as the publisher. */
export function hashMasterSingleDefinitionSuccessorReceiptR1(value: unknown): string {
  return sha256(value);
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Pure registry-row assembly shared by the writer and formal capture callers.
 * File/package verification belongs to the caller; this is not source admission.
 * Uses the publisher's existing identity helper, without callbacks, IO or a client.
 * Pass null package inputs for a config without a package; never bypass its loader.
 */
export function assembleMasterSingleDefinitionManagedRegistryCandidateR1<
  C extends Pick<MasterSingleDefinitionSuccessorConfig,
    "contract" | "stopCode" | "catalogId" | "parentReleaseId" | "sourceId" | "normId"
    | "sourceMetadata" | "locator" | "binding" | "catalogAppend" | "projectSourcePackagePath">,
>(config: C, verified: Readonly<{
  projectSourcePackage: ReturnType<typeof loadVerifiedProjectSourcePackageBinding> | null;
  projectSourcePackageSet: ReturnType<typeof verifyS279CompleteProjectSourcePackageSetForSuccessor> | null;
}>) {
  const { projectSourcePackage, projectSourcePackageSet } = verified;
  invariant(Boolean(config.projectSourcePackagePath?.trim()) === (projectSourcePackage != null),
    `STOP_${config.stopCode}_REGISTRY_CANDIDATE_VERIFIED_PACKAGE_REQUIRED`);
  invariant(projectSourcePackageSet == null
    || projectSourcePackage?.packagePayloadSha256 === projectSourcePackageSet.targetPackagePayloadSha256,
    `STOP_${config.stopCode}_PROJECT_SOURCE_COMPLETE_SET_TARGET_DRIFT`);
  const resolvedSourceMetadata = {
    ...config.sourceMetadata,
    ...(projectSourcePackage == null ? {} : {
      source_kind: "APPROVED_PROJECT_DOCUMENT_PACKAGE",
      artifact_sha256: projectSourcePackage.packagePayloadSha256,
    }),
  };
  const resolvedLocators = projectSourcePackage == null
    ? [{
      key: config.locator.key,
      payload: config.locator.payload,
      excerptSha256: resolveMasterSingleDefinitionLocatorExcerptSha256R1(config),
    }]
    : projectSourcePackage.verifiedLocators.map((locator, index) => ({
      key: `${config.locator.key}:package:${projectSourcePackage.packagePayloadSha256}`
        + `:excerpt:${index}:${locator.excerptSha256}`,
      payload: {
        ...config.locator.payload,
        kind: "APPROVED_PROJECT_DOCUMENT_PACKAGE_BOUND",
        projectSourcePackage: {
          packageId: projectSourcePackage.packageId,
          packagePayloadSha256: projectSourcePackage.packagePayloadSha256,
          ...(projectSourcePackageSet == null ? {} : {
            completePackageSet: projectSourcePackageSet,
          }),
          projectMetadata: projectSourcePackage.projectMetadata,
          catalogMappingIdentity: {
            catalogId: projectSourcePackage.mapping.catalogId,
            definitionSha256: projectSourcePackage.mapping.definitionSha256,
            rowId: projectSourcePackage.mapping.rowId,
          },
          documentLocator: locator.documentLocator,
          verifiedExcerpt: {
            artifactId: locator.artifactId,
            fileName: locator.excerptFileName,
            bytes: locator.excerptBytes,
            sha256: locator.excerptSha256,
          },
        },
      },
      excerptSha256: locator.excerptSha256,
    }));
  const generatedSourceId = uuid(`${config.contract}:${config.sourceId}:source`);
  const generatedLocatorIds = resolvedLocators.map((locator) => projectSourcePackage == null
    ? uuid(`${config.contract}:${config.sourceId}:${locator.key}:locator`)
    : uuid(`${config.sourceId}:${locator.key}:normative-locator`));
  const registrySourceMetadata={
    contract:config.contract,
    sourceKind:resolvedSourceMetadata.source_kind??"PROJECT_DOCUMENTATION_REQUIRED",
    useRestriction:resolvedSourceMetadata.use_restriction,
    universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false,
    ...(projectSourcePackage==null?{}:{projectSourcePackage:{
      packageId:projectSourcePackage.packageId,packagePayloadSha256:projectSourcePackage.packagePayloadSha256,
      ...(projectSourcePackageSet==null?{}:{completePackageSet:projectSourcePackageSet}),
      artifactReceipts:projectSourcePackage.artifactReceipts,excerptReceipts:projectSourcePackage.excerptReceipts,
      projectMetadata:projectSourcePackage.projectMetadata,
    }}),
  };
  const generatedRetentionCandidate={config,newSource:{id:generatedSourceId,source_key:config.sourceId,
    title_ru:resolvedSourceMetadata.source_title,authority:resolvedSourceMetadata.source_authority,
    official_url:resolvedSourceMetadata.official_url??null,artifact_sha256:resolvedSourceMetadata.artifact_sha256??null,
    effective_from:resolvedSourceMetadata.effective_from??null,effective_to:null,metadata:registrySourceMetadata},
    newLocators:resolvedLocators.map((locator,index)=>({id:generatedLocatorIds[index]!,source_id:generatedSourceId,
      locator_key:locator.key,locator:locator.payload,excerpt_sha256:locator.excerptSha256}))};
  const existingRegistryReuse=resolveMasterExistingNormativeRegistryReuseR1(generatedRetentionCandidate);
  const retentionCandidate=existingRegistryReuse==null?generatedRetentionCandidate:{config,
    newSource:existingRegistryReuse.managedSource,newLocators:existingRegistryReuse.locators};
  return { resolvedSourceMetadata, resolvedLocators, registrySourceMetadata, existingRegistryReuse, retentionCandidate };
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase("ru-RU")
    .replace(/ё/gu, "е")
    .replace(/[^a-zа-я0-9]+/giu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function resourceRowType(category: string): string {
  if (category === "material") return "material";
  if (category === "equipment") return "equipment";
  if (category === "service") return "service";
  if (category === "construction_work") return "labor";
  return "other";
}

/** Exact existing publication preparation, shared with the pure clone rehearsal. */
export function buildMasterPublicationResourceRowsR1(resourceDefinitions: readonly Json[]): Json[] {
  return resourceDefinitions.map((resource) => ({
    ...resource,
    row_type: ["material", "labor", "equipment", "service", "waste", "other"]
      .includes(String(resource.row_type))
      ? resource.row_type
      : resourceRowType(resource.category),
  }));
}

function stop(config: Pick<MasterSingleDefinitionSuccessorConfig, "stopCode">, suffix: string): string {
  return `STOP_${config.stopCode}_${suffix}`;
}

function isJsonRecord(value: unknown): value is Json {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyText(value: unknown): string {
  return String(value ?? "").trim();
}

/**
 * A completeness oracle is useful only if it was authored independently and
 * still resolves to the exact rows/formulas being published. This check is
 * deliberately performed before a database transaction is opened.
 */
export function validateIndependentCompletenessMapReferences(input: Readonly<{
  completenessMap: unknown;
  formulaDefinitions: readonly Json[];
  resourceDefinitions: readonly Json[];
  /** Mandatory only for a new successor; legacy reference readers keep their contract. */
  requireOperationBindings?: boolean;
}>): readonly string[] {
  const errors: string[] = [];
  const completeness = isJsonRecord(input.completenessMap) ? input.completenessMap : null;
  if (completeness == null) return ["MAP_NOT_OBJECT"];
  if (completeness.contract !== CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT) {
    errors.push("CONTRACT");
  }
  if (!["NORMATIVE_OPERATION_MAP", "TECHNOLOGY_MAP", "PRODUCT_SYSTEM_TDS", "PROJECT_SYSTEM"]
    .includes(nonEmptyText(completeness.sourceKind))) {
    errors.push("SOURCE_KIND");
  }
  if (completeness.generatedFromCurrentRows !== false) errors.push("NOT_INDEPENDENT");
  if (!/^[0-9a-f]{64}$/u.test(nonEmptyText(completeness.evidenceSha256))) {
    errors.push("EVIDENCE_SHA256");
  }

  const entries = Array.isArray(completeness.entries) ? completeness.entries : [];
  if (entries.length === 0) errors.push("ENTRIES_EMPTY");
  const formulas = new Map(input.formulaDefinitions.map((formula) => [
    nonEmptyText(formula.formula_id), formula,
  ]));
  const resources = new Map(input.resourceDefinitions.map((resource) => [
    nonEmptyText(resource.row_id), resource,
  ]));
  const entryKeys = new Set<string>();
  // New source maps opt in to physical operation binding. Historical maps keep
  // their existing contract; a resource title never proves which stage uses it.
  const requireOperationBindings = input.requireOperationBindings === true || completeness.operationResourceBindingRequired === true;
  if (completeness.operationResourceBindingRequired != null && completeness.operationResourceBindingRequired !== true) {
    errors.push("OPERATION_RESOURCE_BINDING_POLICY");
  }
  for (const [index, rawEntry] of entries.entries()) {
    const prefix = `ENTRY_${index}`;
    if (!isJsonRecord(rawEntry) || !isJsonRecord(rawEntry.resolution)) {
      errors.push(`${prefix}_SHAPE`);
      continue;
    }
    const operationId = nonEmptyText(rawEntry.operationId);
    const expectedResourceId = nonEmptyText(rawEntry.expectedResourceId);
    const condition = nonEmptyText(rawEntry.condition);
    const sourceId = nonEmptyText(rawEntry.sourceId);
    const key = `${operationId}\u0000${expectedResourceId}`;
    if (!operationId) errors.push(`${prefix}_OPERATION_ID`);
    if (!expectedResourceId) errors.push(`${prefix}_EXPECTED_RESOURCE_ID`);
    if (!condition) errors.push(`${prefix}_CONDITION`);
    if (!sourceId) errors.push(`${prefix}_SOURCE_ID`);
    if (entryKeys.has(key)) errors.push(`${prefix}_DUPLICATE`);
    else entryKeys.add(key);

    const resolutionKind = nonEmptyText(rawEntry.resolution.kind);
    if (resolutionKind === "NOT_APPLICABLE") {
      if (!nonEmptyText(rawEntry.resolution.reasonRu)) errors.push(`${prefix}_REASON`);
      continue;
    }
    const rowId = resolutionKind === "ROW" || resolutionKind === "INCLUDED_COMPONENT_ROW"
      ? nonEmptyText(rawEntry.resolution.rowId)
      : resolutionKind === "INCLUDED_IN_PARENT"
        ? nonEmptyText(rawEntry.resolution.parentRowId)
        : "";
    if (!rowId) {
      errors.push(`${prefix}_RESOLUTION`);
      continue;
    }
    const formulaId = nonEmptyText(rawEntry.formulaId);
    const resource = resources.get(rowId);
    if (!resource) errors.push(`${prefix}_ROW_REFERENCE`);
    if (requireOperationBindings && resource) {
      // A matching identity is not physical coverage when, for example, the
      // independent source requires water in litres but the row supplies m3.
      // Accept registered aliases only; this gate does not convert quantities.
      const categoryKey = (value: unknown) => resolveCanonicalEstimateExplicitRowCategory(nonEmptyText(value))
        ?? nonEmptyText(value).toLowerCase();
      const unitKey = (value: unknown) => resolveProfessionalUnitDefinition(nonEmptyText(value))?.code
        ?? nonEmptyText(value);
      if (nonEmptyText(rawEntry.category) && categoryKey(rawEntry.category) !== categoryKey(resource.category)) {
        errors.push(`${prefix}_RESOURCE_CATEGORY`);
      }
      if (nonEmptyText(rawEntry.unitId)) {
        const expectedUnit = unitKey(rawEntry.unitId);
        if (expectedUnit !== unitKey(resource.unit_id)) errors.push(`${prefix}_RESOURCE_UNIT`);
        const formula = formulas.get(formulaId);
        if (formula && expectedUnit !== unitKey(formula.output_unit_id)) errors.push(`${prefix}_FORMULA_OUTPUT_UNIT`);
      }
    }
    const requiredOperationIds = rawEntry.requiredOperationIds;
    if (requireOperationBindings || requiredOperationIds != null) {
      if (!Array.isArray(requiredOperationIds) || requiredOperationIds.length === 0
        || requiredOperationIds.length > 64
        || requiredOperationIds.some(id => typeof id !== "string" || !id.trim())
        || new Set(requiredOperationIds).size !== requiredOperationIds.length) {
        errors.push(`${prefix}_REQUIRED_OPERATION_IDS`);
      } else if (resource) {
        const graph = isJsonRecord(resource.resource_graph) ? resource.resource_graph : {};
        const actualOperationIds = new Set(canonicalEstimateOperationReferences(graph.operationCompositionV1)
          .map(reference => reference.operationId));
        if (requiredOperationIds.some(id => !actualOperationIds.has(id))) {
          errors.push(`${prefix}_OPERATION_BINDING`);
        }
      }
    }
    if (!formulaId || !formulas.has(formulaId)) errors.push(`${prefix}_FORMULA_REFERENCE`);
    if (resource && formulaId && nonEmptyText(resource.formula_id) !== formulaId) {
      errors.push(`${prefix}_ROW_FORMULA_MISMATCH`);
    }
    if (resolutionKind === "INCLUDED_COMPONENT_ROW") {
      const parentRowId = nonEmptyText(rawEntry.resolution.parentRowId);
      const parent = resources.get(parentRowId);
      if (!parentRowId || !parent) errors.push(`${prefix}_PARENT_ROW_REFERENCE`);
      const resourceGraph = resource && isJsonRecord(resource.resource_graph)
        ? resource.resource_graph
        : null;
      if (resource && nonEmptyText(resourceGraph?.parentCostOwnerId) !== parentRowId) {
        errors.push(`${prefix}_PARENT_ROW_MISMATCH`);
      }
      if (resource && nonEmptyText(resourceGraph?.costTreatment) !== "INCLUDED_IN_RESOURCE_ROWS") {
        errors.push(`${prefix}_INCLUDED_COST_TREATMENT`);
      }
      // The visible child quantity may legitimately use a more specific
      // formula than its price-owning parent (for example, one operator's
      // machine-hours inside a crew total). The parent link and the child's
      // own formula are the invariants; formula equality would reject valid
      // detailed composition and force components back into a generic row.
    }
  }
  return errors;
}

function exactDatabaseGuard(config: MasterSingleDefinitionSuccessorConfig): void {
  const parsed = new URL(DATABASE_URL);
  const explicitlyAllowedLocalDatabase = String(
    process.env.R4A13_ALLOWED_LOCAL_DATABASE_NAME ?? "",
  ).trim();
  const expectedDatabasePath = explicitlyAllowedLocalDatabase
    ? `/${explicitlyAllowedLocalDatabase}`
    : "/rik_r4_runtime_b5_v2";
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `${stop(config, "DATABASE_NOT_LOOPBACK")}:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === expectedDatabasePath,
    `${stop(config, "DATABASE_NOT_CANONICAL_LOCAL")}:${parsed.port}:${parsed.pathname}`);
}

/** Shared by retained metadata-only successors; the existing clone and audit
 * remain the only search-release publication path. */
export {cloneSearch as cloneMasterSingleDefinitionSearchReleaseR1};
async function cloneSearch(
  client: Client,
  config: Pick<MasterSingleDefinitionSuccessorConfig,
    "catalogAppend" | "contract" | "parentSearchReleaseId" | "masterSha256" | "search" | "catalogId" | "binding" | "stopCode">,
  input: Readonly<{
    releaseId: string;
    searchReleaseId: string;
    releaseKey: string;
    head: string;
    tree: string;
    fingerprint: string;
    definitionId: string;
  }>,
): Promise<Json> {
  const append = config.catalogAppend;
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count+$10::int,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'masterSha256',$11::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false,
        'masterSingleDefinitionTargetCount',1)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId,
    `${input.releaseKey}-search`,
    input.head,
    input.tree,
    sha256(`${input.searchReleaseId}:draft`),
    config.contract,
    config.parentSearchReleaseId,
    input.releaseId,
    input.fingerprint,
    append == null ? 0 : 1,
    config.masterSha256,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId, config.parentSearchReleaseId,
  ]);
  if (append?.searchPlacement.groupMode === "create") {
    const placement = append.searchPlacement;
    const insertedGroup = await client.query(`insert into public.estimate_search_group(
        search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
        work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,0,$10,$11::jsonb)
      on conflict(search_release_id,group_id) do nothing`, [
      input.searchReleaseId,
      placement.groupId,
      placement.groupNameRu,
      placement.domainId,
      placement.systemId,
      placement.subsystemId,
      placement.assemblyId,
      placement.workFamilyId,
      JSON.stringify(placement.breadcrumb),
      sha256([]),
      JSON.stringify(placement.groupOracleDisposition),
    ]);
    invariant(insertedGroup.rowCount === 1, stop(config, "SEARCH_APPEND_GROUP_INSERT"));
  }
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question question where search_release_id=$2
      and not exists(select 1 from unnest(question.candidate_ids) candidate(catalog_id)
        where not (${canonicalPublicWorkSqlV1('candidate')}))`, [
    input.searchReleaseId, config.parentSearchReleaseId,
  ]);
  await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
      primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
      catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
      required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
      replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
      normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
      adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
    select $1,source.catalog_id,source.domain_id,source.system_id,source.subsystem_id,source.assembly_id,
      source.work_family_id,source.group_id,source.subgroup_id,source.element_type,source.operation_kind,
      source.technology_variant,source.construction_state,source.primary_uom,source.canonical_name_ru,
      source.aliases,source.normative_classifiers,source.applicability_tags,source.publication_state,
      source.catalog_origin,$2::uuid,source.short_scope_ru,source.key_distinguishing_parameters,
      source.required_inputs_count,source.clarification_fields,source.included_boundaries,
      source.excluded_boundaries,source.replacement_catalog_id,source.normalized_catalog_id,
      source.normalized_canonical_name,source.normalized_aliases,source.normalized_search_terms,
      source.normalized_search_blob,source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,
        'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,'UTF8'),'sha256'),'hex'),
      source.adjudication_class,source.selectable,source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4 and ${canonicalPublicWorkSqlV1('source')}`, [
    input.searchReleaseId,
    input.releaseId,
    config.contract,
    config.parentSearchReleaseId,
    input.fingerprint,
  ]);
  if (append != null) {
    const placement = append.searchPlacement;
    const aliases = [...config.search.aliases];
    const normalizedAliases = aliases.map(normalizeSearchText);
    const normalizedName = normalizeSearchText(config.search.canonicalNameRu);
    const searchTerms = [
      normalizedName,
      ...normalizedAliases,
      normalizeSearchText(config.search.extraSearchTermsRu),
    ].filter((value, index, values) => values.indexOf(value) === index);
    const sourceProvenance = {
      contract: config.contract,
      parentSearchReleaseId: config.parentSearchReleaseId,
      definitionReleaseId: input.releaseId,
      sourceFingerprint: input.fingerprint,
      knownWorkScopeFirstEstimate: true,
      conditionalTechnologyFailClosed: true,
      appendedCatalogIdentity: true,
      activationAllowed: false,
      productionEligible: false,
      ...config.search.sourceProvenance,
    };
    const documentSha256 = sha256({
      contract: config.contract,
      catalogId: config.catalogId,
      definitionReleaseId: input.releaseId,
      definitionVersionId: input.definitionId,
      placement,
      canonicalNameRu: config.search.canonicalNameRu,
      aliases,
      shortScopeRu: config.search.shortScopeRu,
      keyDistinguishingParameters: config.search.keyDistinguishingParameters,
      clarificationFields: config.search.clarificationFields,
      includedBoundaries: config.search.includedBoundaries,
      excludedBoundaries: config.search.excludedBoundaries,
      sourceProvenance,
    });
    const insertedDocument = await client.query(`insert into public.estimate_search_document(
        search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
        group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
        primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
        catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
        required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
        replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
        normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
        adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
      values($1,$2,$3,$4,$5,$6,$7,$8,null,$9,$10,$11,$12,$13,$14,$15::text[],$16::text[],
        $17::text[],$18,$19,$20,$21,$22::jsonb,$23,$24::jsonb,$25::jsonb,$26::jsonb,null,$27,$28,
        $29::text[],$30::text[],$31,$32::jsonb,$33,$34,$35,null,$36)`, [
      input.searchReleaseId,
      config.catalogId,
      placement.domainId,
      placement.systemId,
      placement.subsystemId,
      placement.assemblyId,
      placement.workFamilyId,
      placement.groupId,
      placement.elementType,
      placement.operationKind,
      placement.technologyVariant,
      placement.constructionState,
      config.search.primaryUom,
      config.search.canonicalNameRu,
      aliases,
      [...placement.normativeClassifiers],
      [...placement.applicabilityTags],
      placement.publicationState,
      placement.catalogOrigin,
      input.releaseId,
      config.search.shortScopeRu,
      JSON.stringify(config.search.keyDistinguishingParameters),
      config.search.keyDistinguishingParameters.length,
      JSON.stringify(config.search.clarificationFields),
      JSON.stringify(config.search.includedBoundaries),
      JSON.stringify(config.search.excludedBoundaries),
      normalizeSearchText(config.catalogId),
      normalizedName,
      normalizedAliases,
      searchTerms,
      searchTerms.join(" "),
      JSON.stringify(sourceProvenance),
      documentSha256,
      placement.adjudicationClass,
      placement.selectable,
      input.definitionId,
    ]);
    invariant(insertedDocument.rowCount === 1, stop(config, "SEARCH_APPEND_DOCUMENT_INSERT"));
  }
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,source.group_id,source.catalog_id,source.ordinal,source.independent_disposition
    from public.estimate_search_group_membership source
    join public.estimate_search_document successor_document
      on successor_document.search_release_id=$1
      and successor_document.catalog_id=source.catalog_id
    where source.search_release_id=$2`, [
    input.searchReleaseId, config.parentSearchReleaseId,
  ]);
  if (append != null) {
    const placement = append.searchPlacement;
    const insertedMembership = await client.query(`insert into public.estimate_search_group_membership(
        search_release_id,group_id,catalog_id,ordinal,independent_disposition)
      values($1,$2,$3,$4,$5::jsonb)`, [
      input.searchReleaseId,
      placement.groupId,
      config.catalogId,
      placement.membershipOrdinal,
      JSON.stringify(placement.independentDisposition),
    ]);
    invariant(insertedMembership.rowCount === 1, stop(config, "SEARCH_APPEND_MEMBERSHIP_INSERT"));
    const memberRows = (await client.query(`select catalog_id
      from public.estimate_search_group_membership
      where search_release_id=$1 and group_id=$2 order by ordinal,catalog_id`, [
      input.searchReleaseId,
      placement.groupId,
    ])).rows as Json[];
    const memberCatalogIds = memberRows.map((row) => String(row.catalog_id));
    const memberSetSha256 = sha256(memberCatalogIds);
    const updatedGroup = await client.query(`update public.estimate_search_group set
        member_count=$3,member_set_sha256=$4,
        oracle_disposition=oracle_disposition||$5::jsonb
      where search_release_id=$1 and group_id=$2`, [
      input.searchReleaseId,
      placement.groupId,
      memberCatalogIds.length,
      memberSetSha256,
      JSON.stringify({
        ...placement.groupOracleDisposition,
        memberCatalogIdsSha256: memberSetSha256,
      }),
    ]);
    invariant(updatedGroup.rowCount === 1, stop(config, "SEARCH_APPEND_GROUP_UPDATE"));
  }
  await client.query(`delete from public.estimate_search_group g where g.search_release_id=$1
    and not exists(select 1 from public.estimate_search_group_membership m
      where m.search_release_id=g.search_release_id and m.group_id=g.group_id)`,[input.searchReleaseId]);
  await client.query(`with actual as (
      select group_id,count(*)::int member_count,
        encode(extensions.digest(convert_to(array_to_json(array_agg(catalog_id order by ordinal,catalog_id))::text,'UTF8'),'sha256'),'hex') member_set_sha256
      from public.estimate_search_group_membership where search_release_id=$1 group by group_id
    ) update public.estimate_search_group g set member_count=actual.member_count,
      member_set_sha256=actual.member_set_sha256,
      oracle_disposition=g.oracle_disposition||jsonb_build_object('measuredGeometryCatalogPolicy',$2::text,
        'memberCatalogIdsSha256',actual.member_set_sha256)
    from actual where g.search_release_id=$1 and g.group_id=actual.group_id`,
    [input.searchReleaseId,CANONICAL_PUBLIC_CATALOG_VISIBILITY_V1]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,relation.source_catalog_id,relation.target_catalog_id,relation.relationship_type,
      relation.direction,relation.source_locator,relation.applicability_predicate,
      relation.required_when,relation.mutually_exclusive_with,relation.explanation_ru,
      relation.relation_sha256
    from public.estimate_search_typed_relation relation
    join public.estimate_search_document source_document
      on source_document.search_release_id=$1
      and source_document.catalog_id=relation.source_catalog_id
    join public.estimate_search_document target_document
      on target_document.search_release_id=$1
      and target_document.catalog_id=relation.target_catalog_id
    where relation.search_release_id=$2`, [
    input.searchReleaseId, config.parentSearchReleaseId,
  ]);

  if(append==null&&(config.binding.retainParentBindings?.operationCompositionOnly||config.binding.retainParentBindings?.projectScopeMetadataOnlyV1)){
    const updated=await client.query(config.binding.retainParentBindings?.projectScopeMetadataOnlyV1
      ?`update public.estimate_search_document set definition_release_id=$2,definition_version_id=$3,
      source_provenance=source_provenance||jsonb_build_object('projectScopeMetadataSuccessorV1',$4::text),
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$4,'UTF8'),'sha256'),'hex')
      where search_release_id=$1 and catalog_id=$5`
      :`update public.estimate_search_document set definition_release_id=$2,definition_version_id=$3,
      source_provenance=source_provenance||jsonb_build_object('operationCompositionSuccessorV1',$4::text),
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$4,'UTF8'),'sha256'),'hex')
      where search_release_id=$1 and catalog_id=$5`,[input.searchReleaseId,input.releaseId,input.definitionId,input.fingerprint,config.catalogId]);
    invariant(updated.rowCount===1,stop(config,'OPERATION_ONLY_SEARCH_TARGET_UPDATE'));
  }else if (append == null) {
    const aliases = [...config.search.aliases];
    const normalizedAliases = aliases.map(normalizeSearchText);
    const normalizedName = normalizeSearchText(config.search.canonicalNameRu);
    const searchTerms = [
      normalizedName,
      ...normalizedAliases,
      normalizeSearchText(config.search.extraSearchTermsRu),
    ].filter((value, index, values) => values.indexOf(value) === index);
    const updated = await client.query(`update public.estimate_search_document set
      primary_uom=$3,canonical_name_ru=$4,aliases=$5::text[],short_scope_ru=$6,
      key_distinguishing_parameters=$7::jsonb,required_inputs_count=$8,
      clarification_fields=$9::jsonb,included_boundaries=$10::jsonb,excluded_boundaries=$11::jsonb,
      normalized_canonical_name=$12,normalized_aliases=$13::text[],normalized_search_terms=$14::text[],
      normalized_search_blob=$15,definition_release_id=$2,definition_version_id=$16,
      source_provenance=source_provenance||$17::jsonb,
      document_sha256=encode(extensions.digest(convert_to(
        $4||':'||$2::uuid::text||':'||$16::uuid::text||':'||$18,'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$19`, [
    input.searchReleaseId,
    input.releaseId,
    config.search.primaryUom,
    config.search.canonicalNameRu,
    aliases,
    config.search.shortScopeRu,
    JSON.stringify(config.search.keyDistinguishingParameters),
    config.search.keyDistinguishingParameters.length,
    JSON.stringify(config.search.clarificationFields),
    JSON.stringify(config.search.includedBoundaries),
    JSON.stringify(config.search.excludedBoundaries),
    normalizedName,
    normalizedAliases,
    searchTerms,
    searchTerms.join(" "),
    input.definitionId,
    JSON.stringify({
      contract: config.contract,
      knownWorkScopeFirstEstimate: true,
      conditionalTechnologyFailClosed: true,
      activationAllowed: false,
      productionEligible: false,
      ...config.search.sourceProvenance,
    }),
    input.fingerprint,
    config.catalogId,
  ]);
    invariant(updated.rowCount === 1, stop(config, "SEARCH_TARGET_UPDATE"));
  }

  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    global_count=$4,metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({
      documentCount: snapshot.documents,
      visibleCount: snapshot.visible,
      masterSingleDefinitionTargetCount: 1,
      masterSingleDefinitionCatalogId: config.catalogId,
      measuredGeometryCatalogPolicy:CANONICAL_PUBLIC_CATALOG_VISIBILITY_V1,
    }),
    snapshot.documents,
  ]);
  return snapshot;
}

async function auditState(
  client: Client,
  config: MasterSingleDefinitionSuccessorConfig,
  releaseId: string,
  searchReleaseId: string,
  definitionId: string,
): Promise<Json> {
  const release = (await client.query(`select id::text,status,activated_at,definition_count,
      parameter_count,formula_count,resource_row_count,source_manifest_sha256
    from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json;
  const manifest = (await client.query(`select count(*)::int identities,
      count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [
    releaseId, config.catalogId, definitionId,
  ])).rows[0] as Json;
  const target = (await client.query(`select manifest.catalog_id,manifest.definition_version_id::text,
      manifest.source_batch,manifest.runtime_publication_state,definition.definition_version,
      definition.content_status,definition.content_gate_status,passport.decision,
      (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameters,
      (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formulas,
      (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resources
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    where manifest.release_id=$1 and manifest.catalog_id=$2`, [
    releaseId, config.catalogId,
  ])).rows[0] as Json;
  const resourceRows = (await client.query(`select row_id,title_ru
    from public.estimate_resource_spec where definition_version_id=$1 order by ordinal`, [
    definitionId,
  ])).rows as Json[];
  const forbiddenAdjacentRows = resourceRows.filter((row) =>
    config.forbiddenAdjacentMatchers.some((matcher) => {
      matcher.lastIndex = 0;
      return matcher.test(`${row.row_id} ${row.title_ru}`);
    }));
  const search = (await client.query(`select release.status release_status,document.catalog_id,
      document.canonical_name_ru,document.primary_uom,document.definition_release_id::text,
      document.definition_version_id::text,document.selectable,document.adjudication_class,
      (select count(*)::int from public.estimate_search_document d where d.search_release_id=$1) documents,
      release.snapshot_sha256
    from public.estimate_search_index_release release
    join public.estimate_search_document document on document.search_release_id=release.id
    where release.id=$1 and document.catalog_id=$2`, [
    searchReleaseId, config.catalogId,
  ])).rows[0] as Json;
  const identity = (await client.query(`select catalog_id,namespace,domain,source_identity,work_key,
      title_ru,denominator_eligible,canonical_owner,retired_at
    from public.estimate_work_identity where catalog_id=$1`, [config.catalogId])).rows[0] as Json | undefined;
  const searchPlacement = config.catalogAppend == null ? null : (await client.query(`select
      membership.group_id,membership.ordinal,membership.independent_disposition,
      search_group.group_name_ru,search_group.domain_id,search_group.system_id,
      search_group.subsystem_id,search_group.assembly_id,search_group.work_family_id,
      search_group.breadcrumb,search_group.member_count,search_group.member_set_sha256,
      search_group.oracle_disposition,
      (select jsonb_agg(member.catalog_id order by member.ordinal,member.catalog_id)
        from public.estimate_search_group_membership member
        where member.search_release_id=membership.search_release_id
          and member.group_id=membership.group_id) member_catalog_ids
    from public.estimate_search_group_membership membership
    join public.estimate_search_group search_group
      on search_group.search_release_id=membership.search_release_id
      and search_group.group_id=membership.group_id
    where membership.search_release_id=$1 and membership.catalog_id=$2`, [
    searchReleaseId,
    config.catalogId,
  ])).rows[0] as Json | undefined;
  return {
    release,
    manifest,
    target: { ...target, forbidden_adjacent_rows: forbiddenAdjacentRows.length },
    search,
    identity,
    searchPlacement,
  };
}

export function buildMasterCapabilityMatrix(unresolvedRows: readonly string[] | undefined, resources: readonly Json[], partialBasis?: MasterTypedPartialQuantityBasisR1): Json[] {
  if(partialBasis!=null){
    if(unresolvedRows!=null)throw new Error('MASTER_TYPED_QUANTITY_CANNOT_MASK_MISSING_APPLICATION_NORMS');
    return [{capability:'PARAMETERS',status:'GREEN'},{capability:'FORMULAS_AND_PHYSICAL_PARITY',status:'GREEN'},
      masterTypedPartialQuantityCapabilityR1(partialBasis,resources),{capability:'PRICE',status:'GREEN_UNKNOWN_IS_NULL'}];
  }
  if (unresolvedRows != null && (unresolvedRows.length === 0
    || new Set(unresolvedRows).size !== unresolvedRows.length
    || unresolvedRows.some(id => !resources.some(resource => resource.row_id === id)))) {
    throw new Error('MASTER_LIMITED_SCOPE_REQUIRES_EXISTING_UNRESOLVED_RESOURCES');
  }
  return [
    { capability: 'PARAMETERS', status: 'GREEN' },
    { capability: 'FORMULAS_AND_PHYSICAL_PARITY', status: 'GREEN' },
    { capability: 'FULL_APPLICABLE_SCOPE', status: unresolvedRows == null ? 'GREEN' : 'NEEDS_SOURCE',
      ...(unresolvedRows == null ? {} : { unresolvedResourceRowIds: [...unresolvedRows], preliminaryCompositionOnly: true }) },
    { capability: 'PRICE', status: 'GREEN_UNKNOWN_IS_NULL' },
  ];
}

export function buildMasterScopeReadiness(unresolvedRows: readonly string[] | undefined, resources: readonly Json[], partialBasis?: MasterTypedPartialQuantityBasisR1): Json {
  if(partialBasis!=null){
    if(unresolvedRows!=null)throw new Error('MASTER_TYPED_QUANTITY_CANNOT_MASK_MISSING_APPLICATION_NORMS');
    return masterTypedPartialQuantityReadinessR1(partialBasis,resources);
  }
  const scope = buildMasterCapabilityMatrix(unresolvedRows, resources)[2]!;
  return scope.status === 'GREEN' ? { quantityScope: 'FULL' } : {
    quantityScope: 'PARTIAL', technicalScopeStatus: 'NEEDS_SOURCE',
    preliminaryCompositionOnly: true, unresolvedResourceRowIds: scope.unresolvedResourceRowIds,
  };
}

/** The same pure validator runs here and on the final publisher plan. */
export function validateMasterTypedPartialQuantityPreparationR1(config: Pick<MasterSingleDefinitionSuccessorConfig,
  'binding'|'parameterDefinitions'|'formulaDefinitions'|'resourceDefinitions'|'acceptanceInput'
  |'runtimeProfileInput'|'runtimeProfileClassification'|'runtimeProfileSourceIds'> & Partial<Pick<MasterSingleDefinitionSuccessorConfig,
    'contract'|'stopCode'|'catalogId'|'parentReleaseId'|'sourceId'|'normId'|'sourceMetadata'|'locator'|'catalogAppend'
    |'projectSourcePackagePath'|'capturedScopedNormativeRegistry'>> & Readonly<{
    passport:Pick<MasterSingleDefinitionSuccessorConfig['passport'],'partialQuantityBasis'|'unresolvedApplicableResourceRowIds'>;
  }>): string[] {
  if(!Object.hasOwn(config.passport,'partialQuantityBasis'))return [];
  const basis=config.passport.partialQuantityBasis;if(basis==null)return ['TYPED_PARTIAL_QUANTITY_OBJECT'];
  const mixed=config.passport.unresolvedApplicableResourceRowIds==null?[]:['MASTER_TYPED_QUANTITY_CANNOT_MASK_MISSING_APPLICATION_NORMS'];
  const retained=config.binding.retainParentBindings,values={...config.acceptanceInput,...config.runtimeProfileInput};
  const registry=config.binding.reuseExistingNormativeRegistry;
  if(retained&&registry){
    if(Object.hasOwn(config.binding,'ordinaryCompositeSourceV1'))mixed.push('TYPED_QUANTITY_ORDINARY_RETAINED_CONFLICT');
    try{assertMasterTypedPartialQuantityRegistryR1(basis,{newSources:[registry.source],newLocators:registry.locators});}
    catch(error){mixed.push(String((error as Error).message));}
  }else if(retained&&!registry&&!Object.hasOwn(config.binding,'ordinaryCompositeSourceV1')){
    try{
      invariant(basis.kind==='DEFERRED_PROJECT_QUANTITIES'&&config.catalogAppend==null&&config.projectSourcePackagePath==null
        &&config.sourceMetadata?.source_kind==='PROJECT_SYSTEM','TYPED_QUANTITY_RETAINED_MANAGED_DEFERRED_SCOPE');
      invariant([config.contract,config.stopCode,config.catalogId,config.parentReleaseId,config.sourceId,config.normId].every(value=>
        typeof value==='string'&&value.length>0)&&config.locator!=null,'TYPED_QUANTITY_RETAINED_MANAGED_CONFIG');
      const candidate=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config as MasterSingleDefinitionSuccessorConfig,
        {projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
      const captured=masterRetainParentBindingsOptInR1(candidate);
      invariant(captured!=null,'TYPED_QUANTITY_RETAINED_MANAGED_PARENT_REQUIRED');
      const scoped=resolveMasterScopedNormativeRegistryOptInR1(candidate);
      invariant(scoped!=null,'TYPED_QUANTITY_RETAINED_MANAGED_FRESH_SCOPED_PREIMAGE_REQUIRED');
      const oldIds=new Set(captured.capturedParent.resources.map(row=>row.row_id));
      const newIds=config.resourceDefinitions.filter(row=>!oldIds.has(row.row_id)).map(row=>row.row_id);
      const ids=resolveMasterSingleDefinitionBindingRowIds(config,config.resourceDefinitions,[basis.source.locatorId]);
      invariant(newIds.length>0&&ids.length===newIds.length&&newIds.every(id=>ids.includes(id)),
        'TYPED_QUANTITY_RETAINED_MANAGED_EXACT_NEW_RESOURCE_BINDINGS');
      assertMasterTypedPartialQuantityRegistryR1(basis,{newSources:[candidate.newSource],newLocators:candidate.newLocators});
    }catch(error){mixed.push(String((error as Error).message));}
  }else if(!retained&&!registry&&Object.hasOwn(config.binding,'ordinaryCompositeSourceV1')){
    try{
      invariant(basis.kind==='DEFERRED_PROJECT_QUANTITIES'&&config.catalogAppend==null&&config.projectSourcePackagePath==null
        &&config.sourceMetadata?.source_kind==='PROJECT_SYSTEM','TYPED_QUANTITY_ORDINARY_DEFERRED_SCOPE');
      invariant([config.contract,config.stopCode,config.catalogId,config.parentReleaseId,config.sourceId,config.normId].every(value=>
        typeof value==='string'&&value.length>0)&&config.locator!=null,
        'TYPED_QUANTITY_ORDINARY_MANAGED_CONFIG');
      const candidate=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config as MasterSingleDefinitionSuccessorConfig,
        {projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
      const scoped=resolveMasterScopedNormativeRegistryOptInR1(candidate);
      invariant(scoped!=null,'TYPED_QUANTITY_ORDINARY_FRESH_SCOPED_PREIMAGE_REQUIRED');
      const ids=resolveMasterSingleDefinitionBindingRowIds(config,config.resourceDefinitions,[basis.source.locatorId]);
      invariant(ids.length===config.resourceDefinitions.length,'TYPED_QUANTITY_ORDINARY_EXACT_RESOURCE_BINDINGS');
      assertMasterTypedPartialQuantityRegistryR1(basis,{newSources:[candidate.newSource],newLocators:candidate.newLocators});
    }catch(error){mixed.push(String((error as Error).message));}
  }else mixed.push('TYPED_QUANTITY_REGISTERED_RETAINED_SOURCE_REQUIRED');
  const sourceIds=Object.fromEntries(config.parameterDefinitions.map(p=>[p.parameter_id,
    retained?.newParameterSources[p.parameter_id]?.sourceIds??retained?.capturedParent.baseline.normative_source_ids?.[p.parameter_id]
      ??config.runtimeProfileSourceIds?.[p.parameter_id]??(config.binding.ordinaryCompositeSourceV1!=null&&config.sourceId?[config.sourceId]:[])]));
  return [...mixed,...validateMasterTypedPartialQuantityBasisR1({parameters:config.parameterDefinitions,formulas:config.formulaDefinitions,resources:config.resourceDefinitions,
    baseline:{input_values:values,input_classification:Object.fromEntries(config.parameterDefinitions.map(p=>[p.parameter_id,
      config.runtimeProfileClassification?.[p.parameter_id]??'VALIDATION_FIXTURE'])),normative_source_ids:sourceIds},
    passport:{decision:buildMasterScopeReadiness(undefined,config.resourceDefinitions,basis),
      capability_matrix:buildMasterCapabilityMatrix(undefined,config.resourceDefinitions,basis)}})];
}

function masterSuccessorIndependentCompositionR1(config:MasterSingleDefinitionSuccessorConfig):unknown{
 const retained=config.binding.retainParentBindings;
 const captured=retained?.operationCompositionOnly?.capturedContentPassport
  ??retained?.projectScopeMetadataOnlyV1?.capturedContentPassport??retained?.truthAuthorityOnlyV1?.capturedContentPassport
  ??retained?.monolithicRepairGeometryVisibilityOnlyR60?.capturedContentPassport;
 return config.passport.independentCompletenessMap??captured?.decision?.independentCompletenessMap;
}

export async function runMasterSingleDefinitionSuccessorR1(
  config: MasterSingleDefinitionSuccessorConfig,
): Promise<void> {
  assertCanonicalNewWorkCatalogIdV1(config.catalogId);
  const admissionCompletenessMap=masterSuccessorIndependentCompositionR1(config);
  const operationReferenceErrors=validateIndependentCompletenessMapReferences({completenessMap:admissionCompletenessMap,
    formulaDefinitions:config.formulaDefinitions,resourceDefinitions:config.resourceDefinitions,requireOperationBindings:true});
  invariant(operationReferenceErrors.length===0,`${stop(config,'NEW_SUCCESSOR_INDEPENDENT_COMPOSITION')}:${operationReferenceErrors.join(',')}`);
  assertCanonicalPublisherSuccessorOperationResourcesR1({catalogId:config.catalogId,
    resourceDefinitions:config.resourceDefinitions,parameterDefinitions:config.parameterDefinitions,independentComposition:admissionCompletenessMap});
  const typedQuantityErrors=validateMasterTypedPartialQuantityPreparationR1(config);
  invariant(typedQuantityErrors.length===0,`${stop(config,'TYPED_QUANTITY_PREFLIGHT')}:${typedQuantityErrors.join(',')}`);
  const apply = process.argv.includes("--apply");
  const allowHashedDirtySource = process.env.R4A13_ALLOW_HASHED_DIRTY_SOURCE === "true";
  const sourcePathsForIdentity = [...new Set([
    ...config.sourcePaths,
    ...(config.passport.partialQuantityBasis==null&&!config.binding.retainParentBindings?.operationCompositionOnly?.capturedContentPassport.decision?.partialQuantityBasis?[]:['scripts/estimate/r4a13/masterTypedPartialQuantityBasisR1.ts']),
    'src/lib/estimate/backendPlatform/canonicalPublicCatalogVisibilityV1.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts',
    'src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1.ts',
    'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
    ...(config.catalogAppend == null && config.binding.additionalRowIds == null ? [] : [
      "scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts",
    ]),
    ...(Object.hasOwn(config.binding,"retainParentBindings")
      ?["scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts"]:[]),
    ...(config.binding.retainParentBindings?.operationCompositionOnly?['scripts/estimate/r4a13/masterOperationCompositionOnlyR1.ts']:[]),
    ...(Object.hasOwn(config.binding,"reuseExistingNormativeRegistry")
      ?["src/lib/estimate/estimateDeterministicHash.ts"]:[]),
    "scripts/estimate/r4a13/projectSourcePackageBindingR1.ts",
    "scripts/estimate/r4a13/projectSourcePackagePreflightR1.ts",
  ])];
  exactDatabaseGuard(config);
  invariant(git("branch", "--show-current") === config.expectedBranch, stop(config, "BRANCH_DRIFT"));
  invariant(existsSync(config.masterPath)
    && sha256(readFileSync(config.masterPath)) === config.masterSha256,
  stop(config, "MASTER_SHA256_DRIFT"));
  const dirtySourcePaths = sourcePathsForIdentity.filter((path) =>
    git("status", "--short", "--", path) !== "");
  invariant(dirtySourcePaths.length === 0 || allowHashedDirtySource,
    `${stop(config, "DIRTY_SOURCE_REQUIRES_EXPLICIT_OPT_IN")}:${dirtySourcePaths.join(",")}`);
  for (const path of sourcePathsForIdentity) {
    invariant(existsSync(resolve(path)), `${stop(config, "SOURCE_MISSING")}:${path}`);
  }
  assertCanonicalPublisherParameterOrdinalsUniqueR1(config.parameterDefinitions);
  const formulaConsistencyErrors = validateMasterFormulaGraphConsistency(
    config.formulaDefinitions,
  );
  invariant(formulaConsistencyErrors.length === 0,
    `${stop(config, "FORMULA_GRAPH_DRIFT")}:${formulaConsistencyErrors.join(",")}`);

  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = sourcePathsForIdentity.map((path) => ({
    path,
    sha256: sha256(readFileSync(resolve(path))),
    trackedState: git("status", "--short", "--", path) || "CLEAN_AT_HEAD",
  }));
  const coreAcceptance = await config.verifyCore();
  const append = config.catalogAppend;
  if (append != null) {
    invariant(append.identity.domain === append.searchPlacement.domainId,
      stop(config, "APPEND_IDENTITY_DOMAIN_DRIFT"));
    invariant(append.identity.sourceIdentity.trim().length > 0
      && append.identity.workKey.trim().length > 0
      && append.identity.titleRu.trim().length > 0,
    stop(config, "APPEND_IDENTITY_INCOMPLETE"));
    invariant(append.searchPlacement.groupId.trim().length > 0
      && append.searchPlacement.groupNameRu.trim().length > 0
      && append.searchPlacement.breadcrumb.length > 0
      && append.searchPlacement.membershipOrdinal >= 0
      && Number.isInteger(append.searchPlacement.membershipOrdinal),
    stop(config, "APPEND_SEARCH_PLACEMENT_INCOMPLETE"));
  }
  const operationOnly=config.binding.retainParentBindings?.operationCompositionOnly;
  const projectScopeOnly=config.binding.retainParentBindings?.projectScopeMetadataOnlyV1;
  const authorityOnly=config.binding.retainParentBindings?.truthAuthorityOnlyV1;
  const repairVisibilityOnly=config.binding.retainParentBindings?.monolithicRepairGeometryVisibilityOnlyR60;
  const metadataOnlyPassport=operationOnly?.capturedContentPassport??projectScopeOnly?.capturedContentPassport??authorityOnly?.capturedContentPassport??repairVisibilityOnly?.capturedContentPassport;
  const operationParent=metadataOnlyPassport?config.binding.retainParentBindings!.capturedParent:null;
  const parameterRows: Json[] = config.parameterDefinitions.map((parameter) => ({ ...parameter }));
  const formulaRows: Json[] = config.formulaDefinitions.map((formula) => ({
    ...formula,
    ast_sha256: config.binding.retainParentBindings?.capturedParent.formulas
      .some(row=>row.formula_id===formula.formula_id)?formula.ast_sha256:sha256(formula.ast),
  }));
  const resourceRows: Json[] = buildMasterPublicationResourceRowsR1(config.resourceDefinitions);
  const explicitAppendParameterSources = resolveMasterAppendExplicitParameterSourcesR1(config, {
    parameters: parameterRows, formulas: formulaRows, resources: resourceRows,
  });
  const parameterSchemaSha256 = sha256(parameterRows);
  const definitionSchemaSha256 = sha256({ formulaRows, resourceRows });
  const targetDefinitionSha256 = sha256({
    contract: config.contract,
    catalogId: config.catalogId,
    parameterSchemaSha256,
    definitionSchemaSha256,
  });
  const configuredProjectSourcePackagePath = config.projectSourcePackagePath?.trim() || undefined;
  const s279PackageRole: S279ProjectSourcePackageRole | null =
    config.sourceId === S279_ADDRESSABLE_SOURCE_KEY
      ? "ADDRESSABLE_FIRE_ALARM"
      : config.sourceId === S279_SPRINKLER_SOURCE_KEY
        ? "SPRINKLER_SYSTEM"
        : null;
  const projectSourcePackageSet = s279PackageRole == null
    ? null
    : verifyS279CompleteProjectSourcePackageSetForSuccessor({
      packageRole: s279PackageRole,
      targetManifestPath: configuredProjectSourcePackagePath,
      addressableManifestPath: process.env.S279_ADDRESSABLE_PROJECT_SOURCE_PACKAGE_PATH,
      sprinklerManifestPath: process.env.S279_SPRINKLER_PROJECT_SOURCE_PACKAGE_PATH,
    });
  const projectSourcePackage = configuredProjectSourcePackagePath == null
    ? null
    : loadVerifiedProjectSourcePackageBinding({
      manifestPath: configuredProjectSourcePackagePath,
      expectedSourceKey: config.sourceId,
      expectedCatalogId: config.catalogId,
      expectedDefinitionSha256: targetDefinitionSha256,
      expectedRowId: config.binding.rowId,
    });
  invariant(projectSourcePackageSet == null
    || projectSourcePackage?.packagePayloadSha256
      === projectSourcePackageSet.targetPackagePayloadSha256,
  stop(config, "PROJECT_SOURCE_COMPLETE_SET_TARGET_DRIFT"));
  const { resolvedSourceMetadata, resolvedLocators, registrySourceMetadata, existingRegistryReuse, retentionCandidate } =
    assembleMasterSingleDefinitionManagedRegistryCandidateR1(config, { projectSourcePackage, projectSourcePackageSet });
  const runtimeProfileInput = { ...(config.runtimeProfileInput ?? {}) };
  const runtimeProfileClassification = { ...(config.runtimeProfileClassification ?? {}) };
  const runtimeProfileSourceIds = Object.fromEntries(Object.entries(
    config.runtimeProfileSourceIds ?? {},
  ).map(([parameterId, sourceIds]) => [parameterId, [...sourceIds]]));
  invariant(Object.keys(runtimeProfileInput).every((parameterId) =>
    parameterRows.some((parameter) => parameter.parameter_id === parameterId)
      && JSON.stringify(config.acceptanceInput[parameterId]) === JSON.stringify(runtimeProfileInput[parameterId])
      && runtimeProfileClassification[parameterId] != null
      && Array.isArray(runtimeProfileSourceIds[parameterId])
      && (runtimeProfileClassification[parameterId] !== "NORMATIVE"
        || runtimeProfileSourceIds[parameterId]!.length > 0)
      && runtimeProfileSourceIds[parameterId]!.every((sourceId) => nonEmptyText(sourceId))),
  stop(config, "RUNTIME_PROFILE_INPUT_DRIFT"));
  invariant(Object.keys(runtimeProfileClassification).every((parameterId) =>
    Object.hasOwn(runtimeProfileInput, parameterId)),
  stop(config, "RUNTIME_PROFILE_CLASSIFICATION_ORPHAN"));
  invariant(Object.keys(runtimeProfileSourceIds).every((parameterId) =>
    Object.hasOwn(runtimeProfileInput, parameterId)),
  stop(config, "RUNTIME_PROFILE_SOURCE_ORPHAN"));
  const completenessErrors = validateIndependentCompletenessMapReferences({
    completenessMap: admissionCompletenessMap,formulaDefinitions: formulaRows,resourceDefinitions: resourceRows,
    requireOperationBindings:true,
  });
  invariant(completenessErrors.length === 0,
    `${stop(config, "INDEPENDENT_COMPLETENESS_MAP")}:${completenessErrors.join(",")}`);
  assertCanonicalPublisherSuccessorOperationResourcesR1({catalogId:config.catalogId,
    resourceDefinitions:resourceRows,parameterDefinitions:parameterRows,independentComposition:admissionCompletenessMap});
  const { formulaConsumers, resourceConsumers } = buildMasterParameterCalculationConsumers({
    parameters: parameterRows, formulas: formulaRows, resources: resourceRows,
  });
  invariant(parameterRows.every((parameter) => resourceConsumers[parameter.parameter_id]!.length > 0
    || isMasterRetainedRetiredUnusedParameterR1(config.binding.retainParentBindings, parameter,
      {parameters: parameterRows, formulas: formulaRows, resources: resourceRows})),
    stop(config, "PARAMETER_WITHOUT_RESOURCE_CONSUMER"));

  const sourceEnvelope = {
    contract: config.contract,
    head,
    tree,
    masterSha256: config.masterSha256,
    parentReleaseId: config.parentReleaseId,
    parentSearchReleaseId: config.parentSearchReleaseId,
    sourceHashes,
    parameters: parameterRows,
    formulas: formulaRows,
    resources: resourceRows,
    runtimeProfileInput,
    runtimeProfileClassification,
    runtimeProfileSourceIds,
    sourceId: config.sourceId,
    normId: config.normId,
    sourceMetadata: resolvedSourceMetadata,
    passport: config.passport,
    applicability: config.applicability,
    binding: config.binding,
    locators: resolvedLocators,
    projectSourcePackage,
    projectSourcePackageSet,
    search: config.search,
    catalogAppend: append,
    validationScenario: config.validationScenario,
    coreAcceptance,
  };
  const sourceOrigin = buildCanonicalMasterSingleDefinitionSourceOriginR1({ catalogId: config.catalogId, envelope: sourceEnvelope });
  invariant(sourceOrigin, stop(config, "SOURCE_ORIGIN_ENVELOPE_INVALID"));
  const fingerprint = sourceOrigin.fingerprint;
  const releaseId = uuid(`${config.contract}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${config.contract}:${fingerprint}:search-release`);
  const definitionId = uuid(`${config.contract}:${fingerprint}:definition`);
  const baselineId = uuid(`${config.contract}:${fingerprint}:baseline`);
  if(existingRegistryReuse?.declaration.locatorExcerptHashKind==='REVIEWED_NORM_PACK_ITEM_SHA256_R1'){
    for(const p of [existingRegistryReuse.declaration.reviewedNormPack!.artifactPath,'scripts/estimate/r4a13/masterReviewedNormPackRegistryReuseR1.ts'])
      invariant(config.sourcePaths.some(item=>resolve(item)===resolve(p)),stop(config,'REVIEWED_NORM_PACK_PROOF_MUST_BE_FINGERPRINTED'));
  }
  const additionalRegistryReuse=resolveMasterAdditionalCapturedExistingRegistryV1(retentionCandidate);
  const sourceId=String(retentionCandidate.newSource.id);
  const locatorIds=retentionCandidate.newLocators.map(locator=>String(locator.id));
  const retentionInput=masterRetainParentBindingsOptInR1(retentionCandidate)==null?null:retentionCandidate;
  const scopedRegistryInput=resolveMasterScopedNormativeRegistryOptInR1(retentionCandidate);
  if(scopedRegistryInput!=null)invariant(config.sourcePaths.some(p=>resolve(p)===resolve(
    "scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts")),
    stop(config,"SCOPED_REGISTRY_HELPER_MUST_BE_FINGERPRINTED"));
  const releaseKey = `${config.contract}:${fingerprint.slice(0, 20)}`;
  const current = JSON.parse(readFileSync(config.currentReleasePath, "utf8")) as Json;
  invariant(current.productionAccessed === false, stop(config, "CURRENT_PRODUCTION_ACCESS_FLAG"));
  invariant(
    (current.definitionReleaseId === config.parentReleaseId
      && current.searchReleaseId === config.parentSearchReleaseId)
    || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    `${stop(config, "POINTER_DRIFT")}:${current.definitionReleaseId}:${current.searchReleaseId}`,
  );

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: config.applicationName,
    options: '-c TimeZone=UTC',
  });
  await client.connect();
  let receipt: Json;
  let runtimeAdmissionMetadata: Readonly<Record<string, unknown>> = {};
  try {
    const parent = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [config.parentReleaseId],
    )).rows[0] as Json | undefined;
    invariant(parent?.status === "prepared" && parent.activated_at == null,
      stop(config, "PARENT_NOT_PREPARED_INACTIVE"));
    const parentSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [config.parentSearchReleaseId],
    )).rows[0] as Json | undefined;
    invariant(parentSearch?.status === "draft", stop(config, "PARENT_SEARCH_NOT_DRAFT"));
    const old = (await client.query(`select manifest.*,
        definition.definition_version,definition.source_metadata,
        (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameters,
        (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formulas,
        (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resources
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [
      config.parentReleaseId, config.catalogId,
    ])).rows[0] as Json | undefined;
    if (append == null) {
      invariant(old
        && Number(old.parameters) === config.expectedParentShape[0]
        && Number(old.formulas) === config.expectedParentShape[1]
        && Number(old.resources) === config.expectedParentShape[2],
      `${stop(config, "PARENT_TARGET_SHAPE")}:${JSON.stringify(old)}`);
    } else {
      invariant(old == null, `${stop(config, "APPEND_PARENT_ALREADY_HAS_TARGET")}:${config.catalogId}`);
    }
    await config.verifyTargetPrecondition?.(client, "PREFLIGHT");
    const lineage = append == null
      ? await resolveCanonicalApprovedBaselineLeaf(
        client,
        String(old!.approved_template_baseline_id),
        config.catalogId,
      )
      : {
        rootBaselineId: null,
        baselineId: null,
        definitionVersionId: definitionId,
        acceptedReleaseId: releaseId,
        depth: 0,
        path: [] as string[],
        newIdentityRoot: true,
      };
    const catalogDefinitionCount = Number((await client.query(
      "select count(*)::int value from public.estimate_definition_version where catalog_id=$1",
      [config.catalogId],
    )).rows[0].value);
    invariant(append == null || catalogDefinitionCount === 0,
      `${stop(config, "APPEND_DEFINITION_HISTORY_COLLISION")}:${catalogDefinitionCount}`);
    const nextDefinitionVersion = Number((await client.query(
      "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
      [config.catalogId],
    )).rows[0].value);
    const retiredArea = await readMasterAreaRetirementCountsR575(client,config.parentReleaseId);
    const activeParentCounts=resolveMasterActiveParentCountsR575({definitions:Number(parent.definition_count),
      parameters:Number(parent.parameter_count),formulas:Number(parent.formula_count),resources:Number(parent.resource_row_count)},retiredArea);
    const nextCounts = resolveMasterSingleDefinitionNextCounts({
      parent: activeParentCounts,
      previousTarget: append == null ? {
        parameters: Number(old!.parameters),
        formulas: Number(old!.formulas),
        resources: Number(old!.resources),
      } : null,
      nextTarget: {
        parameters: parameterRows.length,
        formulas: formulaRows.length,
        resources: resourceRows.length,
      },
    });
    const existingIdentity = (await client.query(`select catalog_id,namespace,domain,source_identity,
        work_key,title_ru,denominator_eligible,canonical_owner,retired_at
      from public.estimate_work_identity where catalog_id=$1`, [config.catalogId])).rows[0] as Json | undefined;
    const compositeSourceGuardInput = config.binding.additionalRowIds == null ? null : {
      config,
      successorReleaseId: releaseId,
      successorSearchReleaseId: searchReleaseId,
      compositeSourceArtifactSha256: String(resolvedSourceMetadata.artifact_sha256 ?? ""),
    };
    const appendGuardInput = append == null ? null : {
      config,
      successorReleaseId: releaseId,
      successorSearchReleaseId: searchReleaseId,
      compositeSourceArtifactSha256: compositeSourceGuardInput?.compositeSourceArtifactSha256 ?? null,
    };
    const appendPreflight = appendGuardInput == null ? null
      : await readMasterSingleDefinitionAppendPreconditionsR1(client, appendGuardInput);
    const retentionPreflight=retentionInput==null?null
      :await readMasterRetainedBindingPreconditionsR1(client,retentionInput);
    assertMasterExistingNormativeRegistrySnapshotR1(existingRegistryReuse,retentionPreflight);
    const scopedRegistryPreflight=scopedRegistryInput==null?null
      :await readMasterScopedNormativeRegistryPreconditionsR1(client,scopedRegistryInput);
    if (appendGuardInput != null && appendPreflight != null) {
      assertMasterSingleDefinitionAppendParentAnchorR1(
        appendGuardInput, appendPreflight, parent!, parentSearch!,
      );
    }
    const acceptanceEvidenceSha256 = sha256({
      contract: config.contract,
      ...(scopedRegistryInput==null?{}:{scopedNormativeRegistryCaptureSha256:scopedRegistryInput.declaration.captureSha256}),
      shortInput: config.shortInput,
      acceptanceInput: config.acceptanceInput,
      runtimeProfileInput,
      runtimeProfileClassification,
      runtimeProfileSourceIds,
      independentCompletenessMap: config.passport.independentCompletenessMap,
      coreAcceptance,
      parameterSchemaSha256,
      definitionSchemaSha256,
      lineage,
    });
    const baselineRepresentative = operationParent?{...operationParent.baseline,parameter_schema_sha256:parameterSchemaSha256}:{
      parameter_schema_sha256: parameterSchemaSha256,
      input_values: { ...config.acceptanceInput, ...runtimeProfileInput },
      input_classification: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id,
        resolveMasterRetainedBaselineInputClassificationR1(parameter.parameter_id,
          runtimeProfileClassification, config.binding.retainParentBindings),
      ])),
      uom_by_parameter: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id, parameter.unit_id,
      ])),
      formula_consumer_ids: formulaConsumers,
      resource_consumer_row_ids: resourceConsumers,
      normative_source_ids: explicitAppendParameterSources ?? Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id,
        Object.keys(runtimeProfileInput).length === 0
          ? [config.sourceId]
          : runtimeProfileSourceIds[parameter.parameter_id]
            ?? (config.binding.ordinaryCompositeSourceV1 != null ? [config.sourceId] : []),
      ])),
      guide_provenance_ru: Object.fromEntries(parameterRows.map((parameter) => [
        parameter.parameter_id,
        parameter.truth_metadata.visibility_role === "INTERNAL_ONLY"
          && parameter.truth_metadata.effective_resource_quantity_v1 != null
          && parameter.truth_metadata.guide == null
          ? "Внутренний расчётный выход принятого количества строки; первичный ввод и нормативный источник не подставляются."
          : String((parameter.truth_metadata.guide as Json).guide_short_ru),
      ])),
      proposal_source_refs: [{
        contract: config.contract,
        sourceId: config.sourceId,
        sourceKind: resolvedSourceMetadata.source_kind ?? "PROJECT_DOCUMENTATION_REQUIRED",
        exactLocator: resolvedSourceMetadata.exact_locator,
        ...(projectSourcePackage == null ? {} : {
          projectSourcePackageSha256: projectSourcePackage.packagePayloadSha256,
        }),
      }],
      contract_version: BASELINE_CONTRACT,
    };
    const normativeBindingRowIds = operationOnly||projectScopeOnly||authorityOnly||repairVisibilityOnly?[]:resolveMasterSingleDefinitionBindingRowIds(config, resourceRows, locatorIds);
    const normativeApplicabilityByRowId = operationOnly||projectScopeOnly||authorityOnly||repairVisibilityOnly?{}:resolveMasterSingleDefinitionBindingApplicabilityByRowId(config, resourceRows, locatorIds);
    const additionalRowLocatorMap=masterAdditionalCapturedExistingRegistryV1(retentionCandidate)?.rowLocatorIds;
    const newNormativeBindings=additionalRegistryReuse==null?normativeBindingRowIds.flatMap(rowId=>locatorIds.map(locatorId=>({
      row_id:rowId,locator_id:locatorId,applicability:normativeApplicabilityByRowId[rowId],
    }))):normativeBindingRowIds.map(rowId=>({row_id:rowId,locator_id:additionalRowLocatorMap&&Object.hasOwn(additionalRowLocatorMap,rowId)
      ?additionalRowLocatorMap[rowId]:locatorIds[0]!,applicability:normativeApplicabilityByRowId[rowId]}));
    const ct126RetainedMigration=config.binding.ct126PreparedWallMigrationR2===true
      ?await import('../../../src/lib/estimate/backendPlatform/canonicalCt126SixDryWallMigrationS2769'):null;
    invariant(config.binding.ct126PreparedWallMigrationR2==null||config.binding.ct126PreparedWallMigrationR2===true,
      stop(config,'CT126_R2_MIGRATION_OPT_IN'));
    const ct126Parent=config.binding.retainParentBindings?.capturedParent;
    invariant(!ct126RetainedMigration||(ct126Parent!=null&&config.contract==='rik-expo-app.s27-69.ct126-four-prepared-wall-branches.r2'),
      stop(config,'CT126_R2_RETAINED_PARENT_REQUIRED'));
    const ct126Proof=ct126RetainedMigration&&ct126Parent?ct126RetainedMigration.buildCt126SixDryWallMigrationProofS2769({
      fromDefinition:{id:ct126Parent.definition.id,catalogId:config.catalogId,sha256:ct126Parent.definition.definition_sha256},
      toDefinition:{id:definitionId,catalogId:config.catalogId,sha256:targetDefinitionSha256},from:ct126Parent,
      to:{parameters:parameterRows.map(p=>({...p,truth_metadata:{...p.truth_metadata,contract:config.contract,
        semantic_parameter_key:`${config.catalogId}:${p.parameter_id}`,formula_consumers:formulaConsumers[p.parameter_id],resource_branch_consumers:resourceConsumers[p.parameter_id]}})),
        formulas:formulaRows,resources:resourceRows}}):null;
    invariant(ct126Proof==null||ct126Proof.contractVersion==='canonical-ct126-six-dry-wall-migration/r2',stop(config,'CT126_R2_EXACT_PROOF_REQUIRED'));
    const retainedRepresentative=retentionInput==null?null:prepareMasterRetainedBindingRepresentativeR1(retentionInput,{
      parameters:parameterRows,formulas:formulaRows,resources:resourceRows,newBindings:newNormativeBindings,
      successorProvenance:{contract:config.contract,sourceId:config.sourceId,normId:config.normId,
        parentDefinitionId:old!.definition_version_id,parentBaselineId:old!.approved_template_baseline_id,
        capturedParentSha256:config.binding.retainParentBindings!.capturedParentSha256,sourceFingerprint:fingerprint,
        ...(projectScopeOnly?{projectScopeMetadataOnlyV1:masterProjectScopeMetadataCompactR1(config.binding.retainParentBindings!)}:{}),
        ...(authorityOnly?{truthAuthorityOnlyV1:{contract:authorityOnly.contract,changesSha256:authorityOnly.changesSha256,
          parameterIds:Object.keys(authorityOnly.changes).sort(),
          ...(authorityOnly.sourceProfileMetadataOnlyV1?{sourceProfileMetadataOnlyV1:masterRetainedSourceProfileMetadataCompactR1(authorityOnly)}:{})}}:{}),
        ...(repairVisibilityOnly?{monolithicRepairGeometryVisibilityOnlyR60:{contract:repairVisibilityOnly.contract,changesSha256:repairVisibilityOnly.changesSha256,
          parameterIds:Object.keys(repairVisibilityOnly.changes).sort()}}:{}),
        ...(ct126Proof?{ct126PreparedWallMigrationR2:ct126Proof}:{})},
      lifecycleMetadata:{contract:config.contract,masterSha256:config.masterSha256,sourceFingerprint:fingerprint},
    });
    if(retainedRepresentative)baselineRepresentative.normative_source_ids=retainedRepresentative.normativeSourceIds;
    const plan = createCanonicalDefinitionClonePlan({
      contract: config.contract,
      definition: {
        id: definitionId,
        releaseId,
        catalogId: config.catalogId,
        definitionVersion: nextDefinitionVersion,
        passport: operationParent?operationParent.definition.passport:{
          catalogId: config.catalogId,
          canonicalRuName: config.passport.canonicalRuName,
          workKey: config.passport.workKey,
          physicalResultRu: config.passport.physicalResultRu,
          projectSourceId: config.sourceId,
        },
        applicability: config.applicability,
        definitionSha256: targetDefinitionSha256,
        sourceMetadata: retainedRepresentative?.sourceMetadata??{
          contract: config.contract,
          masterSha256: config.masterSha256,
          sourceFingerprint: fingerprint,
          sourceId: config.sourceId,
          normId: config.normId,
          knownWorkScopeFirstEstimate: true,
          missingProjectQuantityPolicy: "PRELIMINARY_NEED",
          invalidSuppliedValuePolicy: "REJECT",
          activationAllowed: false,
          productionEligible: false,
        },
      },
      representative: {
        parameters: parameterRows,
        formulas: formulaRows,
        resources: resourceRows,
        bindings: retainedRepresentative?[...retainedRepresentative.bindings]:newNormativeBindings,
        baseline: baselineRepresentative,
        passport: metadataOnlyPassport??{
          contract_version: CONTENT_PASSPORT_CONTRACT,
          included_scope_ru: config.passport.includedScopeRu,
          capability_matrix: buildMasterCapabilityMatrix(config.passport.unresolvedApplicableResourceRowIds, resourceRows, config.passport.partialQuantityBasis),
        },
      },
      parameterTruthMetadata: (parameter) => metadataOnlyPassport?parameter.truth_metadata:({
        ...parameter.truth_metadata,
        contract: config.contract,
        semantic_parameter_key: `${config.catalogId}:${parameter.parameter_id}`,
        formula_consumers: formulaConsumers[parameter.parameter_id],
        resource_branch_consumers: resourceConsumers[parameter.parameter_id],
      }),
      resourceId: (resource) => uuid(
        `${config.contract}:${fingerprint}:${config.catalogId}:resource:${resource.row_id}`,
      ),
      resourceSemanticOwner: (resource) => retentionInput?.config.binding.retainParentBindings?.capturedParent.resources
        .find(row=>row.row_id===resource.row_id)?.semantic_owner??`${config.catalogId}:${resource.row_id}`,
      resourceSha256: (resource) => sha256({
        contract: config.contract,
        targetCatalogId: config.catalogId,
        resource,
      }),
      baseline: {
        id: baselineId,
        key: `${config.contract}:${fingerprint.slice(0, 16)}:${config.catalogId}`,
        sourceDefinitionVersionId: lineage.definitionVersionId,
        validationScenarioRefs: projectScopeOnly?operationParent!.baseline.validation_scenario_refs:[{
          scenario: config.validationScenario,
          shortInput: config.shortInput,
           fixture: config.acceptanceInput,
           runtimeProfile: runtimeProfileInput,
           runtimeProfileClassification,
           runtimeProfileSourceIds,
           acceptanceEvidenceSha256,
          coreAcceptance,
        }],
        acceptanceEvidenceSha256:projectScopeOnly?operationParent!.baseline.acceptance_evidence_sha256:acceptanceEvidenceSha256,
        acceptedReleaseId: releaseId,
        supersedesBaselineId: append == null ? lineage.baselineId : null,
      },
      passport: {
        physicalResultRu: metadataOnlyPassport?metadataOnlyPassport.physical_result_ru:config.passport.physicalResultRu,
        excludedScopeRu: metadataOnlyPassport?metadataOnlyPassport.excluded_scope_ru:config.passport.excludedScopeRu,
        decision: metadataOnlyPassport?metadataOnlyPassport.decision:{
          contract: CONTENT_PASSPORT_CONTRACT,
          status: "GREEN",
          allowed: true,
          waveContract: config.contract,
          ...buildMasterScopeReadiness(config.passport.unresolvedApplicableResourceRowIds, resourceRows, config.passport.partialQuantityBasis),
          priceState: "PARTIAL_NEEDS_PRICE",
          activationAllowed: false,
          productionEligible: false,
          ...(config.passport.independentCompletenessMap == null ? {} : {
            independentCompletenessMap: config.passport.independentCompletenessMap,
          }),
        },
        payloadSha256: sha256({
          targetDefinitionSha256,
          acceptanceEvidenceSha256,
          independentCompletenessMap: config.passport.independentCompletenessMap,
          ...(config.passport.partialQuantityBasis==null?{}:{partialQuantityBasis:config.passport.partialQuantityBasis}),
        }),
        sourceHead: head,
        sourceTree: tree,
      },
      bindingApplicability: (binding) => ({ ...binding.applicability }),
      expectedNormativeBindingCount: retainedRepresentative?.expectedNormativeBindingCount??normativeBindingRowIds.length,
    });
    // The final effective passport is audited too: metadata-only publication
    // cannot validate a new map and silently persist a different captured map.
    assertCanonicalPublisherSuccessorOperationResourcesR1({catalogId:plan.definition.catalog_id,
      resourceDefinitions:plan.resources,parameterDefinitions:plan.parameters,independentComposition:plan.passport.decision?.independentCompletenessMap});
    // New sparse baselines carry exact metadata coverage; historical records
    // stay untouched. Missing input values are never manufactured from metadata.
    if(!operationParent&&retainedRepresentative&&config.binding.retainParentBindings?.legacyTemplateAssumptionSources?.approvedSourceEvidence
      &&sha256(Object.keys(plan.baseline.input_values).sort())!==sha256(Object.keys(plan.baseline.input_classification).sort())){
      plan.baseline.proposal_source_refs=[...plan.baseline.proposal_source_refs,
        buildMasterRetainedSparseBaselineMetadataR1(plan,config.binding.retainParentBindings.capturedParentSha256)];
    }
    if(retentionInput&&retainedRepresentative)assertMasterRetainedBindingPlanR1(retentionInput,plan,retainedRepresentative);
    if(ct126RetainedMigration&&ct126Parent&&ct126Proof)invariant(ct126RetainedMigration.admitCt126SixDryWallMigrationProofS2769({proof:ct126Proof,
      fromDefinition:{id:ct126Parent.definition.id,catalogId:config.catalogId,sha256:ct126Parent.definition.definition_sha256},
      toDefinition:{id:definitionId,catalogId:config.catalogId,sha256:targetDefinitionSha256},from:ct126Parent,to:plan})!=null,
      stop(config,'CT126_R2_FINAL_PLAN_MIGRATION_NOT_ADMITTED'));


    const existing = (await client.query(
      "select id,status from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (append != null) {
      if (existing == null) {
        invariant(existingIdentity == null,
          `${stop(config, "APPEND_IDENTITY_PREEXISTS_WITHOUT_SUCCESSOR")}:${JSON.stringify(existingIdentity)}`);
      } else {
        invariant(existingIdentity != null
          && existingIdentity.namespace === append.identity.namespace
          && existingIdentity.domain === append.identity.domain
          && existingIdentity.source_identity === append.identity.sourceIdentity
          && existingIdentity.work_key === append.identity.workKey
          && existingIdentity.title_ru === append.identity.titleRu
          && existingIdentity.denominator_eligible === append.identity.denominatorEligible
          && existingIdentity.canonical_owner === "backend"
          && existingIdentity.retired_at == null,
        `${stop(config, "APPEND_IDENTITY_IDEMPOTENT_DRIFT")}:${JSON.stringify(existingIdentity)}`);
      }
    }
    if (existing) {
      invariant(existing.status === "prepared", stop(config, "EXISTING_RELEASE_NOT_PREPARED"));
      const retainedPersistedAudit=retentionInput==null?null:await auditPersistedCanonicalDefinition(client,plan);
      receipt = {
        status: `GREEN_${config.stopCode}_PREPARED_NOT_ACTIVE`,
        idempotent: true,
        mutationPerformed: false,
        predecessor: {
          releaseId: config.parentReleaseId,
          searchReleaseId: config.parentSearchReleaseId,
        },
        successor: { releaseId, searchReleaseId, releaseKey, definitionId, baselineId, nextCounts },
        coreAcceptance,
        ...(retainedPersistedAudit==null?{}:{retainedPersistedAudit}),
        audit: await auditState(client, config, releaseId, searchReleaseId, definitionId),
      };
    } else {
      runtimeAdmissionMetadata = resolveMasterRuntimeAdmissionMetadataR1(
        retiredArea.definitions>0?{...current,currentRuntimeDefinitions:activeParentCounts.definitions}:current,
        activeParentCounts.definitions, nextCounts.definitions,
      );
      await client.query(retentionInput||scopedRegistryInput!=null||config.verifyTargetPrecondition?"begin isolation level read committed":"begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [config.contract]);
      try {
        await config.verifyTargetPrecondition?.(client, "LOCKED_BEFORE");
        let lockedRetention=retentionPreflight;
        if(retentionInput&&retentionPreflight){
          await lockMasterRetainedBindingPreconditionsR1(client,retentionInput);
          lockedRetention=await readMasterRetainedBindingPreconditionsR1(client,retentionInput);
          assertMasterRetainedBindingPreflightUnchangedR1(retentionInput,retentionPreflight,lockedRetention);
          assertMasterExistingNormativeRegistrySnapshotR1(existingRegistryReuse,lockedRetention);
          const lockedPointer=JSON.parse(readFileSync(config.currentReleasePath,"utf8")) as Json;
          invariant(lockedPointer.productionAccessed===false&&lockedPointer.definitionReleaseId===config.parentReleaseId
            &&lockedPointer.searchReleaseId===config.parentSearchReleaseId&&sha256(lockedPointer)===sha256(current),
            stop(config,"RETAIN_POINTER_CHANGED_BEFORE_WRITE"));
          const lockedParent=(await client.query("select * from public.estimate_definition_release where id=$1",[config.parentReleaseId])).rows[0];
          const lockedSearch=(await client.query("select * from public.estimate_search_index_release where id=$1",[config.parentSearchReleaseId])).rows[0];
          invariant(lockedParent?.status==="prepared"&&lockedParent.activated_at==null
            &&lockedSearch?.status==="draft"&&lockedSearch.activated_at==null&&lockedSearch.sealed_at==null
            &&sha256(JSON.parse(JSON.stringify(lockedParent)))===sha256(JSON.parse(JSON.stringify(parent)))
            &&sha256(JSON.parse(JSON.stringify(lockedSearch)))===sha256(JSON.parse(JSON.stringify(parentSearch))),
            stop(config,"RETAIN_PARENT_RELEASE_CHANGED_BEFORE_WRITE"));
        }
        if (appendGuardInput != null && appendPreflight != null) {
          await lockMasterSingleDefinitionAppendPreconditionsR1(client, appendGuardInput);
          const underTransaction = await readMasterSingleDefinitionAppendPreconditionsR1(
            client, appendGuardInput,
          );
          assertMasterSingleDefinitionAppendUnchangedR1(
            appendGuardInput, appendPreflight, underTransaction,
          );
          const lockedCurrent = JSON.parse(readFileSync(config.currentReleasePath, "utf8")) as Json;
          invariant(lockedCurrent.productionAccessed === false
            && lockedCurrent.definitionReleaseId === config.parentReleaseId
            && lockedCurrent.searchReleaseId === config.parentSearchReleaseId
            && sha256(lockedCurrent) === sha256(current),
          stop(config, "APPEND_POINTER_CHANGED_BEFORE_WRITE"));
        }
        if(scopedRegistryInput!=null&&scopedRegistryPreflight!=null){
          // Ordinary whole replacement has no retained/append branch to acquire these locks.
          if(config.binding.ordinaryCompositeSourceV1!=null){
            await client.query("lock table public.estimate_normative_source, public.estimate_normative_locator in share row exclusive mode");
          }
          const lockedScope=await readMasterScopedNormativeRegistryPreconditionsR1(client,scopedRegistryInput,"LOCKED_BEFORE");
          assertMasterScopedNormativeRegistryUnchangedR1(scopedRegistryInput,scopedRegistryPreflight,lockedScope);
        }
        if(retiredArea.definitions>0){
          await client.query(`lock table public.estimate_cumulative_manifest_entry,public.estimate_definition_version,
            public.estimate_parameter_definition,public.estimate_formula_graph,public.estimate_resource_spec,
            public.estimate_search_index_release,public.estimate_search_document,public.estimate_search_group,
            public.estimate_search_group_membership,public.estimate_search_clarification_question,
            public.estimate_search_typed_relation in share row exclusive mode`);
        }
        const lockedRetirement=await readMasterAreaRetirementCountsR575(client,config.parentReleaseId);
        invariant(sha256(lockedRetirement)===sha256(retiredArea),stop(config,'AREA_RETIREMENT_CHANGED_BEFORE_WRITE'));
        const sourceBefore = (await client.query(`select id::text,artifact_sha256
          from public.estimate_normative_source where source_key=$1`, [config.sourceId]))
          .rows[0] as Json | undefined;
        if (compositeSourceGuardInput != null) {
          assertMasterSingleDefinitionCompositeSourceR1(compositeSourceGuardInput, sourceBefore, "BEFORE");
        }
        if (projectSourcePackage != null && sourceBefore?.artifact_sha256 != null) {
          invariant(String(sourceBefore.artifact_sha256).toLowerCase()
            === projectSourcePackage.packagePayloadSha256,
          `${stop(config, "PROJECT_SOURCE_ARTIFACT_IMMUTABLE")}:${sourceBefore.artifact_sha256}`);
        }
        if(retentionInput==null||lockedRetention!.newSources.length===0)await client.query(`insert into public.estimate_normative_source(
            id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
          values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
          ${retentionInput?"":`on conflict(source_key) do update set title_ru=excluded.title_ru,
            authority=excluded.authority,official_url=coalesce(excluded.official_url,public.estimate_normative_source.official_url),
            artifact_sha256=coalesce(public.estimate_normative_source.artifact_sha256,excluded.artifact_sha256),
            effective_from=coalesce(excluded.effective_from,public.estimate_normative_source.effective_from),
            metadata=public.estimate_normative_source.metadata||excluded.metadata`}`, [
          sourceId,
          config.sourceId,
          resolvedSourceMetadata.source_title,
          resolvedSourceMetadata.source_authority,
          resolvedSourceMetadata.official_url ?? null,
          resolvedSourceMetadata.artifact_sha256 ?? null,
          resolvedSourceMetadata.effective_from ?? null,
          JSON.stringify(registrySourceMetadata),
        ]);
        const actualSource = (await client.query(
          "select id::text,artifact_sha256 from public.estimate_normative_source where source_key=$1",
          [config.sourceId],
        )).rows[0] as Json;
        const actualSourceId = String(actualSource.id);
        if (compositeSourceGuardInput != null) {
          assertMasterSingleDefinitionCompositeSourceR1(compositeSourceGuardInput, actualSource, "AFTER");
        }
        if (projectSourcePackage != null) {
          invariant(String(actualSource.artifact_sha256).toLowerCase()
            === projectSourcePackage.packagePayloadSha256,
          stop(config, "PROJECT_SOURCE_ARTIFACT_PERSISTENCE"));
        }
        for (const [index, resolvedLocator] of resolvedLocators.entries()) {
          const locatorId = locatorIds[index]!;
          if(retentionInput==null||!lockedRetention!.newLocators.some(row=>row.id===locatorId))await client.query(`insert into public.estimate_normative_locator(
              id,source_id,locator_key,locator,excerpt_sha256)
            values($1,$2,$3,$4::jsonb,$5)
            ${retentionInput?"":"on conflict(source_id,locator_key) do nothing"}`, [
            locatorId,
            actualSourceId,
            resolvedLocator.key,
            JSON.stringify(resolvedLocator.payload),
            resolvedLocator.excerptSha256,
          ]);
          const actualLocator = (await client.query(`select id::text,locator,excerpt_sha256
            from public.estimate_normative_locator where source_id=$1 and locator_key=$2`, [
            actualSourceId,
            resolvedLocator.key,
          ])).rows[0] as Json | undefined;
          invariant(actualLocator?.id === locatorId
            && sha256(actualLocator.locator) === sha256(resolvedLocator.payload)
            && String(actualLocator.excerpt_sha256).toLowerCase() === resolvedLocator.excerptSha256,
          `${stop(config, "NORMATIVE_LOCATOR_IMMUTABLE")}:${resolvedLocator.key}`);
        }
        if(retentionInput){
          const registered=await readMasterRetainedBindingPreconditionsR1(client,retentionInput,"REGISTERED");
          assertMasterExistingNormativeRegistrySnapshotR1(existingRegistryReuse,registered);
          invariant(registered.newSources.length===1&&registered.newLocators.length===retentionInput.newLocators.length,
            stop(config,"RETAIN_COMPLETE_REGISTRY_REQUIRED"));
        }
        if(scopedRegistryInput!=null)await readMasterScopedNormativeRegistryPreconditionsR1(
          client,scopedRegistryInput,"REGISTERED");
        const publisherPreflight = await preflightCanonicalDefinitionPublishPlans(client, [plan],
          retentionInput != null && (retentionInput.config.binding.retainParentBindings?.legacyTemplateAssumptionSources
            || retentionInput.config.binding.retainParentBindings?.legacyCapturedFixtureSources)
            ? [retentionInput] : [], hasMasterTypedPartialQuantityBasisR1(plan.passport)
              ?retentionInput!=null?[retentionInput]:scopedRegistryInput!=null&&config.binding.ordinaryCompositeSourceV1!=null
                ?[{kind:'ORDINARY_COMPOSITE_TYPED_QUANTITY',catalogId:config.catalogId,
                  bindingRowIds:[config.binding.rowId,...(config.binding.additionalRowIds??[])],scopedRegistry:scopedRegistryInput}]:[]
              :[]);
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
            parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,metadata||$8::jsonb,$9,$10,$11,$12
          from public.estimate_definition_release where id=$9`, [
          releaseId,
          releaseKey,
          head,
          tree,
          sha256(`${config.contract}:${fingerprint}:draft`),
          nextCounts.definitions,
          nextCounts.resources,
          JSON.stringify({
            contract: config.contract,
            masterSha256: config.masterSha256,
            masterSingleDefinitionSourceOriginV1: sourceOrigin,
            lifecycle: "DRAFT_FORWARD_ONLY",
            ...(append == null
              ? { replacedDefinitionCount: 1 }
              : { appendedDefinitionCount: 1, appendedCatalogIdentity: true }),
            masterBenchmarkOrdinal: config.benchmarkOrdinal,
            activationAllowed: false,
            productionEligible: false,
            priceState: "PARTIAL_NEEDS_PRICE",
          }),
          config.parentReleaseId,
          sha256({ contract: config.contract, fingerprint, definitionSchemaSha256 }),
          nextCounts.parameters,
          nextCounts.formulas,
        ]);
        const persistedSourceOrigin = (await client.query(`select source_commit,source_tree,source_package_sha256,
            metadata->'masterSingleDefinitionSourceOriginV1' source_origin,
            metadata->>'contract' source_contract,metadata->>'masterSha256' master_sha256
          from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json | undefined;
        invariant(persistedSourceOrigin && canonicalMasterSingleDefinitionSourceOriginMatchesR1({
          origin: persistedSourceOrigin.source_origin,
          catalogId: config.catalogId,
          fingerprint,
          sourceCommit: persistedSourceOrigin.source_commit,
          sourceTree: persistedSourceOrigin.source_tree,
          masterSha256: config.masterSha256,
          sourcePackageSha256: persistedSourceOrigin.source_package_sha256,
          parameterSchemaSha256,
          definitionSchemaSha256,
        }) && persistedSourceOrigin.source_commit === head && persistedSourceOrigin.source_tree === tree
          && persistedSourceOrigin.source_contract === config.contract && persistedSourceOrigin.master_sha256 === config.masterSha256,
        stop(config, "PERSISTED_SOURCE_ORIGIN_MISMATCH"));
        if (append != null) {
          const insertedIdentity = await client.query(`insert into public.estimate_work_identity(
              catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible,canonical_owner)
            values($1,$2,$3,$4,$5,$6,$7,'backend')`, [
            config.catalogId,
            append.identity.namespace,
            append.identity.domain,
            append.identity.sourceIdentity,
            append.identity.workKey,
            append.identity.titleRu,
            append.identity.denominatorEligible,
          ]);
          invariant(insertedIdentity.rowCount === 1, stop(config, "APPEND_IDENTITY_INSERT"));
        }
        await client.query(`insert into public.estimate_cumulative_manifest_entry(
            release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
            definition_hash,entry_sha256,runtime_publication_state)
          select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
            encode(extensions.digest(convert_to($2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),
            runtime_publication_state
          from public.estimate_cumulative_manifest_entry inherited where release_id=$3
            and ${canonicalPublicWorkSqlV1('inherited')}`, [
          releaseId, config.contract, config.parentReleaseId,
        ]);
        const persisted = await publishCanonicalDefinitionDraft(client, plan);
        const targetEntrySha256 = sha256({
          contract: config.contract,
          releaseId,
          catalogId: config.catalogId,
          definitionId,
          baselineId,
          targetDefinitionSha256,
        });
        if (append == null) {
          const manifestUpdate = await client.query(`update public.estimate_cumulative_manifest_entry set
              definition_version_id=$3,source_batch=$4,source_release_id=$1,
              publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$5,
              baseline_ready=true,scenario_ready=true,definition_hash=$6,entry_sha256=$7,
              runtime_publication_state='CANDIDATE'
            where release_id=$1 and catalog_id=$2`, [
            releaseId,
            config.catalogId,
            definitionId,
            config.contract,
            baselineId,
            targetDefinitionSha256,
            targetEntrySha256,
          ]);
          invariant(manifestUpdate.rowCount === 1, stop(config, "MANIFEST_UPDATE"));
        } else {
          const manifestInsert = await client.query(`insert into public.estimate_cumulative_manifest_entry(
              release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
              publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
              definition_hash,entry_sha256,runtime_publication_state)
            values($1,$2,$3,$4,$1,$5,'CANONICAL_SUCCESSOR',$6,true,true,$7,$8,'CANDIDATE')`, [
            releaseId,
            config.catalogId,
            definitionId,
            config.contract,
            append.identity.domain,
            baselineId,
            targetDefinitionSha256,
            targetEntrySha256,
          ]);
          invariant(manifestInsert.rowCount === 1, stop(config, "MANIFEST_APPEND"));
        }
        const searchSnapshot = await cloneSearch(client, config, {
          releaseId,
          searchReleaseId,
          releaseKey,
          head,
          tree,
          fingerprint,
          definitionId,
        });
        const retiredSelection=(await client.query(`select
          (select count(*)::int from public.estimate_cumulative_manifest_entry m where release_id=$1 and not (${canonicalPublicWorkSqlV1('m')})) manifest,
          (select count(*)::int from public.estimate_search_document d where search_release_id=$2 and not (${canonicalPublicWorkSqlV1('d')})) documents,
          (select count(*)::int from public.estimate_search_group_membership m where search_release_id=$2 and not (${canonicalPublicWorkSqlV1('m')})) memberships,
          (select count(*)::int from public.estimate_search_clarification_question q where search_release_id=$2
            and exists(select 1 from unnest(q.candidate_ids) candidate(catalog_id) where not (${canonicalPublicWorkSqlV1('candidate')}))) questions`,[releaseId,searchReleaseId])).rows[0];
        invariant(retiredSelection && Object.values(retiredSelection).every(count=>Number(count)===0),stop(config,'AREA_SELECTION_SURVIVED_CLONE'));
        const audit = await auditState(client, config, releaseId, searchReleaseId, definitionId);
        audit.activeAreaRetirement={policy:CANONICAL_PUBLIC_CATALOG_VISIBILITY_V1,parentReleaseId:config.parentReleaseId,
          retiredCounts:retiredArea,successorRetiredSelectionCounts:retiredSelection,historicalDefinitionsDeleted:false};
        invariant(Number(audit.manifest.identities) === nextCounts.definitions
          && Number(audit.manifest.replaced) === 1,
        `${stop(config, "MANIFEST_AUDIT")}:${JSON.stringify(audit.manifest)}`);
        invariant(audit.target.content_status === "CANDIDATE_READY"
          && audit.target.content_gate_status === "GREEN"
          && Number(audit.target.parameters) === parameterRows.length
          && Number(audit.target.formulas) === formulaRows.length
          && Number(audit.target.resources) === resourceRows.length
          && Number(audit.target.forbidden_adjacent_rows) === 0,
        `${stop(config, "TARGET_AUDIT")}:${JSON.stringify(audit.target)}`);
        invariant(audit.search.release_status === "draft"
          && audit.search.definition_release_id === releaseId
          && audit.search.definition_version_id === definitionId
          && audit.search.primary_uom === config.search.primaryUom
          && audit.search.canonical_name_ru === config.search.canonicalNameRu,
        `${stop(config, "SEARCH_AUDIT")}:${JSON.stringify(audit.search)}`);
        if (append != null) {
          const memberCatalogIds = Array.isArray(audit.searchPlacement?.member_catalog_ids)
            ? audit.searchPlacement.member_catalog_ids.map(String)
            : [];
          invariant(audit.identity?.namespace === append.identity.namespace
            && audit.identity?.domain === append.identity.domain
            && audit.identity?.source_identity === append.identity.sourceIdentity
            && audit.identity?.work_key === append.identity.workKey
            && audit.identity?.title_ru === append.identity.titleRu
            && audit.identity?.denominator_eligible === append.identity.denominatorEligible
            && audit.identity?.canonical_owner === "backend"
            && audit.identity?.retired_at == null,
          `${stop(config, "APPEND_IDENTITY_AUDIT")}:${JSON.stringify(audit.identity)}`);
          invariant(audit.searchPlacement?.group_id === append.searchPlacement.groupId
            && Number(audit.searchPlacement?.ordinal) === append.searchPlacement.membershipOrdinal
            && Number(audit.searchPlacement?.member_count) === memberCatalogIds.length
            && audit.searchPlacement?.member_set_sha256 === sha256(memberCatalogIds)
            && audit.searchPlacement?.oracle_disposition?.memberCatalogIdsSha256 === sha256(memberCatalogIds),
          `${stop(config, "APPEND_SEARCH_PLACEMENT_AUDIT")}:${JSON.stringify(audit.searchPlacement)}`);
        }
        const unrelated = (await client.query(`select count(*)::int changed
          from public.estimate_cumulative_manifest_entry parent
          join public.estimate_cumulative_manifest_entry successor using(catalog_id)
          where parent.release_id=$1 and successor.release_id=$2 and parent.catalog_id<>$3
            and (parent.definition_version_id<>successor.definition_version_id
              or parent.source_batch<>successor.source_batch
              or parent.source_release_id<>successor.source_release_id
              or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
              or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
          config.parentReleaseId, releaseId, config.catalogId,
        ])).rows[0] as Json;
        invariant(Number(unrelated.changed) === 0,
          `${stop(config, "UNRELATED_MANIFEST_DRIFT")}:${unrelated.changed}`);
        const prepared = await client.query(`update public.estimate_definition_release
          set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
            metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId,
          audit.manifest.snapshot,
          JSON.stringify({
            lifecycle: "PREPARED_NOT_ACTIVE",
            searchReleaseId,
            searchSnapshotSha256: searchSnapshot.snapshot_sha256,
            masterSingleDefinitionTargetCount: 1,
            sourceCoreAcceptanceSha256: coreAcceptance.serializedSha256,
            parameterCountPerTarget: parameterRows.length,
            formulaCountPerTarget: formulaRows.length,
            resourceDefinitionCountPerTarget: resourceRows.length,
            priceState: "PARTIAL_NEEDS_PRICE",
            ...(projectSourcePackage == null ? {} : {
              projectSourcePackageId: projectSourcePackage.packageId,
              projectSourcePackageSha256: projectSourcePackage.packagePayloadSha256,
              projectSourceMappingSha256: projectSourcePackage.mappingPayloadSha256,
            }),
            ...(append == null
              ? { masterSingleDefinitionPublicationMode: "REPLACE" }
              : { masterSingleDefinitionPublicationMode: "APPEND", appendedCatalogIdentity: true }),
          }),
        ]);
        invariant(prepared.rowCount === 1, stop(config, "PREPARED_TRANSITION"));
        const terminalAudit = await auditState(
          client,
          config,
          releaseId,
          searchReleaseId,
          definitionId,
        );
        terminalAudit.activeAreaRetirement=audit.activeAreaRetirement;
        invariant(terminalAudit.release.status === "prepared"
          && terminalAudit.release.activated_at == null,
        `${stop(config, "TERMINAL_LIFECYCLE")}:${JSON.stringify(terminalAudit.release)}`);
        if (apply) await client.query("commit");
        else await client.query("rollback");
        receipt = {
          status: apply
            ? `GREEN_${config.stopCode}_PREPARED_NOT_ACTIVE`
            : `DRY_RUN_${config.stopCode}_VALIDATED`,
          idempotent: false,
          mutationPerformed: apply,
          predecessor: {
            releaseId: config.parentReleaseId,
            searchReleaseId: config.parentSearchReleaseId,
            catalogId: config.catalogId,
            definitionId: append == null ? old!.definition_version_id : null,
            shape: append == null
              ? [Number(old!.parameters), Number(old!.formulas), Number(old!.resources)]
              : null,
            targetAbsentForAppend: append != null,
          },
          successor: {
            releaseId,
            searchReleaseId,
            releaseKey,
            definitionId,
            baselineId,
            definitionVersion: nextDefinitionVersion,
            shape: [parameterRows.length, formulaRows.length, resourceRows.length],
            nextCounts,
          },
          coreAcceptance,
          projectSourcePackage,
          publisherPreflight,
          publisherPersistedSelfAudit: persisted,
          audit: { ...terminalAudit, unrelatedManifestChanges: Number(unrelated.changed) },
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }

  const body = {
    schemaVersion: `${config.contract}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: {
      branch: config.expectedBranch,
      head,
      tree,
      fingerprint,
      sourceHashes,
      projectSourcePackage,
      projectSourcePackageSet,
      hashedDirtySourceAccepted: dirtySourcePaths.length > 0 && allowHashedDirtySource,
    },
    master: { path: config.masterPath, sha256: config.masterSha256 },
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (apply && receipt!.mutationPerformed === true) {
    atomicJson(resolve(config.outputRoot, "acceptance.json"), sealed);
    atomicJson(resolve(config.outputRoot, `01_${config.receiptFileStem}_${head}.json`), sealed);
    atomicJson(config.currentReleasePath, {
      ...current,
      ...runtimeAdmissionMetadata,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      currentRuntimeDefinitions: receipt!.successor.nextCounts.definitions,
      activeAreaRetirement:receipt!.audit.activeAreaRetirement,
      owner: config.owner,
      productionAccessed: false,
      fakeGreenClaimed: false,
    });
  }
  process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
}
