import { readFileSync } from 'node:fs';
import { WHOLE_PROVISION_SAVED_MANUAL_MIGRATION_R1 as policy, admitWholeProvisionSavedManualMigrationR1 as admit } from './canonicalWholeProvisionSavedManualMigrationR1';
import { canonicalManualPriceMigrationBindings as prices, canonicalManualQuantityMigrationBindings as quantities,
  canonicalStoredManualPricesCanMigrate, assertCanonicalStoredManualPriceReleaseMigration } from './canonicalManualPriceReleaseMigration';
import type { Ct29MigrationModelR1 } from './canonicalCt29OrdinaryManualMigrationR1';
import {compileCanonicalEstimateCore} from './canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {interiorWallFinishingProvisionGroupDefinitionR8} from '../v4/interiorWallFinishingProvisionGroupR8';
import {ceramicFloorM150WholeProvisionDefinitionR5} from '../v4/ceramicFloorM150HandDryingProvisionR5';

const fixture = (name: string) => {
  const t = policy.transitions.find(t => t.name === name)!;
  const a = JSON.parse(readFileSync(t.modelRoot+'-from.json','utf8')), b = JSON.parse(readFileSync(t.modelRoot+'-to.json','utf8'));
  return { fromIdentity: a.identity, toIdentity: b.identity, from: a.model as Ct29MigrationModelR1, to: b.model as Ct29MigrationModelR1 };
};

test.each(['vgt','primer','floor'])('exact published %s predecessor retains saved physical quantities and reference prices without relaxing the writer', name => {
  const input = fixture(name), t = policy.transitions.find(t => t.name === name)!, result = admit(input);
  expect(result).not.toBeNull(); expect(Object.keys(result!.quantityBindings)).toHaveLength(t.preservedRowIds.length);
  const overrides = { [t.consumptionDriverRowId]: { quantity: '10.2', unitPrice: '50', provenance: { kind: 'manual' } } };
  const evidence = { rowOverrides: overrides, customRows: [], currency: 'KGS', fromBindings: prices(input.from), toBindings: result!.priceBindings,
    fromQuantityBindings: quantities(input.from), toQuantityBindings: result!.quantityBindings };
  expect(canonicalStoredManualPricesCanMigrate(evidence)).toBe(true);
  expect(canonicalStoredManualPricesCanMigrate({ ...evidence, toBindings: prices(input.to), toQuantityBindings: quantities(input.to) })).toBe(false);
  expect(() => assertCanonicalStoredManualPriceReleaseMigration({ ...evidence, parentOverrides: overrides, requestedOverrides: overrides,
    parentCustomRows: [], requestedCustomRows: [], parentCurrency: 'KGS', requestedCurrency: 'KGS' })).not.toThrow();
  expect(() => assertCanonicalStoredManualPriceReleaseMigration({ ...evidence, parentOverrides: overrides,
    requestedOverrides: { [t.consumptionDriverRowId]: { ...overrides[t.consumptionDriverRowId], quantity: '1' } },
    parentCustomRows: [], requestedCustomRows: [], parentCurrency: 'KGS', requestedCurrency: 'KGS' })).toThrow();
  expect(result!.exclusionBindings).toEqual({});expect(result!.operationBindings).toEqual({});
});

test.each(['vgt','primer','floor'])('%s preserves every still-unresolved application quantity under its original ID and unit', name => {
  const input=fixture(name), result=admit(input)!;
  const open=input.from.resources.filter(r=>String(r.row_id).includes('open-')||String(r.row_id).endsWith('handwash-water')
    ||String(r.row_id).endsWith('hand-drying-towels')||String(r.row_id).endsWith('deformation-junctions')||String(r.row_id).endsWith('additional-logistics-waste'));
  for(const row of open.filter(r=>result.quantityBindings[String(r.row_id)])){
    const id=String(row.row_id), target=input.to.resources.find(r=>r.row_id===id)!;
    expect(target.unit_id).toBe(row.unit_id);
    expect(canonicalStoredManualPricesCanMigrate({rowOverrides:{[id]:{quantity:'10',provenance:{kind:'manual'}}},customRows:[],
      fromBindings:prices(input.from),toBindings:result.priceBindings,fromQuantityBindings:quantities(input.from),toQuantityBindings:result.quantityBindings})).toBe(true);
  }
  expect(policy.transitions.find(t=>t.name===name)!.preservedRowIds.some(id=>id.endsWith(':open-access'))).toBe(false);
});

test.each(['catalog','source-hash','target-id','unit','category','formula','cost-owner','source','operation','new-row'])
  ('reviewed migration rejects %s drift instead of trusting a shared ID', mutation => {
    const input=structuredClone(fixture('vgt'));
    if(mutation==='catalog')input.toIdentity.catalogId='foreign';
    if(mutation==='source-hash')input.fromIdentity.sha256='b'.repeat(64);
    if(mutation==='target-id')input.toIdentity.id='foreign';
    if(mutation==='unit')input.to.resources[0].unit_id='l';
    if(mutation==='category')input.to.resources[0].category='foreign';
    if(mutation==='formula')input.to.formulas[0].ast={kind:'literal',value:'999'};
    if(mutation==='cost-owner')input.to.resources[0].cost_owner_id='foreign';
    if(mutation==='source')input.to.resources[0].source_metadata={foreign:true};
    if(mutation==='operation')input.to.resources[0].resource_graph={operationCompositionV1:{operationId:'foreign'}};
    if(mutation==='new-row')input.to.resources=[...input.to.resources,{row_id:'foreign'}];
    expect(admit(input)).toBeNull();
  });

const dryingTransitions=policy.transitions.filter(t=>t.name.includes('-drying-'));
test.each(dryingTransitions)('$name keeps saved pieces and litres through its exact published successor',async t=>{
  const input=fixture(t.name),admitted=admit(input);expect(admitted).not.toBeNull();
  const floor=t.name.startsWith('floor'),d=floor?ceramicFloorM150WholeProvisionDefinitionR5()
    :interiorWallFinishingProvisionGroupDefinitionR8(t.name.startsWith('primer')?'deep-primer-00603':'improved-wall-01');
  const towel=floor?'ceramic-floor:cement-mortar:krer11-01-027-03:r3:hand-drying-towels'
    :'wall_finish_ready_krer150400701_r3_work:open-hand-drying-towels',
    soap=floor?'ceramic-floor:cement-mortar:krer11-01-027-03:r3:hand-cleanser'
    :'wall_finish_ready_krer150400701_r3_work:open-hand-cleanser',
    order=floor?'ceramic-floor:cement-mortar:krer11-01-027-03:r5:hand-drying-supply'
    :'wall_finish_ready_krer150400701_r3_work:hand-drying-towels-order';
  const overrides={[towel]:{quantity:'101',unitPrice:'11',provenance:{kind:'manual' as const}},
    [soap]:{quantity:'10',provenance:{kind:'manual' as const}}};
  expect(canonicalStoredManualPricesCanMigrate({rowOverrides:overrides,customRows:[],currency:'KGS',
    fromBindings:prices(input.from),toBindings:admitted!.priceBindings,
    fromQuantityBindings:quantities(input.from),toQuantityBindings:admitted!.quantityBindings})).toBe(true);
  const parameters=floor?{net_ceramic_floor_area_m2:'100',ceramic_m150_skirting_length_m:'50'}
    :{wall_finish_ready_krer150400701_r3_net_wall_area_m2:'20.1'};
  const result=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'exact-drying-migration-test',
    catalogId:t.catalogId,primaryMeasureParameterId:Object.keys(parameters)[0],
    parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
    submittedParameters:parameters,confirmedParameters:{...d.runtimeInput},currencyCode:'KGS',priceItems:[],
    maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash,rowOverrides:overrides});
  expect(result.rows.find(r=>r.row_id===towel)).toMatchObject({quantity:'101',unit_id:'pcs',unit_price:'11',included_in_estimate:false,included_in_procurement:false});
  expect(result.rows.find(r=>r.row_id===order)).toMatchObject({quantity:'102',unit_id:'pcs',included_in_estimate:false,included_in_procurement:false});
  expect(result.rows.find(r=>r.row_id===soap)).toMatchObject({quantity:'10',unit_id:'l'});
  const pending=result.preliminaryNeeds.filter(n=>n.need_state==='QUANTITY_REQUIRED');
  if(floor)expect(pending).toHaveLength(3);
  else{
    // Real physical application gaps stay numeric questions. Closed semantic
    // scope notes stay in the saved ledger without an internal quantity input.
    // Exact published predecessor/successor migration evidence above is unchanged.
    const prefix='wall_finish_ready_krer150400701_r3_work:',
      expected=[['open-washing-water','l','need_washing_water'],['open-ppe','item','need_ppe'],
        ['open-handling-profile','item','need_handling_profile']] as const;
    expect(pending.map(n=>[n.row_id,n.unit_id]).sort()).toEqual(expected.map(([key,unit])=>[prefix+key,unit]).sort());
    for(const [key,unit,parameter] of expected){
      const need=pending.find(n=>n.row_id===prefix+key)!;
      expect(need).toMatchObject({unit_id:unit,quantity:null,unit_price:null,selected:false,procurement_eligible:false,
        formula_id:prefix+'formula:'+key});
      expect(need.missing_parameter_ids).toContain('wall_finish_ready_krer150400701_r3_'+parameter);
      expect(need.normative_trace).toEqual(expect.arrayContaining([expect.any(Object)]));
    }
    const semantic=[['ordinary-access','INCLUDED'],['ordinary-accompanying','INCLUDED'],['open-access','PROCESS_REQUIRED']] as const;
    for(const [key,status] of semantic){
      const need=result.preliminaryNeeds.find(n=>n.row_id===prefix+key)!;
      expect(need).toMatchObject({need_state:'CONDITION_REQUIRED',unit_id:'',quantity:null,unit_price:null,
        selected:false,procurement_eligible:false,missing_parameter_ids:[],formula_id:prefix+'formula:'+key,
        calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE',publicResourcePresentationV1:{rowKind:'PROCESS_NOTE'},
          scopeRequirementDecisionV1:{status,missingObjectFactParameterIds:[],numericNormAccepted:false,separatePaymentAccepted:false}}}});
      expect(need.normative_trace).toEqual(expect.arrayContaining([expect.any(Object)]));
      expect(result.rows.some(row=>row.row_id===need.row_id)).toBe(false);
    }
    for(const key of ['ordinary-access','ordinary-accompanying']){
      expect(d.resources.find(row=>row.row_id===prefix+key)!.resource_graph)
        .toMatchObject({scopeRequirementV1:{kind:'INCLUDED'},publicResourcePresentationV1:{rowKind:'PROCESS_NOTE'}});
    }
    expect(d.resources.find(row=>row.row_id===prefix+'open-access')!.resource_graph)
      .toMatchObject({scopeRequirementV1:{kind:'PROCESS'},publicResourcePresentationV1:{rowKind:'PROCESS_NOTE'}});
  }
});

test('a saved manual name requires the same reviewed physical binding and remains immutable during migration',()=>{
  const input=fixture('floor-drying-current'),admitted=admit(input)!,id='ceramic-floor:cement-mortar:krer11-01-027-03:ceramic-tile-order';
  const overrides={[id]:{titleRu:'Плитка заказчика 150 × 150 мм',quantity:'105',unitPrice:'600',provenance:{kind:'manual'}}};
  const evidence={rowOverrides:overrides,customRows:[],fromBindings:prices(input.from),toBindings:admitted.priceBindings,
    fromQuantityBindings:quantities(input.from),toQuantityBindings:admitted.quantityBindings};
  expect(canonicalStoredManualPricesCanMigrate(evidence)).toBe(true);
  expect(canonicalStoredManualPricesCanMigrate({...evidence,toBindings:{...admitted.priceBindings,[id]:'f'.repeat(64)}})).toBe(false);
  expect(canonicalStoredManualPricesCanMigrate({...evidence,rowOverrides:{[id]:{...overrides[id],titleRu:' '}}})).toBe(false);
  expect(()=>assertCanonicalStoredManualPriceReleaseMigration({...evidence,parentOverrides:overrides,
    requestedOverrides:{[id]:{...overrides[id],titleRu:'Другая плитка'}},parentCustomRows:[],requestedCustomRows:[],
    parentCurrency:'KGS',requestedCurrency:'KGS'})).toThrow();
});
