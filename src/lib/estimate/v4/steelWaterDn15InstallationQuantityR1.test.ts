import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {steelWaterDn15InstallationDefinitionR1 as definition, compileSteelWaterDn15QuantityScenarioR1 as scenario,
  steelWaterDn15ScenarioFactsR1 as facts, steelWaterDn15PackR1 as pack, steelWaterDn15PrefixR1 as prefix,
  steelWaterDn15PrimaryR1 as primary, steelWaterDn15FactIdsR1 as factIds, steelWaterDn15NeedRowIdsR1 as needIds,
  steelWaterDn15NeedParameterIdsR1 as needParameters, steelWaterDn15IndependentCompletenessMapR1 as completeness,
} from './steelWaterDn15InstallationQuantityR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const physicalIds = pack.physicalSourceRows.map(r => prefix + ':' + r.id);
const includedIds = pack.operationsIncludedInWholeLabour.map(o => prefix + ':' + o.id);
const physicalAndIncluded = [...physicalIds, ...includedIds];
const provenance = {kind: 'manual', reason: 'TEST_ONLY CONTROL77; not a supplier quote or accepted project'};
const core = async (p: Record<string, unknown>, overrides: Parameters<typeof scenario>[1] = {}, prices: Parameters<typeof scenario>[2] = []) =>
  (await scenario(p, overrides, prices)).compiled;

describe('Catalogue-null galvanized node DN15 16-02-002-01 source-only shared-core scenarios, NOT RUN by author', () => {
  it('keeps exact27 resource definitions,30 unique parameters,19 formula-gated rows and no hidden defaults', () => {
    const d = definition();
    expect(d).toMatchObject({catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false, runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {}});
    expect([d.parameters.length, d.formulas.length, d.resources.length]).toEqual([30, 27, 27]);
    expect(d.parameters.map(p => p.ordinal)).toEqual(Array.from({length: 30}, (_, i) => i));
    expect(d.resources.map(r => r.ordinal)).toEqual(Array.from({length: 27}, (_, i) => i));
    expect(d.parameters.every(p => p.default_value === null)).toBe(true);
    expect(d.resources.every(r => !r.procurement_eligible)).toBe(true);
    expect(d.resources.filter(r => r.resource_graph.costTreatment === 'OWN_COST').map(r => r.row_id)).toEqual([physicalIds[0]]);
    expect(d.resources.some(r => 'purchaseBalanceV1' in r.resource_graph || 'purchaseBalanceOwnerRowId' in r.resource_graph)).toBe(false);
    expect(d.resources.slice(0, 19).every(r => r.source_metadata?.conditionalNeedQuantityIsUnappliedReferenceOnly === true)).toBe(true);
  });
  it.each([
    ['100', ['37.07','0.15','0.08','0.07','1.39','0.44','0.25','0.00019','0.342','0.0009','0.00044','0.0004','0.00053','0.05','100','61']],
    ['50', ['18.535','0.075','0.04','0.035','0.695','0.22','0.125','0.000095','0.171','0.00045','0.00022','0.0002','0.000265','0.025','50','30.5']],
  ])('compiles frozen source-vector for%s actual metres without converting consumption to order units', async (length, expected) => {
    const r = await core(facts(length as string));
    expect(r.rows.map(v => v.row_id)).toEqual(physicalAndIncluded);
    expect(r.rows.slice(0, 16).map(v => v.quantity)).toEqual(expected);
    expect(r.rows.slice(16).map(v => v.quantity)).toEqual([length, length, length]);
    expect(r.preliminaryNeeds.map(n => n.row_id).sort()).toEqual([...needIds].sort());
    expect(r.rows.every(v => !v.included_in_procurement && v.unit_price === null)).toBe(true);
    expect(r.rows.filter(v => v.included_in_estimate).map(v => v.row_id)).toEqual([physicalIds[0]]);
    expect(r.rows.find(v => v.row_id === prefix + ':acetylene')?.unit_id).toBe('t');
    expect(r.rows.find(v => v.row_id === prefix + ':pipe-fastenings')).toMatchObject({unit_id: 'kg'});
  });
  it('allows complete physical node identity before commercialBOM is resolved, with all8 tasks still unresolved', async () => {
    const r = await core(facts());
    expect(r.rows).toHaveLength(19); expect(r.preliminaryNeeds).toHaveLength(8);
    expect(r.preliminaryNeeds.every(n => n.quantity === null && n.unit_price === null && !n.selected && !n.procurement_eligible)).toBe(true);
    expect(r.preliminaryNeeds.find(n => n.row_id.endsWith(':node-bom-and-valves'))?.normative_trace).toEqual([]);
    expect(r.rows.every(v => !v.included_in_procurement)).toBe(true);
    expect(definition().resources.filter(r => r.category === 'material')).toHaveLength(10);
  });
  it('accepts documented absence of installed valves without inventing a zero project-valve norm', async () => {
    const r = await core({...facts(), node_valve_inventory_scope: 'PROJECT_DOCUMENTED_ABSENCE_OF_VALVES_IN_THIS_SCOPE',
      node_valve_inventory_reference: 'TEST_ONLY: actual scope inventory explicitly contains no installed valves'});
    expect(r.rows[0]?.quantity).toBe('37.07'); expect(r.preliminaryNeeds.map(n => n.row_id).sort()).toEqual([...needIds].sort());
    const bom = definition().resources.find(r => r.row_id.endsWith(':open:node-bom-and-valves'))!;
    expect(bom.source_metadata).toMatchObject({projectValvePQuantity: null, projectValvePRateIsNotNumeric: true});
    expect(definition().parameters.some(p => /valve.*quantity|valve.*rate|project_valve_P/.test(p.parameter_id))).toBe(false);
  });
  it.each(pack.physicalSourceRows.slice(1).flatMap(r => (['manual', 'snapshot'] as const).map(route => [r.id, route] as const)))(
    'CONTROL77 cannot admit INFO row%s through%s price route', async (suffix, route) => {
      const id = prefix + ':' + suffix, resource = definition().resources.find(r => r.row_id === id)!;
      const overrides = {[id]: {includedInEstimate: true, includedInProcurement: true, provenance, ...(route === 'manual' ? {unitPrice: '77'} : {})}};
      const prices = route === 'snapshot' ? [{price_key: resource.cost_owner_id!, unit_id: resource.unit_id, unit_price: '77', currency_code: 'KGS', snapshot_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}] : [];
      const r = await core(facts(), overrides, prices);
      expect(r.rows.find(v => v.row_id === id)).toMatchObject({unit_price: '77', ownership_status: 'OWNED_EXCLUDED', included_in_estimate: false, included_in_procurement: false});
      expect(r.totals.amount).toBe('0'); expect(r.preliminaryNeeds).toHaveLength(8);
      // An existing reference amount is allowed; it is not finance/procurement.
    });
  it.each(physicalIds)('explicit manual quantity77 retains the automatic source basis and payment boundary on%s', async id => {
    await assertExplicitManualSourceRow(id,'77');
  });
  const invalidScopes: Array<[string, Record<string, unknown>]> = [
    ['wrong-DN20', {nominal_bore_mm: '20'}], ['outside-diameter15-not-nominal', {diameter_basis: 'OUTSIDE_DIAMETER_15_MM'}],
    ['black-steel-not-galvanized', {material_scope: 'BLACK_STEEL'}], ['polymerPPR', {material_scope: 'PPR'}],
    ['heating-only-scope', {system_scope: 'HEATING'}], ['gas-scope', {system_scope: 'GAS'}], ['external-main', {system_scope: 'EXTERNAL_MAIN'}],
    ['steel-building-water-inlet', {route_excludes_building_inlet: 'BUILDING_STEEL_INLET'}], ['equipment-complex-accounted-length', {route_excludes_complex_accounted_lengths: 'INCLUDE_COMPLEX_ACCOUNTED_LENGTHS'}],
    ['motorized-valve', {node_valve_inventory_scope: 'MOTORIZED_VALVES'}], ['lever-or-other-nonhandwheel-drive', {node_valve_inventory_scope: 'LEVER_VALVES'}],
    ['barepipe-as-ready-node', {supply_method: 'BARE_PIPE_QUOTE'}], ['node-sleeves-not-confirmed', {supply_method: 'ASSEMBLED_NODES_SLEEVES_UNCONFIRMED'}],
    ['new-structural-boring-required', {through_holes: 'NEW_STRUCTURAL_BORING_REQUIRED'}],
    ['height3.01', {working_height_m: '3.01'}], ['pressure1.61', {working_pressure_mpa: '1.61'}], ['point-primary-conversion', {q: '1'}],
  ];
  it.each(invalidScopes)('rejects incompatible source case%s without selecting a neighbouring norm', async (_label, change) => {
    await expect(core({...facts(), ...change})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
  });
  it.each([
    ['unknown-node-method', 'supply_method'], ['node-valve-membership-or-inventory-unknown', 'node_valve_inventory_scope'], ['ready-through-openings-unknown', 'through_holes'],
  ])('withholds applied rows while retaining conditional reference quantities for%s', async (_label, id) => {
    const input = facts(); delete input[id!];
    const expected = ['37.07','0.15','0.08','0.07','1.39','0.44','0.25','0.00019','0.342','0.0009','0.00044','0.0004','0.00053','0.05','100','61','100','100','100'];
    const owner = definition().resources.find(r => r.row_id === physicalIds[0])!;
    for (const route of ['unpriced', 'manual', 'snapshot'] as const) {
      const overrides = route === 'unpriced' ? {} : {[owner.row_id]: {includedInEstimate: true, includedInProcurement: false, provenance, ...(route === 'manual' ? {unitPrice: '77'} : {})}};
      const prices = route === 'snapshot' ? [{price_key: owner.cost_owner_id!, unit_id: owner.unit_id, unit_price: '77', currency_code: 'KGS', snapshot_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}] : [];
      const r = await core(input, overrides, prices);
      expect(r.rows).toEqual([]);
      const conditional = r.preliminaryNeeds.filter(n => physicalAndIncluded.includes(n.row_id));
      expect(conditional.map(n => n.row_id)).toEqual(physicalAndIncluded);
      expect(conditional.map(n => n.quantity)).toEqual(expected);
      expect(conditional.every(n => n.need_state === 'CONDITION_REQUIRED' && n.missing_parameter_ids.includes(id!)
        && n.calculation_trace!==null&&typeof n.calculation_trace==='object'&&'preliminaryNeed'in n.calculation_trace&&n.calculation_trace.preliminaryNeed===true && !n.procurement_eligible)).toBe(true);
      expect(r.totals).toMatchObject({amount: '0', includedRowCount: 0, pricedRowCount: 0});
      const application = r.preliminaryNeeds.filter(n => needIds.includes(n.row_id));
      expect(application.map(n => n.row_id)).toEqual(needIds);
      expect(application.every(n => n.quantity === null && n.unit_price === null && !n.procurement_eligible)).toBe(true);
      expect(conditional[0]?.unit_price).toBe(route === 'manual' ? '77' : null);
    }
    await expect(core(input, {[owner.row_id]: {unitPrice: '77', includedInEstimate: true, includedInProcurement: true, provenance}})).rejects.toMatchObject({code: 'ROW_AMENDMENT_INVALID'});
    await assertExplicitManualNeed(owner.row_id,'77',input);
  });
  it.each(pack.projectFactsRequired.map(f => f.id))('missing physical reference%s withholds all19dependent source/included rows', async id => {
    const input = facts(); delete input[id]; const r = await core(input);
    expect(r.rows).toEqual([]);
    expect(r.preliminaryNeeds.filter(n => physicalAndIncluded.includes(n.row_id)).every(n => n.missing_parameter_ids.includes(id))).toBe(true);
    expect(r.preliminaryNeeds.filter(n => physicalAndIncluded.includes(n.row_id))).toHaveLength(19);
    expect(r.preliminaryNeeds.filter(n => needIds.includes(n.row_id))).toHaveLength(8);
  });
  it.each(pack.openNeeds.map(n => n.id))('manual0or1 on need%s preserves missing source requirements and cannot pay or order it', async id => {
    const row = prefix + ':open:' + id, parameter = 'steel_dn15_application_need_' + id.replaceAll('-', '_');
    for (const value of ['0', '1']) {
      await assertExplicitManualNeed(row,value,facts(),{unitPrice:'77',includedInEstimate:true,includedInProcurement:true});
      await expect(core({...facts(), [parameter]: value})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
    }
    expect(definition().parameters.find(p => p.parameter_id === parameter)).toMatchObject({unit_id: null, default_value: null,
      truth_metadata: {visibility_role: 'INTERNAL_ONLY', value_source_role: 'UNRESOLVED_APPLICATION_NORM'}});
  });
  it.each([
    ['node-quote-double-counts-valves', {node_quote_includes_valves: true}], ['node-quote-double-counts-fastenings', {node_quote_includes_fastenings: true}],
    ['support61kg-to61pcs', {support_quantity_pcs: '61'}], ['gas-or-wire-bundled-in-machine-rate', {machine_rate_includes_gas_and_wire: true}],
    ['repeat-existing-hydrotest-owner', {hydrotest_owner_catalog_id: 'canonical-work:master:internal_steel_water_hydraulic_test_dn50_krer16_07_005_01'}],
    ['add-future10orderowners-from-stock-and-quantum-only', {usable_stock: '0', supplier_package_quantum: '1'}],
  ] as Array<[string, Record<string, unknown>]>)('does not invent commercial admission for%s', async (_label, extra) => {
    await expect(core({...facts(), ...extra})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
  });
  it.each(['machinists-reference', 'flush-with-water'])('cannot sell%s separately on top of the one whole paid owner', async suffix => {
    const r = await core(facts(), {[physicalIds[0]!]: {unitPrice: '100', provenance}, [prefix + ':' + suffix]: {unitPrice: '77', includedInEstimate: true, includedInProcurement: true, provenance}});
    expect(r.totals.amount).toBe('3707'); expect(r.rows.filter(v => v.included_in_estimate).map(v => v.row_id)).toEqual([physicalIds[0]]);
    expect(r.rows.every(v => !v.included_in_procurement)).toBe(true);
  });
  // Additional checks cover exact common-core contracts beyond the91source-design cases.
  it.each([...pack.scopeFacts, ...pack.projectNumericFacts].map(f => f.id))('has no positive-source fallback when mandatory fact%s is absent', async id => {
    const input = facts(); delete input[id]; const r = await core(input); expect(r.rows).toEqual([]);
    expect(r.preliminaryNeeds.filter(n => physicalAndIncluded.includes(n.row_id))).toHaveLength(19);
    expect(definition().parameters.find(p => p.parameter_id === id)).toMatchObject({default_value: null, constraints_json: {requiredWhen: {kind: 'greater_than', parameterId: primary, value: 0}}});
  });
  it.each([
    {[primary]: '-1', project_length_m: '-1'}, {working_pressure_mpa: '0'}, {working_pressure_mpa: '-0.1'}, {working_height_m: '-0.01'}, {nominal_bore_mm: '14.99'},
    {project_length_m: '0'}, {project_length_m: '99'}, {[primary]: '99'},
  ])('uses existing exclusive/reciprocal numeric validation without guessed minima %#', async extra => {
    await expect(core({...facts(), ...extra})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
  });
  it('no actual length means no consumption; an unproved zero does not create positive source work', async () => {
    const input = facts(); delete input[primary]; const absent = await core(input); expect(absent.rows).toEqual([]);
    const unresolved = absent.preliminaryNeeds.filter(n => physicalAndIncluded.includes(n.row_id));
    expect(unresolved).toHaveLength(19); expect(unresolved.every(n => n.quantity === null)).toBe(true);
    expect(absent.totals).toMatchObject({amount: '0', includedRowCount: 0, pricedRowCount: 0});
    const zero = await core({[primary]: '0'}); expect(zero.rows.every(r => r.quantity === '0')).toBe(true);
    expect(zero.rows.every(r => !r.included_in_procurement)).toBe(true);
  });
  it.each(includedIds)('ties included component%s to the same whole owner while preserving explicit manual quantity', async id => {
    const r = definition().resources.find(v => v.row_id === id)!;
    expect(r).toMatchObject({cost_owner_id: physicalIds[0], resource_graph: {costTreatment: 'INCLUDED_IN_RESOURCE_ROWS', parentCostOwnerId: physicalIds[0], includedInResourceOwnerRowId: physicalIds[0]}});
    await assertExplicitManualSourceRow(id,'1');
  });
  it('preserves same-source user title, price and exclusion without mutating submitted rights', async () => {
    const raw = {unitPrice: '77', titleRu: 'TEST_ONLY сохранённый единый труд', includedInEstimate: false, includedInProcurement: false, provenance};
    const before = JSON.stringify(raw), r = await core(facts('125'), {[physicalIds[0]!]: raw});
    expect(r.rows[0]).toMatchObject({quantity: '46.3375', unit_price: '77', title_ru: raw.titleRu, included_in_estimate: false, included_in_procurement: false});
    expect(r.totals.amount).toBe('0'); expect(r.preliminaryNeeds).toHaveLength(8); expect(JSON.stringify(raw)).toBe(before);
  });
  it('keeps literal16source codes/rates, included3scope rows and needs8without borrowed trace', () => {
    const d = definition(); expect(d.resources.slice(0, 16).map(r => r.source_metadata?.normativeResourceCode)).toEqual(pack.physicalSourceRows.map(r => r.resourceCode));
    expect(d.resources.slice(19).every(r => r.unit_id === '' && JSON.stringify(r.source_metadata?.normativeTrace) === '[]' && JSON.stringify(r.source_metadata?.normative_source_ids) === '[]')).toBe(true);
    expect(d.resources.slice(0, 19).every(r => JSON.stringify(r.resource_graph.derivedQuantityEditPolicyV1).includes('PARAMETERS_ONLY'))).toBe(true);
    expect(d.formulas.slice(0, 19).every(f => f.input_parameter_ids.length === 1 && f.input_parameter_ids[0] === primary)).toBe(true);
    expect(d.parameters.filter(p => needParameters.includes(p.parameter_id))).toHaveLength(8);
    expect(d.resources.filter(r => r.source_metadata?.machinePriceOwnerAdmitted === true)).toEqual([]);
  });
  it.each(['project_valve_P', 'valve_rate_per_m', 'pipe_outside_diameter_mm', 'area_m2', 'pipe_package_m', 'machine_hour_price', 'stock_reserve'])('does not reinterpret unknown%s as a norm/order/price', async id => {
    await expect(core({...facts(), [id]: '0'})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'});
  });
  it('never admits catalog/source absence or consumes old saved-row objects as project input', async () => {
    expect(await scenario(facts())).toMatchObject({catalogId: null, publicationAllowed: false, fullTechnicalAcceptance: false});
    const old = {rows: [{row_id: 'historical-owner', quantity: '9', unit_price: '77'}], rowOverrides: {old: {includedInEstimate: false}}};
    const before = JSON.stringify(old);
    await expect(core({...facts(), ...old})).rejects.toMatchObject({code: 'PARAMETER_VALIDATION_FAILED'}); expect(JSON.stringify(old)).toBe(before);
  });
  it('resolves all27source/fullcycle expectations through the same independent-map contract', () => {
    const d = definition(), map = completeness(); expect(map.generatedFromCurrentRows).toBe(false); expect(map.entries).toHaveLength(27);
    expect(map.entries.filter(e => e.quantityRule === 'SOURCE_REQUIRED_NOT_QUANTIFIED')).toHaveLength(8);
    expect(validateIndependentCompletenessMapReferences({completenessMap: map, formulaDefinitions: [...d.formulas], resourceDefinitions: [...d.resources]})).toEqual([]);
  });
});

// Exercise the real generic publisher route policy with equal owner/unit preconditions.
it.each([...physicalIds.slice(1),...includedIds])('does not automatically inherit unadmitted reference price on %s',id=>{
 const target=definition().resources.find(r=>r.row_id===id)!;
 const source={...target,source_metadata:{}};
 expect(target.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(false);
});
it('retains the existing compatible whole-labour price route policy',()=>{
 const target=definition().resources.find(r=>r.row_id===physicalIds[0])!,source={...target,source_metadata:{}};
 expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(true);
});

// Manual amendments preserve the automatic source basis; they do not rewrite it.
async function assertExplicitManualSourceRow(rowId:string,quantity:string){
 const parameters=facts(),sourceBefore=JSON.stringify(definition()),before=await core(parameters);
 const original=before.rows.find(item=>item.row_id===rowId)!;
 expect(original).toBeDefined();
 const resource=definition().resources.find(item=>item.row_id===rowId)!,formula=definition().formulas.find(item=>item.formula_id===resource.formula_id)!;
 const overrides={[rowId]:{quantity,provenance:provenance}},saved=JSON.stringify(overrides);
 const edited=await core(parameters,overrides),actual=edited.rows.find(item=>item.row_id===rowId)!;
 expect(actual).toMatchObject({quantity,unit_id:original.unit_id,unit_price:original.unit_price,
  included_in_estimate:original.included_in_estimate,included_in_procurement:original.included_in_procurement,
  calculation_trace:{formulaId:resource.formula_id,formulaAstSha256:formula.ast_sha256,inputParameterIds:formula.input_parameter_ids,
   manualQuantityOverride:true,manualAmendment:provenance,calculatedQuantityBeforeOverride:original.quantity}});
 expect(edited.parameters).toEqual(before.parameters);expect(edited.derivedParameters).toEqual(before.derivedParameters);
 expect(edited.rows.filter(item=>item.row_id!==rowId)).toEqual(before.rows.filter(item=>item.row_id!==rowId));
 expect(edited.preliminaryNeeds).toEqual(before.preliminaryNeeds);expect(edited.totals).toEqual(before.totals);
 const cleared=await core(parameters,{[rowId]:{quantity:null,provenance:provenance}}),restored=cleared.rows.find(item=>item.row_id===rowId)!;
 expect(restored).toMatchObject({quantity:original.quantity,unit_id:original.unit_id,unit_price:original.unit_price,
  included_in_estimate:original.included_in_estimate,included_in_procurement:original.included_in_procurement,
  calculation_trace:{formulaId:resource.formula_id,formulaAstSha256:formula.ast_sha256,inputParameterIds:formula.input_parameter_ids}});
 expect(restored.calculation_trace).not.toHaveProperty('manualQuantityOverride');
 await expect(core(parameters,{[rowId]:{quantity}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 expect(JSON.stringify(overrides)).toBe(saved);expect(JSON.stringify(definition())).toBe(sourceBefore);
}

// A saved manual value never supplies the missing source/object norm or pays a held need.
async function assertExplicitManualNeed(rowId:string,quantity:string,input:Record<string,unknown>,extra:Record<string,unknown>={}){
 const sourceBefore=JSON.stringify(definition()),before=await core(input),original=before.preliminaryNeeds.find(item=>item.row_id===rowId)!;
 expect(original).toBeDefined();expect(original.missing_parameter_ids.length).toBeGreaterThan(0);
 const resource=definition().resources.find(item=>item.row_id===rowId)!,formula=definition().formulas.find(item=>item.formula_id===resource.formula_id)!;
 const overrides={[rowId]:{...extra,quantity,provenance:provenance}},saved=JSON.stringify(overrides);
 const edited=await core(input,overrides),actual=edited.preliminaryNeeds.find(item=>item.row_id===rowId)!;
 expect(actual).toMatchObject({quantity,unit_price:extra.unitPrice??original.unit_price,unit_id:original.unit_id,
  need_state:original.need_state,missing_parameter_ids:original.missing_parameter_ids,selected:original.selected,
  procurement_eligible:false,formula_id:resource.formula_id,normative_trace:original.normative_trace,
  calculation_trace:{preliminaryNeed:true,formulaId:resource.formula_id,formulaAstSha256:formula.ast_sha256,
   inputParameterIds:formula.input_parameter_ids,manualQuantityOverride:true,manualAmendment:provenance,
   calculatedQuantityBeforeOverride:original.quantity}});
 expect(edited.rows).toEqual(before.rows);expect(edited.parameters).toEqual(before.parameters);
 expect(edited.derivedParameters).toEqual(before.derivedParameters);expect(edited.totals).toEqual(before.totals);
 expect(edited.preliminaryNeeds.filter(item=>item.row_id!==rowId)).toEqual(before.preliminaryNeeds.filter(item=>item.row_id!==rowId));
 const cleared=await core(input,{[rowId]:{quantity:null,provenance:provenance}}),restored=cleared.preliminaryNeeds.find(item=>item.row_id===rowId)!;
 expect(restored).toMatchObject({quantity:original.quantity,unit_price:original.unit_price,unit_id:original.unit_id,
  need_state:original.need_state,missing_parameter_ids:original.missing_parameter_ids,selected:original.selected,
  procurement_eligible:false,formula_id:resource.formula_id,normative_trace:original.normative_trace});
 expect(restored.calculation_trace).not.toHaveProperty('manualQuantityOverride');
 await expect(core(input,{[rowId]:{quantity}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
 expect(JSON.stringify(overrides)).toBe(saved);expect(JSON.stringify(definition())).toBe(sourceBefore);
}
