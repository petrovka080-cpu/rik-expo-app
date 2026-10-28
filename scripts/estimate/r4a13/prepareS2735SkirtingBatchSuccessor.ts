import {buildSkirtingCurrentPhysicalCycleR1,skirtingCurrentPhysicalCompletenessR1,skirtingCurrentPhysicalPackR1} from '../../../src/lib/estimate/v4/skirtingConstructorS2735';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {readMasterSuccessorTargetPreimageR1,validateIndependentCompletenessMapReferences,assembleMasterSingleDefinitionManagedRegistryCandidateR1} from './prepareMasterSingleDefinitionSuccessorR1';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import {buildCanonicalRevisionCommitPayload} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalEstimateRevisionDetailFromStorage,canonicalEstimateRevisionRowFromStorage} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections,canonicalEstimateWorkProcess} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {masterOperationValueSha256R1,assertMasterOperationCompositionDeclarationR1,assertMasterOperationCompositionComputationR1} from './masterOperationCompositionOnlyR1';
import {masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
import type {CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import type {MasterRetainedParentCaptureR1,MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileSkirtingConstructorS2735 as compile,SKIRTING_TARGETS_S2735 as targets,SKIRTING_DEFINITIONS_S2735 as definitions,
  SKIRTING_SOURCE_ID_S2735 as sourceId,SKIRTING_NORM_ID_S2735 as normId,SKIRTING_SOURCE_METADATA_S2735 as sourceMetadata} from '../../../src/lib/estimate/v4/skirtingConstructorS2735';
const currentReleasePath=resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json');
const outputRoot=resolve('.release-runtime/r568/s27-35/skirting-batch');
const titles={standard:'стандартная зона',small_area:'малый участок',large_area:'большой участок',high_load:'повышенная нагрузка по проекту',technical_room:'техническое помещение',wet_zone:'влажная зона'};
const selected=process.argv.find(a=>a.startsWith('--target='))?.slice('--target='.length);
assert(selected==null||targets.some(t=>t.operation+'-'+t.variant===selected),'UNKNOWN_SKIRTING_TARGET');

const skirtingCurrentCaptureAnchorsR410:Readonly<Record<string,Json>>={
  "canonical-work:base:flooring_interior_baseboard_install_standard": {
    "definitionId": "93b889bd-375a-57af-8e9e-2a1fd3828186",
    "baselineId": "a72284e3-aa67-5742-8b33-c8678346a98d",
    "sourceReleaseId": "fcea3501-544c-5065-8a40-411d6c119292",
    "shape": [
      137,
      37,
      37
    ],
    "binding": {
      "definition_version_id": "93b889bd-375a-57af-8e9e-2a1fd3828186",
      "resource_spec_id": "8164c84d-3d44-5832-9962-74fcdc64327d",
      "locator_id": "2a97cf89-50b7-5395-885d-42d0ac6345d7",
      "applicability": {
        "norm_id": "project:skirting:ready-gerflor-forbo-system:s27-35.v1",
        "source_id": "manufacturer_bound_skirting_constructor_s27_35",
        "exact_locator": "source-packs/skirting-constructor-s27-35.json: Gerflor6086 PMO516V1 p1; Forbo232 Performances/Application/Working Process/Articles; исходные операции труда и числитель потребления клея",
        "quantity_basis": "MEASURED_LENGTH_AND_VISIBLE_SELECTED_MANUFACTURER_RATE",
        "operation_class": "REUSED_NET_ADHESIVE_AND_SINGLE_INSTALLATION",
        "technology_class": "PRELIMINARY_GERFLOR_6086_FORBO_232_WITH_ACTUAL_CONFIRMATION",
        "universal_productivity_claimed": false
      }
    }
  },
  "canonical-work:base:flooring_interior_baseboard_install_high_load": {
    "definitionId": "fac89522-c393-559b-8092-cc10937cc42a",
    "baselineId": "5370c51a-1215-5e2f-87d6-18def873a284",
    "sourceReleaseId": "de7f5166-afe8-52fa-b7a5-5fedccb6a78f",
    "shape": [
      137,
      37,
      37
    ],
    "binding": {
      "definition_version_id": "fac89522-c393-559b-8092-cc10937cc42a",
      "resource_spec_id": "78ddde38-0ddd-560d-a1c0-b8c1d8f15eaf",
      "locator_id": "527838fe-e6e6-534e-bb92-b4feaac096f5",
      "applicability": {
        "norm_id": "project:skirting:ready-gerflor-forbo-system:s27-35.v1",
        "source_id": "manufacturer_bound_skirting_constructor_s27_35",
        "exact_locator": "source-packs/skirting-constructor-s27-35.json: Gerflor6086 PMO516V1 p1; Forbo232 Performances/Application/Working Process/Articles; исходные операции труда и числитель потребления клея",
        "quantity_basis": "MEASURED_LENGTH_AND_VISIBLE_SELECTED_MANUFACTURER_RATE",
        "operation_class": "REUSED_NET_ADHESIVE_AND_SINGLE_INSTALLATION",
        "technology_class": "PRELIMINARY_GERFLOR_6086_FORBO_232_WITH_ACTUAL_CONFIRMATION",
        "universal_productivity_claimed": false
      }
    }
  },
  "canonical-work:base:flooring_interior_baseboard_install_technical_room": {
    "definitionId": "f58a8688-2cb0-58f9-8ee6-233aee3fa919",
    "baselineId": "dfcd3111-9d92-5d59-ae8e-8232be2cd60d",
    "sourceReleaseId": "c31d4a29-c9d5-5a13-8853-af9f5852eae4",
    "shape": [
      137,
      37,
      37
    ],
    "binding": {
      "definition_version_id": "f58a8688-2cb0-58f9-8ee6-233aee3fa919",
      "resource_spec_id": "9635b399-b6b4-557a-927b-8aa2ab24420c",
      "locator_id": "e2fab132-9197-59a6-95d1-c0fec0275301",
      "applicability": {
        "norm_id": "project:skirting:ready-gerflor-forbo-system:s27-35.v1",
        "source_id": "manufacturer_bound_skirting_constructor_s27_35",
        "exact_locator": "source-packs/skirting-constructor-s27-35.json: Gerflor6086 PMO516V1 p1; Forbo232 Performances/Application/Working Process/Articles; исходные операции труда и числитель потребления клея",
        "quantity_basis": "MEASURED_LENGTH_AND_VISIBLE_SELECTED_MANUFACTURER_RATE",
        "operation_class": "REUSED_NET_ADHESIVE_AND_SINGLE_INSTALLATION",
        "technology_class": "PRELIMINARY_GERFLOR_6086_FORBO_232_WITH_ACTUAL_CONFIRMATION",
        "universal_productivity_claimed": false
      }
    }
  },
  "canonical-work:base:flooring_interior_baseboard_install_wet_zone": {
    "definitionId": "473fc240-c7d2-5147-9024-0b27ab89664a",
    "baselineId": "4b1e100f-4394-5ac5-ab74-00580e78cacb",
    "sourceReleaseId": "ef2a86c0-226d-5ed8-889d-c5f8285707bf",
    "shape": [
      137,
      37,
      37
    ],
    "binding": {
      "definition_version_id": "473fc240-c7d2-5147-9024-0b27ab89664a",
      "resource_spec_id": "c4179e5c-f0c2-5088-801e-f87b888e6882",
      "locator_id": "282f0209-297b-570f-bc39-d9f9285fc2fc",
      "applicability": {
        "norm_id": "project:skirting:ready-gerflor-forbo-system:s27-35.v1",
        "source_id": "manufacturer_bound_skirting_constructor_s27_35",
        "exact_locator": "source-packs/skirting-constructor-s27-35.json: Gerflor6086 PMO516V1 p1; Forbo232 Performances/Application/Working Process/Articles; исходные операции труда и числитель потребления клея",
        "quantity_basis": "MEASURED_LENGTH_AND_VISIBLE_SELECTED_MANUFACTURER_RATE",
        "operation_class": "REUSED_NET_ADHESIVE_AND_SINGLE_INSTALLATION",
        "technology_class": "PRELIMINARY_GERFLOR_6086_FORBO_232_WITH_ACTUAL_CONFIRMATION",
        "universal_productivity_claimed": false
      }
    }
  },
  "canonical-work:base:flooring_interior_baseboard_glue_standard": {
    "definitionId": "2bd43810-bc33-57a1-b04d-5d4a43767e31",
    "baselineId": "0e3fbbb1-f697-5000-8c00-91b0183cacdd",
    "sourceReleaseId": "de98d80f-4ad6-5570-b2e3-1f201b2a0b88",
    "shape": [
      129,
      35,
      35
    ],
    "binding": {
      "definition_version_id": "2bd43810-bc33-57a1-b04d-5d4a43767e31",
      "resource_spec_id": "289ec50c-0a1b-5498-a17c-d4fdfad8cbca",
      "locator_id": "af19be73-6ca7-5175-bf52-0ceabc4614b2",
      "applicability": {
        "norm_id": "project:skirting:ready-gerflor-forbo-system:s27-35.v1",
        "source_id": "manufacturer_bound_skirting_constructor_s27_35",
        "exact_locator": "source-packs/skirting-constructor-s27-35.json: Gerflor6086 PMO516V1 p1; Forbo232 Performances/Application/Working Process/Articles; исходные операции труда и числитель потребления клея",
        "quantity_basis": "MEASURED_LENGTH_AND_VISIBLE_SELECTED_MANUFACTURER_RATE",
        "operation_class": "REUSED_NET_ADHESIVE_AND_SINGLE_INSTALLATION",
        "technology_class": "PRELIMINARY_GERFLOR_6086_FORBO_232_WITH_ACTUAL_CONFIRMATION",
        "universal_productivity_claimed": false
      }
    }
  },
  "canonical-work:base:flooring_interior_baseboard_glue_high_load": {
    "definitionId": "7c3fcf48-cced-518f-bc74-ae8feb276848",
    "baselineId": "857ef8d1-37f8-5712-96f8-11a47328796d",
    "sourceReleaseId": "fa9136cc-5308-542a-b8a7-f03338577cb1",
    "shape": [
      129,
      35,
      35
    ],
    "binding": {
      "definition_version_id": "7c3fcf48-cced-518f-bc74-ae8feb276848",
      "resource_spec_id": "5bb9e4ca-29bd-5cd5-8f77-9222b913f9d0",
      "locator_id": "fe3cd1b7-356d-5ffc-a929-4d4ab77551dc",
      "applicability": {
        "norm_id": "project:skirting:ready-gerflor-forbo-system:s27-35.v1",
        "source_id": "manufacturer_bound_skirting_constructor_s27_35",
        "exact_locator": "source-packs/skirting-constructor-s27-35.json: Gerflor6086 PMO516V1 p1; Forbo232 Performances/Application/Working Process/Articles; исходные операции труда и числитель потребления клея",
        "quantity_basis": "MEASURED_LENGTH_AND_VISIBLE_SELECTED_MANUFACTURER_RATE",
        "operation_class": "REUSED_NET_ADHESIVE_AND_SINGLE_INSTALLATION",
        "technology_class": "PRELIMINARY_GERFLOR_6086_FORBO_232_WITH_ACTUAL_CONFIRMATION",
        "universal_productivity_claimed": false
      }
    }
  },
  "canonical-work:base:flooring_interior_baseboard_glue_technical_room": {
    "definitionId": "3c9820fb-6ff2-53dc-99d7-7ad93a011174",
    "baselineId": "ffdc8e65-a3be-5647-9fed-0c4b34b8c48a",
    "sourceReleaseId": "d589ea06-3e21-5681-92d6-c49afbf2184f",
    "shape": [
      129,
      35,
      35
    ],
    "binding": {
      "definition_version_id": "3c9820fb-6ff2-53dc-99d7-7ad93a011174",
      "resource_spec_id": "efea8d1f-40c9-586d-9149-5df8c6dcb9dd",
      "locator_id": "976f8217-e2a2-56b8-af4e-0809742b3b2d",
      "applicability": {
        "norm_id": "project:skirting:ready-gerflor-forbo-system:s27-35.v1",
        "source_id": "manufacturer_bound_skirting_constructor_s27_35",
        "exact_locator": "source-packs/skirting-constructor-s27-35.json: Gerflor6086 PMO516V1 p1; Forbo232 Performances/Application/Working Process/Articles; исходные операции труда и числитель потребления клея",
        "quantity_basis": "MEASURED_LENGTH_AND_VISIBLE_SELECTED_MANUFACTURER_RATE",
        "operation_class": "REUSED_NET_ADHESIVE_AND_SINGLE_INSTALLATION",
        "technology_class": "PRELIMINARY_GERFLOR_6086_FORBO_232_WITH_ACTUAL_CONFIRMATION",
        "universal_productivity_claimed": false
      }
    }
  },
  "canonical-work:base:flooring_interior_baseboard_glue_wet_zone": {
    "definitionId": "4b97c7af-eb80-5ba2-83ef-5b3d59cc9561",
    "baselineId": "02ec37d8-5f88-583d-b224-002d111a8fa9",
    "sourceReleaseId": "d6035f58-cdef-5dac-b696-80a072167d88",
    "shape": [
      129,
      35,
      35
    ],
    "binding": {
      "definition_version_id": "4b97c7af-eb80-5ba2-83ef-5b3d59cc9561",
      "resource_spec_id": "24a2ab01-cc8f-59e9-a16e-20324aae6dbc",
      "locator_id": "a15f3955-6906-557f-a980-c92d8453f510",
      "applicability": {
        "norm_id": "project:skirting:ready-gerflor-forbo-system:s27-35.v1",
        "source_id": "manufacturer_bound_skirting_constructor_s27_35",
        "exact_locator": "source-packs/skirting-constructor-s27-35.json: Gerflor6086 PMO516V1 p1; Forbo232 Performances/Application/Working Process/Articles; исходные операции труда и числитель потребления клея",
        "quantity_basis": "MEASURED_LENGTH_AND_VISIBLE_SELECTED_MANUFACTURER_RATE",
        "operation_class": "REUSED_NET_ADHESIVE_AND_SINGLE_INSTALLATION",
        "technology_class": "PRELIMINARY_GERFLOR_6086_FORBO_232_WITH_ACTUAL_CONFIRMATION",
        "universal_productivity_claimed": false
      }
    }
  }
};
const skirtingCurrentRegistryLocatorIdentitiesR410=[
  {
    "id": "282f0209-297b-570f-bc39-d9f9285fc2fc",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-install-wet_zone-v1"
  },
  {
    "id": "2a97cf89-50b7-5395-885d-42d0ac6345d7",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-install-standard-v1"
  },
  {
    "id": "527838fe-e6e6-534e-bb92-b4feaac096f5",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-install-high_load-v1"
  },
  {
    "id": "976f8217-e2a2-56b8-af4e-0809742b3b2d",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-glue-technical_room-v1"
  },
  {
    "id": "a15f3955-6906-557f-a980-c92d8453f510",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-glue-wet_zone-v1"
  },
  {
    "id": "af19be73-6ca7-5175-bf52-0ceabc4614b2",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-glue-standard-v1"
  },
  {
    "id": "ba65f64c-f514-5274-a061-642bc432d7b7",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-glue-large_area-v1"
  },
  {
    "id": "bb7f29be-794f-5813-9ad2-201c85eff7ef",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-glue-small_area-v1"
  },
  {
    "id": "cc85dc76-aadb-5c4b-98c5-d5299f471da0",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-install-large_area-v1"
  },
  {
    "id": "e2fab132-9197-59a6-95d1-c0fec0275301",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-install-technical_room-v1"
  },
  {
    "id": "e6c552ba-873b-5868-808c-585fed9e8c11",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-install-small_area-v1"
  },
  {
    "id": "fe3cd1b7-356d-5ffc-a929-4d4ab77551dc",
    "sourceId": "5aaecb6b-7af3-5262-924e-694d06ea67d3",
    "locatorKey": "skirting-s27-35-glue-high_load-v1"
  }
] as const;

/** Close the retained capture over its real binding; preserve the whole raw
 * source registry separately. This function neither authorizes nor publishes. */
export function projectSkirtingCurrentRetainedCaptureR410(record:Json,parent:{releaseId:string;searchReleaseId:string}){
  const c=record.capture as MasterRetainedParentCaptureR1,a=skirtingCurrentCaptureAnchorsR410[record.catalogId],m=record.membership,s=record.searchDocument;
  assert(a,'SKIRTING_EXACT_CURRENT_CATALOG');
  assert.equal(c.definition.catalog_id,record.catalogId);assert.equal(c.definition.id,a.definitionId,'SKIRTING_EXACT_CURRENT_DEFINITION');
  assert.equal(c.definition.definition_version,4,'SKIRTING_EXACT_CURRENT_REVISION');
  assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length],a.shape,'SKIRTING_EXACT_CURRENT_WHOLE_SHAPE');
  assert.equal(c.baseline.id,a.baselineId);assert.equal(c.baseline.catalog_id,record.catalogId);assert.equal(c.baseline.definition_version_id,a.definitionId);
  assert.equal(m.catalog_id,record.catalogId);assert.equal(m.definition_version_id,a.definitionId);assert.equal(m.approved_template_baseline_id,a.baselineId);
  assert.equal(m.release_id,parent.releaseId);assert.equal(m.source_release_id,a.sourceReleaseId);assert.equal(c.definition.release_id,a.sourceReleaseId);
  assert.equal(s.catalog_id,record.catalogId);assert.equal(s.definition_version_id,a.definitionId);
  assert.equal(s.definition_release_id,parent.releaseId,'SKIRTING_EXACT_CURRENT_SEARCH_PARENT');assert.equal(s.search_release_id,parent.searchReleaseId);
  assert.equal(record.contentPassport.definition_version_id,a.definitionId);
  assert.equal(c.bindings.length,1);assert.deepEqual(c.bindings[0],a.binding,'SKIRTING_EXACT_CURRENT_BINDING');
  assert.equal(c.resources.filter(row=>row.id===a.binding.resource_spec_id).length,1,'SKIRTING_EXISTING_RESOURCE_OWNER');
  assert.equal(c.normativeSources.length,1);assert.equal(c.normativeSources[0]!.source_key,sourceId,'SKIRTING_EXACT_CURRENT_SOURCE_KEY');
  assert.equal(c.normativeLocators.length,12,'SKIRTING_PRESERVE_TWELVE_RAW_LOCATORS');
  const identities=c.normativeLocators.map(row=>({id:row.id,sourceId:row.source_id,locatorKey:row.locator_key})).sort((x,y)=>String(x.id).localeCompare(String(y.id)));
  assert.deepEqual(identities,skirtingCurrentRegistryLocatorIdentitiesR410,'SKIRTING_EXACT_RAW_REGISTRY_IDENTITIES');
  assert(c.normativeLocators.every(row=>row.source_id===c.normativeSources[0]!.id),'SKIRTING_EXACT_CURRENT_SOURCE_OWNER');
  const bound=c.normativeLocators.filter(row=>row.id===a.binding.locator_id),siblings=c.normativeLocators.filter(row=>row.id!==a.binding.locator_id);
  assert.equal(bound.length,1);assert.equal(siblings.length,11);
  return {retainedCapture:{...c,normativeLocators:bound},rawCurrentCapture:c,
    rawRegistryLocators:c.normativeLocators,untouchedRegistrySiblingLocators:siblings};
}

async function run(){const receipts:unknown[]=[];
for(const [index,target]of targets.entries()){
  const {operation,variant,catalogId}=target,key=operation+'-'+variant;
  if(selected!=null&&selected!==key)continue;
  const parent=JSON.parse(readFileSync(currentReleasePath,'utf8'));
  const definition=definitions[operation],titleRu=titles[variant];
  const variantRoot=resolve(outputRoot,key);
  const operationTitle=operation==='install'?'Монтаж плинтуса с поставкой':'Приклеивание предоставленного плинтуса';
  async function verifyCore(){const short=await compile({length_m:30},catalogId);
    const checked=await compile({length_m:7,material_skirting_adhesive_stock:280},catalogId);
    assert.equal(short.rows.length,operation==='install'?21:19);assert.equal(short.preliminaryNeeds.length,5);
    assert.equal(checked.rows.find(r=>r.row_id==='material:skirting:adhesive')?.quantity,'0');
    assert(!Object.keys(definition.runtimeInput).some(k=>/productivity|_confirmed|trip_count/.test(k)));
    return {status:'GREEN_S2735_SKIRTING_REUSED_OWNER',operation,variant,knownShortRows:short.rows.length,shortNeeds:short.preliminaryNeeds.length,engineeringAccepted:false,ordinaryUiAccepted:false,
      validationFixtureNeverRuntimeDefaults:true,sha256:createHash('sha256').update(JSON.stringify({short,checked})).digest('hex')};}
  const config:MasterSingleDefinitionSuccessorConfig={contract:'rik-expo-app.s27-35.skirting-'+key+'.v1',stopCode:'S2735_SKIRTING_'+key.toUpperCase().replaceAll('-','_'),applicationName:'s2735-skirting-'+key,
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (75).md',masterSha256:'bd9241644e6fd958e77a775f24ae7043ad33a1e67e72f0b4b0983da0fd57b230',
    parentReleaseId:parent.definitionReleaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath,outputRoot:variantRoot,
    sourcePaths:['src/lib/estimate/v4/skirtingConstructorS2735.ts','src/lib/estimate/v4/domains/interiorFinishesComplete/baseboardGerflorInstallProfessionalV1.ts',
      'src/lib/estimate/v4/domains/interiorFinishesComplete/baseboardGlueProfessionalV1.ts','src/lib/estimate/v4/domains/interiorFinishesComplete/inventory.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
      'data/estimate-benchmarks/source-packs/skirting-constructor-s27-35.json','tests/estimateNorms/skirtingConstructorS2735.contract.test.ts',
      'scripts/estimate/r4a13/prepareS2735SkirtingBatchSuccessor.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'],
    catalogId,sourceId,normId,sourceMetadata,parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:{length_m:30},acceptanceInput:{length_m:30,...definition.runtimeInput},runtimeProfileInput:definition.runtimeInput,runtimeProfileClassification:definition.runtimeClassification,runtimeProfileSourceIds:definition.runtimeSourceIds,
    verifyCore,expectedParentShape:[1,59,59],benchmarkOrdinal:135+index,validationScenario:'S2735_SKIRTING_'+key.toUpperCase().replaceAll('-','_')+'_ORDINARY_LENGTH',
    passport:{canonicalRuName:operationTitle+' ('+titleRu+')',workKey:'flooring_interior_baseboard_'+operation+'_'+variant,
      physicalResultRu:'Линия совместимого плинтуса с материалами, раскроем, приклеиванием и подтверждаемыми условиями; видимый Gerflor6086/Forbo232 профиль предварительный',
      includedScopeRu:[operation==='install'?'Поставка профиля6086 и применимых вставок6087':'Профиль и вставки предоставлены, поставка исключена',
        'Числитель расхода клея и труд готовых операций переиспользованы; установка и приклеивание оплачиваются один раз',
        'Клей, совместимый очиститель и отдельные расходники/оснащение; ручной и электрический раскрой взаимоисключены',
        'Местное выравнивание и герметизация только при подтверждённой необходимости, фактических изделиях/количествах/фасовке',
        'Совместимый клей-герметик вставок и примыкания объединяется до округления, с неоплачиваемым распределением',
        'Известная длина сразу; фактический труд/доставка и подтверждение условий остаются локальными уточнениями'],
      excludedScopeRu:['Двойная оплата приклеивания и монтажа, ножовки и электрораскроя','Подложка, напольное покрытие, автоматические саморезы/комплекты кг',
        'Forbo232 для вставок без совместимого узла','Нормы труда/раскроя по названию варианта, утверждение объекта и цены']},
    applicability:{country:'KG',primaryMeasureParameterId:'length_m',knownScopeParameters:['length_m'],ordinaryUserInputCount:1,operation,variant,hiddenDemoFixtureInputs:false,ordinaryUiAccepted:false,engineeringAccepted:false},
    binding:{rowId:'material:skirting:adhesive',applicability:{technology_class:'PRELIMINARY_GERFLOR_6086_FORBO_232_WITH_ACTUAL_CONFIRMATION',operation_class:'REUSED_NET_ADHESIVE_AND_SINGLE_INSTALLATION',source_id:sourceId,norm_id:normId,exact_locator:sourceMetadata.exact_locator,quantity_basis:'MEASURED_LENGTH_AND_VISIBLE_SELECTED_MANUFACTURER_RATE',universal_productivity_claimed:false}},
    locator:{key:'skirting-s27-35-'+key+'-v1',payload:{kind:'MEASURED_LENGTH_REUSED_OPERATIONS',sourcePackSha256:sourceMetadata.artifact_sha256,ordinaryKnownInputs:['length_m'],visibleProfileInputs:Object.keys(definition.runtimeInput),fixtureValuesNeverRuntimeDefaults:true,variantDoesNotChooseEngineeringNorm:true}},
    search:{primaryUom:'m',canonicalNameRu:operationTitle+' ('+titleRu+')',aliases:[(operation==='install'?'установка плинтуса ':'приклеить плинтус ')+titleRu,(operation==='install'?'монтаж плинтуса с материалом ':'приклеивание предоставленного плинтуса ')+titleRu],
      shortScopeRu:operationTitle+'. Готовые операции, раскрытые материалы, совместимая закупка; выбранный предварительный профиль и условия требуют подтверждения.',
      keyDistinguishingParameters:['length_m','skirting_product_code','adhesive_product'],clarificationFields:['cut_extra_m','end_cap_count','cutting_mode','local_preparation_mode','junction_sealing_mode'],
      includedBoundaries:['Профиль/клей/раскрой/монтаж/подготовка/оснащение по границам выбранной операции'],excludedBoundaries:['Напольное покрытие/подложка','Скрытые проектные подтверждения и производительность'],
      extraSearchTermsRu:'плинтус ПВХ Gerflor6086 Forbo232 торец раскрой приклеивание монтаж закупка остаток',sourceProvenance:{acceptedOperationsReused:true,variantDoesNotChooseEngineeringNorm:true,hiddenDemoFixtureInputs:false,engineeringApprovalClaimed:false}},
    forbiddenAdjacentMatchers:[/materials_0[1-6]/iu,/professional_.*_set/iu,/floor_covering/iu,/underlay/iu],owner:'S2735_SKIRTING_BATCH',receiptFileStem:'skirting_'+key};
  await runMasterSingleDefinitionSuccessorR1(config);
  const receipt=process.argv.includes('--apply')?JSON.parse(readFileSync(resolve(variantRoot,'acceptance.json'),'utf8')):{status:'DRY_RUN_COMPLETED_WITHOUT_DATABASE_MUTATION',parent:{releaseId:parent.definitionReleaseId,searchReleaseId:parent.searchReleaseId},successor:null,productionAccessed:false,source:null};
  receipts.push({key,status:receipt.status,parent:receipt.parent,successor:receipt.successor,productionAccessed:receipt.productionAccessed,source:receipt.source});
  mkdirSync(outputRoot,{recursive:true});writeFileSync(resolve(outputRoot,process.argv.includes('--apply')?'batch-apply-summary.json':'batch-dry-run-summary.json'),JSON.stringify({targets:receipts,current:JSON.parse(readFileSync(currentReleasePath,'utf8')),productionAccessed:false},null,2));
}
}

/** Actual current inputs, loaded only on explicit use. No current DB authority
 * is inferred from this retained artifact; the writer rechecks current tuples. */
export function skirtingCurrentMetadataRecordsR411():Json[]{
 const bytes=readFileSync(resolve(__dirname,'../../..',"data/estimate-benchmarks/fixtures/finishing-current12-metadata-records-r411.json"));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),"d3fd4fa3f0ee4c229624180b93fd0c08d01b8c7bca4ab91ca88ada7367b43348",'EXACT_CURRENT_METADATA_INPUT_BYTES');
 const value=JSON.parse(bytes.toString('utf8'));assert.equal(value.status,'ACTUAL_CURRENT_TWELVE_RECIPE_INPUTS_NOT_ADMITTED');
 return (value.records as Json[]).filter(row=>row.family.startsWith("SKIRTING"));
}

/** Existing Master retained recipe. Every current row/source/baseline is kept;
 * only the reviewed operation field may change. Literal admission stays closed
 * until ROOT accepts the genuine helper hashes and a separate guard forward. */
/** Publication contract belongs to the whole captured native model, not its shared source row. */
export function skirtingCurrentNativeContractR1(c:Pick<MasterRetainedParentCaptureR1,'parameters'|'definition'>):string{
 const contracts=[...new Set(c.parameters.map(row=>row.truth_metadata?.contract))];
 assert.equal(contracts.length,1,'CURRENT_NATIVE_PARAMETER_CONTRACT_UNIQUE');
 const contract=contracts[0];assert(typeof contract==='string'&&contract.trim().length>0,'CURRENT_NATIVE_PARAMETER_CONTRACT_NONEMPTY');
 assert.equal(contract,c.definition.source_metadata.contract,'CURRENT_NATIVE_DEFINITION_PARAMETER_CONTRACT');
 return contract;
}
export function skirtingCurrentRetainedMetadataConfigR411(record:Json,parent:{releaseId:string;searchReleaseId:string;outputRoot?:string}):MasterSingleDefinitionSuccessorConfig{
 const pinned=skirtingCurrentMetadataRecordsR411().find(row=>row.catalogId===record.catalogId);assert(pinned,'EXACT_CURRENT_METADATA_CATALOG');
 assert.deepEqual(record,pinned,'EXACT_CURRENT_METADATA_RECORD');
 const raw=record.capture as MasterRetainedParentCaptureR1,c=projectSkirtingCurrentRetainedCaptureR410(record,{releaseId:record.membership.release_id,searchReleaseId:record.searchDocument.search_release_id}).retainedCapture,p=record.contentPassport,s=record.searchDocument,membership=record.membership;
 // Frozen origin is evidence, not a claim that its old global release is
 // still the current pointer after another card's successor. The existing
 // writer validates active parent, whole membership/capture twice under locks.
 assert.equal(membership.release_id,s.definition_release_id,'EXACT_CAPTURED_ORIGIN_TUPLE');
 const parentId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
 assert.match(parent.releaseId,parentId,'ACTIVE_PARENT_ID_SHAPE_ONLY_NOT_AUTHORITY');
 assert.match(parent.searchReleaseId,parentId,'ACTIVE_SEARCH_ID_SHAPE_ONLY_NOT_AUTHORITY');
 assert.equal(s.definition_version_id,c.definition.id);assert.equal(membership.approved_template_baseline_id,c.baseline.id);
 const map=record.operationByRowId as Record<string,Json|null>,captureSha=masterRetainedParentCaptureSha256R1(c);
 const mode={contract:'master-operation-composition-only/r1' as const,capturedContentPassport:p,capturedContentPassportSha256:masterOperationValueSha256R1(p),
  operationByRowId:map,operationMapSha256:masterOperationValueSha256R1(map),};
 // Intentionally HOLD with today's guard. Computing a hash never enrolls a new
 // catalog/definition in its existing literal reviewed allowlist.
 assertMasterOperationCompositionDeclarationR1({catalogId:record.catalogId,capture:c,captureSha256:captureSha,mode,newParameterSources:{}});
 const resources=c.resources.map(row=>map[row.row_id]===null?row:{...row,resource_graph:{...row.resource_graph,operationCompositionV1:map[row.row_id]}});
 assertMasterOperationCompositionComputationR1(c,mode,{parameters:c.parameters,formulas:c.formulas,resources},'REPRESENTATIVE');
 const source=c.normativeSources.find(row=>row.source_key===record.sourceKey);assert(source);
 const locators=c.normativeLocators.filter(row=>row.source_id===source.id);assert.equal(locators.length,1);
 const locator=locators[0]!,bound=c.bindings.filter(row=>row.locator_id===locator.id);assert(bound.length>0);
 const rowIds=bound.map(binding=>{const row=c.resources.find(row=>row.id===binding.resource_spec_id);assert(row);return row.row_id as string;});
 const ownSourceKeys=c.normativeSources.map(row=>row.source_key),fixtureSources=Object.fromEntries(Object.entries(c.baseline.normative_source_ids)
  .map(([id,keys])=>[id,(keys as string[]).filter(key=>!ownSourceKeys.includes(key))]).filter(([,keys])=>(keys as string[]).length));
 const compileCurrent=(rows:readonly Json[],input:Record<string,unknown>=c.baseline.input_values)=>compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'finishing-current-operation-only/r411',catalogId:record.catalogId,
  primaryMeasureParameterId:'length_m',parameterDefinitions:[...c.parameters] as Parameters<typeof compileCanonicalEstimateCore>[0]['parameterDefinitions'],formulaDefinitions:[...c.formulas] as Parameters<typeof compileCanonicalEstimateCore>[0]['formulaDefinitions'],
  resourceDefinitions:[...rows] as Parameters<typeof compileCanonicalEstimateCore>[0]['resourceDefinitions'],submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:rows.length,
  hashJson:(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
 const nativeContract=skirtingCurrentNativeContractR1(c);
 return{contract:nativeContract,stopCode:'SKIRTING_CURRENT_OPERATION_ONLY_R411',applicationName:'finishing-current-operation-'+record.catalogId.split(':').at(-1),expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_21_2026-10-26.txt',masterSha256:'3f5f8c0e2f0ad1cdaf960d66d7561853fa0e5f70d269b6a8227cea549dcbe602',
  parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:parent.outputRoot??('.release-runtime/r568/finishing-current-operation-r411/'+record.catalogId.replaceAll(':','_')),
  sourcePaths:["data/estimate-benchmarks/fixtures/current-finishing-reviewed-operation-maps-r414.json","data/estimate-benchmarks/fixtures/finishing-current12-metadata-records-r411.json","scripts/estimate/r4a13/prepareS2735SkirtingBatchSuccessor.ts",'scripts/estimate/r4a13/masterOperationCompositionOnlyR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts','src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts','src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper.ts','src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport.ts','src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts','data/estimate-benchmarks/source-packs/skirting-constructor-s27-35.json'],
  catalogId:record.catalogId,sourceId:record.sourceKey,normId:normId,
  sourceMetadata:{source_title:source.title_ru,source_authority:source.authority,official_url:source.official_url,artifact_sha256:source.artifact_sha256,
   source_kind:source.metadata.sourceKind,exact_locator:sourceMetadata.exact_locator,use_restriction:source.metadata.useRestriction},
  parameterDefinitions:c.parameters,formulaDefinitions:c.formulas,resourceDefinitions:resources,shortInput:c.baseline.input_values,acceptanceInput:c.baseline.input_values,
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[c.parameters.length,c.formulas.length,c.resources.length],benchmarkOrdinal:0,
  validationScenario:'EXACT_CURRENT_WHOLE_MODEL_OPERATION_METADATA_ONLY',
  passport:{canonicalRuName:c.definition.passport.canonicalRuName,workKey:c.definition.passport.workKey,physicalResultRu:c.definition.passport.physicalResultRu,
   includedScopeRu:p.included_scope_ru,excludedScopeRu:p.excluded_scope_ru,
   ...(p.decision.independentCompletenessMap?{independentCompletenessMap:p.decision.independentCompletenessMap}:{}),
   ...(p.decision.unresolvedResourceRowIds?{unresolvedApplicableResourceRowIds:p.decision.unresolvedResourceRowIds}:{})},
  applicability:c.definition.applicability,
  binding:{rowId:rowIds[0]!,...(rowIds.length>1?{additionalRowIds:rowIds.slice(1)}:{}),applicability:bound[0]!.applicability,
   applicabilityByRowId:Object.fromEntries(bound.map(binding=>[c.resources.find(row=>row.id===binding.resource_spec_id)!.row_id,binding.applicability])),
   retainParentBindings:{capturedParent:c,capturedParentSha256:captureSha,newParameterSources:{},operationCompositionOnly:mode,
    ...(Object.keys(fixtureSources).length?{legacyCapturedFixtureSources:{contract:'master-retained-captured-fixture-provenance/r1' as const,parameterSources:fixtureSources as Record<string,string[]>}}:{})},
   reuseExistingNormativeRegistry:{contract:'master-existing-normative-registry-reuse/r1',locatorExcerptHashKind:'CAPTURED_PARENT_OPERATION_COMPOSITION_ONLY_R1',source,locators}},
  locator:{key:locator.locator_key,payload:locator.locator},
  search:{primaryUom:s.primary_uom,canonicalNameRu:s.canonical_name_ru,aliases:s.aliases,shortScopeRu:s.short_scope_ru,keyDistinguishingParameters:s.key_distinguishing_parameters,
   clarificationFields:s.clarification_fields,includedBoundaries:s.included_boundaries,excludedBoundaries:s.excluded_boundaries,extraSearchTermsRu:'',sourceProvenance:s.source_provenance},
  forbiddenAdjacentMatchers:[/materials_0[1-6]/iu,/professional_.*_set/iu,/floor_covering/iu,/underlay/iu],owner:'S2735_SKIRTING_BATCH',receiptFileStem:record.catalogId.split(':').at(-1)+'-current-operation-r411',
  verifyCore:async()=>{
   const before=await compileCurrent(c.resources),after=await compileCurrent(resources);
   const arithmetic=(result:typeof before)=>({parameters:result.parameters,rows:result.rows.map(row=>({id:row.row_id,quantity:row.quantity,unit:row.unit_id,
    included:row.included_in_estimate,procurement:row.included_in_procurement,eligible:row.procurement_eligible,ownership:row.ownership_status,price:row.unit_price,amount:row.amount})),
    needs:JSON.parse(JSON.stringify(result.preliminaryNeeds,(key,value)=>key==='operationCompositionV1'||key==='need_sha256'?undefined:value)),totals:result.totals});
   assert.deepEqual(arithmetic(after),arithmetic(before));

   const hashJson=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex');
   const durable=(result:typeof after,input:Record<string,unknown>,requiredIds:readonly string[])=>{
    const commit=buildCanonicalRevisionCommitPayload({rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,
     checksumSha256:hashJson(result.revisionProjection),compilerVersion:'finishing-current-operation-only/r411',parameters:result.parameters,
     approvedTemplateBaselineId:c.baseline.id,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,
     derivedParameters:result.derivedParameters,identityContract:{},preliminaryNeeds:result.preliminaryNeeds,purchaseSupplyIndexV1:result.purchaseSupplyIndexV1});
    const stored={id:'11111111-1111-4111-8111-111111111111',release_id:parent.releaseId,definition_version_id:c.definition.id,catalog_id:record.catalogId,
     price_snapshot_ids:result.priceSnapshotIds,input_parameters:commit.resolvedParameters,totals:commit.totals,row_count:commit.rowCount,revision_number:1,status:'ready',currency_code:'KGS',
     compiler_version:'finishing-current-operation-only/r411',created_at:'2026-10-26T00:00:00Z',checksum_sha256:commit.checksumSha256,amendment_contract:{parameterSources:commit.parameterSources}};
    const bytes=JSON.stringify(stored),transport=projectCanonicalEstimatePreliminaryNeedTransport(stored),detail=canonicalEstimateRevisionDetailFromStorage(stored);
    assert.deepEqual(detail.preliminaryNeeds,transport.preliminaryNeeds);assert.deepEqual(transport.preliminaryNeeds.map(need=>need.rowId),result.preliminaryNeeds.map(need=>need.row_id));
    const reopened=JSON.parse(JSON.stringify(detail)) as typeof detail;
    const known=JSON.parse(JSON.stringify(result.rows)).map((row:Json)=>canonicalEstimateRevisionRowFromStorage(row,null,null,stored.amendment_contract));
    const coldResources=[...known.map((row:ReturnType<typeof canonicalEstimateRevisionRowFromStorage>)=>({rowId:row.rowId,titleRu:row.titleRu,category:row.category,
     operation:(row.calculationTrace.resourceGraph as Json).operationCompositionV1})),...reopened.preliminaryNeeds!.map(need=>({rowId:need.rowId,titleRu:need.titleRu,category:need.category,operation:need.operation}))];
    const sections=canonicalEstimateResourceOperationSections(coldResources),process=canonicalEstimateWorkProcess(coldResources);
    for(const id of requiredIds){const resource=coldResources.find(row=>row.rowId===id);assert(resource,'ACTUAL_CORE_ROW_OR_NEED_FOR_OPERATION:'+id);
     assert.deepEqual(canonicalEstimateOperationReferences(resource.operation),canonicalEstimateOperationReferences(map[id]));
     const operation=map[id]!;
     for(const related of operation.additionalOperations??[]){
      assert.equal(sections.filter(section=>section.resourceIds.includes(id)).length,1);
      const section=sections.find(section=>section.operation?.operationId===related.operationId);assert(section);
      assert.equal(section.resourceIds.includes(id),false);assert.equal(section.sharedResources.filter(row=>row.rowId===id).length,1);
      assert.equal(process.flatMap(group=>group.operations).find(step=>step.operationId===related.operationId)!.resourceIds.filter(rowId=>rowId===id).length,1);
     }
    }
    const firstNeed=result.preliminaryNeeds.find(need=>requiredIds.includes(need.row_id));
    if(firstNeed){assert.match(firstNeed.need_sha256,/^[0-9a-f]{64}$/);const {need_sha256:_hash,...basis}=firstNeed;assert.equal(hashJson(basis),firstNeed.need_sha256);
     const invalid=structuredClone(stored);(invalid.amendment_contract.parameterSources as {preliminaryNeeds:Json[]}).preliminaryNeeds.find(need=>need.row_id===firstNeed.row_id)!.need_sha256='eh_'+'0'.repeat(16);
     assert.equal(projectCanonicalEstimatePreliminaryNeedTransport(invalid).preliminaryNeeds.some(need=>need.rowId===firstNeed.row_id),false);}
    assert.equal(JSON.stringify(stored),bytes);return{known:known.length,needs:reopened.preliminaryNeeds!.length,assertedRows:requiredIds.length};
   };
   const actualBaselineDurable=durable(after,c.baseline.input_values,[]);
   const controlEvidence:Json[]=[];
   const controlInput={...c.baseline.input_values,length_m:30,end_cap_count:2,junction_sealing_mode:'REQUIRED',end_cap_sealant_consumption_ml:100,junction_sealant_consumption_l:0.3,
    sealant_supply_grouping:'SHARED_COMPATIBLE_BATCH',shared_sealant_designation:'EXPLICIT_TEST_COMPATIBLE_BATCH',shared_sealant_cartridge_ml:310,shared_sealant_compatibility_confirmed:'YES',
    material_skirting_shared_sealant_stock:80,material_skirting_shared_sealant_reserve:20};
   const activeBefore=await compileCurrent(c.resources,controlInput),activeAfter=await compileCurrent(resources,controlInput);assert.deepEqual(arithmetic(activeAfter),arithmetic(activeBefore));
   const owner='material:skirting:shared-sealant';assert.equal(activeAfter.rows.filter(row=>row.row_id===owner&&row.included_in_procurement).length,1);
   assert.equal(activeAfter.rows.find(row=>row.row_id===owner)!.quantity,'620');
   assert.equal(activeAfter.rows.filter(row=>row.row_id.startsWith('allocation:skirting:sealant:')).every(row=>!row.included_in_estimate&&!row.included_in_procurement),true);
   controlEvidence.push({basis:'EXISTING_EXPLICIT_CONTROL_NOT_CAPTURED_BASELINE_OR_OBJECT_FACT',...durable(activeAfter,controlInput,[owner])});
   return{status:'PASS_CURRENT_MODEL_METADATA_ARITHMETIC_INVARIANT_ONLY',catalogId:record.catalogId,capturedResources:c.resources.length,
    changedOperationRows:record.changedRowIds,retainedMissingOperations:record.unchangedAbsentOperationRows.length,
    currentKnownRows:after.rows.length,currentNeeds:after.preliminaryNeeds.length,currentProcurementRows:after.rows.filter(row=>row.included_in_procurement).length,
    sourceQuantityNormsChanged:false,actualObjectFactsAccepted:false,actualBaselineDurable,controlEvidence,wholeDeliveryAcceptance:false,FULL:false};
  }};
}

export type SkirtingCurrentPhysicalPinR1=Readonly<{path:string;sha256:string}>;
export type SkirtingCurrentPhysicalContextR1=Readonly<{releaseId:string;searchReleaseId:string;outputRoot:string;
 actualBodyProof:SkirtingCurrentPhysicalPinR1;targetPreimage:SkirtingCurrentPhysicalPinR1;master:SkirtingCurrentPhysicalPinR1;
 currentRelease:SkirtingCurrentPhysicalPinR1;physicalSourcePack:SkirtingCurrentPhysicalPinR1;formalScopedCapture?:SkirtingCurrentPhysicalPinR1}>;
/** Full-source opt-in in the existing producer; R411 metadata-only enrolment is
 * not reused to admit a changed model. No writer, DB or runner is created. */
export function prepareSkirtingCurrentPhysicalCycleDraftR1(c:SkirtingCurrentPhysicalContextR1):MasterSingleDefinitionSuccessorConfig{
 const p=skirtingCurrentPhysicalPackR1,moduleRoot=resolve(__dirname,'../../..'),
  digest=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex'),
  read=(pin:SkirtingCurrentPhysicalPinR1)=>{assert.match(pin.sha256,/^[a-f0-9]{64}$/u);const bytes=readFileSync(pin.path);
   assert.equal(digest(bytes),pin.sha256,'SKIRTING_CURRENT_PIN_CHANGED:'+pin.path);return bytes;},
  json=(pin:SkirtingCurrentPhysicalPinR1)=>JSON.parse(read(pin).toString('utf8').replace(/^\uFEFF/u,''))as Json;
 for(const pin of[c.actualBodyProof,c.targetPreimage,c.master,c.currentRelease,c.physicalSourcePack,...(c.formalScopedCapture?[c.formalScopedCapture]:[])])read(pin);
 assert.equal(c.master.sha256,'92c04a456ecd85afcc699e7da5e6cf97114db1a74019fd203f1816c2b81ca08f','SKIRTING_MASTER224_REQUIRED');
 assert.equal(c.actualBodyProof.sha256,p.actualCurrent.proofSha256,'SKIRTING_CURRENT_R858_REQUIRED');
 assert.equal(resolve(c.physicalSourcePack.path),resolve(moduleRoot,'data/estimate-benchmarks/source-packs/ready-pvc-skirting-current-physical-cycle-r1.json'),'SKIRTING_PIN_MUST_BE_IMPORTED_JSON');
 assert.deepEqual(json(c.physicalSourcePack),p,'SKIRTING_CURRENT_IMPORTED_SOURCE_IDENTITY');
 const proof=json(c.actualBodyProof),pointer=json(c.currentRelease),target=json(c.targetPreimage),
  observed=proof.results.find((x:Json)=>x.target?.catalogId===p.catalogId&&x.target?.sourceId===p.contract);
 assert.equal(proof.transactionRolledBack,true);assert.equal(proof.connectionClosed,true);assert(observed?.current,'SKIRTING_CURRENT_REQUESTED_SOURCE_TARGET');
 assert.equal(c.releaseId,proof.selectedReleaseId,'SKIRTING_SELECTED_R858_PARENT');assert.equal(pointer.definitionReleaseId,c.releaseId);assert.equal(pointer.searchReleaseId,c.searchReleaseId);
 assert.deepEqual(target,observed.current,'SKIRTING_REQUESTED_TARGET_BODY');assert.deepEqual(target.header,p.actualCurrent.header,'SKIRTING_ACTUAL_HEADER');assert.equal(target.sets.newSource.rowCount,0);
 for(const source of p.sources)assert.equal(digest(readFileSync(source.path)),source.sha256,'SKIRTING_PRIMARY_SOURCE_CHANGED:'+source.id);
 const raw=observed.currentBody;
 assert(raw&&[raw.definition,raw.baseline,raw.sources,raw.locators,raw.bindings,raw.parameters,raw.formulas,raw.resources].every(Array.isArray),'SKIRTING_FULL_CURRENT_CAPTURE_REQUIRED');
 assert.equal(raw.definition.length,1);assert.equal(raw.baseline.length,1);
 const omit=(row:Json,keys:readonly string[])=>Object.fromEntries(Object.entries(row).filter(([key])=>!keys.includes(key))),
  normalized={parameters:raw.parameters.map((q:Json)=>omit(q,['definition_version_id','approved_template_baseline_id'])).sort((a:Json,b:Json)=>a.ordinal-b.ordinal),
   formulas:raw.formulas.map((f:Json)=>omit(f,['definition_version_id'])).sort((a:Json,b:Json)=>a.formula_id<b.formula_id?-1:a.formula_id>b.formula_id?1:0),
   resources:raw.resources.map((r:Json)=>omit(r,['definition_version_id','created_at'])).sort((a:Json,b:Json)=>a.ordinal-b.ordinal)};
 assert.deepEqual(normalized,p.actualCurrent.retainedBody,'SKIRTING_ACTUAL_RAW_NORMALIZED_BODY_MISMATCH');
 const capture:MasterRetainedParentCaptureR1={definition:raw.definition[0],baseline:raw.baseline[0],parameters:raw.parameters,formulas:raw.formulas,
  resources:raw.resources,bindings:raw.bindings,normativeSources:raw.sources,normativeLocators:raw.locators},captureSha=masterRetainedParentCaptureSha256R1(capture),
  snapshot=JSON.parse(JSON.stringify(p.actualCurrent.retainedBody)),base:AutomaticOwnerDefinition={...snapshot,
   runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['length_m']},model=buildSkirtingCurrentPhysicalCycleR1(base,'ACTUAL_CUT_PLAN_R1'),
  // The owner validates the normalized exact body. The retained representative
  // additionally needs exact DB ownership columns on unchanged historical rows.
  d:AutomaticOwnerDefinition={...model,parameters:model.parameters.map(q=>({...capture.parameters.find(old=>old.parameter_id===q.parameter_id),...q})),
   formulas:model.formulas.map(formula=>{
    const retained=capture.formulas.find(old=>old.formula_id===formula.formula_id);if(!retained)return formula;
    // The typed model contains the exact normalized persisted contract. Restore
    // only its checked immutable FK; no raw Json union or formula cast escapes.
    assert.deepEqual(omit(retained,['definition_version_id']),formula,'SKIRTING_RETAINED_FORMULA_FULL_CONTRACT_REQUIRED');
    const definitionId=retained.definition_version_id;
    if(typeof definitionId!=='string'||definitionId!==capture.definition.id)throw Error('SKIRTING_RETAINED_FORMULA_DEFINITION_ID_REQUIRED');
    return{...formula,definition_version_id:definitionId};
   }),
   resources:model.resources.map(r=>({...capture.resources.find(old=>old.row_id===r.row_id),...r}))},
  map=skirtingCurrentPhysicalCompletenessR1(),held=new Set(d.parameters.filter(q=>q.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').map(q=>q.parameter_id)),
  open=d.resources.filter(row=>d.formulas.find(formula=>formula.formula_id===row.formula_id)!.input_parameter_ids.some(id=>held.has(id))).map(row=>row.row_id),
  oldIds=new Set(capture.parameters.map(q=>q.parameter_id)),
  newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(d.parameters.filter(q=>!oldIds.has(q.parameter_id)).map(q=>[q.parameter_id,
   q.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[p.contract]}])),
  retained:MasterRetainParentBindingsR1={capturedParent:capture,capturedParentSha256:captureSha,newParameterSources,
   capturedSourcePreimage:{sourceKey:p.contract,expected:null}},
  bound=[p.prefix+':whole-required-scope'],input={length_m:'30'},
  {retainedBody:_body,...compactCurrent}=p.actualCurrent,compactPack={...p,actualCurrent:compactCurrent},
  formal=c.formalScopedCapture?json(c.formalScopedCapture)as MasterCapturedScopedNormativeRegistryR1:undefined;
 assert.equal(open.length,23,'SKIRTING_DECLARED_PHYSICAL_SOURCE_HOLDS');
 return{contract:p.contract,stopCode:'SKIRTING_CURRENT_WHOLE_PHYSICAL_R1',applicationName:'ready-pvc-skirting-current-whole',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:c.master.path,masterSha256:c.master.sha256,parentReleaseId:c.releaseId,parentSearchReleaseId:c.searchReleaseId,currentReleasePath:c.currentRelease.path,
  outputRoot:c.outputRoot,catalogId:p.catalogId,sourceId:p.contract,normId:'PROJECT_SYSTEM:READY_PVC_SKIRTING_CURRENT_WHOLE_PHYSICAL_R1',
  sourcePaths:[c.physicalSourcePack.path,...['scripts/estimate/r4a13/prepareS2735SkirtingBatchSuccessor.ts','src/lib/estimate/v4/skirtingConstructorS2735.ts',
   'src/lib/estimate/v4/skirtingConstructorS2735.test.ts','data/estimate-benchmarks/source-packs/skirting-constructor-s27-35.json',
   'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts'].map(path=>resolve(moduleRoot,path)),
   ...p.sources.map(source=>source.path),c.actualBodyProof.path,c.targetPreimage.path,c.master.path,c.currentRelease.path,...(c.formalScopedCapture?[c.formalScopedCapture.path]:[])],
  sourceMetadata:{source_title:'Готовый плинтус из ПВХ: полный применимый цикл по самостоятельной длине',source_authority:'Документы производителей, принятые карты раскроя и проектное обеспечение',
   source_kind:'PROJECT_SYSTEM',artifact_sha256:c.physicalSourcePack.sha256,official_url:null,exact_locator:'R858 current137/37/37; PMO516V1 p1; Forbo232 TDS/SDS pinned; accepted-cut-plan delta',
   use_restriction:'SOURCE_ONLY BLOCKED_PARTIAL:23source quantities and16protectedconditions require evidence. ExactselectedPVCglueprofile only, no03904/wood/fastener transfer.'},
  ...(formal?{capturedScopedNormativeRegistry:formal}:{}),parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:input,acceptanceInput:input,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[137,37,37],benchmarkOrdinal:0,
  validationScenario:'ACTUAL_R858_READY_PVC_SKIRTING_WHOLE_CURRENT_WITH_UNKNOWN_SOURCE_QUANTITIES_AND_APPROVED_CUTPLAN',
  passport:{canonicalRuName:'Монтаж готового плинтуса по отдельной длине',workKey:'flooring_interior_baseboard_install_standard',
   physicalResultRu:'Установленная и принятая совместимая линия плинтуса; неизвестные нормы и факты не объявлены обеспеченными.',includedScopeRu:p.operations.map(o=>o.nameRu),
   excludedScopeRu:['Площадь покрытия вместо измеренной длины','Керамический03904, деревянный и механический монтаж по этой норме','Автоматическая совместимость и объектное подтверждение'],
   independentCompletenessMap:map,unresolvedApplicableResourceRowIds:open},
  applicability:{actualParentProof:c.actualBodyProof,actualHeader:p.actualCurrent.header,newObjectClosures:0,protectedConditions:16,sourceHeldFunctions:23,
   baselineAssumptionCount:78,baselineValidationFixtureCount:59,baselineNotRuntime:true,fullTechnicalAcceptance:false,consumptionNotOrder:true},
  binding:{rowId:bound[0]!,retainParentBindings:retained,
   applicability:{contract:p.contract,actualParentSha256:p.actualCurrent.header.definition_sha256,sourceOnly:true,
    quantityMeaning:'WHOLE_PHYSICAL_PROCESS_CHECK_NOT_NEW_ADHESIVE_OR_LABOUR_NORM',oldAdhesiveBindingRetained:true,
    newSourceDoesNotOwnHistoricalQuantities:true,protectedObjectReadbacksRequired:true,fullTechnicalAcceptance:false}},
  locator:{key:'ready-pvc-skirting-current-whole-physical-r1',payload:{sourcePack:compactPack,actualBodyProof:c.actualBodyProof,independentCompletenessMap:map,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m',canonicalNameRu:'Монтаж готового плинтуса по отдельной длине',aliases:['Клеевой монтаж готового плинтуса из ПВХ'],
   shortScopeRu:'Готовый плинтус из ПВХ по совместимому клеевому способу, с отдельным обмером и картой раскроя.',
   keyDistinguishingParameters:['length_m','skirting_product_code','adhesive_product'],clarificationFields:['length_m','skirting_cycle_cutplan_total_required_m'],
   includedBoundaries:p.operations.map(o=>o.nameRu),excludedBoundaries:['Пол, подложка, керамический и деревянный способы'],extraSearchTermsRu:'плинтус готовый ПВХ приклеивание раскрой углы стыки очистка',
   sourceProvenance:{actualParentProof:c.actualBodyProof,sourcePack:c.physicalSourcePack,fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[/materials_0[1-6]|professional_.*_set|floor_covering|underlay|ceramic-skirting|krer11-039-04/iu],owner:'ROOT_SINGLE_WRITER',receiptFileStem:'ready_pvc_skirting_current_whole_r1',
  verifyTargetPrecondition:async(client,phase)=>assert.deepEqual(await readMasterSuccessorTargetPreimageR1(client,{releaseId:c.releaseId,catalogId:p.catalogId,sourceId:p.contract,lock:phase==='LOCKED_BEFORE'}),target,'SKIRTING_ACTUAL_TARGET_DRIFT'),
  verifyCore:async()=>{assert(c.formalScopedCapture,'STOP_SKIRTING_CURRENT_WHOLE_PHYSICAL_R1_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED');
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
   return{status:'SOURCE_ONLY_STRUCTURAL_MAP_NOT_CORE_RUNTIME_ACCEPTANCE',shape:[d.parameters.length,d.formulas.length,d.resources.length],sourceHolds:open.length,
    actualClosures:0,fullTechnicalAcceptance:false,rootFiniteCoreCasesRequired:true};}};
}

/** Actual ordinary intake refuses an absent formal scoped capture. The draft
 * above is inspectable authoring data; its verifyCore also refuses this absence. */
export function prepareSkirtingCurrentPhysicalCycleConfigR1(c:SkirtingCurrentPhysicalContextR1):MasterSingleDefinitionSuccessorConfig{
 const config=prepareSkirtingCurrentPhysicalCycleDraftR1(c);
 assert(c.formalScopedCapture,'STOP_SKIRTING_CURRENT_WHOLE_PHYSICAL_R1_SCOPED_REGISTRY_ORDINARY_SOURCE_CAPTURE_REQUIRED');
 const candidate=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
 assert(resolveMasterScopedNormativeRegistryOptInR1(candidate),'SKIRTING_CURRENT_FORMAL_RETAINED_CAPTURE_REQUIRED');
 return config;
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2735SkirtingBatchSuccessor.ts'))
  void run().catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
