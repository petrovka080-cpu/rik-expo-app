import { buildAutomaticConstructionOwnerR1, type AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { PVC_ROOF_CONCRETE_DEFINITION_S2736, PVC_ROOF_CONCRETE_CATALOG_S2736 } from './pvcRoofConcreteKrer12ConstructorS2736';
import { PVC_ROOF_VOLUME_CLEANER_DEFINITION_S2737, PVC_ROOF_VOLUME_CLEANER_CATALOG_S2737 } from './pvcRoofCleanerVolume472219S2737';
import { PVC_BITUMEN_TRANSITION_DEFINITION_S2737, PVC_BITUMEN_TRANSITION_CATALOG_S2737 } from './pvcBitumenTransitionReinforcedGuide2024S2737';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import type { CanonicalCommercialCostCoverageV1 } from '../backendPlatform/canonicalCommercialCostCoverageV1';
import { withG6PvcResourcePresentationS2741 } from './g6PvcResourcePresentationS2741';

export const G6_COMMERCIAL_LABOR_MODE_PARAMETER_S2741 = 'commercial_labor_price_mode';
export const G6_RESOURCE_LABOR_MODE_S2741 = 'По трудозатратам существующей строки';
export const G6_COMPOSITE_LABOR_MODE_S2741 = 'Комплексная расценка труда и включённой оснастки';
const sourceId = 'master_s2741_explicit_commercial_labor_scope';
const contract = 'g6-pvc-commercial-labor-profile.s27-41/v1';
const locator = 'MASTER S27.41 §20.43.2–20.43.7; явный выбор состава расценки. Не источник нормы труда или рыночной цены.';

/** Adds one explicit labour-rate choice. The original labour resource, from a
 * norm or a project plan, stays whole; no operation receives a guessed share. */
function withLaborRate(base: AutomaticOwnerDefinition, config: {
  catalogId: string; measureId: string; unitId: string; workerRowId: string; rateRowId: string; rateTitleRu: string;
}): AutomaticOwnerDefinition {
  const worker = base.resources.find(row => row.row_id === config.workerRowId);
  if (!worker || worker.resource_graph.costTreatment !== 'OWN_COST') throw Error('G6_EXISTING_LABOR_OWNER_REQUIRED');
  const extension = buildAutomaticConstructionOwnerR1({ contract, semanticOwner: 'G6-commercial-labor', sourceId,
    normId: 'COMMERCIAL_SCOPE_NOT_A_TECHNICAL_NORM',
    sourceMetadata: { source_title: 'Явный состав самостоятельной расценки труда', source_document_version: 'S27.41',
      definition_hash: estimateDeterministicHash({ contract, config }), artifact_sha256: estimateDeterministicHash({ locator, config }), exact_locator: locator },
    applicabilityRu: 'Труд и штатное оснащение, уже включённое в существующую строку труда. Материалы, отдельно оплачиваемая техника и услуги сохраняют прежнюю оплату и обеспечение.',
    ordinary: [{ id: config.measureId, title: 'Объём выбранной работы', valueType: 'decimal', unitId: config.unitId, kind: 'ordinary', min: 0 }],
    profile: [{ id: G6_COMMERCIAL_LABOR_MODE_PARAMETER_S2741, title: 'Способ оплаты труда', valueType: 'enum', unitId: null, kind: 'profile',
      defaultValue: G6_RESOURCE_LABOR_MODE_S2741, values: [G6_RESOURCE_LABOR_MODE_S2741, G6_COMPOSITE_LABOR_MODE_S2741] }],
    conditional: [], rows: [{ rowId: config.rateRowId, section: 'labor', category: 'construction_work', title: config.rateTitleRu,
      unitId: config.unitId, formulaId: config.rateRowId+':quantity', expression: config.measureId, costTreatment: 'OWN_COST', procurement: false,
      inputParameterIds: [G6_COMMERCIAL_LABOR_MODE_PARAMETER_S2741],
      inclusion: { kind: 'equals', parameterId: G6_COMMERCIAL_LABOR_MODE_PARAMETER_S2741, value: G6_COMPOSITE_LABOR_MODE_S2741 } }],
    excludedUnownedAssumptions: ['Не вводить цену по умолчанию', 'Не делить исходные трудозатраты между подработами', 'Не включать отдельно оплачиваемые материалы или механизмы'],
  });
  const rawRate = extension.resources[0]!;
  const operation = worker.resource_graph.operationCompositionV1 as Record<string, unknown> | undefined;
  const coverage: CanonicalCommercialCostCoverageV1 = {
    contractVersion: 'canonical-commercial-cost-coverage/v1', scopeId: 'labor-with-included-contractor-resources:'+config.catalogId,
    scopeRu: 'Труд всех операций в выбранной границе и штатное оснащение, уже включённое в строку труда по выбранному режиму. Материалы, отдельная аренда и отдельно назначенные испытания оплачиваются по своим строкам.',
    sourceReference: locator, priceScope: 'LABOR_AND_LISTED_RESOURCES',
    when: { kind: 'equals', parameterId: G6_COMMERCIAL_LABOR_MODE_PARAMETER_S2741, value: G6_COMPOSITE_LABOR_MODE_S2741 },
    rateBasis: { kind: 'PER_MEASURE', parameterId: config.measureId, unitId: config.unitId },
    members: [{ rowId: worker.row_id, unitId: worker.unit_id }],
  };
  const rate = { ...rawRate, ordinal: base.resources.length,
    cost_owner_id: 'commercial-labor-with-included-resources:'+config.catalogId,
    source_metadata: { ...rawRate.source_metadata, normativeTrace: [], sourceRole: 'EXPLICIT_COMMERCIAL_SCOPE_NOT_ENGINEERING_NORM',
      existingLaborRowId: worker.row_id, existingLaborFormulaId: worker.formula_id, priceDefault: null,
      separatelyPayableMaterialsCovered: false, separatelyPayableMachinesCovered: false,
      includedContractorResourcesKeepOriginalApplicability: true,
      includedContractorResourceRowIds: base.resources.filter(r => r.resource_graph.includedInResourceOwnerRowId === worker.row_id).map(r => r.row_id) },
    resource_graph: { ...rawRate.resource_graph, commercialCostCoverageV1: coverage,
      ...(operation ? { operationCompositionV1: { ...operation, operationId: 'commercial-labor-rate',
        operationTitleRu: 'Оплата труда по выбранной расценке', processRole: 'COST_SUMMARY' } } : {}) }, row_sha256: '' };
  rate.row_sha256 = estimateDeterministicHash(rate);
  const parameter = extension.parameters.find(p => p.parameter_id === G6_COMMERCIAL_LABOR_MODE_PARAMETER_S2741)!;
  return Object.freeze({ ...base,
    parameters: [...base.parameters, { ...parameter, ordinal: base.parameters.length,
      truth_metadata: { ...parameter.truth_metadata, guide: { ...(parameter.truth_metadata.guide as Record<string, unknown>),
        guide_short_ru: 'По умолчанию сохраняются трудозатраты действующей строки: норма либо проектный план согласно её источнику. Комплексная ставка заменяет её оплату и включает штатную оснастку, уже покрытую этой строкой; цену укажите по соответствующему предложению исполнителя.' } } }],
    formulas: [...base.formulas, ...extension.formulas], resources: [...base.resources, rate],
    runtimeInput: { ...base.runtimeInput, ...extension.runtimeInput },
    runtimeClassification: { ...base.runtimeClassification, ...extension.runtimeClassification },
    runtimeSourceIds: { ...base.runtimeSourceIds, ...extension.runtimeSourceIds },
  });
}

export const G6_PVC_COMMERCIAL_LABOR_SERIES_S2741 = [
  { catalogId: PVC_ROOF_CONCRETE_CATALOG_S2736, measureId: 'area_m2', unitId: 'm2', workerRowId: 'pvc-roof:labor:workers',
    rateRowId: 'pvc-roof:work:labor-rate', rateTitleRu: 'Укладка и крепление ПВХ-мембраны: труд и включённая оснастка', base: PVC_ROOF_CONCRETE_DEFINITION_S2736 },
  { catalogId: PVC_ROOF_VOLUME_CLEANER_CATALOG_S2737, measureId: 'area_m2', unitId: 'm2', workerRowId: 'pvc-roof:labor:workers',
    rateRowId: 'pvc-roof:work:labor-rate', rateTitleRu: 'Укладка и крепление ПВХ-мембраны: труд и включённая оснастка', base: PVC_ROOF_VOLUME_CLEANER_DEFINITION_S2737 },
  { catalogId: PVC_BITUMEN_TRANSITION_CATALOG_S2737, measureId: 'transition_length_m', unitId: 'linear_m', workerRowId: 'transition:labor:worker',
    rateRowId: 'transition:work:labor-rate', rateTitleRu: 'Переход между ПВХ и битумом: труд и включённая оснастка', base: PVC_BITUMEN_TRANSITION_DEFINITION_S2737 },
].map(({ base, ...config }) => ({ ...config, definition: withG6PvcResourcePresentationS2741(withLaborRate(base, config)), originalDefinition: base }));
