import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import pack from '../../../data/estimate-benchmarks/source-packs/pvc15-existing-area-bindings-s27-43.json';
import {pvc15FieldTransitionPublishConfigS2743} from './prepareS2743Pvc15FieldTransitionSuccessor';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {PVC15_FIELD_TRANSITION_DEFINITION_S2743 as definition} from '../../../src/lib/estimate/v4/pvcRoofFieldTransitionCompositionS2743';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {pvc15AreaVariantControlInputS2743} from '../../../tests/fixtures/pvc15AreaVariantBindingsS2743';

const packPath='data/estimate-benchmarks/source-packs/pvc15-existing-area-bindings-s27-43.json';
export type Pvc15AreaVariantS2743='small_area'|'large_area';
export function pvc15ExistingAreaPublishConfigS2743(parent:{definition:string;search:string},variant:Pvc15AreaVariantS2743):MasterSingleDefinitionSuccessorConfig{
 const member=pack.members.find(x=>x.variant===variant);assert(member,'UNKNOWN_EXISTING_AREA_BINDING');
 const previous=pvc15FieldTransitionPublishConfigS2743(parent);
 const packHash=createHash('sha256').update(readFileSync(packPath)).digest('hex');
 const input=pvc15AreaVariantControlInputS2743(variant),sourceId='pvc15_existing_area_bindings_s2743',normId='EXPLICIT_EXISTING_AREA_VARIANT_NO_RATE_FACTOR';
 return {...previous,contract:pack.contract,stopCode:'S2743_PVC15_AREA',applicationName:'s2743-pvc15-area-'+variant,
  owner:'S2743_PVC15_AREA_SINGLE_WRITER',receiptFileStem:'pvc15_area_'+variant,outputRoot:resolve('.release-runtime/r568/s27-43/pvc15-existing-area-'+variant),
  catalogId:member.catalogId,sourceId,normId,expectedParentShape:[1,59,59],shortInput:{area_m2:input.area_m2},acceptanceInput:input,
  sourcePaths:[...previous.sourcePaths,packPath,'scripts/estimate/r4a13/prepareS2743Pvc15ExistingAreaBindings.ts','tests/fixtures/pvc15AreaVariantBindingsS2743.ts','tests/estimateNorms/pvc15ExistingAreaBindingsS2743.contract.test.ts'],
  sourceMetadata:{...previous.sourceMetadata,source_title:'Принятый проектный профиль ПВХ1,5: два существующих варианта площади без поправок к нормам',artifact_sha256:packHash,
   exact_locator:previous.sourceMetadata.exact_locator+'; MASTER83 §20.45.4–8; два existing area bindings из source-pack',use_restriction:pack.rulesRu.join(' ')},
  passport:{...previous.passport,workKey:member.workKey,canonicalRuName:member.titleRu,physicalResultRu:'Смонтированное и проверенное выбранное поле кровельной ПВХ-мембраны1,5 мм по проекту; размер участка не меняет норму',
   includedScopeRu:[...previous.passport.includedScopeRu,...pack.rulesRu.slice(0,4)],excludedScopeRu:[...previous.passport.excludedScopeRu,'Иные материалы плоской кровли, непроверенные нагрузки и специальные зоны; применение прежнего default100 или generic нормы по названию']},
  applicability:{...previous.applicability,scope:'EXPLICIT_PVC15_EXISTING_AREA_VARIANT',areaVariant:variant,areaThresholdOrRateFactor:null},
  binding:{...previous.binding,applicability:{...previous.binding.applicability,source_id:sourceId,norm_id:normId,size_rate_factor_used:false}},
  locator:{key:'pvc15-existing-area-'+variant+'-s27-43',payload:{...previous.locator.payload,sourcePackSha256:packHash,parentDefinitionId:member.parentDefinitionId,
   parentDefinitionVersion:member.parentDefinitionVersion,fixturePath:'tests/fixtures/pvc15AreaVariantBindingsS2743.ts',sharedOwnerPath:pack.acceptedOwnerPath,formulaOverrides:[],acceptedNewTypeDelta:0}},
  search:{...previous.search,canonicalNameRu:member.titleRu,aliases:[member.titleRu,'ПВХ мембрана1,5 '+(variant==='small_area'?'малый участок':'большая площадь')],
   shortScopeRu:'Явно выбранное поле ПВХ1,5 по проектной системе; '+(variant==='small_area'?'малый участок':'большая площадь')+' без коэффициента размера. '+previous.search.shortScopeRu,
   sourceProvenance:{...previous.search.sourceProvenance,sourceId,normId,sourcePackSha256:packHash,sizeRateFactorUsed:false,existingVariantNotNewType:true}},
  verifyCore:async()=>{
   for(const component of pack.components)assert.equal(createHash('sha256').update(readFileSync(component.path)).digest('hex'),component.sha256);
   const compile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({definition,catalogId:member.catalogId,primaryMeasureParameterId:'area_m2',compilerVersion:pack.contract,submittedParameters});
   const short=await compile({area_m2:input.area_m2}),complete=await compile(input);
   assert.equal(short.rows.length,1);assert(short.preliminaryNeeds.length>0);assert.equal(short.rows[0].quantity,String(input.area_m2));
   assert.equal(complete.preliminaryNeeds.length,0);assert.equal(complete.rows.length,26);assert.deepEqual(definition.runtimeInput,{});
   assert.equal(complete.rows.find(r=>r.row_id==='rc09:reinforced_pvc_roof_membrane_1_5mm')?.quantity,String(input.reinforced_membrane_quantity_m2));
   return {status:'GREEN_EXPLICIT_EXISTING_PVC15_AREA_BINDING_CORE_CONTROL',variant,catalogId:member.catalogId,rows:26,needs:0,primaryArea:input.area_m2,sizeRateFactorUsed:false,acceptedNewTypeDelta:0,ordinaryUiAccepted:false};
  },
 };
}
async function run(){
 const variant=process.argv.find(arg=>arg.startsWith('--variant='))?.slice('--variant='.length);
 if(variant!=='small_area'&&variant!=='large_area')throw Error('EXPLICIT_EXISTING_VARIANT_REQUIRED');
 const current=JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json','utf8'));
 await runMasterSingleDefinitionSuccessorR1(pvc15ExistingAreaPublishConfigS2743({definition:current.definitionReleaseId,search:current.searchReleaseId},variant));
}
if(require.main===module)run().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
