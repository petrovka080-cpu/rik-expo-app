import type {ElectricalPoles04kvCanonicalParentR1117} from '../../src/lib/estimate/v4/domains/electricalComplete/productionBinding';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {compileFormulaGraph} from '../../src/lib/estimate/backendPlatform/formulaGraph';
// Exact ordinary Core EMPTY/N1 capture in the existing normal Jest harness.
// This records ACTUAL_CORE_RESULT or ACTUAL_CORE_STOP; neither is FULL/admission.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import s from '../../data/estimate-benchmarks/source-packs/electrical-poles-04kv-whole-current-r1117-r1.json';
import {electricalPoles04kvWholeOrdinaryMaterializerInputR1117} from '../../src/lib/estimate/v4/domains/electricalComplete/productionBinding';
import {compileCanonicalEstimateCore as core} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../../src/lib/estimate/estimateDeterministicHash';
const stableHash=(value:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
const parent=():ElectricalPoles04kvCanonicalParentR1117=>{
 const formulas=s.currentNative.formulas.map(formula=>{
  const graph=compileFormulaGraph(formula.expression_source);
  expect(graph.ast).toEqual(formula.ast);
  expect(graph.inputParameterIds).toEqual(formula.input_parameter_ids);
  const typed={...formula,ast:graph.ast,input_parameter_ids:[...graph.inputParameterIds]};
  expect(typed).toEqual(formula);expect(stableHash(typed)).toBe(stableHash(formula));
  return typed;
 });
 const body={...s.currentNative,formulas};
 expect(body).toEqual(s.currentNative);expect(stableHash(body)).toBe(stableHash(s.currentNative));
 return {header:s.currentHeader,body};
};
const sha=(v:Buffer)=>createHash('sha256').update(v).digest('hex');
it('R1153 actual ordinary Core EMPTY/N1 captures preserve exact original full inputs and HOLD',async()=>{
 expect(process.env.GITHUB_ACTIONS).toBe('true');
 const root=process.cwd(),output=process.env.GOX_TYPES_OUTPUT_ROOT;
 if(!output||path.resolve(output)===path.resolve(root))throw Error('EXISTING_CI_ARTIFACT_OUTPUT_REQUIRED');
 const originalInputBytes=fs.readFileSync(path.join(root,'scripts/verification/gox-current-types-v1/poles04-original-native-input-r1153.json'));
 expect(sha(originalInputBytes)).toBe('2ff9f0581566aeff49c94560951026ed8e38f9fad28d9cc6a641a31301fb287e');
 const originalInput=JSON.parse(originalInputBytes.toString('utf8'));
 expect(originalInput.expected.coreCases).toEqual(['EMPTY','SYNTHETIC_POLE_N1']);
 expect(originalInput.expected.shape).toEqual([100,131,131]);
 expect(originalInput.sourceAdmission).toBe(false);expect(originalInput.full).toBe(false);
 const subjectPins=originalInput.subjects as {logicalPath:string;sha256:string}[];
 for(const pin of subjectPins){
  let sourcePath=path.join(root,pin.logicalPath);
  if(pin.logicalPath==='tests/estimateNorms/electricalPoles04CurrentPreflightR1153.contract.test.ts'){
   expect(pin.sha256).toBe('26a191affaca4edcce6c48e2ce5a7e4f0e7f2037c3d771303a17f820c702e694');
   sourcePath=path.join(root,'scripts/verification/gox-current-types-v1/poles04-original20-source-r1153.txt');
  }
  expect(sha(fs.readFileSync(sourcePath))).toBe(pin.sha256);
 }
 expect(sha(fs.readFileSync(path.join(root,'tests/estimateNorms/electricalPoles04CurrentPreflightR1153.contract.test.ts')))).toBe('6af255c9d4b7b30db834cbbe24ebca76d3e92c1eba691cc23e48fd1c52782479');
 const final=electricalPoles04kvWholeOrdinaryMaterializerInputR1117(parent()),d=final.definition;
 expect([d.parameters.length,d.formulas.length,d.resources.length,final.independentCompletenessMap.entries.length]).toEqual([100,131,131,68]);
 expect(final.sourceRegistryAdmission).toBeNull();expect(final.fullTechnicalAcceptance).toBe(false);
 const runCore=(values:Record<string,unknown>)=>core({operation:'compile',compilerVersion:'SYNTHETIC_UNSAVED_POLES04_R1153_NOT_ADMISSION',catalogId:s.catalogId,primaryMeasureParameterId:s.fields.pole_count,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:values,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:async v=>hash(v)});
 const originalCoreDefinitions={parameters:d.parameters,formulas:d.formulas,resources:d.resources};
 const coreDefinitionHash=stableHash(originalCoreDefinitions);
 const mutableCoreDefinitions={parameters:[...d.parameters],formulas:[...d.formulas],resources:[...d.resources]};
 expect(mutableCoreDefinitions).toEqual(originalCoreDefinitions);
 expect(stableHash(mutableCoreDefinitions)).toBe(coreDefinitionHash);
 const cases=[];
 for(const [id,values] of [['EMPTY',{}],['SYNTHETIC_POLE_N1',{[s.fields.pole_count]:1}]] as const){
  try{const v=await runCore(values);cases.push({id,submitted:values,status:'ACTUAL_CORE_RESULT',rows:v.rows.length,needs:v.preliminaryNeeds.length});}
  catch(error){const e=error as Error&{code?:unknown};cases.push({id,submitted:values,status:'ACTUAL_CORE_STOP',code:e.code??null,name:e.name,message:e.message});}
  expect(stableHash(originalCoreDefinitions)).toBe(coreDefinitionHash);
 }
 const result={contract:'gox-poles04-original-ordinary-core-normal-jest/r1153',status:'ACTUAL_CORE_CAPTURES_RESULT_OR_STOP_NOT_ADMISSION',cases,sourceAdmission:false,publication:false,full:false,actualObjectFactsSupplied:false,baselineValuesSubmitted:false};
 fs.writeFileSync(path.join(output,'POLES04_ORDINARY_CORE_RESULT.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 expect(cases.map(v=>v.id)).toEqual(['EMPTY','SYNTHETIC_POLE_N1']);
 expect(cases.every(v=>['ACTUAL_CORE_RESULT','ACTUAL_CORE_STOP'].includes(v.status))).toBe(true);
});
