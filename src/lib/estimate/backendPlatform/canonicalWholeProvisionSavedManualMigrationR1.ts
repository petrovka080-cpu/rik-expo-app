import policy from '../../../../data/estimate-benchmarks/source-packs/whole-provision-saved-manual-migration-r1.json';
import { ct29OrdinaryMigrationSemanticSha256R1 as semantic, type Ct29MigrationModelR1 as Model } from './canonicalCt29OrdinaryManualMigrationR1';
import { canonicalEstimateStableJson as stable } from './canonicalEstimateDeterminism';
import { canonicalManualPriceMigrationBindings as prices, canonicalManualQuantityMigrationBindings as quantities } from './canonicalManualPriceReleaseMigration';

export const WHOLE_PROVISION_SAVED_MANUAL_MIGRATION_R1 = policy;
type Identity = { id: string; catalogId: string; sha256: string };
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown> : {};

/** Only the exact reviewed same-column enum extension may widen a legacy
 * equality. Numeric formulas, units and the original choice remain unchanged. */
function preservesLegacyProfileEquality(from:Model,to:Model,before:unknown,after:unknown,review:unknown):boolean {
  const rule=object(review),id=String(rule.parameterId??''),values=rule.values;
  if(!id||typeof rule.legacyValue!=='string'||!Array.isArray(values)||values.length!==3
    ||values[0]!==rule.legacyValue||new Set(values).size!==3||values.some(v=>typeof v!=='string'))return false;
  const old=from.parameters.find(p=>p.parameter_id===id),next=to.parameters.find(p=>p.parameter_id===id);
  return stable(object(old?.constraints_json).values)===stable([rule.legacyValue])
    &&stable(object(next?.constraints_json).values)===stable(values)
    &&object(next?.truth_metadata).visibility_role==='USER_INPUT'
    &&stable(before)===stable({kind:'equals',parameterId:id,value:rule.legacyValue})
    &&stable(after)===stable({kind:'or',operands:values.map(value=>({kind:'equals',parameterId:id,value}))});
}

/** Exact reviewed predecessor pairs only. Retained numeric user inputs do not
 * assert a norm, payment or new procurement. The existing compiler owns all
 * target balances and the existing writer still requires identical overrides. */
export function admitWholeProvisionSavedManualMigrationR1(input: { fromIdentity: Identity; toIdentity: Identity; from: Model; to: Model }) {
  const transition = policy.transitions.find(t => t.from.id === input.fromIdentity.id && t.to.id === input.toIdentity.id);
  if (!transition) return null;
  for (const side of ['from', 'to'] as const) {
    const actual = side === 'from' ? input.fromIdentity : input.toIdentity, expected = transition[side];
    if (actual.catalogId !== transition.catalogId || actual.sha256 !== expected.sha256
      || semantic(input[side]) !== expected.semanticSha256) return null;
  }
  const fromPrices = prices(input.from), fromQuantities = quantities(input.from);
  const drivers = new Map([[transition.consumptionDriverRowId, {
    unitId: 'driverUnitId' in transition ? String(transition.driverUnitId) : 'l',
    oldCostOwnerId: transition.oldConsumptionCostOwnerId,
    newCostOwnerId: transition.newConsumptionCostOwnerId,
    supplyOwnerRowId: transition.supplyOwnerRowId,
  }]]);
  if ('additionalConsumptionDrivers' in transition && Array.isArray(transition.additionalConsumptionDrivers)) {
    for (const value of transition.additionalConsumptionDrivers) {
      const d = object(value);
      if (!['rowId','unitId','oldCostOwnerId','newCostOwnerId','supplyOwnerRowId'].every(k => typeof d[k] === 'string' && d[k])) return null;
      if (drivers.has(String(d.rowId))) return null;
      drivers.set(String(d.rowId), {unitId:String(d.unitId),oldCostOwnerId:String(d.oldCostOwnerId),
        newCostOwnerId:String(d.newCostOwnerId),supplyOwnerRowId:String(d.supplyOwnerRowId)});
    }
  }
  if ([...drivers.keys()].some(id => !transition.preservedRowIds.includes(id))) return null;
  for (const id of transition.preservedRowIds) {
    const a = input.from.resources.find(r => r.row_id === id), b = input.to.resources.find(r => r.row_id === id);
    if (!a || !b || !fromPrices[id] || !fromQuantities[id]) return null;
    const keys = ['row_id', 'unit_id', 'category', 'procurement_eligible'];
    if (keys.some(key => stable(a[key]) !== stable(b[key]))) return null;
    if(stable(a.inclusion_ast)!==stable(b.inclusion_ast)
      &&!preservesLegacyProfileEquality(input.from,input.to,a.inclusion_ast,b.inclusion_ast,
        'legacyProfileExtension' in transition?transition.legacyProfileExtension:null))return null;
    const driver = drivers.get(id);
    if (driver) {
      const graph = object(b.resource_graph), display = object(graph.publicResourcePresentationV1);
      if (a.unit_id !== driver.unitId || a.cost_owner_id !== driver.oldCostOwnerId
        || b.cost_owner_id !== driver.newCostOwnerId || graph.costTreatment !== 'INFORMATIONAL_SCOPE'
        || display.rowKind !== 'CALCULATION_DETAIL' || graph.purchaseBalanceOwnerRowId !== driver.supplyOwnerRowId
        || !input.to.resources.some(r => r.row_id === driver.supplyOwnerRowId && r.unit_id === driver.unitId)) return null;
    } else {
      const af = input.from.formulas.find(f => f.formula_id === a.formula_id), bf = input.to.formulas.find(f => f.formula_id === b.formula_id);
      if (!af || !bf || a.cost_owner_id !== b.cost_owner_id
        || stable(af.ast) !== stable(bf.ast) || af.output_unit_id !== bf.output_unit_id
        || stable(af.input_parameter_ids) !== stable(bf.input_parameter_ids)) return null;
    }
  }
  return { definitionId: transition.from.id,
    priceBindings: Object.fromEntries(transition.preservedRowIds.map(id => [id, fromPrices[id]])),
    quantityBindings: Object.fromEntries(transition.preservedRowIds.map(id => [id, fromQuantities[id]])),
    exclusionBindings: {} as Record<string, string>, operationBindings: {} as Record<string, string> };
}
