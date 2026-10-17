import fs from 'node:fs';import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {assembleSlabTransportProjectInputsTwoForwardR1 as assemble} from './slabTransportProjectInputsTwoForwardAssemblerR1';
import {isCanonicalEstimateConsumerSuppliedParameter as supplied,isCanonicalEstimateVisibleUserResourceSelectionParameter as selection,isCanonicalEstimateVisibleReplaceableProfile as profile,canonicalEstimateParameterChoiceLabelRu as label} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';
import {compileCanonicalEstimateCore as compile} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
type Json=Record<string,any>;const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
async function main(){
 const context=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),parents=context.parents.filter((p:Json)=>p.resources.length===109);assert.equal(parents.length,2);
 const built=assemble({...context,parents,releaseId:'95fc00da-baa5-50ee-8ca0-8ae417e6aa1a',sourceHead:'b415526f62bc6a414c6576037a86b78d83c0ee59',sourceTree:'1'.repeat(40),sourceFingerprint:'1'.repeat(64),sourceFreezeSha256:'2'.repeat(64),masterSha256:'e19c7b598656434d4c78cecc69a51099b15e842abd672fb60f6e854e23e790f7',acceptanceEvidenceSha256:'3'.repeat(64)});
 const fixtures=JSON.parse(fs.readFileSync(process.argv[3],'utf8')),models:Json[]=[],editor:Json[]=[];
 for(const {plan} of built.models){
  const parent=parents.find((p:Json)=>p.definition.catalog_id===plan.definition.catalog_id),fixture=fixtures.cases.find((c:Json)=>c.catalogId===plan.definition.catalog_id);assert(fixture);
  for(const p of plan.parameters.filter(p=>/^slab_(main_concrete|soil)_transport_(pricing_basis|price_scope_reference)$/u.test(p.parameter_id))){
   const t=p.truth_metadata,g=t.guide,schema:Json={parameterId:p.parameter_id,titleRu:p.title_ru,valueType:p.value_type,unitId:p.unit_id,required:p.required,defaultValue:null,constraints:p.constraints_json,visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,semanticParameterKey:t.semantic_parameter_key,formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,
    guide:{guideKind:g.guide_kind,sourceRole:g.source_role,guideVersion:g.guide_version,sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,guideValidationPolicy:g.guide_validation_policy}};
   assert(supplied(schema as any)||selection(schema as any)||profile(schema as any),'REQUIRED_PROJECT_TARIFF_FACT_HIDDEN:'+p.parameter_id);assert(selection(schema as any));assert(!Object.hasOwn(plan.baseline.input_values,p.parameter_id));
   if(p.value_type==='enum'){const labels=(p.constraints_json.values as string[]).map(v=>label(p.parameter_id,v));assert.equal(new Set(labels).size,labels.length);}
   editor.push({catalogId:plan.definition.catalog_id,parameterId:p.parameter_id,editable:true,resourceSelection:true,runtimeDefault:null});
  }
  const execute=(model:Json)=>compile({operation:'compile',compilerVersion:'slab-project-input-admission-r2',catalogId:plan.definition.catalog_id,primaryMeasureParameterId:'slab_area_m2',parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,submittedParameters:fixture.input,confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:160,priceItems:[],hashJson:async v=>hash(v)});
  const before=await execute(parent),after=await execute(plan);assert.equal(after.preliminaryNeeds.length,0);
  const calculated=(rows:Json[])=>rows.map(({resource_spec_id:_physicalResourceId,row_sha256:_serializedRowHash,...row})=>row);
  assert.deepEqual(calculated(after.rows),calculated(before.rows),'EDITOR_METADATA_CHANGED_CALCULATED_VALUES');
  models.push({catalogId:plan.definition.catalog_id,version:plan.definition.definition_version,parameters:83,formulas:127,resources:109,calculatedRows:after.rows.length,parentSha256:hash(parent),planSha256:hash(plan),allCalculatedValuesEquivalent:true,expectedNewPhysicalResourceIds:true});
 }
 const output={status:'PASS_TWO_SLAB_PROJECT_TARIFF_INPUTS_EDITABLE_AND_ALL_QUANTITIES_PRICE_BINDINGS_UNCHANGED',models,editor,other26ModelsChanged:false,databaseAccessed:false};fs.writeFileSync(process.argv[4],JSON.stringify(output,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:output.status,editorFields:editor.length}));
}
if(process.argv[1]?.endsWith('verifySlabTransportProjectInputsTwoR1.ts'))void main().catch(error=>{console.error(error);process.exitCode=1;});
