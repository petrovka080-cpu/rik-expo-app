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
      templateVersion: "professional-estimate-pdf:38",
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
    expect(result.issues.some(issue=>issue.rowId==='explicit-counter'||issue.rowId==='scope')).toBe(false);
    expect(result.pdfAllowed).toBe(false);expect(JSON.stringify(resources)).toBe(before);
  });

it('separates archived metadata identity from current PDF issuance and preserves old bytes/source',()=>{
  const renderer='canonical-professional-pdf.r4-a13-verified-operation-composition-template86';
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
  for(const metadata of [archived,{...current,renderer:'old'},{...current,generatorVersion:'old'},
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
  const resources=specification.map(([kind,name])=>({row_id:'test-'+kind,title_ru:name,quantity:'1',
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
