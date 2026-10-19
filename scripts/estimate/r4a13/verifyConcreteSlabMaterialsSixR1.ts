import fs from 'node:fs';import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {buildConcreteSlabMaterialsSixR1 as build,type ConcreteSlabMaterialsParentR1 as Parent} from './concreteSlabMaterialsSixR1';
import {CONCRETE_SLAB_EMBEDDED_ITEMS_TARGETS as targets,concreteSlabEmbeddedItemsAcceptanceInputR1 as fixture} from '../../../src/lib/estimate/v4/concreteSlabEmbeddedItemsR1';
import {compileCanonicalEstimateCore as compile} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalManualPriceMigrationBindings as priceBindings,canonicalStoredManualPricesCanMigrate as canMigrate} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {foundationAtomicChoiceLabelRuR1 as label} from '../../../src/lib/estimate/v4/concreteFoundationAtomicConstructionR1';

type Json=Record<string,any>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
export async function verifyConcreteSlabMaterialsSixR1(parents:readonly Parent[]){
 assert.equal(parents.length,6);const cases:Json[]=[],models:Json[]=[];
 for(const parent of parents){
  const before=hash(parent),model=build(parent),target=targets.find(t=>t.catalogId===model.catalogId)!;
  assert.equal(hash(parent),before,'MUTATED_CURRENT_PARENT');assert.equal(model.groups.length,4);
  assert.equal(model.resources.length,66);assert.equal(model.retiredAggregateRowIds.length,10);assert.equal(model.preservedParentRowIds.length,18);
  for(const id of model.modifiedOwnerInputRows){
   const old=parent.resources.find(r=>r.row_id===id)!,next=model.resources.find(r=>r.row_id===id)!;
   assert.deepEqual({...next,resource_graph:old.resource_graph,source_metadata:old.source_metadata},old,'OWNER_CHANGED_BEYOND_AGGREGATE_SELECTOR_AND_PRICE_POLICY');
   assert.deepEqual(next.source_metadata,{...old.source_metadata,automaticGenericPriceInheritanceAllowed:false});
  }
  for(const id of model.preservedParentRowIds)assert.deepEqual(model.resources.find(r=>r.row_id===id),parent.resources.find(r=>r.row_id===id),'EXISTING_OWNER_RESOURCE_CHANGED');
  assert.deepEqual(model.formulas.slice(0,parent.formulas.length),parent.formulas,'EXISTING_FORMULAS_CHANGED');
  const oldPrices=priceBindings(parent as any),newPrices=priceBindings(model);
  for(const id of model.preservedParentRowIds)assert.equal(newPrices[id],oldPrices[id],'EXISTING_PRICE_OWNER_CHANGED');
  const manual=(id:string,patch:Json)=>({rowOverrides:{[id]:{...patch,provenance:{kind:'manual',reason:'TEST_ONLY'}}},customRows:[],fromBindings:oldPrices,toBindings:newPrices});
  assert(canMigrate(manual('work:concrete:slab-embedded-items-layout',{unitPrice:'100'})),'UNCHANGED_LABOR_PRICE_NOT_PRESERVED');
  assert(!canMigrate(manual('work:concrete:slab-embedded-items-fixing',{unitPrice:'100'})),'CHANGED_OWNER_INPUT_MANUAL_PRICE_MIGRATED_WITHOUT_REVIEW');
  assert(!canMigrate(manual('material:concrete:embedded-installation-separate-kit',{unitPrice:'100'})),'RETIRED_KIT_PRICE_SILENTLY_MIGRATED');
  assert(!canMigrate(manual('material:concrete:embedded-installation-separate-kit',{quantity:'35'})),'RETIRED_KIT_QUANTITY_SILENTLY_MIGRATED');
  assert(!canMigrate(manual('material:concrete:embedded-installation-separate-kit',{titleRu:'Manual title'})),'RETIRED_KIT_TITLE_SILENTLY_MIGRATED');
  const input:Json={...fixture(target.contextKey),
   welding_post_pricing_mode:'SEPARATE_EQUIPMENT_RATE',welding_post_specification:'TEST compatible welding post',welding_post_machine_h:1,
   welding_post_price_scope_reference:'TEST post includes its own energy; operator is in existing welding labor',
   welding_post_delivery_mode:'SEPARATE_CONFIRMED_TRIPS',welding_post_delivery_reference:'TEST one confirmed post transport trip',welding_post_delivery_trip_count:1,
   embedded_installation_price_scope_reference:'TEST fixing labor excludes separately selected physical items',
   embedded_lifting_price_scope_reference:'TEST lifting machine energy included; operator is in fixing labor',
   embedded_installation_delivery_reference:'TEST direct embedded-item delivery schedule',
   embedded_coating_method:'MANUAL_TOOLS',embedded_coating_method_reference:'TEST manual coating method',
   embedded_coating_price_scope_reference:'TEST coating work and direct coating material kept separate',
   embedded_coating_delivery_mode:'SEPARATE_CONFIRMED_TRIPS',embedded_coating_delivery_reference:'TEST one confirmed coating-tools trip',embedded_coating_delivery_trip_count:1};
  for(const group of model.groups)for(const position of group.positions)input[`foundation_item_${group.key}_${position.key}_applicability`]=label('NOT_REQUIRED_BY_APPROVED_PROJECT');
  Object.assign(input,{foundation_item_installation_fixing_applicability:label('REQUIRED_BY_APPROVED_PROJECT'),
   foundation_item_installation_fixing_payment_mode:label('SEPARATE_CONFIRMED_SUPPLY'),
   foundation_item_installation_fixing_designation:'TEST fixture: project fixing F-2',foundation_item_installation_fixing_quantity:2,
   foundation_item_installation_fixing_price_scope_reference:'TEST fixture: separate physical fixing only',foundation_item_installation_fixing_stock:0,
   foundation_item_installation_fixing_reserve:1,foundation_item_installation_fixing_supplier_quantum:3});
  const execute=(parameters:Json)=>compile({operation:'compile',compilerVersion:'concrete-slab-six-offline-verification-r1',catalogId:model.catalogId,
   primaryMeasureParameterId:model.primaryMeasureParameterId,parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,
   resourceDefinitions:model.resources,submittedParameters:parameters,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:128,hashJson:async v=>hash(v)});
  const result=await execute(input),fixing=result.rows.find(r=>r.row_id==='material:concrete:foundation-item-installation-fixing-separate');
  assert(fixing,'EXPLICIT_FIXING_NOT_CALCULATED:'+JSON.stringify({hours:input.fixing_worker_h,needs:result.preliminaryNeeds.filter(n=>n.row_id.includes('installation-fixing'))}));assert.equal(String(fixing.quantity),'3','SUPPLIER_QUANTUM_NOT_PRESERVED');
  assert(!result.rows.some(r=>model.retiredAggregateRowIds.includes(r.row_id)&&r.included_in_estimate),'RETIRED_KIT_PAID_TWICE');
  assert.equal(result.preliminaryNeeds.length,0,'EXPLICIT_TEST_SCHEDULE_STILL_HAS_OPEN_QUANTITY_NEEDS');
  const unknown={...input};delete unknown.foundation_item_installation_fixing_stock;
  const missing=await execute(unknown);assert(missing.preliminaryNeeds.some(n=>n.row_id===fixing.row_id),'UNKNOWN_STOCK_TREATED_AS_ZERO');
  const inactive={...input,foundation_item_installation_fixing_applicability:label('NOT_REQUIRED_BY_APPROVED_PROJECT')};
  const absent=await execute(inactive);assert(!absent.rows.some(r=>r.row_id===fixing.row_id&&r.included_in_estimate),'UNSELECTED_MATERIAL_BECAME_PURCHASE');
  const bad:Json={...input,field_welding_required:true,welding_worker_h:2,welding_post_pricing_mode:'INCLUDED_IN_WELDING_LABOR_RATE',
   foundation_item_welding_cable_applicability:label('REQUIRED_BY_APPROVED_PROJECT'),foundation_item_welding_cable_quantity:2,
   foundation_item_welding_cable_designation:'TEST welding cable',foundation_item_welding_cable_price_scope_reference:'TEST scope'};
  const equipment=model.resources.find(r=>r.row_id==='equipment:concrete:embedded-welding-post-separate')!;
  bad.foundation_item_welding_cable_payment_mode='Включено в подтверждённую ставку: '+equipment.title_ru;
  let rejection:any;try{await execute(bad);}catch(error){rejection=error;}assert(rejection,'MATERIAL_HIDDEN_BEHIND_EQUIPMENT_INCLUDED_IN_LABOR');
  assert.equal(rejection.code,'PARAMETER_VALIDATION_FAILED');
  assert(String(rejection.message).includes('foundation_item_welding_cable_payment_mode'),'WRONG_ERROR_MASKED_MATERIAL_OWNER_GUARD');
  cases.push({catalogId:model.catalogId,context:target.contextKey,fixtureKind:'EXPLICIT_TEST_SCHEDULE_NOT_REAL_PROJECT',primary:input.embedded_item_count_piece,
   explicitFixingQuantity:fixing.quantity,calculatedRows:result.rows.length,openNeeds:result.preliminaryNeeds.length,
   needs:result.preliminaryNeeds.map(n=>({rowId:n.row_id,missingParameterIds:n.missing_parameter_ids})),
   input,rejectedOwnerChoiceCode:rejection.code,fullProjectEstimateAccepted:false,confirmedOrder:false});
  models.push({catalogId:model.catalogId,modelSha256:hash(model),parentSha256:before,parameters:model.parameters.length,formulas:model.formulas.length,resources:model.resources.length,retiredAggregateRows:10,preservedResources:18,changedOwnerInputRows:model.modifiedOwnerInputRows});
 }
 return {status:'PASS_ALL_SIX_COMPILER_BOUNDARIES_PAYMENT_MIGRATION_AND_UNKNOWN_FACTS',cases,models,
  calculatedTypesWithExplicitTestFacts:6,realProjectEstimatesAccepted:0,publicationPerformed:false};
}
async function main(){
 const context=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/u,''));
 assert.equal(context.status,'PASS_READ_ONLY_CONCRETE_SLAB_SIX_CURRENT_FULL_PARENTS');
 const report=await verifyConcreteSlabMaterialsSixR1(context.parents);
 fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:report.status,models:report.models.length,calculatedTestTypes:6}));
}
if(process.argv[1]?.endsWith('verifyConcreteSlabMaterialsSixR1.ts'))void main().catch(error=>{console.error(error);process.exitCode=1;});
