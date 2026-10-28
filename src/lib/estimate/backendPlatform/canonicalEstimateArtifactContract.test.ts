import {ct54MeasuredModelFromActualReferenceR930,prepareCt54MeasuredCurrentReferenceR930,type Ct54MeasuredCurrentContextR930} from '../../../../scripts/estimate/r4a13/prepareCt54ReferencePublicationR613';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {resolveMasterScopedNormativeRegistryOptInR1 as resolveCt54ActualScopedRoute} from '../../../../scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1';
import {prepareCt54ReferencePublicationFromReadR619 as prepareCt54FreshReadContext} from '../../../../scripts/estimate/r4a13/prepareCt54ReferencePublicationR613';
import {captureCt54ReferenceFormalRegistryR619 as captureCt54FreshPlan} from '../../../../scripts/estimate/r4a13/prepareCt54ReferencePublicationR613';
import {prepareCt54ReferencePublicationR613 as prepareCt54PlanPublisher} from '../../../../scripts/estimate/r4a13/prepareCt54ReferencePublicationR613';
import {validateMasterTypedPartialQuantityPreparationR1 as validateCt54PlanPartial} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1 as assembleCt54PlanCandidate} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {makeMasterScopedNormativeRegistryCaptureR1 as captureCt54PlanRegistry} from '../../../../scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1';
import ct54QuantityPlan from '../../../../data/estimate-benchmarks/source-packs/ct54-actual-project-quantity-plan-r1.json';
import {validateIndependentCompletenessMapReferences as validateCt54PlanReferences,validateMasterFormulaGraphConsistency as validateCt54PlanGraphs} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {createHash} from 'node:crypto';
import {buildCanonicalRevisionCommitPayload} from './canonicalEstimateRevisionWriter';
import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalSavedOperationCompositionEvidenceV1} from './canonicalEstimateSavedOperationAcceptanceV1';
import {assertCanonicalProfessionalArtifactCurrentPresentationV1} from './canonicalEstimateArtifactContract';
import unresolvedCeiling from '../../../../data/estimate-benchmarks/fixtures/master24-ceiling-unresolved-included-pdf-r1.json';
import {canonicalPublicSavedResourceRowKindV1} from './canonicalPublicResourcePresentationV1';
import savedFanAcceptanceFixture from './fixtures/saved-operation-acceptance-native-fan-source-r1.json';
import {canonicalEstimateSavedOperationAcceptanceV1, assertCanonicalEstimateSavedArtifactStructureV1} from './canonicalEstimateSavedOperationAcceptanceV1';
import {
  buildCanonicalArtifactMetadata,
  buildCanonicalProcurementProjection,
  canonicalArtifactPreliminaryNeeds,
  canonicalArtifactQuantity,
  canonicalArtifactSection,
  canonicalArtifactSpecificationParts,
  canonicalArtifactVisibleRowTitle,
  canonicalProfessionalArtifactMetadataIdentityMatches,
  selectCanonicalArtifactRows,
} from "./canonicalEstimateArtifactContract";
import { canonicalEstimateStableJson } from "./canonicalEstimateDeterminism";
import ct54Reference from '../../../../data/estimate-benchmarks/source-packs/ct54-manual-reference-project-system-r608.json';
import {ct54ReferencePublicationModelR613} from '../../../../scripts/estimate/r4a13/prepareCt54ReferencePublicationR613';
import {compileCanonicalEstimateCore} from './canonicalEstimateCompileCore';

const revision = {
  id: "revision-1",
  release_id: "release-1",
  catalog_id: "catalog-1",
  checksum_sha256: "a".repeat(64),
  row_count: 3,
  currency_code: "KGS",
  source_request_hash: "b".repeat(64),
};

const rows = [
  { row_id: "material", ordinal: 0, section: "materials", category: "material", title_ru: "Материал", unit_id: "m2", quantity: "12.5", unit_price: null, amount: null, currency_code: "KGS", procurement_eligible: true, included_in_estimate: true, included_in_procurement: true, ownership_status: "OWNED", row_sha256: "c".repeat(64) },
  { row_id: "labor", ordinal: 1, section: "labor", category: "labor", title_ru: "Работа", unit_id: "m2", quantity: "10", unit_price: null, amount: null, currency_code: "KGS", procurement_eligible: false, included_in_estimate: true, included_in_procurement: false, ownership_status: "OWNED", row_sha256: "d".repeat(64) },
  { row_id: "legacy", ordinal: 2, section: "legacy", category: "legacy", title_ru: "Legacy", unit_id: "item", quantity: "999", unit_price: null, amount: null, currency_code: "KGS", procurement_eligible: true, included_in_estimate: false, included_in_procurement: false, ownership_status: "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL", row_sha256: "e".repeat(64) },
];

it('CT54 ordinary artifact gate distinguishes a missing waste-receiver condition from thirty unknown numeric quantities',async()=>{
  // Contract fixture only: use the actual ordinary model/compiler/commit adapter.
  // The fixture passport is not a DB readback, publication or saved-project claim.
  const model=ct54ReferencePublicationModelR613(),method='ct54_reference_method';
  const hashJson=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value),'utf8').digest('hex');
  const parameters:Record<string,unknown>={area_m2:20,...ct54Reference.conditions};
  delete parameters[method];
  const compile=async(submittedParameters:Record<string,unknown>)=>{
    const compiled=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:ct54Reference.contract,
      catalogId:'canonical-work:base:plaster_paint_interior_paint_wall_paint_standard',primaryMeasureParameterId:'area_m2',
      parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
      submittedParameters,confirmedParameters:{[method]:ct54Reference.conditions.ct54_reference_method},
      currencyCode:'KGS',priceItems:[],maximumResourceRows:model.resources.length,hashJson});
    const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:'ct54-contract-release',
      definitionVersionId:'ct54-contract-definition',passport:{definition_version_id:'ct54-contract-definition',
        payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:ct54Reference.independentComposition}}})!;
    const checksum=hashJson({...compiled.revisionProjection,operationCompositionEvidenceV1:evidence});
    const commit=buildCanonicalRevisionCommitPayload({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,
      checksumSha256:checksum,compilerVersion:ct54Reference.contract,parameters:compiled.parameters,
      approvedTemplateBaselineId:null,baselineAssumptions:{[method]:ct54Reference.conditions.ct54_reference_method},
      effectiveUserParameters:submittedParameters,parentRevisionId:null,identityContract:{},
      preliminaryNeeds:compiled.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
    const saved={...revision,release_id:'ct54-contract-release',definition_version_id:'ct54-contract-definition',
      catalog_id:'canonical-work:base:plaster_paint_interior_paint_wall_paint_standard',row_count:compiled.rows.length,
      input_parameters:compiled.parameters,checksum_sha256:checksum,amendment_contract:{parameterSources:commit.parameterSources}};
    const resources=[...compiled.rows,...canonicalArtifactPreliminaryNeeds(saved)];
    return {compiled,saved,resources};
  };
  const ready=await compile(parameters),readyBefore=JSON.stringify(ready);
  expect(ready.compiled.rows).toHaveLength(1);expect(ready.compiled.preliminaryNeeds).toHaveLength(30);
  const quantityOnly=canonicalEstimateSavedOperationAcceptanceV1({revision:ready.saved,resources:ready.resources});
  expect(quantityOnly).toMatchObject({pdfAllowed:true,completeClaimAllowed:false});
  expect(quantityOnly.issues).toEqual([{code:'RESOURCE_QUANTITY_UNRESOLVED'}]);
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(quantityOnly)).not.toThrow();
  expect(JSON.stringify(ready)).toBe(readyBefore);

  const missing={...parameters};delete missing.ct54_reference_waste_receiver;
  const pending=await compile(missing),pendingBefore=JSON.stringify(pending);
  expect(pending.compiled.rows).toHaveLength(0);expect(pending.compiled.preliminaryNeeds).toHaveLength(31);
  expect(pending.compiled.preliminaryNeeds.every(row=>row.missing_parameter_ids.includes('ct54_reference_waste_receiver'))).toBe(true);
  expect(pending.compiled.preliminaryNeeds.find(row=>row.row_id==='reference:wall-paint:ct54:ct54'))
    .toMatchObject({need_state:'CONDITION_REQUIRED',quantity:'6'});
  // This exact owner guards enqueue, cache/read, worker and the PDF projection.
  const held=canonicalEstimateSavedOperationAcceptanceV1({revision:pending.saved,resources:pending.resources});
  expect(held.pdfAllowed).toBe(false);expect(held.completeClaimAllowed).toBe(false);
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(held)).toThrow(expect.objectContaining({
    code:'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED',httpStatus:409}));
  expect(JSON.stringify(pending)).toBe(pendingBefore);

  // No known numeric quantity must not hide a simultaneously missing fact.
  const withoutArea={...parameters};delete withoutArea.area_m2;
  const numericOnly=await compile(withoutArea),numericBefore=JSON.stringify(numericOnly);
  expect(numericOnly.compiled.preliminaryNeeds).toHaveLength(31);
  expect(numericOnly.compiled.preliminaryNeeds.every(row=>row.quantity===null)).toBe(true);
  const numericGate=canonicalEstimateSavedOperationAcceptanceV1({revision:numericOnly.saved,resources:numericOnly.resources});
  expect(numericGate).toMatchObject({pdfAllowed:true,completeClaimAllowed:false});
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(numericGate)).not.toThrow();
  expect(JSON.stringify(numericOnly)).toBe(numericBefore);
  const withoutFact={...withoutArea};delete withoutFact.ct54_reference_waste_receiver;
  const mixed=await compile(withoutFact),mixedBefore=JSON.stringify(mixed);
  expect(mixed.compiled.preliminaryNeeds.every(row=>row.need_state==='CONDITION_REQUIRED')).toBe(true);
  expect(mixed.compiled.preliminaryNeeds.every(row=>row.quantity===null)).toBe(true);
  const mixedGate=canonicalEstimateSavedOperationAcceptanceV1({revision:mixed.saved,resources:mixed.resources});
  expect(mixedGate.pdfAllowed).toBe(false);
  expect(mixedGate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:'reference:wall-paint:ct54:ct54'});
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(mixedGate)).toThrow(expect.objectContaining({httpStatus:409}));
  expect(JSON.stringify(mixed)).toBe(mixedBefore);
});

it("serializes one purchased resource and its related operations as valid immutable JSON", () => {
  const material = { ...rows[0], row_id: "membrane-rolls", unit_id: "roll", quantity: "30", calculation_trace: {
    resourceGraph: { operationCompositionV1: {
      contractVersion: "canonical-operation-resource/v1", groupId: "bridge", groupTitleRu: "Мостовое покрытие",
      operationId: "roll-order", operationTitleRu: "Общий заказ рулонов", completionCriterionRu: "Один общий заказ",
      processOrdinal: 0, processRole: "COST_SUMMARY", additionalOperations: [
        { operationId: "field", operationTitleRu: "Основное поле", completionCriterionRu: "Поле наплавлено" },
        { operationId: "details", operationTitleRu: "Детали", completionCriterionRu: "Детали герметичны" },
      ],
    } },
  } };
  const before = JSON.stringify(material);
  const projection = buildCanonicalProcurementProjection({ revision: { ...revision, row_count: 1 },
    procurementRows: [material], sourceRows: [material] });
  const serialized = canonicalEstimateStableJson(projection);
  expect(() => JSON.parse(serialized)).not.toThrow();
  expect(JSON.parse(serialized)).toEqual(projection);
  expect(projection.rows).toHaveLength(1);
  expect(projection.rows[0]).toMatchObject({ rowId: "membrane-rolls", quantity: "30" });
  expect(projection.operationGroups.filter(group => group.rowIds.includes("membrane-rolls"))).toHaveLength(1);
  expect(projection.operationGroups.filter(group => group.sharedResources?.some(row => row.rowId === "membrane-rolls"))).toHaveLength(2);
  expect(JSON.stringify(material)).toBe(before);
});

describe("canonical estimate artifact contract", () => {
  it("keeps small positive source quantities visible instead of displaying zero", () => {
    expect(canonicalArtifactQuantity("0.0001562")).toBe("0,0001562");
    expect(canonicalArtifactQuantity("0.000000001")).toBe("0,000000001");
    expect(canonicalArtifactQuantity("0")).toBe("0");
    expect(canonicalArtifactQuantity(null)).toBe("—");
    expect(canonicalArtifactQuantity("12.5")).toBe("12,5");
  });
  it("preserves saved physical decimal precision above the small-quantity threshold without binary conversion", () => {
    for (const [value,expected] of [["0.007300000","0,0073"],["0.002400000","0,0024"],["12.345600000","12,3456"],["10000000.123456789","10\u00a0000\u00a0000,123456789"],["0.001000001","0,001000001"],["-0.000000000","0"]])
      expect(canonicalArtifactQuantity(value)).toBe(expected);
    expect(canonicalArtifactQuantity(0.0073)).toBe("0,0073");
  });
  it("renders a saved semicolon specification once while preserving other supplied details", () => {
    const value = "LOGICROOF V-RP 1,5 мм; контрольная спецификация, ТЛ 2.01 03.2026";
    const membrane = { ...rows[0]!, title_ru: "Мембрана", calculation_trace: { resourceGraph: {
      titleSpecificationParameterIds: ["product"],
      publicResourcePresentationV1: { contractVersion: "canonical-public-resource-presentation/v1",
        sourceTitleRu: "Мембрана", nameRu: "Мембрана", brandAndModelRu: null,
        specificationRu: value, detailsRu: ["Расход и заказ подтверждены отдельно."] },
    } } };
    const before = JSON.stringify(membrane);
    expect(canonicalArtifactSpecificationParts(membrane, { product: value }).flatMap(spec => spec.parts))
      .toEqual(["V-RP 1,5 мм", "контрольная спецификация, ТЛ 2.01 03.2026", "Расход и заказ подтверждены отдельно."]);
    expect(JSON.stringify(membrane)).toBe(before);
  });
  it("uses authored dimension labels once in PDF and procurement specifications without changing saved facts", () => {
    const title = "Лента переходная — Ширина (мм): 300, Толщина (мм): 1.5, Длина рулона (м): 15";
    const parameters = { width: 300, thickness: 1.5, roll: 15 };
    const tape = { ...rows[0]!, title_ru: title, quantity: "15", unit_id: "m", calculation_trace: { resourceGraph: {
      titleSpecificationParameterIds: ["width", "thickness", "roll"],
      titleSpecificationParameterLabelsRu: { width: "Ширина (мм)", thickness: "Толщина (мм)", roll: "Длина рулона (м)" },
      publicResourcePresentationV1: { contractVersion: "canonical-public-resource-presentation/v1", sourceTitleRu: title,
        nameRu: "Лента переходная", brandAndModelRu: "LOGICROOF Tape PVC-B", specificationRu: "Ширина (мм): 300, Толщина (мм): 1.5, Длина рулона (м): 15", detailsRu: [] },
    } } };
    const before = JSON.stringify({ tape, parameters });
    const specifications = canonicalArtifactSpecificationParts(tape, parameters);
    expect(specifications.flatMap(spec => spec.parts)).toEqual([
      "Ширина (мм): 300", "Толщина (мм): 1.5", "Длина рулона (м): 15",
    ]);
    expect(specifications[0]).toMatchObject({ parameterId: "width", value: "300" });
    expect(buildCanonicalProcurementProjection({ revision: { ...revision, input_parameters: parameters }, procurementRows: [tape] }).rows[0])
      .toMatchObject({ quantity: "15", unitId: "m", specifications });
    expect(JSON.stringify({ tape, parameters })).toBe(before);
  });

  it("preserves known dimensions and legacy specifications without inheriting a label", () => {
    const partial = { ...rows[0]!, calculation_trace: { resourceGraph: { titleSpecificationParameterIds: ["width", "thickness"],
      titleSpecificationParameterLabelsRu: { width: "Ширина (мм)", thickness: "Толщина (мм)" } } } };
    expect(canonicalArtifactSpecificationParts(partial, { width: 300 }).flatMap(spec => spec.parts)).toEqual(["Ширина (мм): 300"]);
    const legacy = { ...rows[0]!, calculation_trace: { resourceGraph: { titleSpecificationParameterIds: ["constructor"],
      titleSpecificationParameterLabelsRu: Object.create({ constructor: "Чужая подпись" }) } } };
    expect(canonicalArtifactSpecificationParts(legacy, { constructor: 7 }).flatMap(spec => spec.parts)).toEqual(["7"]);
  });
  it("presents a known product version in saved resources without rewriting quantities or source rows", () => {
    const row = { ...rows[0], title_ru: "CT127en_GL: сухой порошок — CT127_EN_GL_0120", calculation_trace: { resourceGraph: { titleSpecificationParameterIds: ["ct127_delivered_version"] } } };
    const before = JSON.stringify(row);
    expect(canonicalArtifactVisibleRowTitle(row)).toBe("Ceresit CT 127, версия en GL: сухой порошок — Ceresit CT 127, технический лист en GL 01.2020");
    expect(JSON.stringify(row)).toBe(before);
    expect(canonicalArtifactVisibleRowTitle({ ...row, title_ru: "Фактический продукт — CUSTOM_MODEL_127" })).toBe("Фактический продукт — CUSTOM_MODEL_127");
  });
  it("corrects only published asphalt grammar while preserving manual names and selected facts", () => {
    const row = {...rows[0]!,row_id:'f09:asphalt_floor_covering_demolition:waste-plan',
      title_ru:'Обращение со снятой асфальтовым или асфальтобетонным покрытием пола — Материалы остаются на объекте'};
    const before = JSON.stringify(row);
    expect(canonicalArtifactVisibleRowTitle(row)).toBe('Обращение со снятым асфальтовым или асфальтобетонным покрытием пола — Материалы остаются на объекте');
    expect(JSON.stringify(row)).toBe(before);
    expect(canonicalArtifactVisibleRowTitle({...row,calculation_trace:{manualTitleOverride:true}})).toBe(row.title_ru);
    expect(canonicalArtifactVisibleRowTitle({...row,row_id:'other-work'})).toBe(row.title_ru);
  });
  it("keeps material kits within an equipment operation as materials without changing procurement data", () => {
    const kit = { ...rows[0], section: "Оборудование армирования", title_ru: "Полный комплект оснастки станка", unit_id: "set", quantity: "3" };
    expect(canonicalArtifactSection(kit)).toBe("Материалы");
    const projection = buildCanonicalProcurementProjection({ revision, procurementRows: [kit] });
    expect(projection.rows[0]).toMatchObject({ category: "material", section: "Оборудование армирования", unitId: "set", quantity: "3" });
    expect(canonicalArtifactSection({ category: "equipment", section: "Оборудование армирования" })).toBe("Оборудование");
  });
  it.each([
    { titleSpecificationParameterIds: ["selected_vibrator"], titleSpecificationMode: "APPEND" },
    { titleSpecificationParameterId: "selected_vibrator" },
    { titleSpecificationParameterIds: ["selected_vibrator"], titleSpecificationMode: "REPLACE" },
  ])("retains an explicitly selected specification in public documents: %p", resourceGraph => {
    const title = "Глубинный вибратор для уплотнения бетонной смеси — DEMO: compatible head45, shaft2m and actual kit";
    const row = { ...rows[0], title_ru: title, calculation_trace: { resourceGraph } };
    expect(canonicalArtifactVisibleRowTitle(row)).toBe(title);
    const projection = buildCanonicalProcurementProjection({ revision, procurementRows: [row] });
    expect(projection.rows[0]?.titleRu).toBe(title);
    expect(row.title_ru).toBe(title);
    expect(row.quantity).toBe("12.5");
  });
  it("keeps established public aliases on rows without declared specification parameters", () => {
    expect(canonicalArtifactVisibleRowTitle({ title_ru: "Глубинный вибратор для уплотнения бетонной смеси" })).toBe("Глубинный вибратор");
    expect(canonicalArtifactVisibleRowTitle({ title_ru: "Глубинный вибратор для уплотнения бетонной смеси", calculation_trace: { resourceGraph: { titleSpecificationParameterIds: [] } } })).toBe("Глубинный вибратор");
  });
  it("selects immutable revision rows once for PDF and procurement", () => {
    const selection = selectCanonicalArtifactRows(rows);
    expect(selection.estimateRows.map((row) => row.row_id)).toEqual(["material", "labor"]);
    expect(selection.professionalPdfRows.map((row) => row.row_id)).toEqual(["material", "labor"]);
    expect(selection.procurementRows.map((row) => row.row_id)).toEqual(["material"]);
    expect(canonicalArtifactQuantity(selection.procurementRows[0]?.quantity)).toBe("12,5");
  });

  it("builds the one canonical procurement projection and artifact provenance", () => {
    const selection = selectCanonicalArtifactRows(rows);
    const projection = buildCanonicalProcurementProjection({ revision, procurementRows: selection.procurementRows });
    expect(projection.schemaVersion).toBe("canonical_estimate_procurement_r12");
    expect(projection.rows).toHaveLength(1);
    expect(projection.rows[0]?.quantity).toBe("12.5");
    expect(buildCanonicalArtifactMetadata({
      operation: "procurement",
      renderer: "test",
      revision,
      sourceRowCount: selection.sourceRows.length,
      projectedRowCount: selection.procurementRows.length,
      selectedProcurementRowCount: selection.procurementRows.length,
    })).toMatchObject({ sourceRowCount: 3, projectedRowCount: 1, selectedProcurementRowCount: 1 });
  });

  it("keeps preliminary needs visible but outside totals and procurement", () => {
    const preliminaryNeeds = canonicalArtifactPreliminaryNeeds({
      ...revision,
      amendment_contract: {
        parameterSources: {
          preliminaryNeeds: [{
            row_id: "primer",
            ordinal: 7,
            section: "materials",
            category: "material",
            title_ru: "Совместимая грунтовка",
            unit_id: "kg",
            quantity: null,
            unit_price: null,
            need_state: "QUANTITY_REQUIRED",
            missing_parameter_ids: ["primer_consumption_kg_m2"],
            selected: true,
            procurement_eligible: true,
            need_sha256: "f".repeat(64),
          }],
        },
      },
    });

    expect(preliminaryNeeds).toHaveLength(1);
    expect(preliminaryNeeds[0]).toMatchObject({
      row_id: "primer",
      quantity: null,
      included_in_estimate: false,
      included_in_procurement: false,
      procurement_eligible: false,
      ownership_status: "PRELIMINARY_NEED",
    });
    expect(selectCanonicalArtifactRows([...rows, ...preliminaryNeeds]).procurementRows)
      .toHaveLength(1);
  });

  it("records the complete production identity for the professional PDF artifact", () => {
    const metadata = buildCanonicalArtifactMetadata({
      operation: "professional_pdf",
      renderer: "canonical-professional-pdf.r4-a6",
      revision,
      sourceRowCount: 3,
      projectedRowCount: 2,
      selectedProcurementRowCount: 1,
      definitionVersionId: "definition-version-1",
      pageCount: 4,
      grandTotalStatus: "PARTIAL_NEEDS_PRICE",
    });
    expect(metadata).toMatchObject({
      artifactKind: "professional_pdf",
      revisionId: "revision-1",
      definitionVersionId: "definition-version-1",
      sourceReleaseId: "release-1",
      sourceRevisionChecksumSha256: "a".repeat(64),
      sourceRowCount: 3,
      rowCount: 2,
      grandTotalStatus: "PARTIAL_NEEDS_PRICE",
      pageCount: 4,
      generatorVersion: "canonical-professional-pdf.r4-a6",
      templateVersion: "professional-estimate-pdf:41",
    });
    expect(canonicalProfessionalArtifactMetadataIdentityMatches({
      metadata,
      revision: { ...revision, definition_version_id: "definition-version-1" },
    })).toBe(true);
    expect(canonicalProfessionalArtifactMetadataIdentityMatches({
      metadata: { ...metadata, pageCount: null },
      revision: { ...revision, definition_version_id: "definition-version-1" },
    })).toBe(false);
    expect(canonicalProfessionalArtifactMetadataIdentityMatches({
      metadata: { ...metadata, definitionVersionId: "wrong-definition" },
      revision: { ...revision, definition_version_id: "definition-version-1" },
    })).toBe(false);
    expect(canonicalProfessionalArtifactMetadataIdentityMatches({
      metadata: { templateVersion: "professional-estimate-pdf:4" },
      revision,
    })).toBe(true);
  });

  it.each([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])("keeps the bound metadata checks for historical PDF template %s", (version) => {
    const historicalRevision = { ...revision, definition_version_id: "definition-version-1" };
    const metadata = {
      templateVersion: `professional-estimate-pdf:${version}`,
      artifactKind: "professional_pdf",
      revisionId: "revision-1",
      definitionVersionId: "definition-version-1",
      pageCount: 4,
      grandTotalStatus: "PARTIAL_NEEDS_PRICE",
    };
    const matches = (candidate: Record<string, unknown>) => canonicalProfessionalArtifactMetadataIdentityMatches({
      metadata: candidate,
      revision: historicalRevision,
    });
    expect(matches(metadata)).toBe(true);
    expect(matches({ ...metadata, revisionId: "other-revision" })).toBe(false);
    expect(matches({ ...metadata, definitionVersionId: "other-definition" })).toBe(false);
    expect(matches({ ...metadata, pageCount: null })).toBe(false);
    expect(matches({ ...metadata, pageCount: 1.5 })).toBe(false);
    expect(matches({ ...metadata, artifactKind: "procurement" })).toBe(false);
    expect(matches({ ...metadata, grandTotalStatus: null })).toBe(false);
  });

  it.each([
    "professional-estimate-pdf:12",
    "professional-estimate-pdf:0",
    "professional-estimate-pdf:06",
    "professional-estimate-pdf:6-extra",
    "professional-estimate-pdf:",
  ])("rejects an unsupported or malformed PDF template identity %s", (templateVersion) => {
    expect(canonicalProfessionalArtifactMetadataIdentityMatches({ metadata: { templateVersion }, revision })).toBe(false);
  });
});

describe('full saved-row operation acceptance before artifact filtering', () => {
  const operation={contractVersion:'canonical-operation-resource/v1',groupId:'mount',groupTitleRu:'Монтаж',
    operationId:'fix',operationTitleRu:'Закрепить устройство',completionCriterionRu:'Устройство закреплено'};
  const resource=(rowId:string, quantity:string|null)=>({row_id:rowId,title_ru:'Крепёж',quantity,
    included_in_estimate:false,included_in_procurement:false,ownership_status:'PRELIMINARY_NEED',
    calculation_trace:{resourceGraph:{operationCompositionV1:operation,publicResourcePresentationV1:{
      contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:'Крепёж',nameRu:'Крепёж',
      brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:'MATERIAL'}}}});
  it('keeps an unresolved independent need draft-visible without claiming completeness or mutating history',()=>{
    const saved={...revision,input_parameters:{},amendment_contract:{parameterSources:{}}};
    const resources=[resource('fixings',null)];const before=JSON.stringify({saved,resources});
    const result=canonicalEstimateSavedOperationAcceptanceV1({revision:saved,resources});
    expect(result.status).toBe('COMPOSITION_UNVERIFIED');expect(result.pdfAllowed).toBe(false);
    expect(result.completeClaimAllowed).toBe(false);expect(result.issues).toContainEqual({code:'RESOURCE_QUANTITY_UNRESOLVED'});
    expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(result)).toThrow(expect.objectContaining({
      code:'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED',httpStatus:409,message:'Состав подработ не проверен. PDF пока недоступен.'}));
    expect(JSON.stringify({saved,resources})).toBe(before);
  });
  it('does not lose an invalid excluded row before the common structure guard',()=>{
    const resources=[resource('good','1'),{...resource('unassigned',null),calculation_trace:{}}];
    const result=canonicalEstimateSavedOperationAcceptanceV1({revision,resources});
    expect(result.status).toBe('STRUCTURE_INVALID');
    expect(result.issues).toContainEqual({code:'RESOURCE_OPERATION_MISSING',rowId:'unassigned'});
    expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(result)).toThrow(expect.objectContaining({code:'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID',httpStatus:409}));
  });
  it('keeps explicit manual names and shared operation identities without creating a second row',()=>{
    const first=resource('fixings','1');
    const related={...resource('tool','1'),title_ru:'Мой инструмент',calculation_trace:{manualTitleOverride:true,
      resourceGraph:{...first.calculation_trace.resourceGraph,operationCompositionV1:{...operation,
        additionalOperations:[{operationId:'check',operationTitleRu:'Проверить крепление',completionCriterionRu:'Крепление проверено'}]}}}};
    const resources=[first,related];const before=JSON.stringify(resources);
    const result=canonicalEstimateSavedOperationAcceptanceV1({revision,resources});
    expect(result.pdfAllowed).toBe(false);expect(result.completeClaimAllowed).toBe(false);
    expect(result.issues.some(issue=>issue.code==='PUBLIC_RESOURCE_NAME_UNVERIFIED')).toBe(false);
    expect(resources).toHaveLength(2);expect(JSON.stringify(resources)).toBe(before);
  });
});

it('does not call an explicit labor/work row physical when its generic operation has the same name',()=>{
  const operation={contractVersion:'canonical-operation-resource/v1',groupId:'work',groupTitleRu:'Работы',
    operationId:'mount',operationTitleRu:'Монтаж',completionCriterionRu:'Монтаж выполнен'};
  for(const category of ['labor','work']) {
    const resources=[{row_id:'labor',title_ru:'Монтаж',quantity:null,category,
      calculation_trace:{resourceGraph:{operationCompositionV1:operation}}}];
    const result=canonicalEstimateSavedOperationAcceptanceV1({revision,resources});
    expect(result.pdfAllowed).toBe(false);expect(result.completeClaimAllowed).toBe(false);
    expect(result.issues.some(issue=>issue.code==='RESOURCE_USED_AS_OPERATION')).toBe(false);
  }
  const unresolved=[{row_id:'resource',title_ru:'Монтаж',quantity:null,category:'unclassified',
    calculation_trace:{resourceGraph:{operationCompositionV1:operation}}}];
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision,resources:unresolved}).issues)
    .toContainEqual({code:'RESOURCE_USED_AS_OPERATION',rowId:'resource',operationId:'mount'});
});

it('retains exact native saved5 membership as a readable draft while holding new PDF and blocks checksum drift without substituting current source',()=>{
  const fixture=JSON.parse(JSON.stringify(savedFanAcceptanceFixture));const before=JSON.stringify(fixture);
  expect(fixture.resources).toHaveLength(19);
  const result=canonicalEstimateSavedOperationAcceptanceV1(fixture);
  expect(result.status).toBe('COMPOSITION_UNVERIFIED');expect(result.pdfAllowed).toBe(false);
  expect(result.completeClaimAllowed).toBe(false);expect(result.definitionAdmissionAllowed).toBe(false);
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(result)).toThrow(expect.objectContaining({
    code:'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED',httpStatus:409}));
  const drift=canonicalEstimateSavedOperationAcceptanceV1({...fixture,
    revision:{...fixture.revision,checksum_sha256:'0'.repeat(64)}});
  expect(drift.pdfAllowed).toBe(false);expect(drift.status).toBe('STRUCTURE_INVALID');
  expect(JSON.stringify(fixture)).toBe(before);
});

it('retains original source-title parity across public and manual aliases without guessing absent source metadata',()=>{
  const sourceTitle='Крепёж из исходного комплекта';
  const operation={contractVersion:'canonical-operation-resource/v1',groupId:'fix',groupTitleRu:'Крепление',
    operationId:'bad-heading',operationTitleRu:sourceTitle,completionCriterionRu:'Историческая запись'};
  const descriptor={contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:sourceTitle,
    nameRu:'Крепёж',brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:'MATERIAL'};
  const source={row_id:'source',title_ru:sourceTitle,quantity:null,category:'material',
    calculation_trace:{resourceGraph:{operationCompositionV1:operation,publicResourcePresentationV1:descriptor}}};
  const audit=(resource:Record<string,unknown>)=>canonicalEstimateSavedOperationAcceptanceV1({revision,resources:[resource]});
  expect(audit(source).issues).toContainEqual({code:'RESOURCE_USED_AS_OPERATION',rowId:'source',operationId:'bad-heading'});
  const manual={...source,title_ru:'Мой крепёж',calculation_trace:{...source.calculation_trace,manualTitleOverride:true}};
  expect(audit(manual).issues).toContainEqual({code:'RESOURCE_USED_AS_OPERATION',rowId:'source',operationId:'bad-heading'});
  const noSavedSource={...manual,calculation_trace:{manualTitleOverride:true,resourceGraph:{operationCompositionV1:operation}}};
  expect(audit(noSavedSource).pdfAllowed).toBe(false);expect(audit(noSavedSource).completeClaimAllowed).toBe(false);
});

test.each(['PROCESS_NOTE','CALCULATION_DETAIL'])(
  'shared classification keeps actual ceiling labor UNKNOWN despite %s and omits genuine scope/counters',rowKind=>{
    const source=unresolvedCeiling.need,trace=source.calculation_trace;
    const need={...source,ownership_status:'PRELIMINARY_NEED',need_state:'QUANTITY_REQUIRED',quantity:null,
      amount:null,unit_price:null,included_in_estimate:false,included_in_procurement:false,
      calculation_trace:{...trace,resourceGraph:{...trace.resourceGraph,
        operationCompositionV1:null,
        publicResourcePresentationV1:{...trace.resourceGraph.publicResourcePresentationV1,rowKind}}}};
    const counterTitle='Проверочный счётчик расхода';
    const counter={row_id:'explicit-counter',title_ru:counterTitle,category:'material',unit_id:'item',
      ownership_status:'OWNED',quantity:'1',unit_price:null,amount:null,
      included_in_estimate:false,included_in_procurement:false,
      calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE',purchaseBalanceOwnerRowId:'owner-counter-supply',
        publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
          sourceTitleRu:counterTitle,nameRu:counterTitle,brandAndModelRu:null,specificationRu:null,detailsRu:[],
          rowKind:'CALCULATION_DETAIL'}}}};
    const scope={...counter,row_id:'scope',calculation_trace:{resourceGraph:{scopeRequirementDecisionV1:{
      contractVersion:'canonical-scope-requirement-decision/v1',rowId:'scope',groupId:'ceiling',groupTitleRu:'Потолок',
      titleRu:'Проверка основания',reasonRu:'Нужны данные объекта',kind:'OBJECT_SCOPE',status:'OBJECT_FACT_REQUIRED',
      coveringRowIds:[],originalRowIds:[],missingObjectFactParameterIds:['base'],numericNormAccepted:false,separatePaymentAccepted:false}}}};
    const resources=[need,counter,scope];const before=JSON.stringify(resources);
    expect(canonicalPublicSavedResourceRowKindV1(need)).toBe('RESOURCE');
    expect(canonicalPublicSavedResourceRowKindV1(counter)).toBe('CALCULATION_DETAIL');
    const result=canonicalEstimateSavedOperationAcceptanceV1({revision,resources});
    expect(result.issues).toContainEqual({code:'RESOURCE_OPERATION_MISSING',rowId:need.row_id});
    expect(result.issues).toContainEqual({code:'RESOURCE_QUANTITY_UNRESOLVED'});
    expect(result.issues.some(issue=>issue.rowId==='explicit-counter')).toBe(false);
    expect(result.issues.filter(issue=>issue.rowId==='scope')).toEqual([{code:'RESOURCE_CONDITION_UNRESOLVED',rowId:'scope'}]);
    expect(result.pdfAllowed).toBe(false);expect(JSON.stringify(resources)).toBe(before);
  });

it('separates archived metadata identity from current PDF issuance and preserves old bytes/source',()=>{
  const renderer='canonical-professional-pdf.r4-a13-verified-operation-composition-template89';
  const saved={...revision,definition_version_id:'definition-version-1'};
  const current=buildCanonicalArtifactMetadata({operation:'professional_pdf',renderer,revision:saved,
    sourceRowCount:3,projectedRowCount:3,selectedProcurementRowCount:0,definitionVersionId:'definition-version-1',
    pageCount:1,grandTotalStatus:'PARTIAL_NEEDS_PRICE'});
  const archived={...current,templateVersion:'professional-estimate-pdf:36',
    renderer:'canonical-professional-pdf.r4-a13-plain-resource-names-legacy4-template84',
    generatorVersion:'canonical-professional-pdf.r4-a13-plain-resource-names-legacy4-template84'};
  const before=JSON.stringify({saved,current,archived});
  expect(canonicalProfessionalArtifactMetadataIdentityMatches({metadata:archived,revision:saved})).toBe(true);
  expect(()=>assertCanonicalProfessionalArtifactCurrentPresentationV1({metadata:current,revision:saved,rendererVersion:renderer})).not.toThrow();
  const previous={...current,templateVersion:'professional-estimate-pdf:40',
    renderer:'canonical-professional-pdf.r4-a13-verified-operation-composition-template88',
    generatorVersion:'canonical-professional-pdf.r4-a13-verified-operation-composition-template88'};
  expect(canonicalProfessionalArtifactMetadataIdentityMatches({metadata:previous,revision:saved})).toBe(true);
  for(const metadata of [archived,previous,{...current,renderer:'old'},{...current,generatorVersion:'old'},
    {...current,pageCount:null},{...current,definitionVersionId:'other'},
    {...current,sourceRevisionChecksumSha256:'0'.repeat(64)},{...current,sourceReleaseId:'other'},
    {...current,sourceRowCount:2},{...current,sourceCatalogId:'other'}])
    expect(()=>assertCanonicalProfessionalArtifactCurrentPresentationV1({metadata,revision:saved,rendererVersion:renderer}))
      .toThrow(expect.objectContaining({code:'ARTIFACT_PRESENTATION_REFRESH_REQUIRED'}));
  expect(JSON.stringify({saved,current,archived})).toBe(before);
});

it('cold-reads the exact server passport snapshot, rejects drift and never upgrades an old revision from caller evidence',()=>{
  // Synthetic complete single-operation contract, not an actual project readback.
  const op={contractVersion:'canonical-operation-resource/v1',groupId:'test-group',groupTitleRu:'Работа',
    operationId:'test-install',operationTitleRu:'Выполнить монтаж',completionCriterionRu:'Монтаж закончен',
    processOrdinal:1,processRole:'PROCESS'};
  const specification=[['MATERIAL','Материал'],['CONSUMABLE','Расходный материал'],['TOOL','Инструмент'],
    ['ACCESSORY','Оснастка'],['EQUIPMENT','Оборудование'],['MECHANISM','Механизм'],['LABOR','Труд монтажника'],
    ['SERVICE','Услуга'],['TRANSPORT','Доставка'],['PPE','Средства защиты']] as const;
  const map={contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',
    generatedFromCurrentRows:false,evidenceSha256:'e'.repeat(64),operationRoster:[op],
    entries:specification.map(([kind,name])=>({operationId:'test-install',expectedResourceId:'test-'+kind,
      condition:'Синтетический полный комплект',sourceId:'test-source',requiredOperationIds:['test-install'],
      publicNameRu:name,resourceKind:kind,resolution:{kind:'ROW',rowId:'test-'+kind}})),
    operationRequirements:[{operationId:'test-install',sourceId:'test-source',
      requirements:Object.fromEntries(specification.map(([kind])=>[kind,{status:'REQUIRED',rowIds:['test-'+kind]}]))}]};
  const passport={definition_version_id:'pinned-definition',payload_sha256:'c'.repeat(64),
    decision:{independentCompletenessMap:map}};
  const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:'pinned-release',
    definitionVersionId:'pinned-definition',passport})!;
  expect(evidence.mapSha256).toBe(createHash('sha256').update(canonicalEstimateStableJson(map),'utf8').digest('hex'));
  const projection={rows:['fixed'],operationCompositionEvidenceV1:evidence};
  const checksum=createHash('sha256').update(canonicalEstimateStableJson(projection),'utf8').digest('hex');
  const commit=buildCanonicalRevisionCommitPayload({rowCount:10,currencyCode:'KGS',totals:{},
    checksumSha256:checksum,compilerVersion:'synthetic',parameters:{},approvedTemplateBaselineId:null,
    baselineAssumptions:{},effectiveUserParameters:{},parentRevisionId:null,identityContract:{},
    operationCompositionEvidenceV1:evidence});
  expect(commit.parameterSources).toMatchObject({operationCompositionEvidenceV1:evidence});
  expect(commit.checksumSha256).toBe(checksum);
  expect(checksum).not.toBe(createHash('sha256').update(canonicalEstimateStableJson({rows:['fixed']}),'utf8').digest('hex'));
  const saved={...revision,release_id:'pinned-release',definition_version_id:'pinned-definition',
    amendment_contract:{parameterSources:{operationCompositionEvidenceV1:evidence}}};
  const resources=specification.map(([kind,name])=>({row_id:'test-'+kind,title_ru:name,quantity:'1',unit_id:kind==='LABOR'?'man_hour':kind==='TRANSPORT'?'trip':'piece',
    calculation_trace:{resourceGraph:{operationCompositionV1:op,publicResourcePresentationV1:{
      contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:name,nameRu:name,
      brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:kind}}}}));
  const cold=JSON.parse(JSON.stringify(saved));const before=JSON.stringify({saved,resources,passport});
  const result=canonicalEstimateSavedOperationAcceptanceV1({revision:cold,resources});
  expect(result.status).toBe('ACCEPTED');expect(result.completeClaimAllowed).toBe(true);
  expect(canonicalSavedOperationCompositionEvidenceV1(cold).independentComposition).toEqual(map);
  const manual=resources.map(row=>({...row,title_ru:'Моё название',calculation_trace:{...row.calculation_trace,manualTitleOverride:true}}));
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:cold,resources:manual}).status).toBe('ACCEPTED');
  const unknown=resources.map((row,index)=>index?row:{...row,quantity:null});
  const quantityOnly=canonicalEstimateSavedOperationAcceptanceV1({revision:cold,resources:unknown});
  expect(quantityOnly).toMatchObject({status:'COMPOSITION_UNVERIFIED',pdfAllowed:true,completeClaimAllowed:false});
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(quantityOnly)).not.toThrow();
  for(const unit_id of ['', '   ', null]){
    const unknownUnit=resources.map((row,index)=>index?row:{...row,unit_id});
    const held=canonicalEstimateSavedOperationAcceptanceV1({revision:cold,resources:unknownUnit});
    expect(held).toMatchObject({status:'COMPOSITION_UNVERIFIED',pdfAllowed:false,completeClaimAllowed:false});
    expect(held.issues).toContainEqual({code:'RESOURCE_UNIT_UNRESOLVED',rowId:'test-MATERIAL'});
    expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(held)).toThrow(expect.objectContaining({code:'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED',httpStatus:409}));
  }
  const legacy={...saved,amendment_contract:{}};
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:legacy,resources}).status).toBe('COMPOSITION_UNVERIFIED');
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:legacy,resources,savedIndependentComposition:map}).pdfAllowed).toBe(false);
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:cold,resources,savedIndependentComposition:map}).status).toBe('ACCEPTED');
  for(const bad of [null,{...evidence,mapSha256:'0'.repeat(64)},
    {...evidence,releaseId:'other'},{...evidence,definitionVersionId:'other'},
    {...evidence,sourcePassportPayloadSha256:'missing'},
    {...evidence,independentComposition:{...map,operationRoster:[]}}]){
    const changed={...saved,amendment_contract:{parameterSources:{operationCompositionEvidenceV1:bad}}};
    expect(()=>canonicalEstimateSavedOperationAcceptanceV1({revision:changed,resources})).not.toThrow();
    expect(canonicalEstimateSavedOperationAcceptanceV1({revision:changed,resources})).toMatchObject({status:'STRUCTURE_INVALID',pdfAllowed:false});
  }
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:cold,resources,
    savedIndependentComposition:{...map,entries:[]}}).pdfAllowed).toBe(false);
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:cold,resources:resources.slice(1)}).pdfAllowed).toBe(false);
  const expandedMap={...map,entries:[...map.entries,{...map.entries[0],expectedResourceId:'not-output-derived',
    resolution:{kind:'ROW',rowId:'required-but-absent'}}]};
  const expandedEvidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:'pinned-release',
    definitionVersionId:'pinned-definition',passport:{...passport,decision:{independentCompletenessMap:expandedMap}}})!;
  const expandedSaved={...saved,amendment_contract:{parameterSources:{operationCompositionEvidenceV1:expandedEvidence}}};
  expect(canonicalSavedOperationCompositionEvidenceV1(expandedSaved).independentComposition).toEqual(expandedMap);
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:expandedSaved,resources}).issues)
    .toContainEqual({code:'REQUIRED_RESOURCE_MISSING',rowId:'required-but-absent'});
  const malformedEvidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:'pinned-release',
    definitionVersionId:'pinned-definition',passport:{...passport,decision:{independentCompletenessMap:{...map,operationRoster:[]}}}})!;
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:{...saved,amendment_contract:{parameterSources:{
    operationCompositionEvidenceV1:malformedEvidence}}},resources}).pdfAllowed).toBe(false);
  expect(()=>canonicalOperationCompositionEvidenceFromPassportV1({releaseId:'pinned-release',definitionVersionId:'other',passport})).toThrow();
  expect(JSON.stringify({saved,resources,passport})).toBe(before);
});


it('R873 preserves known unverified scope through historical cold rows without manufacturing missing numeric inputs',()=>{
  // Synthetic saved contract only. The real Core/cold path is also exercised by
  // the existing whole BMS capacity case; this covers historical ordinary rows.
  const scope={contractVersion:'canonical-scope-requirement-decision/v1',rowId:'test-known-scope',
    groupId:'test-scope',groupTitleRu:'Проверка применимости',titleRu:'Подтвердить область применения',
    reasonRu:'Выбранная технология не подтверждена для известной нагрузки',kind:'OBJECT_SCOPE',status:'SCOPE_UNVERIFIED',
    coveringRowIds:[],originalRowIds:[],missingObjectFactParameterIds:[],numericNormAccepted:false,separatePaymentAccepted:false};
  const resource={row_id:scope.rowId,title_ru:scope.titleRu,quantity:'1',unit_price:null,
    included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,
    calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE',scopeRequirementDecisionV1:scope}}};
  const cold=JSON.parse(JSON.stringify(resource)) as typeof resource,before=JSON.stringify(cold);
  const result=canonicalEstimateSavedOperationAcceptanceV1({revision,resources:[cold]});
  expect(result.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:scope.rowId});
  expect(result.pdfAllowed).toBe(false);
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(result)).toThrow(expect.objectContaining({httpStatus:409,
    message:'Не подтверждены обязательные условия выполнения работы. PDF пока недоступен.'}));
  expect(cold.calculation_trace.resourceGraph.scopeRequirementDecisionV1.missingObjectFactParameterIds).toEqual([]);
  expect(JSON.stringify(cold)).toBe(before);
  // A future process duty is intentionally not an unverified application fact.
  const future={...cold,calculation_trace:{resourceGraph:{...cold.calculation_trace.resourceGraph,
    scopeRequirementDecisionV1:{...scope,kind:'PROCESS',status:'PROCESS_REQUIRED'}}}};
  const futureResult=canonicalEstimateSavedOperationAcceptanceV1({revision,resources:[future]});
  expect(futureResult.issues.some(issue=>issue.code==='RESOURCE_CONDITION_UNRESOLVED')).toBe(false);
});

// New opt-in quantity rules only. Existing R642 tests/captures above are unchanged.
// Narrow the actual Core/saved JSON records before reading trace evidence.
const ct54PlanObject=(value:unknown):Record<string,unknown>=>{
 const isRecord=(candidate:unknown):candidate is Record<string,unknown>=>candidate!==null&&typeof candidate==='object'&&!Array.isArray(candidate);
 if(!isRecord(value))throw Error('CT54_TEST_EXPECTED_REAL_JSON_RECORD');return value;
},ct54PlanTrace=(row:unknown)=>ct54PlanObject(ct54PlanObject(row).calculation_trace);

const ct54PlanId=(key:string)=>'ct54_plan_'+key,
 ct54PlanDemo=():Record<string,unknown>=>{const p:Record<string,unknown>={area_m2:20,...ct54Reference.conditions,
  ct54_plan_roller_stations:2,ct54_plan_mixing_stations:1,ct54_plan_wash_stations:1,ct54_plan_crew_people:3,ct54_plan_control_stations:1,
  ct54_plan_replacement_covers:1,ct54_plan_replacement_brushes:0,ct54_plan_replacement_glove_pairs:2,
  ct54_plan_wash_cycles:4,ct54_plan_fresh_l_per_wash_cycle:2,ct54_plan_meter_start_kwh:10,ct54_plan_meter_end_kwh:10.08,
  ct54_plan_collected_liquid_l:9,ct54_plan_container_usable_l:4,ct54_plan_protection_cut_length_m:5,ct54_plan_protection_cut_width_m:1.6,
  ct54_plan_extra_attachment_tape_m:1.8,ct54_plan_record_count:8,ct54_plan_records_per_sheet:6,
  ct54_reference_qty_wipes:10,ct54_reference_qty_waste_bags:2,ct54_reference_qty_whole_cycle_labour:7.5};
  for(const key of ['organization_reference','replacement_reference','wash_reference','meter_reference','container_reference','protection_reference','journal_reference','direct_requirements_reference'])p[ct54PlanId(key)]='TEST_ONLY_CONFIRMED_PLAN_'+key;
  delete p.ct54_reference_method;return p;},
 ct54PlanCompile=async(submitted:Record<string,unknown>=ct54PlanDemo(),rowOverrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={},model=ct54ReferencePublicationModelR613('ACTUAL_PROJECT_PLAN_R1'))=>{
  const hashJson=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex'),
   compiled=await compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:ct54QuantityPlan.contract,
    catalogId:'canonical-work:base:plaster_paint_interior_paint_wall_paint_standard',primaryMeasureParameterId:'area_m2',parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
    submittedParameters:submitted,confirmedParameters:{ct54_reference_method:ct54Reference.conditions.ct54_reference_method},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:31,hashJson}),
   evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId:'TEST_ONLY_CT54_PLAN_RELEASE',definitionVersionId:'TEST_ONLY_CT54_PLAN_DEFINITION',passport:{definition_version_id:'TEST_ONLY_CT54_PLAN_DEFINITION',payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:ct54Reference.independentComposition}}})!,
   checksum=hashJson({...compiled.revisionProjection,operationCompositionEvidenceV1:evidence}),commit=buildCanonicalRevisionCommitPayload({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,
    compilerVersion:ct54QuantityPlan.contract,parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{ct54_reference_method:ct54Reference.conditions.ct54_reference_method},effectiveUserParameters:submitted,parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds,operationCompositionEvidenceV1:evidence}),
   saved={...revision,release_id:'TEST_ONLY_CT54_PLAN_RELEASE',definition_version_id:'TEST_ONLY_CT54_PLAN_DEFINITION',catalog_id:'canonical-work:base:plaster_paint_interior_paint_wall_paint_standard',row_count:compiled.rows.length,input_parameters:compiled.parameters,checksum_sha256:checksum,amendment_contract:{parameterSources:commit.parameterSources}},
   resources=[...compiled.rows,...canonicalArtifactPreliminaryNeeds(saved)];return{compiled,saved,resources,model};
 },ct54PlanRow=(result:Awaited<ReturnType<typeof ct54PlanCompile>>,key:string)=>{const resource=ct54Reference.resources.find(v=>v.rowId.endsWith(':'+key))!;return[...result.compiled.rows,...result.compiled.preliminaryNeeds].find(v=>v.row_id===resource.rowId);};

describe('SOURCE_ONLY CT54 actual project plan quantity rules in the existing ordinary owner',()=>{
 it('preserves the default current reference while opt-in replaces27operands and retains31resources/7operations/soleowners',()=>{
  const original=ct54ReferencePublicationModelR613(),d=ct54ReferencePublicationModelR613('ACTUAL_PROJECT_PLAN_R1');expect([original.parameters.length,original.formulas.length,original.resources.length]).toEqual([39,31,31]);expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([66,31,31]);
  expect(ct54QuantityPlan.parameters.filter(v=>v.valueType!=='text')).toHaveLength(19);expect(ct54QuantityPlan.rules.filter(v=>v.after==='DIRECT_MANUAL_UNCHANGED')).toHaveLength(3);expect(ct54QuantityPlan.independentNumericInputs).toBe(22);
  for(const old of original.resources){const next=d.resources.find(v=>v.row_id===old.row_id)!;expect([next.row_id,next.formula_id,next.unit_id,next.cost_owner_id,next.inclusion_ast,next.procurement_eligible,next.resource_graph.costTreatment]).toEqual([old.row_id,old.formula_id,old.unit_id,old.cost_owner_id,old.inclusion_ast,old.procurement_eligible,old.resource_graph.costTreatment]);
   const originalOperation=old.resource_graph.operationCompositionV1 as Record<string,unknown>,extraKey=old.row_id==='reference:wall-paint:ct54:water'?'paint':old.row_id==='material:wall-paint:tool:mixing-drill'?'clean-tools':null;
   expect(next.resource_graph.operationCompositionV1).toEqual(extraKey?{...originalOperation,additionalOperations:[...(Array.isArray(originalOperation.additionalOperations)?originalOperation.additionalOperations:[]),ct54Reference.operationRoster.find(op=>op.operationId===extraKey)]}:originalOperation);
   for(const id of old.resource_graph.inputParameterIds as string[])expect(next.resource_graph.inputParameterIds).toContain(id);
  }
  expect(d.formulas.find(v=>v.formula_id==='reference:wall-paint:ct54:ct54:reference-quantity')).toEqual(original.formulas.find(v=>v.formula_id==='reference:wall-paint:ct54:ct54:reference-quantity'));
  expect(ct54ReferencePublicationModelR613()).toEqual(original);expect(d.parameters.every(v=>v.default_value==null)).toBe(true);
 });
 it('explicit complete DEMO plan derives all31 quantities using22independentnumericfacts, not30manualresourcequantities',async()=>{
  const r=await ct54PlanCompile();expect(r.compiled.rows).toHaveLength(31);expect(r.compiled.preliminaryNeeds).toHaveLength(0);
  const q:Record<string,string>={ct54:'6',water:'8',electricity:'0.08','paint-roller':'3','paint-roller-frame':'2','roller-tray':'2','cut-in-brush':'2','telescopic-pole':'2','mixing-drill':'1','mixing-paddle':'1','mixing-bucket':'1','protection-film':'8','masking-tape':'15',wipes:'10','waste-bags':'2',gloves:'5','eye-protection':'3','work-clothing':'3','work-shoes':'3','clean-water-pail':'1','wash-pail':'1','wash-tray':'1','used-paint-container':'3','used-paint-container-lid':'3','air-thermometer':'1','surface-thermometer':'1','humidity-instrument':'1',clock:'1','record-sheet':'2','record-pen':'1','whole-cycle-labour':'7.5'};
  for(const[key,value]of Object.entries(q))expect(ct54PlanRow(r,key)?.quantity).toBe(value);
  expect(r.compiled.rows.filter(v=>v.included_in_estimate||v.included_in_procurement)).toHaveLength(0);expect(r.compiled.rows.every(v=>v.unit_price==null)).toBe(true);expect(ct54QuantityPlan.fullTechnicalAcceptance).toBe(false);
 });
 it('with actual derivedfacts but no3manualresiduals the ordinary result is28known+3UNKNOWN, and no invented wipes/bags/labour norm',async()=>{
  const p=ct54PlanDemo();for(const id of ['ct54_reference_qty_wipes','ct54_reference_qty_waste_bags','ct54_reference_qty_whole_cycle_labour'])delete p[id];const r=await ct54PlanCompile(p);expect(r.compiled.rows).toHaveLength(28);expect(r.compiled.preliminaryNeeds).toHaveLength(3);
  for(const key of ['wipes','waste-bags','whole-cycle-labour'])expect(ct54PlanRow(r,key)?.quantity).toBeNull();const gate=canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources});expect(gate).toMatchObject({pdfAllowed:true,completeClaimAllowed:false});
 });
 it('absent plan leaves6l sourcequantity and honest30needs; no documents/counts are silently borrowed fromDEMO',async()=>{
  const p:Record<string,unknown>={area_m2:20,...ct54Reference.conditions};delete p.ct54_reference_method;const r=await ct54PlanCompile(p);expect(r.compiled.rows).toHaveLength(1);expect(r.compiled.preliminaryNeeds).toHaveLength(30);expect(ct54PlanRow(r,'ct54')?.quantity).toBe('6');
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources}).pdfAllowed).toBe(false);
 });
 it('small wallarea changes onlysourcepaint, not PPE/tools/washwater or inheritedrawlabour',async()=>{
  const r=await ct54PlanCompile({...ct54PlanDemo(),area_m2:0.01});expect(ct54PlanRow(r,'ct54')?.quantity).toBe('0.003');expect(ct54PlanRow(r,'paint-roller')?.quantity).toBe('3');expect(ct54PlanRow(r,'whole-cycle-labour')?.quantity).toBe('7.5');expect(ct54PlanRow(r,'water')?.quantity).toBe('8');
 });
 it.each([0,-1,Number.NaN])('zero/invalid sourceprimary%s retains actualvalidator',async area=>{await expect(ct54PlanCompile({...ct54PlanDemo(),area_m2:area})).rejects.toThrow();});
 it('missing replacementcounts never assumes0; sharedframequantity remainsknown from the same organizationplan',async()=>{
  const p=ct54PlanDemo();delete p.ct54_plan_replacement_covers;delete p.ct54_plan_replacement_glove_pairs;const r=await ct54PlanCompile(p);expect(ct54PlanRow(r,'paint-roller')?.quantity).toBeNull();expect(ct54PlanRow(r,'gloves')?.quantity).toBeNull();expect(ct54PlanRow(r,'paint-roller-frame')?.quantity).toBe('2');
 });
 it.each([['roller_stations',0],['roller_stations',2.5],['roller_stations',4],['container_usable_l',0],['fresh_l_per_wash_cycle',0],['protection_cut_width_m',0],['wash_cycles',1],['record_count',3],['records_per_sheet',0],['meter_end_kwh',10],['meter_end_kwh',9.9]])('rejects impossible actualprimitive%s=%s',async(key,value)=>{await expect(ct54PlanCompile({...ct54PlanDemo(),[ct54PlanId(String(key))]:value})).rejects.toThrow();});
 it.each([[8,4,'2'],[8.001,4,'3'],[9,4.5,'2']])('collected%s litres/netcapacity%s gives%s originalcontainers andmatchinglids, independently of8lfreshwater',async(volume,capacity,count)=>{
  const r=await ct54PlanCompile({...ct54PlanDemo(),ct54_plan_collected_liquid_l:volume,ct54_plan_container_usable_l:capacity});expect(ct54PlanRow(r,'used-paint-container')?.quantity).toBe(count);expect(ct54PlanRow(r,'used-paint-container-lid')?.quantity).toBe(count);expect(ct54PlanRow(r,'water')?.quantity).toBe('8');
 });
 it('paper is rounded by actual journalcapacity; no new instruments/clock/pen perrecord orcoat',async()=>{
  const r=await ct54PlanCompile({...ct54PlanDemo(),ct54_plan_record_count:12,ct54_plan_records_per_sheet:6});expect(ct54PlanRow(r,'record-sheet')?.quantity).toBe('2');const more=await ct54PlanCompile({...ct54PlanDemo(),ct54_plan_record_count:13,ct54_plan_records_per_sheet:6});expect(ct54PlanRow(more,'record-sheet')?.quantity).toBe('3');for(const key of ['clock','record-pen','air-thermometer','surface-thermometer','humidity-instrument'])expect(ct54PlanRow(more,key)?.quantity).toBe('1');
 });
 it('actual traceID is mandatory even beside known allocatedquantity; one document never waives technicalconditions',async()=>{
  const p=ct54PlanDemo();delete p.ct54_plan_organization_reference;const r=await ct54PlanCompile(p),need=ct54PlanRow(r,'paint-roller-frame')!;expect(need).toMatchObject({quantity:'2',need_state:'CONDITION_REQUIRED'});expect(ct54PlanTrace(need).unresolvedConditionParameterIds).toContain('ct54_plan_organization_reference');
  const gate=canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources});expect(gate.pdfAllowed).toBe(false);expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(gate)).toThrow(expect.objectContaining({httpStatus:409}));
  const missing=ct54PlanDemo();delete missing.ct54_reference_waste_receiver;const all=await ct54PlanCompile(missing);expect(all.compiled.preliminaryNeeds).toHaveLength(31);expect(ct54PlanRow(all,'ct54')).toMatchObject({quantity:'6',need_state:'CONDITION_REQUIRED'});expect(canonicalEstimateSavedOperationAcceptanceV1({revision:all.saved,resources:all.resources}).pdfAllowed).toBe(false);
 });
 it.each(['ct54_reference_substrate','ct54_reference_access','ct54_reference_utilities','ct54_reference_compatible_tools_ppe','ct54_reference_conditions'])('known organizationaldocument cannot replace original%s condition',async key=>{
  const p=ct54PlanDemo();delete p[key];const r=await ct54PlanCompile(p);expect(r.compiled.preliminaryNeeds).toHaveLength(31);expect((ct54PlanRow(r,'ct54') as {missing_parameter_ids:string[]}).missing_parameter_ids).toContain(key);expect(canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources}).pdfAllowed).toBe(false);
 });
 it('retired27 rawquantityfields cannot silently override derivedtools/water;3 retainedmanualfields are explicit',async()=>{
  await expect(ct54PlanCompile({...ct54PlanDemo(),ct54_reference_qty_paint_roller:99})).rejects.toThrow();const r=await ct54PlanCompile({...ct54PlanDemo(),ct54_reference_qty_whole_cycle_labour:9});expect(ct54PlanRow(r,'whole-cycle-labour')?.quantity).toBe('9');
 });
 it('manual resource amendments retain one originalowner/sourceformula, distinguish automatic plan from manual actualquantity and never add payment',async()=>{
  const rowId='material:wall-paint:tool:paint-roller',r=await ct54PlanCompile(ct54PlanDemo(),{[rowId]:{quantity:'4',unitPrice:'2',titleRu:'Моя шубка валика',provenance:{kind:'manual',reason:'TEST_ONLY actualrow amendment, not sourcewear norm'}}});
  expect(ct54PlanRow(r,'paint-roller')).toMatchObject({quantity:'4',unit_price:'2',title_ru:'Моя шубка валика',included_in_estimate:false,included_in_procurement:false});expect(ct54PlanTrace(ct54PlanRow(r,'paint-roller')).calculatedQuantityBeforeOverride).toBe('3');expect(r.compiled.rows.filter(v=>v.row_id===rowId)).toHaveLength(1);expect(r.compiled.totals.amount).toBe('0');
 });
 it('saved/cold JSON preserves all31rows, same source refs/soleowners/conditions, and commonPDFgate checks the saved snapshot',async()=>{
  const r=await ct54PlanCompile(),cold=JSON.parse(JSON.stringify({saved:r.saved,resources:r.resources})),before=JSON.stringify(cold),gate=canonicalEstimateSavedOperationAcceptanceV1({revision:cold.saved,resources:cold.resources});expect(gate.pdfAllowed).toBe(true);expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(gate)).not.toThrow();expect(JSON.stringify(cold)).toBe(before);expect(cold.resources).toHaveLength(31);
  const frame=cold.resources.find((v:{row_id:string})=>v.row_id==='material:wall-paint:tool:paint-roller-frame');expect(ct54PlanObject(ct54PlanObject(ct54PlanTrace(frame).resourceGraph).operationCompositionV1).additionalOperations).toEqual(expect.arrayContaining([expect.objectContaining({operationId:'clean-tools'})]));expect(ct54PlanObject(ct54PlanTrace(frame).resourceGraph).inputParameterIds).toContain('ct54_plan_organization_reference');
 });
 it('existing source referencevalidator sees the same31formula/row/operation/unit bindings in the opt-in model',()=>{
  const d=ct54ReferencePublicationModelR613('ACTUAL_PROJECT_PLAN_R1');expect(validateCt54PlanReferences({completenessMap:ct54Reference.independentComposition,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true})).toEqual([]);expect(validateCt54PlanGraphs(d.formulas)).toEqual([]);
 });
});

it('SOURCE_ONLY CT54 opt-in uses the existing typed partial publisher and22driver witness for all30dependentrows without a fake norm',()=>{
 const c=prepareCt54PlanPublisher({quantityPlan:'ACTUAL_PROJECT_PLAN_R1',parentReleaseId:'TEST_ONLY_CURRENT_RELEASE',parentSearchReleaseId:'TEST_ONLY_SEARCH',currentReleasePath:'TEST_ONLY_REFERENCE_POINTER_COPY',selectedCurrentReleasePath:'TEST_ONLY_SELECTED_POINTER',referencePointerMode:'PREPARED_NOT_ACTIVE_COPY',outputRoot:'TEST_ONLY',expectedBranch:'TEST_ONLY',masterPath:'TEST_ONLY',masterSha256:'a'.repeat(64),currentDefinitionVersionId:'TEST_ONLY_CURRENT_DEF',currentDefinitionSha256:'b'.repeat(64),approvedTemplateBaselineId:'TEST_ONLY_BASELINE',capturedParentPath:'TEST_ONLY_CAPTURE',capturedParentByteSha256:'c'.repeat(64),expectedParentShape:[39,31,31],verifyTargetPrecondition:async()=>{throw Error('TEST_ONLY_NO_DB');},verifyCore:async()=>({status:'TEST_ONLY_NO_EXECUTION'})}),
  candidate=assembleCt54PlanCandidate(c,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate,
  scope={artifactSha256:String(candidate.newSource.artifact_sha256),normId:c.normId,sourceKey:c.sourceId,generatedSourceId:candidate.newSource.id,generatedLocatorIds:candidate.newLocators.map(v=>v.id),generatedLocatorKeys:candidate.newLocators.map(v=>v.locator_key)},
  scoped={...c,capturedScopedNormativeRegistry:captureCt54PlanRegistry(scope,{sourceRows:[],locatorRows:[]})};
 expect(validateCt54PlanPartial(scoped)).toEqual([]);const basis=c.passport.partialQuantityBasis;
 if(basis?.kind!=='DEFERRED_PROJECT_QUANTITIES')throw Error('CT54_TEST_DEFERRED_PROJECT_QUANTITY_BASIS_REQUIRED');
 expect(basis.parameters).toHaveLength(22);expect(basis.resourceRowIds).toHaveLength(30);
 expect(c.sourcePaths).toContain(ct54QuantityPlan.sourceDocumentPath);expect(c.sourceId).toBe(ct54QuantityPlan.sourceId);expect(c.resourceDefinitions.every(v=>!v.procurement_eligible&&v.resource_graph.costTreatment==='INFORMATIONAL_SCOPE')).toBe(true);
});

it('CT54 full existing typed preflight separates22quantity facts from8condition traceIDs and rejects stale/absent scopedsource',()=>{
 const config=prepareCt54FreshReadContext({quantityPlan:'ACTUAL_PROJECT_PLAN_R1',parentReleaseId:'TEST_ONLY_PREPARED_REFERENCE_RELEASE',parentSearchReleaseId:'TEST_ONLY_REFERENCE_SEARCH',currentReleasePath:'TEST_ONLY_REFERENCE_COPY',selectedCurrentReleasePath:'TEST_ONLY_SELECTED',referencePointerMode:'PREPARED_NOT_ACTIVE_COPY',outputRoot:'TEST_ONLY',expectedBranch:'TEST_ONLY',masterPath:'TEST_ONLY',masterSha256:'a'.repeat(64),currentDefinitionVersionId:'TEST_ONLY_PREPARED_REFERENCE_DEF',currentDefinitionSha256:'b'.repeat(64),approvedTemplateBaselineId:'TEST_ONLY_REFERENCE_BASELINE',capturedParentPath:'TEST_ONLY_FRESH_TWO_PARENT_CAPTURE',capturedParentByteSha256:'c'.repeat(64),expectedParentShape:[39,31,31],verifyTargetPrecondition:async()=>{throw Error('TEST_ONLY_NO_DB');},verifyCore:async()=>({status:'TEST_ONLY_NO_EXECUTION'})});
 const candidate=assembleCt54PlanCandidate(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate,
  scope={artifactSha256:String(candidate.newSource.artifact_sha256),normId:config.normId,sourceKey:config.sourceId,generatedSourceId:candidate.newSource.id,generatedLocatorIds:candidate.newLocators.map(v=>v.id),generatedLocatorKeys:candidate.newLocators.map(v=>v.locator_key)},
  scoped={...config,capturedScopedNormativeRegistry:captureCt54PlanRegistry(scope,{sourceRows:[],locatorRows:[]})},
  expectedQuantityIds=[...ct54QuantityPlan.parameters.filter(v=>v.valueType!=='text').map(v=>v.id),...ct54QuantityPlan.rules.filter(v=>v.after==='DIRECT_MANUAL_UNCHANGED').map(v=>v.quantityParameterId)].sort(),
  actualDeferred=config.parameterDefinitions.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT'&&['PROJECT_SPECIFIC_INPUT','CONDITIONAL_PROJECT_FACT'].includes(String(p.truth_metadata.value_source_role))&&!Object.hasOwn({...config.acceptanceInput,...config.runtimeProfileInput},p.parameter_id)).map(p=>p.parameter_id).sort();
 expect(actualDeferred).toEqual(expectedQuantityIds);expect(actualDeferred).toHaveLength(22);expect(validateCt54PlanPartial(scoped)).toEqual([]);
 for(const p of ct54QuantityPlan.parameters.filter(v=>v.valueType==='text')){
  const field=config.parameterDefinitions.find(v=>v.parameter_id===p.id)!;
  expect(field.truth_metadata.value_source_role).toBe('USER_INPUT');expect(field.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:'area_m2',value:0});
  expect(field.truth_metadata.resource_branch_consumers).not.toHaveLength(0);expect(Object.hasOwn(config.acceptanceInput,p.id)).toBe(false);
 }
 // The ordinary route throws its strict-absence guard before the generic
 // scoped!=null fallback can run. Exercise both actual entrypoints, not a guessed error suffix.
 const missingCapture='STOP_CT54_REFERENCE_PROJECT_SYSTEM_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED';
 expect(()=>resolveCt54ActualScopedRoute(candidate)).toThrow(missingCapture);
 expect(validateCt54PlanPartial(config)).toContain(missingCapture);
 const nullCapture={...config,capturedScopedNormativeRegistry:null as never},
  malformedCandidate=assembleCt54PlanCandidate(nullCapture,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
 expect(()=>resolveCt54ActualScopedRoute(malformedCandidate)).toThrow('STOP_CT54_REFERENCE_PROJECT_SYSTEM_SCOPED_REGISTRY_OPT_IN_RAW_PROJECTION_OBJECT');
 expect(validateCt54PlanPartial(nullCapture)).toContain('STOP_CT54_REFERENCE_PROJECT_SYSTEM_SCOPED_REGISTRY_OPT_IN_RAW_PROJECTION_OBJECT');
 const missingBinding={...scoped,binding:{...scoped.binding,additionalRowIds:scoped.binding.additionalRowIds!.slice(1)}};
 expect(validateCt54PlanPartial(missingBinding).some(e=>e.includes('EXACT_RESOURCE_BINDINGS'))).toBe(true);
 const sourceMismatch={...scoped,sourceMetadata:{...scoped.sourceMetadata,artifact_sha256:'e'.repeat(64)}};
 expect(validateCt54PlanPartial(sourceMismatch).length).toBeGreaterThan(0);
});

it('CT54 new plan source/locator scope is disjoint from the already published reference without changing its default identifiers',()=>{
 const base={parentReleaseId:'TEST_ONLY_PREPARED_REFERENCE_RELEASE',parentSearchReleaseId:'TEST_ONLY_REFERENCE_SEARCH',currentReleasePath:'TEST_ONLY_REFERENCE_COPY',selectedCurrentReleasePath:'TEST_ONLY_SELECTED',referencePointerMode:'PREPARED_NOT_ACTIVE_COPY' as const,outputRoot:'TEST_ONLY',expectedBranch:'TEST_ONLY',masterPath:'TEST_ONLY',masterSha256:'a'.repeat(64),currentDefinitionVersionId:'TEST_ONLY_PREPARED_REFERENCE_DEF',currentDefinitionSha256:'b'.repeat(64),approvedTemplateBaselineId:'TEST_ONLY_REFERENCE_BASELINE',capturedParentPath:'TEST_ONLY_FRESH_TWO_PARENT_CAPTURE',capturedParentByteSha256:'c'.repeat(64),expectedParentShape:[39,31,31] as const,verifyTargetPrecondition:async()=>{throw Error('TEST_ONLY_NO_DB');},verifyCore:async()=>({status:'TEST_ONLY_NO_EXECUTION'})},
  legacy=prepareCt54PlanPublisher(base),actual=prepareCt54PlanPublisher({...base,quantityPlan:'ACTUAL_PROJECT_PLAN_R1'});
 expect(legacy.locator.key).toBe('ct54-manual-reference-project-system-r608:31-resources-70-class-reviews:v1');
 expect(legacy.normId).toBe('PROJECT_SYSTEM:CT54_READY_GROUND_MANUAL_R608');
 expect(actual.locator.key).toBe('ct54-actual-project-quantity-plan-r1:31-resources-27-derived-rules:v1');
 expect(actual.normId).toBe('PROJECT_SYSTEM:CT54_ACTUAL_QUANTITY_PLAN_R1');
 expect(actual.sourceId).not.toBe(legacy.sourceId);
 expect(actual.parameterDefinitions).toHaveLength(66);expect(actual.formulaDefinitions).toHaveLength(31);expect(actual.resourceDefinitions).toHaveLength(31);
});
it('CT54 quantity materialization refuses the legacy incomplete R619 context before any SQL or old callback can run',async()=>{
 const query=jest.fn(),guard=jest.fn(async()=>{}),root={quantityPlan:'ACTUAL_PROJECT_PLAN_R1' as const,parentReleaseId:'TEST_ONLY',parentSearchReleaseId:'TEST_ONLY',currentReleasePath:'TEST_ONLY_REFERENCE_COPY',referencePointerMode:'PREPARED_NOT_ACTIVE_COPY' as const,outputRoot:'TEST_ONLY',expectedBranch:'TEST_ONLY',masterPath:'TEST_ONLY',masterSha256:'a'.repeat(64),verifyTargetPrecondition:guard,verifyCore:async()=>({status:'TEST_ONLY_NO_EXECUTION'})};
 await expect(captureCt54FreshPlan({query} as never,root,{expectedSourcePins:{},expectedReferencePointerSha256:'b'.repeat(64),expectedSelectedPointerSha256:'c'.repeat(64)}))
  .rejects.toThrow('STOP_CT54_QUANTITY_PLAN_FRESH_COMPLETE_CONTEXT_REQUIRED');
 expect(query).not.toHaveBeenCalled();expect(guard).not.toHaveBeenCalled();
});

// Contract cases only. They document the existing common classification; they
// do not change a numeric unknown into a failed technology or open a PDF gate.
function ct54CoherenceUnknownPlan():Record<string,unknown>{
 const values:Record<string,unknown>={area_m2:20,...ct54Reference.conditions};delete values.ct54_reference_method;
 for(const field of ct54QuantityPlan.parameters.filter(v=>v.valueType==='text'))values[field.id]='TEST_ONLY_RECONCILED_SECTION_'+field.key;
 return values;
}
const ct54NumericCoherenceKeys=['electricity','paint-roller','paint-roller-frame','roller-tray','cut-in-brush','telescopic-pole',
 'mixing-drill','mixing-paddle','mixing-bucket','clean-water-pail','wash-pail','wash-tray',
 'air-thermometer','surface-thermometer','humidity-instrument','clock','record-pen'];
it('CT54 all eight trace references with unknown numeric plan retain seventeen coherence needs and thirteen quantity needs',async()=>{
 const values=ct54CoherenceUnknownPlan(),r=await ct54PlanCompile(values);
 expect(r.compiled.rows).toHaveLength(1);expect(r.compiled.preliminaryNeeds).toHaveLength(30);
 expect(r.compiled.preliminaryNeeds.filter(n=>n.need_state==='CONDITION_REQUIRED')).toHaveLength(17);
 expect(r.compiled.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED')).toHaveLength(13);
 const numericIds=ct54QuantityPlan.parameters.filter(v=>v.valueType!=='text').map(v=>v.id);
 for(const key of ct54NumericCoherenceKeys){
  const row=ct54PlanRow(r,key)!;expect(row).toMatchObject({quantity:null,need_state:'CONDITION_REQUIRED'});
  const ids=ct54PlanTrace(row).unresolvedConditionParameterIds as string[];
  expect(ids.length).toBeGreaterThan(0);expect(ids.every(id=>numericIds.includes(id))).toBe(true);
  expect(ids.some(id=>id.startsWith('ct54_reference_'))).toBe(false);
 }
 expect(ct54PlanRow(r,'ct54')?.quantity).toBe('6');
 expect(ct54PlanRow(r,'water')).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});
 expect(ct54PlanTrace(ct54PlanRow(r,'water')).unresolvedConditionParameterIds??[]).toEqual([]);
 for(const id of Object.keys(ct54Reference.conditions).filter(id=>id!=='ct54_reference_method'))
  expect(r.compiled.parameters[id]).toBe(values[id]);
 const gate=canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources});
 expect(gate.pdfAllowed).toBe(false);expect(gate.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'RESOURCE_CONDITION_UNRESOLVED'})]));
 expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(gate)).toThrow(expect.objectContaining({code:'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED',httpStatus:409}));
});
it.each([
 ['station missing with crew known',{ct54_plan_crew_people:3},null,['ct54_plan_roller_stations']],
 ['crew missing with station known',{ct54_plan_roller_stations:2},'2',['ct54_plan_crew_people']],
] as const)('CT54 numeric coherence: %s keeps exact missing numeric consumer without claiming incompatible technology',async(_label,known,quantity,missing)=>{
 const r=await ct54PlanCompile({...ct54CoherenceUnknownPlan(),...known}),frame=ct54PlanRow(r,'paint-roller-frame')!;
 expect(frame).toMatchObject({quantity,need_state:'CONDITION_REQUIRED'});
 expect([...ct54PlanTrace(frame).unresolvedConditionParameterIds as string[]].sort()).toEqual([...missing].sort());
 expect([...(frame as {missing_parameter_ids:string[]}).missing_parameter_ids].sort()).toEqual([...missing].sort());
 expect(canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources}).pdfAllowed).toBe(false);
});
it('CT54 known coherent workplace and crew resolve that frame while an independent missing cover replacement stays a quantity need',async()=>{
 const r=await ct54PlanCompile({...ct54CoherenceUnknownPlan(),ct54_plan_crew_people:3,ct54_plan_roller_stations:2});
 const frame=ct54PlanRow(r,'paint-roller-frame')!,cover=ct54PlanRow(r,'paint-roller')!;
 expect(frame.quantity).toBe('2');expect(ct54PlanTrace(frame).unresolvedConditionParameterIds??[]).toEqual([]);
 expect(cover).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});
 expect((cover as {missing_parameter_ids:string[]}).missing_parameter_ids).toEqual(['ct54_plan_replacement_covers']);
 expect(ct54PlanTrace(cover).unresolvedConditionParameterIds??[]).toEqual([]);
 // Other independent unentered pairs may still prevent PDF; this case does not infer a global PASS.
});
it.each([
 [{ct54_plan_meter_start_kwh:10},['ct54_plan_meter_end_kwh']],
 [{ct54_plan_meter_end_kwh:10.08},['ct54_plan_meter_start_kwh']],
] as const)('CT54 one meter reading is an incomplete numeric pair %j, never an assumed zero endpoint',async(known,missing)=>{
 const r=await ct54PlanCompile({...ct54CoherenceUnknownPlan(),...known}),energy=ct54PlanRow(r,'electricity')!;
 expect(energy).toMatchObject({quantity:null,need_state:'CONDITION_REQUIRED'});
 expect([...ct54PlanTrace(energy).unresolvedConditionParameterIds as string[]].sort()).toEqual([...missing].sort());
});
it('CT54 full nineteen drivers with three direct quantities absent has exactly three quantity needs and no invented applicability condition',async()=>{
 const values=ct54PlanDemo();for(const rule of ct54QuantityPlan.rules.filter(v=>v.after==='DIRECT_MANUAL_UNCHANGED'))delete values[rule.quantityParameterId];
 const r=await ct54PlanCompile(values);expect(r.compiled.rows).toHaveLength(28);expect(r.compiled.preliminaryNeeds).toHaveLength(3);
 expect(r.compiled.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(ct54QuantityPlan.rules.filter(v=>v.after==='DIRECT_MANUAL_UNCHANGED').map(v=>v.rowId).sort());
 for(const row of r.compiled.preliminaryNeeds){expect(row.need_state).toBe('QUANTITY_REQUIRED');expect(row.quantity).toBeNull();expect(ct54PlanTrace(row).unresolvedConditionParameterIds??[]).toEqual([]);}
 const gate=canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources});expect(gate.pdfAllowed).toBe(true);expect(gate.completeClaimAllowed).toBe(false);
});
it('CT54 manual frame quantity cannot waive its uncomputed workplace to crew numeric coherence',async()=>{
 const r=await ct54PlanCompile({...ct54CoherenceUnknownPlan(),ct54_plan_roller_stations:2},{'material:wall-paint:tool:paint-roller-frame':{quantity:'4',provenance:{kind:'manual',reason:'TEST_ONLY physical count, crew still unknown'}}}),frame=ct54PlanRow(r,'paint-roller-frame')!;
 expect(frame).toMatchObject({quantity:'4',need_state:'CONDITION_REQUIRED'});expect(ct54PlanTrace(frame).unresolvedConditionParameterIds).toEqual(['ct54_plan_crew_people']);
 expect(canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources}).pdfAllowed).toBe(false);
});
it.each([
 {ct54_plan_roller_stations:4,ct54_plan_crew_people:3},
 {ct54_plan_meter_start_kwh:10,ct54_plan_meter_end_kwh:10},
] as const)('CT54 a supplied contradictory numeric pair is rejected, rather than converted to a missing technology fact: %j',async known=>{
 await expect(ct54PlanCompile({...ct54CoherenceUnknownPlan(),...known})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('CT54 missing original access is still a technology condition after every numeric pair and document is complete',async()=>{
 const values=ct54PlanDemo();delete values.ct54_reference_access;const r=await ct54PlanCompile(values),frame=ct54PlanRow(r,'paint-roller-frame')!;
 expect(frame).toMatchObject({quantity:'2',need_state:'CONDITION_REQUIRED'});
 expect(ct54PlanTrace(frame).unresolvedConditionParameterIds).toEqual(['ct54_reference_access']);
 expect(canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources}).pdfAllowed).toBe(false);
});

it('CT54 a missing wash trace remains a saved condition even beside an unknown water quantity',async()=>{
 const values=ct54CoherenceUnknownPlan();delete values.ct54_plan_wash_reference;const r=await ct54PlanCompile(values),water=ct54PlanRow(r,'water')!;
 expect(water).toMatchObject({quantity:null,need_state:'CONDITION_REQUIRED'});
 expect(ct54PlanTrace(water).unresolvedConditionParameterIds).toEqual(['ct54_plan_wash_reference']);
 expect((water as {missing_parameter_ids:string[]}).missing_parameter_ids).toEqual(expect.arrayContaining(['ct54_plan_wash_cycles','ct54_plan_fresh_l_per_wash_cycle','ct54_plan_wash_reference']));
 expect(canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources}).pdfAllowed).toBe(false);
});

it('CT54 direct quantity source declarations remain formula-only so a manual wipe quantity does not require a second quantity fact',async()=>{
 const values=ct54PlanDemo();for(const rule of ct54QuantityPlan.rules.filter(v=>v.after==='DIRECT_MANUAL_UNCHANGED'))delete values[rule.quantityParameterId];
 const model=ct54ReferencePublicationModelR613('ACTUAL_PROJECT_PLAN_R1');
 for(const rule of ct54QuantityPlan.rules.filter(v=>v.after==='DIRECT_MANUAL_UNCHANGED')){
  const field=model.parameters.find(v=>v.parameter_id===rule.quantityParameterId)!,row=model.resources.find(v=>v.row_id===rule.rowId)!,formula=model.formulas.find(v=>v.formula_id===rule.formulaId)!;
  expect(field.default_value).toBeNull();expect(field.truth_metadata.preliminary_compilation_allowed).toBe(true);
  expect(field.constraints_json?.requiredWhen).toEqual({kind:'greater_than',parameterId:'area_m2',value:0});
  expect(formula.input_parameter_ids).toEqual([rule.quantityParameterId]);expect(row.resource_graph.inputParameterIds).not.toContain(rule.quantityParameterId);
 }
 const r=await ct54PlanCompile(values,{'material:wall-paint:tool:wipes':{quantity:'11',provenance:{kind:'manual',reason:'TEST_ONLY accepted wipe count, other two direct quantities unknown'}}});
 expect(r.compiled.rows).toHaveLength(29);expect(r.compiled.preliminaryNeeds).toHaveLength(2);expect(ct54PlanRow(r,'wipes')?.quantity).toBe('11');
 for(const row of r.compiled.preliminaryNeeds){expect(row.need_state).toBe('QUANTITY_REQUIRED');expect(ct54PlanTrace(row).unresolvedConditionParameterIds??[]).toEqual([]);}
 expect(canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources}).pdfAllowed).toBe(true);
});

// Current user REFERENCE body, not the selected VGT definition or old R634
// capture. TEST_ONLY facts below are deliberate fixtures, never object readback.
const ct54R930Pin={path:resolve(__dirname,'../../../../data/estimate-benchmarks/fixtures/ct54-user-reference-parent-r930.json'),sha256:'e4f8534c4ba883d8d0e4414e0fe6a3bd389a29a6997d675825af303bd9db634c'},
 ct54R934Pin={path:resolve(__dirname,'../../../../data/estimate-benchmarks/fixtures/ct54-quantity-key-observation-r934.json'),sha256:'8d3c3c7a8f65734c8173890f2d993193ae26822c7849839130a515d68f2e3c27'},
 ct54R930Model=()=>ct54MeasuredModelFromActualReferenceR930(ct54R930Pin),
 ct54R930Compile=(parameters:Record<string,unknown>=ct54PlanDemo(),overrides:Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides']={})=>ct54PlanCompile(parameters,overrides,ct54R930Model());
function ct54R930Context(overrides:Partial<Ct54MeasuredCurrentContextR930>={}):Ct54MeasuredCurrentContextR930{
 return{quantityPlan:'ACTUAL_PROJECT_PLAN_R1',actualReferenceReadback:ct54R930Pin,quantityTargetObservation:ct54R934Pin,
  parentReleaseId:'514af229-9dbd-5c45-9383-6d21fe2b9f21',parentSearchReleaseId:'TEST_ONLY_ROOT_MUST_SUPPLY_REFERENCE_SEARCH_POINTER',
  currentReleasePath:'TEST_ONLY_PREPARED_REFERENCE_COPY',selectedCurrentReleasePath:'TEST_ONLY_SELECTED_VGT_POINTER',referencePointerMode:'PREPARED_NOT_ACTIVE_COPY',
  outputRoot:'TEST_ONLY_NO_PREPARE_EXECUTED',expectedBranch:'TEST_ONLY',masterPath:'TEST_ONLY',masterSha256:'a'.repeat(64),
  currentDefinitionVersionId:'0a31889f-6085-550b-9c74-dbbbc7cb9555',currentDefinitionSha256:'696c0a974e9e16b82862ef76eba4b44913a0b2c45dff0cef711a9168f635d58b',
  approvedTemplateBaselineId:'2348f432-87d8-5058-8f65-a2539cba7b32',expectedParentShape:[39,31,31],capturedParentPath:ct54R930Pin.path,capturedParentByteSha256:ct54R930Pin.sha256,
  verifyTargetPrecondition:async()=>{throw Error('TEST_ONLY_NO_DB_CAPTURE');},verifyCore:async()=>({status:'TEST_ONLY_NO_VERIFY_CORE_EXECUTION'}),...overrides};
}
describe('CT54 R930 whole current reference quantity continuation',()=>{
 it('uses exact reference v10 39/31/31 without importing selected VGT baseline or DEMO parameters',()=>{
  const d=ct54R930Model(),bytes=readFileSync(ct54R930Pin.path);expect(createHash('sha256').update(bytes).digest('hex')).toBe(ct54R930Pin.sha256);
  const rawBody=ct54PlanObject(ct54PlanObject(JSON.parse(bytes.toString('utf8'))).body);
  if(!Array.isArray(rawBody.formulas)||!Array.isArray(rawBody.resources))throw Error('CT54_TEST_REAL_R930_FORMULA_AND_RESOURCE_ARRAYS_REQUIRED');
  const originalFormulas=rawBody.formulas.map(ct54PlanObject),originalResources=rawBody.resources.map(ct54PlanObject);
  expect(originalFormulas).toHaveLength(31);expect(originalResources).toHaveLength(31);
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([66,31,31]);
  expect(new Set(d.resources.map(row=>row.row_id))).toEqual(new Set(ct54Reference.resources.map(row=>row.rowId)));
  expect(new Set(d.formulas.map(f=>f.formula_id))).toEqual(new Set(originalFormulas.map(formula=>formula.formula_id)));
  for(const original of originalResources){const next=d.resources.find(row=>row.row_id===original.row_id)!;
   expect([next.row_id,next.formula_id,next.unit_id,next.cost_owner_id,next.procurement_eligible,next.inclusion_ast]).toEqual([original.row_id,original.formula_id,original.unit_id,original.cost_owner_id,original.procurement_eligible,original.inclusion_ast]);
  }
  for(const original of originalFormulas){const next=d.formulas.find(formula=>formula.formula_id===original.formula_id)!,rule=ct54QuantityPlan.rules.find(rule=>rule.formulaId===original.formula_id);
   if(rule&&rule.after!=='DIRECT_MANUAL_UNCHANGED'){expect(next.expression_source).toBe(rule.expression);expect(next.output_unit_id).toBe(rule.unitId);expect([...next.input_parameter_ids].sort()).toEqual([...rule.independentInputs].sort());}
   else expect(next).toEqual(original);
  }
  expect(validateCt54PlanGraphs(d.formulas)).toEqual([]);
  expect(d.parameters.slice(0,39).every(p=>p.default_value==null)).toBe(true);expect(d.runtimeInput).toEqual({});expect(d.runtimeClassification).toEqual({});expect(d.runtimeSourceIds).toEqual({});
  expect(d.ordinaryParameterIds).toEqual(['area_m2',...Object.keys(ct54Reference.conditions).filter(id=>id!=='ct54_reference_method')]);
  expect(d.formulas.find(f=>f.formula_id==='reference:wall-paint:ct54:ct54:reference-quantity')?.input_parameter_ids).toEqual(['area_m2']);
  for(const row of d.resources){expect(row.cost_owner_id).toBe(row.row_id);expect(row.procurement_eligible).toBe(false);expect(row.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');}
 });
 it('rejects changed actual bytes and an attacker-supplied new digest rather than bypassing the parent guard',()=>{
  const dir=mkdtempSync(resolve(tmpdir(),'ct54-r930-byte-mutation-'));
  try{const path=resolve(dir,'parent.json'),bytes=readFileSync(ct54R930Pin.path,'utf8').replace('"parameter_id": "area_m2"','"parameter_id": "area_m2_changed"');
   expect(bytes).not.toBe(readFileSync(ct54R930Pin.path,'utf8'));writeFileSync(path,bytes,'utf8');
   expect(()=>ct54MeasuredModelFromActualReferenceR930({...ct54R930Pin,path})).toThrow('STOP_CT54_R619_CURRENT_PIN');
   expect(()=>ct54MeasuredModelFromActualReferenceR930({path,sha256:createHash('sha256').update(bytes).digest('hex')})).toThrow('STOP_CT54_ACTUAL_R930_REFERENCE_BYTE_PIN_REQUIRED');
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
 it('derives28 known rows with three direct UNKNOWN holds through actual Core and saved mapper; procurement stays zero',async()=>{
  const p=ct54PlanDemo();for(const id of ['ct54_reference_qty_wipes','ct54_reference_qty_waste_bags','ct54_reference_qty_whole_cycle_labour'])delete p[id];
  const r=await ct54R930Compile(p);expect(r.compiled.rows).toHaveLength(28);expect(r.compiled.preliminaryNeeds).toHaveLength(3);
  expect(ct54PlanRow(r,'ct54')?.quantity).toBe('6');expect(ct54PlanRow(r,'water')?.quantity).toBe('8');expect(ct54PlanRow(r,'protection-film')?.quantity).toBe('8');expect(ct54PlanRow(r,'masking-tape')?.quantity).toBe('15');
  for(const key of ['wipes','waste-bags','whole-cycle-labour'])expect(ct54PlanRow(r,key)).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources})).toMatchObject({pdfAllowed:true,completeClaimAllowed:false});
  expect(r.compiled.rows.every(row=>!row.included_in_estimate&&!row.included_in_procurement&&row.unit_price==null)).toBe(true);expect(r.compiled.totals.amount).toBe('0');
 });
 it('shares immediate paint-tool wash and drill care with existing owners, without adding a wet site-cleaning allowance',async()=>{
  const r=await ct54R930Compile(),water=ct54PlanRow(r,'water')!,drill=ct54PlanRow(r,'mixing-drill')!;
  expect(water).toMatchObject({quantity:'8',included_in_estimate:false,included_in_procurement:false});
  expect(ct54PlanObject(ct54PlanTrace(water).resourceGraph).operationCompositionV1).toMatchObject({operationId:'clean-tools',additionalOperations:[expect.objectContaining({operationId:'paint'})]});
  expect(JSON.stringify(ct54PlanObject(ct54PlanTrace(water).resourceGraph).operationCompositionV1)).not.toContain('clean-site');
  expect(ct54PlanObject(ct54PlanTrace(drill).resourceGraph).operationCompositionV1).toMatchObject({operationId:'mix-paint',additionalOperations:[expect.objectContaining({operationId:'clean-tools'})]});
  expect(r.resources.filter(row=>row.row_id===water.row_id)).toHaveLength(1);expect(r.resources.filter(row=>row.row_id===drill.row_id)).toHaveLength(1);
 });
 it('keeps the original30 unknown quantities when site measurements are absent, with known6l paint and no baseline borrowing',async()=>{
  const p:Record<string,unknown>={area_m2:20,...ct54Reference.conditions};delete p.ct54_reference_method;
  const r=await ct54R930Compile(p);expect(r.compiled.rows).toHaveLength(1);expect(r.compiled.preliminaryNeeds).toHaveLength(30);expect(ct54PlanRow(r,'ct54')?.quantity).toBe('6');
  for(const key of ['wipes','waste-bags','whole-cycle-labour'])expect(ct54PlanRow(r,key)?.quantity).toBeNull();expect(canonicalEstimateSavedOperationAcceptanceV1({revision:r.saved,resources:r.resources}).completeClaimAllowed).toBe(false);
 });
 it('does not let all quantity plans bypass an unconfirmed receiver or ground-access condition after saved cold JSON',async()=>{
  for(const id of ['ct54_reference_waste_receiver','ct54_reference_access']){const p=ct54PlanDemo();delete p[id];const r=await ct54R930Compile(p),cold=JSON.parse(JSON.stringify({saved:r.saved,resources:r.resources}));
   expect(r.compiled.preliminaryNeeds).toHaveLength(31);expect(ct54PlanRow(r,'ct54')).toMatchObject({need_state:'CONDITION_REQUIRED'});
   expect(canonicalEstimateSavedOperationAcceptanceV1({revision:cold.saved,resources:cold.resources}).pdfAllowed).toBe(false);
  }
 });
 it('preserves actual source formula and sole-owner manual amendments through saved cold JSON without payment or order',async()=>{
  const id='material:wall-paint:tool:paint-roller',r=await ct54R930Compile(ct54PlanDemo(),{[id]:{quantity:'4',unitPrice:'2',provenance:{kind:'manual',reason:'TEST_ONLY stock issue amendment, no wear norm'}}}),
   cold=JSON.parse(JSON.stringify({saved:r.saved,resources:r.resources}));
  expect(ct54PlanRow(r,'paint-roller')).toMatchObject({quantity:'4',unit_price:'2',included_in_estimate:false,included_in_procurement:false});expect(ct54PlanTrace(ct54PlanRow(r,'paint-roller')).calculatedQuantityBeforeOverride).toBe('3');
  expect(cold.resources.filter((row:{row_id:string})=>row.row_id===id)).toHaveLength(1);expect(canonicalEstimateSavedOperationAcceptanceV1({revision:cold.saved,resources:cold.resources}).pdfAllowed).toBe(true);expect(r.compiled.totals.amount).toBe('0');
 });
 it('uses the existing ordinary config and typed witness but refuses admission without a fresh scoped registry capture',()=>{
  const c=prepareCt54MeasuredCurrentReferenceR930(ct54R930Context());expect(c.sourceId).toBe(ct54QuantityPlan.sourceId);expect(c.parentReleaseId).toBe('514af229-9dbd-5c45-9383-6d21fe2b9f21');expect(c.expectedParentShape).toEqual([39,31,31]);
  expect([c.parameterDefinitions.length,c.formulaDefinitions.length,c.resourceDefinitions.length]).toEqual([66,31,31]);expect(c.sourcePaths).toEqual(expect.arrayContaining([ct54R930Pin.path,ct54R934Pin.path]));
  const basis=c.passport.partialQuantityBasis;
 if(basis?.kind!=='DEFERRED_PROJECT_QUANTITIES')throw Error('CT54_TEST_DEFERRED_PROJECT_QUANTITY_BASIS_REQUIRED');
 expect(basis.parameters).toHaveLength(22);expect(basis.resourceRowIds).toHaveLength(30);
  // The existing candidate source guard refuses BEFORE the typed-witness
  // wrapper's generic absent-capture check. It is the real strict entrypoint.
  expect(validateCt54PlanPartial(c)).toEqual(['STOP_CT54_REFERENCE_PROJECT_SYSTEM_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED']);
  expect(c.capturedScopedNormativeRegistry).toBeUndefined();expect(c.binding.ordinaryCompositeSourceV1).toBeDefined();expect(c.applicability).toMatchObject({activationAllowed:false,productionEligible:false,fullTechnicalAcceptance:false});
 });
 it('rejects the selected VGT tuple, a stale requested-key pin, and incomplete direct-producer contexts',()=>{
  expect(()=>prepareCt54MeasuredCurrentReferenceR930(ct54R930Context({parentReleaseId:'01417cef-3091-5012-844d-1bbd9e75cee1',currentDefinitionVersionId:'789494af-ef14-5592-9f00-139276aaf0b5',expectedParentShape:[19,91,91]}))).toThrow('STOP_CT54_CURRENT_REFERENCE_PARENT_CONTEXT_REQUIRED');
  expect(()=>prepareCt54MeasuredCurrentReferenceR930(ct54R930Context({quantityTargetObservation:{...ct54R934Pin,sha256:'0'.repeat(64)}}))).toThrow('STOP_CT54_FRESH_R934_QUANTITY_SOURCE_OBSERVATION_REQUIRED');
  expect(()=>prepareCt54PlanPublisher({...ct54R930Context(),quantityTargetObservation:undefined})).toThrow('STOP_CT54_MEASURED_REFERENCE_COMPLETE_CONTEXT_REQUIRED');
 });
});
