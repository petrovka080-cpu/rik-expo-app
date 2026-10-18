import pack from '../../../../data/estimate-benchmarks/source-packs/paving-cut-stationary70-quantity-r1.json';
import {
  buildAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
} from './automaticConstructionOwnerR1';
import { evaluateFormulaGraph, type FormulaParameterValue } from '../backendPlatform/formulaGraph';
import { resolveInclusionGraph } from '../backendPlatform/inclusionGraph';
import { validateCanonicalEstimateParameters } from '../backendPlatform/parameterConstraints';
import { estimateDeterministicHash } from '../estimateDeterministicHash';

/** WORK quantity fragment. No catalogue identity, command, price/order admission or publisher. */
export const pavingCutStationary70QuantityPackR1 = pack;
export const pavingCutStationary70PrimaryR1 = 'actual_paving_cut_length_m';
export const pavingCutStationary70PrefixR1 = 'paving-cut:krer27-07-005-04';
export const pavingCutStationary70MethodR1 = 'STATIONARY_CUTTING_70MM';
const positiveCut = { kind: 'greater_than', parameterId: pavingCutStationary70PrimaryR1, value: 0 } as const;
const facts = ['paver_thickness_mm', 'cutting_method', 'actual_cut_layout_reference',
  'paver_70mm_product_reference', 'stationary_cut_method_statement_reference'] as const;

export function pavingCutStationary70QuantityDefinitionR1() {
  const conditional: AutomaticParameterSpec[] = [
    { id: facts[0], title: 'Фактическая толщина обрабатываемой плитки; эта колонка только для 70 мм',
      valueType: 'decimal', unitId: 'mm', kind: 'conditional', min: 70, max: 70, requiredWhen: positiveCut },
    { id: facts[1], title: 'Подтверждённый стационарный метод резки; ручная УШМ сюда не относится',
      valueType: 'enum', unitId: null, kind: 'conditional', values: [pavingCutStationary70MethodR1], requiredWhen: positiveCut },
    { id: facts[2], title: 'Ведомость раскроя с отдельно измеренной длиной фактических резов',
      valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positiveCut },
    { id: facts[3], title: 'Проектная спецификация обрабатываемой плитки 70 мм',
      valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positiveCut },
    { id: facts[4], title: 'Ссылка на подтверждённый метод резки выбранной плитки стационарным станком',
      valueType: 'text', unitId: null, kind: 'conditional', requiredWhen: positiveCut },
  ];
  const rows: AutomaticRowSpec[] = pack.rows.map(row => ({
    rowId: `${pavingCutStationary70PrefixR1}:${row.suffix}`,
    formulaId: `${pavingCutStationary70PrefixR1}:formula:${row.suffix}`,
    section: pack.titleRu, category: row.category, title: row.titleRu, unitId: row.unitId,
    expression: `${pavingCutStationary70PrimaryR1}*${row.ratePerCutM}`,
    procurement: false,
    costTreatment: row.suffix === 'whole-cutting-labor' ? 'OWN_COST' : 'INFORMATIONAL_SCOPE',
    inputParameterIds: [...facts],
  }));
  const built = buildAutomaticConstructionOwnerR1({
    contract: pack.contract, semanticOwner: pavingCutStationary70PrefixR1,
    sourceId: pack.sourceKeyProposal, normId: pack.normId,
    sourceMetadata: { source_title: pack.source.titleRu, source_document_version: pack.source.edition,
      definition_hash: pack.source.sha256, artifact_sha256: pack.source.sha256,
      exact_locator: pack.source.locatorRu },
    applicabilityRu: 'Только фактическая длина реза плитки 70 мм стационарным методом, колонка 27-07-005-04. '
      + 'Ссылка на проект не заменяет исходную норму, подтверждение модели станка или допуска цены.',
    ordinary: [{ id: pavingCutStationary70PrimaryR1, title: 'Фактическая длина резов тротуарной плитки',
      valueType: 'decimal', unitId: 'm', kind: 'ordinary', min: 0 }],
    profile: [], conditional, rows, deferMissingProjectFactsToRows: true,
    excludedUnownedAssumptions: [...pack.excludedRu],
  });
  return { ...built, catalogId: null, publicationAllowed: false,
    openNeeds: pack.openNeeds.map(need => ({ ...need })),
    parameters: built.parameters.map(parameter => ({ ...parameter,
    truth_metadata: facts.some(id => id === parameter.parameter_id) ? { ...parameter.truth_metadata,
      value_source_role: 'PROJECT_SPECIFIC_INPUT',
      guide: { ...(parameter.truth_metadata.guide as Record<string, unknown>),
        source_role: 'PROJECT_DOCUMENTATION',
        source_document: 'ACTUAL_CUT_LAYOUT_PAVER_SPECIFICATION_AND_METHOD_STATEMENT_REQUIRED',
        source_locator: 'Фактические документы объекта; не исходная норма и не скрытый вариант по умолчанию.' },
    } : parameter.truth_metadata,
  })), resources: built.resources.map((resource, index) => {
    const row = pack.rows[index];
    const { row_sha256: _old, ...withoutHash } = resource;
    const changed = { ...withoutHash, source_metadata: { ...resource.source_metadata,
      sourceRole: 'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
      normativeTrace: [{ sourceId: pack.sourceKeyProposal, normId: pack.normId,
        sourceRole: 'OFFICIAL_EXACT_COLUMN_QUANTITY_CANDIDATE_NOT_PUBLISHED',
        exact_locator: pack.source.locatorRu, source_artifact_sha256: pack.source.sha256 }],
      resource_code: row.resourceCode, source_artifact_sha256: pack.source.sha256,
      printed_resource_name_ru: row.printedNameRu,
      catalogue_identity_pending: true, normative_binding_pending: true, full_technical_acceptance: false,
      machine_price_admission: false, physical_reusable_disc_leftover_established: false,
    } };
    return { ...changed, row_sha256: estimateDeterministicHash(changed) };
  }) };
}

/** Uses the shared parameter/inclusion/formula kernels. Does not compile an estimate. */
export function evaluatePavingCutStationary70QuantitiesR1(input: Record<string, unknown>) {
  const definition = pavingCutStationary70QuantityDefinitionR1();
  const values = validateCanonicalEstimateParameters(definition.parameters, input);
  const missingParameterIds = definition.parameters.filter(parameter => {
    const condition = parameter.constraints_json?.requiredWhen;
    const requiredNow = parameter.required || (condition != null
      && resolveInclusionGraph(condition as Record<string, unknown>, values).value === true);
    return requiredNow && (values[parameter.parameter_id] == null || values[parameter.parameter_id] === '');
  }).map(parameter => parameter.parameter_id).sort();
  const base = { catalogId: null, catalogueClassification: 'PENDING_ROOT_CURRENT_SCOPE_REVIEW',
    publicationAllowed: false, paymentAdmission: false, machinePriceAdmission: false,
    primaryUnitId: 'm', sourceKeyProposal: pack.sourceKeyProposal, normId: pack.normId,
    openNeeds: pack.openNeeds.map(need => ({ ...need })),
    fullTechnicalAcceptance: false, missingParameterIds,
    // No stock, balance residual, lifetime, order, packing or machine model inferred.
    purchaseOrderOwner: null, reusableDiscLeftover: null, discUsefulLifeM: null,
  } as const;
  if (missingParameterIds.length) return { ...base, status: 'PROJECT_FACTS_MISSING', rows: [] } as const;
  const parameters: Record<string, FormulaParameterValue> = Object.fromEntries(
    Object.entries(values).filter(([, value]) => typeof value === 'string' || typeof value === 'number')
      .map(([id, value]) => [id, value as string | number]),
  );
  const byFormula = new Map(definition.formulas.map(formula => [formula.formula_id, formula]));
  return { ...base, status: 'SOURCE_QUANTITY_FRAGMENT_ONLY', rows: definition.resources.map(resource => {
    const formula = byFormula.get(resource.formula_id)!;
    return { rowIdProposal: resource.row_id, unitId: resource.unit_id,
      quantity: evaluateFormulaGraph(formula.ast, parameters), costTreatment: resource.resource_graph.costTreatment,
      procurementEligible: false, unitPrice: null, paymentAdmitted: false };
  }) } as const;
}
