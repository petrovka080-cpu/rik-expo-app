import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {pvc15FullCompositionPublishConfigS2743} from './prepareS2743Pvc15FullCompositionSuccessor';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {PVC15_FIELD_TRANSITION_DEFINITION_S2743 as definition,PVC15_JOINT_PACK_SHA256,PVC15_JOINT_CHOICE} from '../../../src/lib/estimate/v4/pvcRoofFieldTransitionCompositionS2743';
import {pvc15FieldTransitionControlInputS2743} from '../../../tests/fixtures/pvc15FieldTransitionCompositionS2743';
import {pvc15ControlInputS2743} from '../../../tests/fixtures/pvc15FullCompositionS2743';
import pack from '../../../data/estimate-benchmarks/source-packs/pvc15-field-transition-composition-s27-43.json';
const packPath='data/estimate-benchmarks/source-packs/pvc15-field-transition-composition-s27-43.json';
export function pvc15FieldTransitionPublishConfigS2743(parent:{definition:string;search:string}):MasterSingleDefinitionSuccessorConfig{
 const previous=pvc15FullCompositionPublishConfigS2743(parent);
 const sourceId='pvc15_field_transition_explicit_composition_s2743',normId='EXPLICIT_PROJECT_COMMON_PHYSICAL_RESOURCES_NO_NEW_NORM';
 return {...previous,contract:'rik-expo-app.s27-43.pvc15-field-transition-composition.v1',stopCode:'S2743_PVC15_JOINT',
  applicationName:'s2743-pvc15-field-transition',outputRoot:resolve('.release-runtime/r568/s27-43/pvc15-field-transition'),
  owner:'S2743_PVC15_JOINT_SINGLE_WRITER',receiptFileStem:'pvc15_field_transition',sourceId,normId,
  sourcePaths:[...previous.sourcePaths,packPath,'src/lib/estimate/v4/pvcBitumenTransitionReinforcedGuide2024S2737.ts',
   ...pack.components.map(x=>x.path),'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts','src/lib/estimate/v4/pvcRoofFieldTransitionCompositionS2743.ts',
   'src/lib/estimate/v4/g6PvcCommercialLaborProfilesS2741.ts','src/lib/estimate/v4/g6PvcResourcePresentationS2741.ts',
   'src/lib/estimate/v4/g6PvcProjectCompletionS2741.ts','src/lib/estimate/v4/g6PvcCompletionServiceComponentsS2741.ts',
   'src/lib/estimate/backendPlatform/canonicalCommercialCostCoverageV1.test.ts',
   'scripts/estimate/r4a13/prepareS2743Pvc15FieldTransitionSuccessor.ts','tests/fixtures/pvc15FieldTransitionCompositionS2743.ts',
   'tests/estimateNorms/optionalAutomaticOwnerCompositionR1.contract.test.ts','tests/estimateNorms/pvcRoofFieldTransitionCompositionS2743.contract.test.ts'],
  sourceMetadata:{...previous.sourceMetadata,source_title:'Условный совместимый состав поля ПВХ1,5 и принятого армированного перехода ПВХ–битум',
   exact_locator:'MASTER83 §20.45.6Д; '+pack.components.map(x=>x.path).join('; '),artifact_sha256:PVC15_JOINT_PACK_SHA256,
   use_restriction:pack.scopeRu+' Совместимость выбранных редакций и общего оснащения подтверждается по объекту; новый расход по площади не назначается.'},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  acceptanceInput:pvc15FieldTransitionControlInputS2743(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[154,54,54],validationScenario:'S2743_PVC15_FIELD_AND_ACCEPTED_TRANSITION_ONE_CORE_COMMON_RESOURCES',
  forbiddenAdjacentMatchers:[/sarnafil|rc09:roof_vapour_barrier|rc09:roof_insulation|metal_tile_lathing/i],
  passport:{...previous.passport,physicalResultRu:previous.passport.physicalResultRu+'; выбранный армированный переход только после подтверждения его границы и совместимости',
   includedScopeRu:[...previous.passport.includedScopeRu,...pack.compositionRulesRu],
   excludedScopeRu:previous.passport.excludedScopeRu.map(x=>x.replace('неподтверждённые соседние узлы','узлы вне подтверждённой составной границы'))},
  applicability:{...previous.applicability,scope:'EXISTING_PVC15_OPTIONAL_ACCEPTED_REINFORCED_TRANSITION_COMPOSITION',sharedPhysicalResourcesExplicit:true,distinctMaterialConsumptionsSumBeforeRounding:true},
  binding:{...previous.binding,applicability:{...previous.binding.applicability,source_id:sourceId,norm_id:normId,operation_class:'BOUNDED_FIELD_WITH_OPTIONAL_ACCEPTED_REINFORCED_TRANSITION'}},
  locator:{key:'pvc15-field-transition-composition-s27-43',payload:{kind:'OPTIONAL_EXISTING_COMPONENTS_ONE_CORE',sourcePackSha256:PVC15_JOINT_PACK_SHA256,
   sourcePacks:pack.components,fixturePath:'tests/fixtures/pvc15FieldTransitionCompositionS2743.ts',fixtureNeverRuntimeDefault:true,
   stockAllocatedOnce:true,sharedApparatusProvisionOnce:true,originalSavedRevisionsNotRewritten:true,acceptedNewTypeDelta:0}},
  search:{...previous.search,shortScopeRu:previous.search.shortScopeRu+'; по явной границе — армированный переход ПВХ–битум с общими ресурсами',
   keyDistinguishingParameters:[...previous.search.keyDistinguishingParameters,'pvc15_joint_transition_scope'],
   clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role!=='INTERNAL_ONLY'&&p.parameter_id!=='area_m2').map(p=>p.parameter_id),
   extraSearchTermsRu:previous.search.extraSearchTermsRu+' армированный переход ПВХ битум общий аппарат оснастка запас пересечение слоёв',
   sourceProvenance:{...previous.search.sourceProvenance,sourceId,normId,sourcePackSha256:PVC15_JOINT_PACK_SHA256,componentSources:pack.components}},
  verifyCore:async()=>{
   assert.equal(createHash('sha256').update(readFileSync(packPath)).digest('hex'),PVC15_JOINT_PACK_SHA256);
   for(const component of pack.components)assert.equal(createHash('sha256').update(readFileSync(component.path)).digest('hex'),component.sourceSha256);
   const compile=(submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({definition,submittedParameters,catalogId:previous.catalogId,primaryMeasureParameterId:'area_m2',compilerVersion:pack.contract});
   const short=await compile({area_m2:500}),field=await compile({...pvc15ControlInputS2743(),pvc15_joint_transition_scope:PVC15_JOINT_CHOICE.no}),joint=await compile(pvc15FieldTransitionControlInputS2743());
   assert.equal(short.rows.length,1);assert(short.preliminaryNeeds.length>0);assert.equal(field.rows.length,26);assert.equal(field.preliminaryNeeds.length,0);
   assert.equal(joint.preliminaryNeeds.length,0);assert.equal(joint.rows.find(r=>r.row_id==='pvc15:joint:machine-usage')!.quantity,'9.25');
   assert.equal(joint.rows.find(r=>r.row_id==='pvc15:joint:liquid-pvc')!.quantity,'7');assert(!joint.rows.some(r=>r.included_in_procurement&&r.unit_id==='machine_hour'));
   return {status:'GREEN_EXISTING_FIELD_TRANSITION_COMPOSITION_CORE_CONTROL',parameters:definition.parameters.length,resources:definition.resources.length,
    fieldKnownRows:26,jointKnownRows:joint.rows.length,sharedUsageHours:'9.25',sharedLiquidOrder:'7',defaults:{},
    acceptedNewTypeDelta:0,ordinaryUiAccepted:false,engineeringAccepted:false,seriesAccepted:false};
  },
 };
}
async function run(){
 const current=JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json','utf8'));
 await runMasterSingleDefinitionSuccessorR1(pvc15FieldTransitionPublishConfigS2743({definition:current.definitionReleaseId,search:current.searchReleaseId}));
}
if(require.main===module)run().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
