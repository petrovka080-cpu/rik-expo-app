import { compareFormulaGraphDecimals, type FormulaAst } from './formulaGraph';
import { resolveInclusionGraph } from './inclusionGraph';
import { resolveProfessionalUnitDefinition, convertProfessionalUnitQuantity } from '../professionalUnitRegistry';

type Resource = { row_id: string; title_ru: string; unit_id: string; category: string;
  formula_id: string; inclusion_ast: Record<string, unknown>; resource_graph: Record<string, unknown>; procurement_eligible: boolean };
export type CanonicalCommercialCostCoverageV1 = {
  contractVersion: 'canonical-commercial-cost-coverage/v1';
  scopeId: string;
  scopeRu: string;
  sourceReference: string;
  priceScope: 'LABOR_ONLY' | 'LABOR_AND_LISTED_RESOURCES';
  when: Record<string, unknown>;
  rateBasis: { kind: 'PER_MEASURE'; parameterId: string; unitId: string }
    | { kind: 'WHOLE_SCOPE'; scopeParameterId: string; unitId: string };
  members: { rowId: string; unitId: string; supplyParty?: 'RATE_PROVIDER' }[];
};
export type CanonicalCommercialCostOwnerV1 = CanonicalCommercialCostCoverageV1 & {
  ownerRowId: string; ownerTitleRu: string;
};
export type CanonicalCommercialCostCoveragePlanV1 = {
  owners: Map<string, CanonicalCommercialCostOwnerV1>;
  members: Map<string, CanonicalCommercialCostOwnerV1>;
};
function fail(message: string, code = 'COMMERCIAL_COST_COVERAGE_INVALID'): never {
  throw Object.assign(new Error(message), { code });
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('Некорректный состав расценки.');
  return value as Record<string, unknown>;
}
function text(value: unknown): value is string { return typeof value === 'string' && !!value.trim(); }
function keys(value: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) fail('Частичное или неизвестное покрытие не подтверждено контрактом расценки.');
}

/** Definition-owned full-row coverage. It changes payment, never formulas or
 * physical quantities. Partial/proportional allocation is deliberately not inferred. */
export function planCanonicalCommercialCostCoverageV1(
  resources: readonly Resource[], parameters: Record<string, unknown>, parameterUnits: ReadonlyMap<string, string | null | undefined>,
  overrides: Readonly<Record<string, Record<string, unknown>>>,
  formulas: readonly { formula_id: string; ast: FormulaAst }[],
): CanonicalCommercialCostCoveragePlanV1 {
  const byId = new Map(resources.map(row => [row.row_id, row]));
  const owners = new Map<string, CanonicalCommercialCostOwnerV1>();
  const members = new Map<string, CanonicalCommercialCostOwnerV1>();
  const scopeIds = new Set<string>();
  for (const row of resources) {
    const raw = row.resource_graph.commercialCostCoverageV1;
    if (raw == null) continue;
    const descriptor = record(raw), basis = record(descriptor.rateBasis);
    keys(descriptor, ['contractVersion', 'scopeId', 'scopeRu', 'sourceReference', 'priceScope', 'when', 'rateBasis', 'members']);
    keys(basis, basis.kind === 'PER_MEASURE' ? ['kind', 'parameterId', 'unitId'] : ['kind', 'scopeParameterId', 'unitId']);
    const scopeParameter = basis.kind === 'PER_MEASURE' ? basis.parameterId : basis.scopeParameterId;
    if (descriptor.contractVersion !== 'canonical-commercial-cost-coverage/v1'
      || !text(descriptor.scopeId) || !text(descriptor.scopeRu) || !text(descriptor.sourceReference)
      || !['LABOR_ONLY', 'LABOR_AND_LISTED_RESOURCES'].includes(String(descriptor.priceScope))
      || !['PER_MEASURE', 'WHOLE_SCOPE'].includes(String(basis.kind))
      || !text(scopeParameter) || !parameterUnits.has(scopeParameter) || basis.unitId !== row.unit_id
      || !Array.isArray(descriptor.members) || descriptor.members.length === 0
      || row.resource_graph.costTreatment !== 'OWN_COST') {
      fail(`Состав расценки «${row.title_ru}» не подтверждён определением.`);
    }
    const ast = formulas.find(formula => formula.formula_id === row.formula_id)?.ast;
    if (basis.kind === 'PER_MEASURE'
      ? !resolveProfessionalUnitDefinition(String(basis.unitId))
        || convertProfessionalUnitQuantity(1, String(parameterUnits.get(String(scopeParameter))), String(basis.unitId)) !== 1
        || ast?.kind !== 'parameter' || ast.id !== scopeParameter
      : !['service', 'set'].includes(row.unit_id) || ast?.kind !== 'literal' || String(ast.value) !== '1'
        || !Array.isArray(row.resource_graph.inputParameterIds) || !row.resource_graph.inputParameterIds.includes(scopeParameter)) {
      fail('Формула и единица расценки не соответствуют её базе оплаты.');
    }
    const seen = new Set<string>();
    for (const entry of descriptor.members as unknown[]) {
      const member = record(entry), child = byId.get(String(member.rowId));
      keys(member, ['rowId', 'unitId', 'supplyParty']);
      if (!child || member.rowId === row.row_id || seen.has(child.row_id) || member.unitId !== child.unit_id) {
        fail(`В расценке «${row.title_ru}» отсутствует составляющая либо не совпадает её единица.`);
      }
      seen.add(child.row_id);
      if (['INCLUDED_IN_RESOURCE_ROWS', 'INFORMATIONAL_SCOPE', 'CONTROL_OR_DOCUMENT'].includes(String(child.resource_graph.costTreatment ?? ''))) {
        fail('Справочная или уже включённая составляющая не создаёт новую самостоятельную стоимость.');
      }
      if (descriptor.priceScope === 'LABOR_ONLY' && !['labor', 'work', 'construction_work'].includes(child.category)) {
        fail('Цена только труда не может покрывать материал, технику или услугу.');
      }
      // A paid package is not evidence of who supplies its physical resources.
      if ((child.category === 'material' || child.procurement_eligible) && member.supplyParty !== 'RATE_PROVIDER') {
        fail('Для включённого материального ресурса требуется явное обеспечение исполнителем расценки.');
      }
      if (member.supplyParty != null && member.supplyParty !== 'RATE_PROVIDER') fail('Неизвестная сторона обеспечения.');
    }
    const condition = resolveInclusionGraph(record(descriptor.when), parameters);
    if (condition.value == null) fail('Состав цены не уточнён: выберите совместимую модель оплаты.', 'COMMERCIAL_COST_COVERAGE_REQUIRED');
    if (!condition.value) continue;
    if (scopeIds.has(descriptor.scopeId as string)) fail('Две действующие расценки имеют одну область покрытия.');
    scopeIds.add(descriptor.scopeId as string);
    if (resolveInclusionGraph(row.inclusion_ast, parameters).value !== true || overrides[row.row_id]?.includedInEstimate === false) {
      fail('Включённый состав ссылается на недействующую расценку.', 'COMMERCIAL_COST_COVERAGE_CONFLICT');
    }
    const owner = { ...descriptor, ownerRowId: row.row_id, ownerTitleRu: row.title_ru } as CanonicalCommercialCostOwnerV1;
    owners.set(row.row_id, owner);
    for (const member of owner.members) {
      if (members.has(member.rowId)) fail('Одна составляющая покрыта двумя расценками.', 'COMMERCIAL_COST_COVERAGE_CONFLICT');
      members.set(member.rowId, owner);
      const override = overrides[member.rowId];
      if (override && (override.unitPrice != null || override.includedInEstimate === true || override.includedInProcurement === true)) {
        fail(`Стоимость уже включена в «${row.title_ru}». Уточните покрытие перед отдельной оплатой; введённые значения не применены.`, 'COMMERCIAL_COST_COVERAGE_CONFLICT');
      }
    }
  }
  // A package cannot simultaneously be the included child of another package.
  // This rejects cycles and nested/overlapping ownership without guessed shares.
  for (const ownerId of owners.keys()) if (members.has(ownerId)) {
    fail('Расценки образуют цикл или вложенное покрытие без самостоятельной границы.', 'COMMERCIAL_COST_COVERAGE_CONFLICT');
  }
  // Existing included equipment/tools also follow their original labour owner.
  // A strict labour-only quote must not silently acquire those physical costs.
  for (const child of resources) {
    if (child.resource_graph.costTreatment !== 'INCLUDED_IN_RESOURCE_ROWS'
      || ['labor', 'work', 'construction_work'].includes(child.category)
      || resolveInclusionGraph(child.inclusion_ast, parameters).value === false) continue;
    let target = child.resource_graph.includedInResourceOwnerRowId;
    const visited = new Set([child.row_id]);
    while (typeof target === 'string' && !visited.has(target)) {
      visited.add(target);
      const owner = members.get(target);
      if (owner?.priceScope === 'LABOR_ONLY') fail('В исходную строку труда включена оснастка или другой ресурс. Требуется расценка с этим составом, а не цена только труда.', 'COMMERCIAL_COST_COVERAGE_CONFLICT');
      const parent = byId.get(target);
      target = parent?.resource_graph.costTreatment === 'INCLUDED_IN_RESOURCE_ROWS' ? parent.resource_graph.includedInResourceOwnerRowId : null;
    }
  }
  return { owners, members };
}

export function canonicalCommercialCoveredResourceGraphV1(
  graph: Record<string, unknown>, owner: CanonicalCommercialCostOwnerV1 | undefined, rowId: string,
  activeRateOwner?: CanonicalCommercialCostOwnerV1,
): Record<string, unknown> {
  const effective = activeRateOwner ? { ...graph, commercialCostCoverageOwnerDecisionV1: {
    contractVersion: activeRateOwner.contractVersion, active: true, scopeId: activeRateOwner.scopeId, scopeRu: activeRateOwner.scopeRu,
    sourceReference: activeRateOwner.sourceReference, priceScope: activeRateOwner.priceScope,
    rateBasis: activeRateOwner.rateBasis, memberRowIds: activeRateOwner.members.map(m => m.rowId),
  } } : graph;
  return owner ? { ...effective, costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', includedInResourceOwnerRowId: owner.ownerRowId,
    commercialCostCoverageDecisionV1: { contractVersion: owner.contractVersion, scopeId: owner.scopeId, scopeRu: owner.scopeRu,
      sourceReference: owner.sourceReference, priceScope: owner.priceScope, ownerRowId: owner.ownerRowId, ownerTitleRu: owner.ownerTitleRu,
      quantityCoverage: 'ENTIRE_RESOURCE_ROW', supplyParty: owner.members.find(m => m.rowId === rowId)?.supplyParty ?? null } } : effective;
}

export function assertCanonicalCommercialCoveredQuantityV1(
  owner: CanonicalCommercialCostOwnerV1 | undefined, manualQuantity: string | null, formulaQuantity: string | null,
): void {
  if (owner && manualQuantity != null && (formulaQuantity == null || compareFormulaGraphDecimals(manualQuantity, formulaQuantity) !== 0)) {
    fail(`Ручной объём выходит за подтверждённый состав «${owner.ownerTitleRu}». Уточните границу расценки.`, 'COMMERCIAL_COST_COVERAGE_CONFLICT');
  }
}

export function assertCanonicalCommercialCostOwnersV1(
  plan: CanonicalCommercialCostCoveragePlanV1, parameters: Record<string, unknown>,
  rows: readonly { row_id: string; quantity: string; included_in_estimate: boolean }[],
  needs: readonly { row_id: string; selected: boolean }[],
): void {
  const compiled = new Map(rows.map(row => [row.row_id, row]));
  for (const owner of plan.owners.values()) {
    const row = compiled.get(owner.ownerRowId);
    if (!row) {
      if (!needs.some(need => need.row_id === owner.ownerRowId && need.selected)) fail('Покрывающая расценка отсутствует в сохранённом составе.');
      continue; // Its unresolved quantity remains a technical requirement.
    }
    const expected = owner.rateBasis.kind === 'PER_MEASURE' ? parameters[owner.rateBasis.parameterId] : '1';
    if (!row.included_in_estimate || (typeof expected !== 'number' && typeof expected !== 'string')
      || compareFormulaGraphDecimals(row.quantity, String(expected)) !== 0) {
      fail('Объём комплексной расценки не соответствует её базе оплаты.', 'COMMERCIAL_COST_COVERAGE_CONFLICT');
    }
  }
}
