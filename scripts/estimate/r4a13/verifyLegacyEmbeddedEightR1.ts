import fs from 'node:fs';import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {buildLegacyEmbeddedEightR1 as build,LEGACY_EMBEDDED_EIGHT_TARGETS_R1 as targets,LEGACY_EMBEDDED_EIGHT_PRESERVED12_R1 as preserve} from './legacyEmbeddedEightR1';
import {assembleLegacyEmbeddedEightForwardR1 as assemble} from './legacyEmbeddedEightForwardAssemblerR1';
import {buildConcreteFoundationAtomicConstructionR1 as buildAtomic,foundationAtomicChoiceLabelRuR1 as label} from '../../../src/lib/estimate/v4/concreteFoundationAtomicConstructionR1';
import {compileCanonicalEstimateCore as compile} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
type Json=Record<string,any>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
export async function verifyLegacyEmbeddedEightR1(context:Json){
 const parents=context.parents.filter((p:Json)=>targets.some(t=>t.catalogId===p.definition.catalog_id));assert.equal(parents.length,8);
 const frozen=hash(context),cases:Json[]=[];
 for(const parent of parents){
  const model=build(parent),source=buildAtomic(model.sourceProfileCatalogId);
  assert.deepEqual(model.formulas.map((f:Json)=>f.ast),source.formulas.map(f=>f.ast),'REUSED_CAST_IN_ARITHMETIC_CHANGED');
  assert(model.resources.every(r=>r.source_metadata?.automaticGenericPriceInheritanceAllowed===false));
  assert.equal(new Set(model.resources.map(r=>(r.resource_graph.operationCompositionV1 as Json).operationId)).size,5);
  const input:Json={
   approved_embedment_design_reference:'TEST new cast-in design E8-A',embedded_item_schedule_reference:'TEST two specified items, total40kg',
   approved_placement_drawing_reference:'TEST target construction drawing E8-A',slab_location:'TEST target construction segment E8-A',
   tolerance_specification_reference:'TEST independently confirmed tolerances',installation_method_statement_reference:'TEST cast-in only, before placing concrete',
   embedded_item_designation:'TEST embedded item E8-A',embedded_item_count_piece:2,embedded_item_total_mass_kg:40,
   layout_worker_h:1,positioning_worker_h:2,fixing_worker_h:2,field_welding_required:false,
   temporary_support_required:false,lifting_equipment_required:false,survey_control_required:false,inspection_record_count:1,
   coating_touchup_required:false,embedded_items_delivery_trip_count:1,
   embedded_installation_price_scope_reference:'TEST fixing labor excludes separately selected fixings',
   embedded_lifting_price_scope_reference:'TEST equipment excludes operator already paid within fixing',
   embedded_installation_delivery_reference:'TEST one specified embedded-item delivery trip',
   foundation_paid_owner_boundary:label('SEPARATE_CONFIRMED_PHYSICAL_SCOPE'),foundation_anchor_technology:label('CAST_IN_EMBEDDED_ITEMS')};
  for(const p of model.parameters){
   if(p.parameter_id.startsWith('foundation_')&&!p.parameter_id.startsWith('foundation_item_')&&p.value_type==='text')input[p.parameter_id]='TEST confirmed target-specific project and payment reference E8-A';
   if(/^foundation_item_.*_applicability$/u.test(p.parameter_id))input[p.parameter_id]=label('NOT_REQUIRED_BY_APPROVED_PROJECT');
  }
  if(model.target.contextKey==='repair'){
   input.embedded_local_repair_method='Закладные устанавливаются до бетонирования локально заменяемого участка по утверждённому проекту';
   input.embedded_local_repair_scope_reference='TEST new local concrete replacement and separately paid repair; not post-installed anchors';
  }
  Object.assign(input,{foundation_item_installation_fixing_applicability:label('REQUIRED_BY_APPROVED_PROJECT'),
   foundation_item_installation_fixing_payment_mode:label('SEPARATE_CONFIRMED_SUPPLY'),foundation_item_installation_fixing_designation:'TEST fixing E8-F2',
   foundation_item_installation_fixing_quantity:2,foundation_item_installation_fixing_price_scope_reference:'TEST separate physical fixing supply only',
   foundation_item_installation_fixing_stock:0,foundation_item_installation_fixing_reserve:1,foundation_item_installation_fixing_supplier_quantum:3});
  const execute=(parameters:Json)=>compile({operation:'compile',compilerVersion:'legacy-embedded-eight-verification-r1',catalogId:model.catalogId,
   primaryMeasureParameterId:model.primaryMeasureParameterId,parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,
   resourceDefinitions:model.resources,submittedParameters:parameters,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:128,hashJson:async v=>hash(v)});
  const result=await execute(input),fixing=result.rows.find(r=>r.row_id==='material:concrete:foundation-item-installation-fixing-separate');
  assert(fixing,'TEST_EXPLICIT_FIXING_NOT_CALCULATED');assert.equal(String(fixing.quantity),'3');
  assert.equal(result.preliminaryNeeds.length,0,'TEST_SCHEDULE_STILL_HAS_OPEN_QUANTITY_NEEDS:'+JSON.stringify(result.preliminaryNeeds));
  assert(!result.rows.some(r=>r.included_in_estimate&&r.row_id.includes('-kit')),'RETIRED_KIT_PAID_TWICE');
  const unknown={...input};delete unknown.foundation_item_installation_fixing_stock;
  const missing=await execute(unknown);assert(missing.preliminaryNeeds.some(n=>n.row_id===fixing.row_id),'UNKNOWN_STOCK_TREATED_AS_ZERO');
  const inactive=await execute({...input,foundation_item_installation_fixing_applicability:label('NOT_REQUIRED_BY_APPROVED_PROJECT')});
  assert(!inactive.rows.some(r=>r.row_id===fixing.row_id&&r.included_in_estimate));
  let badTechnology:any;try{await execute({...input,foundation_anchor_technology:'POST_INSTALLED_CHEMICAL_ANCHOR'});}catch(error){badTechnology=error;}
  assert.equal(badTechnology?.code,'PARAMETER_VALIDATION_FAILED','POST_INSTALLED_ANCHOR_ACCEPTED');
  let oldQRejected:any;try{await execute({...input,q:100});}catch(error){oldQRejected=error;}
  assert.equal(oldQRejected?.code,'PARAMETER_VALIDATION_FAILED','OLD_VOLUME_Q_WAS_REINTERPRETED_AS_NEW_QUANTITY');
  assert(String(oldQRejected.message).includes('unknown estimate parameters: q'),'WRONG_ERROR_MASKED_LEGACY_PRIMARY_REJECTION');
  if(model.target.contextKey==='repair'){
   const noMethod={...input};delete noMethod.embedded_local_repair_method;const needs=await execute(noMethod);
   assert(needs.preliminaryNeeds.length>0,'MISSING_REPAIR_CAST_IN_CONFIRMATION_WAS_ACCEPTED');
   assert(!needs.rows.some(r=>r.included_in_estimate&&!r.row_id.includes('-kit')),'MISSING_REPAIR_CONFIRMATION_DID_NOT_STOP_PAYABLE_ROWS');
   let rejected:any;try{await execute({...input,embedded_local_repair_method:'Отвергнуто: анкеровка после бетонирования'});}catch(error){rejected=error;}
   assert.equal(rejected?.code,'PARAMETER_VALIDATION_FAILED','REFUSED_REPAIR_CAST_IN_CONFIRMATION_WAS_ACCEPTED');
  }
  cases.push({catalogId:model.catalogId,contextKey:model.target.contextKey,family:model.target.family,
   modelParameters:model.parameters.length,modelFormulas:model.formulas.length,modelResources:model.resources.length,
   calculatedRows:result.rows.length,openNeeds:result.preliminaryNeeds.length,primaryPiece:2,totalEmbeddedMassKg:40,explicitFixingPurchaseQuantity:fixing.quantity,
   input,primaryAndOldQNotAliased:true,postInstalledTechnologyRejected:true,unknownStockNotAssumedZero:true,
   repairConfirmationVerified:model.target.contextKey==='repair',fixtureKind:'EXPLICIT_TEST_SCHEDULE_NOT_REAL_PROJECT',realProjectAccepted:false,confirmedSupplierOrder:false});
 }
 const prepared=assemble({parents,sources:context.sources,locators:context.locators,releaseId:'05a6e12c-314b-578c-8a76-5ab2e5a89574',
  sourceHead:'TEST_ONLY',sourceTree:'TEST_ONLY',sourceFingerprint:'TEST_ONLY_LEGACY_EMBEDDED8',sourceFreezeSha256:'TEST_ONLY',masterSha256:'TEST_ONLY',acceptanceEvidenceSha256:'TEST_ONLY'});
 assert.equal(prepared.models.length,8);assert.equal(hash(context),frozen,'CURRENT_PARENT_CONTEXT_MUTATED');
 for(const id of preserve)assert(context.parents.some((p:Json)=>p.definition.catalog_id===id));
 return {status:'PASS_LEGACY_EMBEDDED_EIGHT_CORE_AND_FORWARD_PLAN_VERIFICATION',cases,caseCount:8,
  actualCoreCompilationScenarios:cases.reduce((n,c)=>n+(c.repairConfirmationVerified?7:5),0),
  preparedPlans:prepared.models.map(m=>({catalogId:m.plan.definition.catalog_id,version:m.plan.definition.definition_version,parameters:m.plan.parameters.length,formulas:m.plan.formulas.length,resources:m.plan.resources.length,bindings:m.plan.bindings.length})),
  preserved12CurrentParentsUnchanged:true,automaticHistoricalMigrationPerformed:false,completeRealProjectEstimatesAccepted:0,confirmedSupplierOrders:0};
}
if(require.main===module){
 const context=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/u,''));
 verifyLegacyEmbeddedEightR1(context).then(result=>{fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,cases:result.caseCount,coreScenarios:result.actualCoreCompilationScenarios}));}).catch(error=>{console.error(error);process.exitCode=1;});
}
