import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import fixture from '../../../data/estimate-benchmarks/fixtures/fire-alarm-psu-whole-test-only-r24.json';
import pack from '../../../data/estimate-benchmarks/source-packs/fire-alarm-rip24-06-whole-factory-delivery-r24.json';
import {appendFireAlarmReservedPowerWholeFactoryR24,fireAlarmReservedPowerWholeResourceIdsR24} from '../../../src/lib/estimate/backendPlatform/fireAlarmReservedPowerWholeFactoryR24';
import {readFrozenDefinitionSnapshotV1} from '../../../src/lib/estimate/backendPlatform/canonicalFrozenDefinitionSnapshotV1';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreResult,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';

const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(item=>typeof item==='string');
const hash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');

// This is the declared frozen-record boundary, not a second compiler or an
// ordinary Config source-admission substitute. Every native field survives.
function bindActualParent(raw:unknown):AutomaticOwnerDefinition{
  assert(object(raw)&&object(raw.capture)&&object(raw.contentPassport),'ACTUAL_R255_WRAPPER_REQUIRED');
  assert.equal(raw.readOnly,true);assert.equal(raw.sourceMetadataLosslessRoundtrip,true);
  const models=readFrozenDefinitionSnapshotV1({models:[{...raw.capture,passport:raw.contentPassport}]},'models').models;
  assert.equal(models.length,1);const model=models[0];assert(model);
  const expected=fixture.currentReadOnlyIdentity;
  assert.equal(model.definition.id,expected.definitionId);assert.equal(model.definition.catalog_id,pack.catalogId);
  assert.equal(model.definition.definition_version,expected.definitionVersion);assert.equal(model.definition.definition_sha256,expected.definitionSha256);
  assert.equal(model.baseline.id,expected.baselineId);assert.equal(model.baseline.definition_version_id,expected.definitionId);
  assert.equal(model.passport.definition_version_id,expected.definitionId);
  assert.deepEqual([model.parameters.length,model.formulas.length,model.resources.length],[58,37,37]);
  assert.equal(model.bindings.length,1);
  assert(object(model.baseline.normative_source_ids));assert.equal(Object.keys(model.baseline.normative_source_ids).length,58);
  const parameters:AutomaticOwnerDefinition['parameters']=model.parameters.map(row=>{
    assert(typeof row.parameter_id==='string'&&typeof row.value_type==='string'&&typeof row.required==='boolean');
    assert(typeof row.ordinal==='number'&&Number.isSafeInteger(row.ordinal)&&typeof row.title_ru==='string');
    assert(row.unit_id===null||typeof row.unit_id==='string');
    assert(row.constraints_json===null||object(row.constraints_json));assert(object(row.truth_metadata));
    assert.equal(row.default_value,null,'NO_CAPTURED_DEFAULT_VALUE_PROMOTION');
    return{...row,parameter_id:row.parameter_id,value_type:row.value_type,required:row.required,
      ordinal:row.ordinal,title_ru:row.title_ru,unit_id:row.unit_id,default_value:row.default_value,
      constraints_json:row.constraints_json,truth_metadata:row.truth_metadata};
  });
  const formulas:CanonicalEstimateFormulaDefinition[]=model.formulas.map(row=>{
    assert(typeof row.formula_id==='string'&&typeof row.output_unit_id==='string'&&typeof row.expression_source==='string');
    assert(typeof row.ast_sha256==='string'&&strings(row.input_parameter_ids));
    const parsed=compileFormulaGraph(row.expression_source);
    assert.deepEqual(parsed.ast,row.ast,'NATIVE_AST_EXACT_EXISTING_PARSER');
    assert.deepEqual(parsed.inputParameterIds,row.input_parameter_ids,'NATIVE_FORMULA_INPUTS_UNCHANGED');
    return{...row,formula_id:row.formula_id,output_unit_id:row.output_unit_id,expression_source:row.expression_source,
      ast:parsed.ast,input_parameter_ids:row.input_parameter_ids,ast_sha256:row.ast_sha256};
  });
  const resources:CanonicalEstimateResourceDefinition[]=model.resources.map(row=>{
    assert(typeof row.id==='string'&&typeof row.row_id==='string'&&typeof row.ordinal==='number'&&Number.isSafeInteger(row.ordinal));
    assert(typeof row.section==='string'&&typeof row.category==='string'&&typeof row.title_ru==='string');
    assert(typeof row.unit_id==='string'&&typeof row.formula_id==='string'&&typeof row.row_sha256==='string');
    assert(object(row.inclusion_ast)&&object(row.resource_graph)&&typeof row.procurement_eligible==='boolean');
    assert(row.cost_owner_id===null||typeof row.cost_owner_id==='string');assert(row.source_metadata===null||object(row.source_metadata));
    return{...row,id:row.id,row_id:row.row_id,ordinal:row.ordinal,section:row.section,category:row.category,title_ru:row.title_ru,
      unit_id:row.unit_id,formula_id:row.formula_id,row_sha256:row.row_sha256,inclusion_ast:row.inclusion_ast,
      resource_graph:row.resource_graph,procurement_eligible:row.procurement_eligible,cost_owner_id:row.cost_owner_id,source_metadata:row.source_metadata};
  });
  assert.deepEqual({parameters,formulas,resources},{parameters:model.parameters,formulas:model.formulas,resources:model.resources},'ALL_NATIVE_FIELDS_VALUES_EXACT');
  return{parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
    ordinaryParameterIds:parameters.filter(row=>row.truth_metadata.value_source_role==='USER_MEASURED').map(row=>row.parameter_id)};
}

it('rehearses whole factory delivery on exact R255 native records with five actual callbacks and preserved unknowns',async()=>{
  const rawDir=process.env.FIRE_PSU_R24_RAW_DIR,inputsPath=process.env.FIRE_PSU_R24_INPUT_MANIFEST;
  assert(rawDir&&path.isAbsolute(rawDir)&&inputsPath&&path.isAbsolute(inputsPath));
  assert(!fs.existsSync(rawDir),'RAW_OUTPUT_MUST_BE_FRESH');fs.mkdirSync(rawDir,{recursive:true});
  const save=(name:string,value:unknown)=>fs.writeFileSync(path.join(rawDir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  let begun=0,results=0,rejects=0,completedAssertions=0,finished=false;
  try{
    const manifest:unknown=JSON.parse(fs.readFileSync(inputsPath,'utf8'));
    assert(object(manifest)&&Array.isArray(manifest.inputs));
    let parentRaw:unknown;
    for(const pin of manifest.inputs){
      assert(object(pin)&&typeof pin.path==='string'&&typeof pin.sha256==='string'&&typeof pin.role==='string');
      const bytes=fs.readFileSync(pin.path);assert.equal(sha(bytes),pin.sha256,'EXACT_INPUT_SHA:'+pin.role);
      if(pin.role==='ACTUAL_R255_PARENT'){
        assert(bytes.length<=4*1024*1024);assert.equal(pin.sha256,fixture.currentReadOnlyIdentity.captureFileSha256);
        parentRaw=JSON.parse(bytes.toString('utf8'));
      }
    }
    assert(parentRaw);const parentBefore=hash(parentRaw),base=bindActualParent(parentRaw);
    const computationSha=hash({parameters:base.parameters,formulas:base.formulas,resources:base.resources});
    assert.equal(fixture.factsAreTestOnly,true);assert.equal(fixture.actualProjectApproval,false);assert.equal(fixture.sourceAdmission,false);
    const next=appendFireAlarmReservedPowerWholeFactoryR24({catalogId:pack.catalogId,parent:base,expectedCapturedComputationSha256:computationSha,
      rootSourceKey:fixture.proposedManufacturerSourceKey,rootNormId:fixture.proposedManufacturerNormId});
    assert.deepEqual([next.parameters.length,next.formulas.length,next.resources.length],[59,42,42]);
    assert.deepEqual(next.parameters.slice(0,58),base.parameters);assert.deepEqual(next.formulas.slice(0,37),base.formulas);
    assert.deepEqual(next.resources.slice(0,37),base.resources);
    const newIds=fireAlarmReservedPowerWholeResourceIdsR24();assert.equal(newIds.length,5);
    const oldPaid=base.resources.filter(row=>row.resource_graph.costTreatment==='OWN_COST');
    assert.deepEqual(next.resources.filter(row=>row.resource_graph.costTreatment==='OWN_COST'),oldPaid,'NO_NEW_PAID_OWNER');
    assert.deepEqual(next.resources.filter(row=>row.procurement_eligible),base.resources.filter(row=>row.procurement_eligible),'NO_NEW_PROCUREMENT_OWNER');
    for(const row of next.resources.slice(37)){
      assert.equal(row.cost_owner_id,pack.existingOwner.powerRowId);assert.equal(row.procurement_eligible,false);
      assert.equal(row.resource_graph.costTreatment,'INCLUDED_IN_RESOURCE_ROWS');
      assert.equal(row.resource_graph.parentCostOwnerId,pack.existingOwner.powerRowId);
      assert.equal(row.resource_graph.includedInResourceOwnerRowId,pack.existingOwner.powerRowId);
      assert.deepEqual(row.source_metadata?.normativeTrace,[]);
      assert.equal(row.source_metadata?.actualProjectApproval,false);
    }
    save('model-constructed-before-core.json',{status:'MODEL_BOUND_NOT_ORDINARY_CONFIG',nativeShape:[58,37,37],composedShape:[59,42,42],
      actualParentFileSha256:fixture.currentReadOnlyIdentity.captureFileSha256,computationSha256:computationSha,oldBindings:1,oldSourceArrays:58,
      newPaidOwners:0,newProcurementOwners:0,ordinaryConfigStatus:fixture.ordinaryConfigStatus,sourceAdmission:false,FULL:false});
    const callback=async(name:string,definition:AutomaticOwnerDefinition,submitted:Record<string,unknown>):Promise<CanonicalEstimateCompileCoreResult>=>{
      const index=++begun,prefix=String(index).padStart(2,'0')+'-'+name;
      save(prefix+'-input.json',{kind:'TEST_ONLY_NATIVE_INPUT',submittedParameters:submitted,confirmedParameters:{},
        priceItems:[],sourceAdmission:false,actualProjectApproval:false,ordinaryConfigStatus:fixture.ordinaryConfigStatus});
      console.log('FIRE_PSU_ACTUAL_CORE_BEGIN',index,name);
      let result:CanonicalEstimateCompileCoreResult;
      try{
        result=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:fixture.compilerVersion,catalogId:pack.catalogId,
          primaryMeasureParameterId:'protected_area_m2',parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],
          resourceDefinitions:[...definition.resources],submittedParameters:submitted,confirmedParameters:{},currencyCode:'KGS',
          priceSnapshotIds:[],priceItems:[],maximumResourceRows:200,hashJson:hash});
      }catch(error:unknown){
        rejects++;save(prefix+'-REJECT.json',{kind:'REJECT',error:{name:error instanceof Error?error.name:null,
          message:error instanceof Error?error.message:String(error),code:object(error)?error.code:null},sourceAdmission:false,actualProjectApproval:false});
        console.log('FIRE_PSU_ACTUAL_CORE_REJECT',index,name);throw error;
      }
      results++;save(prefix+'-RESULT.json',{kind:'RESULT',result,sourceAdmission:false,actualProjectApproval:false});
      console.log('FIRE_PSU_ACTUAL_CORE_RESULT',index,name);return result;
    };
    assert.equal(pack.externalBatteryBoundary.includedInFactoryDelivery,false);
    assert.equal(pack.externalBatteryBoundary.technicalBatteryCountPerUnit,2);
    assert.equal(pack.externalBatteryBoundary.voltagePerBatteryV,12);
    assert.deepEqual(pack.externalBatteryBoundary.permittedCapacityAh,[26,40]);
    assert(!newIds.some(id=>id.includes('battery')),'NO_NEW_INCLUDED_BATTERY_ROW');
    const assertNativeUnknowns=(result:CanonicalEstimateCompileCoreResult)=>{
      assert(result.preliminaryNeeds.length>0,'PROJECT_GAPS_MUST_STAY_VISIBLE');
      assert.equal(result.parameters.battery_quantity_per_power_supply,undefined,'NO_MANUFACTURER_RATIO_AS_RUNTIME_DEFAULT');
      assert.equal(result.parameters.battery_designation,undefined,'NO_GUESSED_BATTERY_CAPACITY_OR_DESIGNATION');
      assert(!result.rows.some(row=>row.row_id===pack.existingOwner.batteryRowId),'EXTERNAL_BATTERY_REMAINS_UNKNOWN');
      for(const id of ['f09:fire_alarm_system_battery','f09:fire_alarm_system_panel_install_labor',
        'f09:fire_alarm_system_connection_labor','f09:fire_alarm_system_commissioning_labor']){
        const need=result.preliminaryNeeds.find(row=>row.row_id===id);assert(need,'NATIVE_UNKNOWN_NEED:'+id);
        assert.equal(need.quantity,null);assert(need.missing_parameter_ids.length>0);
      }
    };
    const assertParts=(result:CanonicalEstimateCompileCoreResult,expected:Readonly<Record<string,string>>,n:string)=>{
      const supply=result.rows.find(row=>row.row_id===pack.existingOwner.powerRowId);assert(supply);assert.equal(supply.quantity,n);
      for(const [key,quantity] of Object.entries(expected)){
        const row=result.rows.find(item=>item.row_id===pack.prefix+':'+key);assert(row,'INCLUDED_FACTORY_COMPONENT:'+key);
        assert.equal(row.quantity,quantity);assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);
        assert.equal(row.procurement_eligible,false);assert.equal(row.amount,null);assert.equal(row.unit_price,null);
        assert(object(row.calculation_trace)&&object(row.calculation_trace.resourceGraph));
        assert.equal(row.calculation_trace.resourceGraph.parentCostOwnerId,pack.existingOwner.powerRowId);
        assert.equal(row.calculation_trace.resourceGraph.includedInResourceOwnerRowId,pack.existingOwner.powerRowId);
        assert.deepEqual(row.normative_trace,[]);
      }
      assert.equal(result.rows.filter(row=>newIds.includes(row.row_id)).length,5);assertNativeUnknowns(result);
    };
    const one:Record<string,unknown>={...fixture.baseTestOnlyInputs,[pack.profileId]:pack.selectedProfile};
    const result1=await callback('PSU-N1',next,one);assertParts(result1,fixture.expectedPartsOneSupply,'1');completedAssertions++;
    const three:Record<string,unknown>={...fixture.baseTestOnlyInputs,...fixture.threeSupplyOverrides,[pack.profileId]:pack.selectedProfile};
    const result3=await callback('PSU-N3',next,three);assertParts(result3,fixture.expectedPartsThreeSupplies,'3');completedAssertions++;
    const legacyBefore=await callback('legacy-before',base,{...fixture.baseTestOnlyInputs});assertNativeUnknowns(legacyBefore);completedAssertions++;
    const legacyAfter=await callback('legacy-after',next,{...fixture.baseTestOnlyInputs,[pack.profileId]:pack.notSelected});
    assert.deepEqual(legacyAfter.rows,legacyBefore.rows,'LEGACY_FULL_ROWS_TRACES_PRICE_OWNERS_EQUAL');
    assert.deepEqual(legacyAfter.preliminaryNeeds,legacyBefore.preliminaryNeeds,'LEGACY_FULL_UNKNOWN_NEEDS_EQUAL');
    assert.deepEqual(legacyAfter.totals,legacyBefore.totals);assert.deepEqual(legacyAfter.priceSnapshotIds,legacyBefore.priceSnapshotIds);
    assert.deepEqual(legacyAfter.derivedParameters,legacyBefore.derivedParameters);
    for(const parameter of base.parameters)assert.deepEqual(legacyAfter.parameters[parameter.parameter_id],legacyBefore.parameters[parameter.parameter_id]);
    assert(![...legacyAfter.rows,...legacyAfter.preliminaryNeeds].some(row=>newIds.includes(row.row_id)),'UNSELECTED_FACTORY_ROWS_INACTIVE');
    completedAssertions++;
    const missing:Record<string,unknown>={...one};delete missing.power_supply_output_capacity_point;
    const missingN=await callback('missing-native-capacity',next,missing);
    for(const id of [pack.existingOwner.powerRowId,...newIds]){
      assert(!missingN.rows.some(row=>row.row_id===id),'NO_FAKE_ZERO_OR_ONE:'+id);
      const need=missingN.preliminaryNeeds.find(row=>row.row_id===id);assert(need,'UNKNOWN_NEED_REQUIRED:'+id);
      assert.equal(need.quantity,null);assert(need.missing_parameter_ids.includes('power_supply_output_capacity_point'));
      if(newIds.includes(id)){assert.equal(need.procurement_eligible,false);assert.equal(need.unit_price,null);}
    }
    assertNativeUnknowns(missingN);completedAssertions++;
    assert.equal(hash(parentRaw),parentBefore,'RAW_NATIVE_CAPTURE_IMMUTABLE');
    assert.equal(begun,5);assert.equal(results,5);assert.equal(rejects,0);assert.equal(completedAssertions,5);finished=true;
  }finally{
    save('actual-finite-summary.json',{status:finished?'PASS_MODEL_FULL_NATIVE_CORE_REHEARSAL_ONLY':'FIRST_FAILURE_OR_INCOMPLETE',plannedCoreCallbacks:5,
      actualCoreCallbacksBegun:begun,actualResults:results,actualRejects:rejects,actualCompletedCaseAssertions:completedAssertions,
      ordinaryConfigStatus:fixture.ordinaryConfigStatus,sourceAdmission:false,actualProjectApproval:false,priceGate:'UNRUN',fullTypes:'UNRUN_FOR_NEW_FIRE_PSU_ENTRY',
      SQL:0,publisher:0,publication:0,UI:0,API422:'UNRUN',FULL:false});
  }
},110000);
