import {canonicalManualPriceMigrationBindings as bindings,canonicalStoredManualPricesCanMigrate as eligible,assertCanonicalStoredManualPriceReleaseMigration as assertMigration} from '../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {PVC15_FULL_DEFINITION_S2743 as oldField} from '../../src/lib/estimate/v4/pvcRoofMembraneFullCompositionS2743';
import {PVC15_FIELD_TRANSITION_DEFINITION_S2743 as composedField} from '../../src/lib/estimate/v4/pvcRoofFieldTransitionCompositionS2743';

const graph=()=>({resources:[{row_id:'labor',unit_id:'man_hour',category:'labor',formula_id:'hours',cost_owner_id:'labor',resource_graph:{semanticOwnerId:'labor',costTreatment:'OWN_COST',scopeContextParameterIds:['area'],operationCompositionV1:{groupId:'old'}},source_metadata:{normativeTrace:[{sourceId:'project',normVersion:'v1'}]}}],
 formulas:[{formula_id:'hours',ast:{type:'parameter',parameterId:'hours'},input_parameter_ids:['hours'],output_unit_id:'man_hour'}],parameters:[{parameter_id:'hours',value_type:'decimal',unit_id:'man_hour',truth_metadata:{semantic_parameter_key:'work-hours'}},{parameter_id:'area',value_type:'decimal',unit_id:'m2',truth_metadata:{semantic_parameter_key:'area'}}]});
const overrides={labor:{unitPrice:100,provenance:{kind:'manual',reason:'approved'}}};
const proof=()=>bindings(graph());
describe('source-authoritative stored manual price release migration',()=>{
 test('the accepted field keeps its four manual rate owners when the optional transition is added',()=>{
  const fromBindings=bindings(oldField),toBindings=bindings(composedField);
  const rowOverrides=Object.fromEntries(['pvc15:labor:separation','pvc15:equipment:own-use','pvc15:labor:preparation','rc09:pvc_membrane_hot_air_install'].map(id=>[id,overrides.labor]));
  expect(eligible({rowOverrides,customRows:[],fromBindings,toBindings})).toBe(true);
  expect(toBindings['pvc15:joint:machine-own']).not.toBe(fromBindings['pvc15:equipment:own-use']);
 });
 test('keeps the same physical price when applicability and process grouping change',()=>{
  const old=graph(),next=graph();Object.assign(next.resources[0],{inclusion_ast:{type:'literal',value:false}});next.resources[0].resource_graph.operationCompositionV1.groupId='new';
  expect(eligible({rowOverrides:overrides,customRows:[],fromBindings:bindings(old),toBindings:bindings(next)})).toBe(true);
  expect(bindings(next)['different-shared-owner']).toBeUndefined();
 });
 test.each(['unit','formula','owner','coverage','source','scope','input-unit','input-meaning'])('rejects changed %s price semantics',kind=>{
  const old=graph(),next=graph();
  if(kind==='unit')next.resources[0].unit_id='day';
  if(kind==='formula')next.formulas[0].ast.parameterId='otherHours';
  if(kind==='owner')next.resources[0].cost_owner_id='shared';
  if(kind==='coverage')Object.assign(next.resources[0].resource_graph,{commercialCostCoverageV1:{mode:'included'}});
  if(kind==='source')next.resources[0].source_metadata.normativeTrace[0].normVersion='v2';
  if(kind==='scope')next.resources[0].resource_graph.scopeContextParameterIds=['length'];
  if(kind==='input-unit')next.parameters[0].unit_id='day';
  if(kind==='input-meaning')next.parameters[0].truth_metadata.semantic_parameter_key='rental-period';
  expect(eligible({rowOverrides:overrides,customRows:[],fromBindings:bindings(old),toBindings:bindings(next)})).toBe(false);
 });
 test.each([0,null,'12.5'])('preserves an explicit price %s without guessing',unitPrice=>expect(eligible({rowOverrides:{labor:{...overrides.labor,unitPrice}},customRows:[],fromBindings:proof(),toBindings:proof()})).toBe(true));
 test.each([null,[],{labor:{...overrides.labor,quantity:12}},{labor:{unitPrice:100}},{labor:{...overrides.labor,unitPrice:-1}},{labor:{...overrides.labor,unitPrice:'unknown'}}])('rejects malformed or non-price-only edits %#',rowOverrides=>expect(eligible({rowOverrides,customRows:[],fromBindings:proof(),toBindings:proof()})).toBe(false));
 test('missing evidence and custom rows remain blocked; an empty valid amendment needs no bindings',()=>{
  expect(eligible({rowOverrides:overrides,customRows:[],fromBindings:proof(),toBindings:{}})).toBe(false);
  expect(eligible({rowOverrides:overrides,customRows:[{clientRowId:'x'}],fromBindings:proof(),toBindings:proof()})).toBe(false);
  expect(eligible({rowOverrides:{},customRows:[],fromBindings:undefined,toBindings:undefined})).toBe(true);
 });
 test('the server accepts exact stored rates only and rejects new edits and currency changes',()=>{
  const request={parentOverrides:overrides,parentCustomRows:[],requestedOverrides:overrides,requestedCustomRows:[],fromBindings:proof(),toBindings:proof(),parentCurrency:'KGS',requestedCurrency:'KGS'};
  expect(()=>assertMigration(request)).not.toThrow();
  for(const patch of [{requestedCurrency:'USD'},{requestedOverrides:{labor:{...overrides.labor,unitPrice:101}}},{requestedCustomRows:[{clientRowId:'new'}]},{toBindings:{}}])expect(()=>assertMigration({...request,...patch})).toThrow('Переход остановлен');
 });
});
