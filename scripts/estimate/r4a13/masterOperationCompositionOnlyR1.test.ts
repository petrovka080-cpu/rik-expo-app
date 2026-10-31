import reviewedCurrentFinishingOperationsR414 from '../../../data/estimate-benchmarks/fixtures/current-finishing-reviewed-operation-maps-r414.json';
import {ct126CurrentMetadataRecordsR411,ct126CurrentRetainedMetadataConfigR411} from './prepareCt126PreparedWallBranchesR2';
import {skirtingCurrentMetadataRecordsR411,skirtingCurrentRetainedMetadataConfigR411,skirtingCurrentNativeContractR1} from './prepareS2735SkirtingBatchSuccessor';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {assertMasterOperationUnchangedAbsentRowsR408,assertMasterOperationCompositionDeclarationR1,assertMasterOperationCompositionComputationR1} from './masterOperationCompositionOnlyR1';
import {preparedCartridgeCurrentRecordsR388,preparedCartridgeCurrentRetainedConfigR388} from './prepareS2754PreparedCartridgeFinishes';
import {ASPHALT_INSTALL_KRER27_RESOURCES} from '../../../src/lib/estimate/v4/asphaltInstallKrer27ProfileR1';
import {BRIDGE_ASPHALT_COMPLETE_RESOURCES} from '../../../src/lib/estimate/v4/bridgeAsphaltCompletePreliminaryProfileR1';
import {asphaltOperationCapturesR1,asphaltOperationMapR1,prepareAsphaltOperationCompositionSuccessorR1} from './prepareAsphaltOperationCompositionSuccessorR1';
import {masterRetainParentBindingsOptInR1,assertMasterRetainedParentComputationR1,prepareMasterRetainedBindingRepresentativeR1,
  assertMasterRetainedBindingPlanR1,assertMasterRetainedBindingSnapshotR1,masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
import {createCanonicalDefinitionClonePlan} from './canonicalDefinitionPublisherR1';
import {hasMasterTypedPartialQuantityBasisR1,validateMasterTypedPartialQuantityBasisR1,assertMasterTypedPartialQuantityRegistryR1} from './masterTypedPartialQuantityBasisR1';
import {masterOperationValueSha256R1} from './masterOperationCompositionOnlyR1';
import {resolveMasterExistingNormativeRegistryReuseR1} from './prepareMasterSingleDefinitionSuccessorR1';
type Json=Record<string,any>;
const copy=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const parent={releaseId:'213db7f8-5899-5b5b-bf8e-2ba138043510',searchReleaseId:'98d2e2ff-dd17-5210-9412-03a264b0d07c',currentReleasePath:'unused',outputRoot:'unused'};
function setup(record:Json,prepare=prepareAsphaltOperationCompositionSuccessorR1){
  const config=prepare(copy(record),record.parentReleaseId?{...parent,releaseId:record.parentReleaseId,searchReleaseId:record.parentSearchReleaseId}:parent),reuse=config.binding.reuseExistingNormativeRegistry!;
  const {created_at:_timestamp,...source}=reuse.source;
  const input={config,newSource:source,newLocators:reuse.locators};
  const c=config.binding.retainParentBindings!.capturedParent;
  const next={parameters:[...config.parameterDefinitions],formulas:[...config.formulaDefinitions],resources:[...config.resourceDefinitions],newBindings:[],
    successorProvenance:{parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,capturedParentSha256:record.capturedParentSha256??config.binding.retainParentBindings!.capturedParentSha256,sourceFingerprint:'a'.repeat(64)}};
  const expected=prepareMasterRetainedBindingRepresentativeR1(input,next);
  const p=record.contentPassport;
  const plan=createCanonicalDefinitionClonePlan({contract:config.contract,definition:{id:'11111111-1111-5111-8111-111111111111',releaseId:'22222222-2222-5222-8222-222222222222',
    catalogId:record.catalogId,definitionVersion:c.definition.definition_version+1,passport:c.definition.passport,applicability:c.definition.applicability,
    definitionSha256:'a'.repeat(64),sourceMetadata:expected.sourceMetadata},
    representative:{parameters:next.parameters,formulas:next.formulas,resources:next.resources,bindings:[...expected.bindings],baseline:c.baseline,passport:p},
    parameterTruthMetadata:row=>row.truth_metadata,resourceId:row=>'new:'+row.row_id,resourceSemanticOwner:row=>row.semantic_owner,resourceSha256:()=>'b'.repeat(64),
    baseline:{id:'33333333-3333-5333-8333-333333333333',key:'operation-only-test',sourceDefinitionVersionId:c.definition.id,validationScenarioRefs:[],
      acceptanceEvidenceSha256:'c'.repeat(64),acceptedReleaseId:'22222222-2222-5222-8222-222222222222',supersedesBaselineId:c.baseline.id},
    passport:{physicalResultRu:p.physical_result_ru,excludedScopeRu:p.excluded_scope_ru,decision:p.decision,payloadSha256:'d'.repeat(64),sourceHead:'test',sourceTree:'test'},
    bindingApplicability:b=>b.applicability,expectedNormativeBindingCount:expected.expectedNormativeBindingCount});
  return {record,config,input,c,next,expected,plan};
}
describe('Exact current asphalt parents: operation links without quantity/source changes',()=>{
  const records=asphaltOperationCapturesR1();
  test('map assembly preserves immutable authoring sources and captured models',()=>{
    const before=JSON.stringify({records,install:ASPHALT_INSTALL_KRER27_RESOURCES,bridge:BRIDGE_ASPHALT_COMPLETE_RESOURCES});
    for(const record of records)asphaltOperationMapR1(record);
    expect(JSON.stringify({records,install:ASPHALT_INSTALL_KRER27_RESOURCES,bridge:BRIDGE_ASPHALT_COMPLETE_RESOURCES})).toBe(before);
  });
  test.each(records)('$catalogId retains its exact full model, bindings and readiness',async record=>{
    const s=setup(record);expect(masterRetainParentBindingsOptInR1(s.input)).not.toBeNull();
    expect(resolveMasterExistingNormativeRegistryReuseR1(s.input)).not.toBeNull();
    assertMasterRetainedBindingPlanR1(s.input,s.plan,s.expected);
    if(hasMasterTypedPartialQuantityBasisR1(s.plan.passport)){
      expect(validateMasterTypedPartialQuantityBasisR1(s.plan)).toEqual([]);
      assertMasterTypedPartialQuantityRegistryR1(s.plan.passport.decision.partialQuantityBasis,
        {newSources:[s.config.binding.reuseExistingNormativeRegistry!.source],newLocators:[...s.input.newLocators]});
    }
    expect(s.plan.parameters.map(p=>p.ordinal)).toEqual([...s.plan.parameters.map(p=>p.ordinal)].sort((a,b)=>a-b));
    expect(s.plan.resources).toHaveLength(record.capture.resources.length);
    expect(s.plan.bindings).toHaveLength(record.capture.bindings.length);
    expect(s.plan.definition.source_metadata.retainedParentBindingSuccessorV1).toEqual(s.c.definition.source_metadata.retainedParentBindingSuccessorV1);
    expect(await s.config.verifyCore()).toMatchObject({status:'PASS_EXACT_CURRENT_PARENT_OPERATION_ONLY',quantitySourcesChanged:false,contentScopeUnchanged:true});
  });
  test.each(['quantity AST','formula input','parameter constraint','parameter default','parameter truth','resource cost owner','resource unit','resource inclusion','procurement','resource source','graph cost treatment','graph input','new row','removed parameter'])(
    'rejects physical mutation: %s',kind=>{
      const s=setup(records[2]!),n=copy(s.next);
      switch(kind){
        case 'quantity AST':n.formulas[0].ast={kind:'literal',value:999};break;
        case 'formula input':n.formulas[0].input_parameter_ids=[];break;
        case 'parameter constraint':n.parameters[0].constraints_json={};break;
        case 'parameter default':n.parameters[0].default_value=999;break;
        case 'parameter truth':n.parameters[0].truth_metadata={};break;
        case 'resource cost owner':n.resources[0].cost_owner_id='forged';break;
        case 'resource unit':n.resources[0].unit_id='t';break;
        case 'resource inclusion':n.resources[0].inclusion_ast={kind:'literal',value:false};break;
        case 'procurement':n.resources[0].procurement_eligible=!n.resources[0].procurement_eligible;break;
        case 'resource source':n.resources[0].source_metadata={};break;
        case 'graph cost treatment':n.resources[0].resource_graph.costTreatment='OWN_COST';break;
        case 'graph input':n.resources[0].resource_graph.inputParameterIds=[];break;
        case 'new row':n.resources.push({...n.resources[0],row_id:'forged'});break;
        case 'removed parameter':n.parameters.pop();break;
      }
      expect(()=>assertMasterRetainedParentComputationR1(s.input,n,'REPRESENTATIVE')).toThrow(/MASTER_OPERATION_ONLY/);
    });
  test.each(['baseline value','baseline classification','baseline source','baseline guide','baseline proposal','passport status','passport capability','definition scope','binding','provenance'])(
    'rejects final plan mutation: %s',kind=>{
      const s=setup(records[0]!),p=copy(s.plan),id=s.c.parameters[0].parameter_id;
      switch(kind){
        case 'baseline value':p.baseline.input_values[id]=999;break;
        case 'baseline classification':p.baseline.input_classification[id]='NORMATIVE';break;
        case 'baseline source':p.baseline.normative_source_ids[id]=[];break;
        case 'baseline guide':p.baseline.guide_provenance_ru[id]='forged';break;
        case 'baseline proposal':p.baseline.proposal_source_refs=[];break;
        case 'passport status':p.passport.decision.technicalScopeStatus='FULL';break;
        case 'passport capability':p.passport.capability_matrix=[];break;
        case 'definition scope':p.definition.applicability={};break;
        case 'binding':p.bindings[0].applicability={};break;
        case 'provenance':p.definition.source_metadata.sourceFingerprint='forged';break;
      }
      expect(()=>assertMasterRetainedBindingPlanR1(s.input,p,s.expected)).toThrow();
    });
  test.each(['map omitted row','map unknown gate','malformed related','duplicate related','bad role','source replacement','locator replacement','passport forgery'])(
    'rejects rehashed metadata forgery: %s',kind=>{
      const s=setup(records[2]!),input=copy(s.input),opt=input.config.binding.retainParentBindings!,mode=opt.operationCompositionOnly!,first=Object.values(mode.operationByRowId)[0]!;
      switch(kind){
        case 'map omitted row':delete (mode.operationByRowId as Json)[Object.keys(mode.operationByRowId)[0]!];break;
        case 'map unknown gate':first.whenResourcePresent=['missing'];break;
        case 'malformed related':first.additionalOperations=[{}];break;
        case 'duplicate related':first.additionalOperations=[{operationId:first.operationId,operationTitleRu:first.operationTitleRu,completionCriterionRu:first.completionCriterionRu}];break;
        case 'bad role':first.processRole='FAKE';break;
        case 'source replacement':(input.newSource as Json).metadata={};break;
        case 'locator replacement':(input.newLocators[0]! as Json).excerpt_sha256='f'.repeat(64);break;
        case 'passport forgery':mode.capturedContentPassport.decision.technicalScopeStatus='FORGED_SCOPE_PROMOTION';break;
      }
      (mode as Json).operationMapSha256=masterOperationValueSha256R1(mode.operationByRowId);
      (mode as Json).capturedContentPassportSha256=masterOperationValueSha256R1(mode.capturedContentPassport);
      expect(()=>masterRetainParentBindingsOptInR1(input)).toThrow();
    });
  test('normal and locked snapshots include the full content passport',()=>{
    const s=setup(records[1]!),snapshot={membership:[{release_id:parent.releaseId,catalog_id:s.record.catalogId,definition_version_id:s.c.definition.id,
      approved_template_baseline_id:s.c.baseline.id,definition_hash:s.c.definition.definition_sha256}],capture:s.c,
      newSources:[s.config.binding.reuseExistingNormativeRegistry!.source],newLocators:[...s.input.newLocators],contentPassport:s.record.contentPassport};
    assertMasterRetainedBindingSnapshotR1(s.input,snapshot);
    const forged=copy(snapshot);forged.contentPassport.decision.quantityScope='FULL';
    expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,forged)).toThrow(/PASSPORT_DRIFT/);
  });
});

describe('Actual R387 cartridge parents retained without duplicate append',()=>{
  const records=preparedCartridgeCurrentRecordsR388();
  const currentSetup=(record:Json)=>setup(record,preparedCartridgeCurrentRetainedConfigR388);
  test.each(records)('$catalogId retains whole model, current source, baseline and lineage',async record=>{
    const before=JSON.stringify(record),s=currentSetup(record);
    expect(s.config.catalogAppend).toBeUndefined();expect(masterRetainParentBindingsOptInR1(s.input)).not.toBeNull();
    expect(resolveMasterExistingNormativeRegistryReuseR1(s.input)).not.toBeNull();
    assertMasterRetainedBindingPlanR1(s.input,s.plan,s.expected);
    expect(s.plan.resources.map(r=>r.row_id).sort()).toEqual(s.c.resources.map((r:Json)=>r.row_id).sort());
    expect(s.plan.definition.source_metadata.retainedParentBindingSuccessorV1).toEqual(s.c.definition.source_metadata.retainedParentBindingSuccessorV1);
    expect(s.plan.baseline.source_definition_version_id).toBe(s.c.definition.id);expect(s.plan.baseline.supersedes_baseline_id).toBe(s.c.baseline.id);
    expect(s.plan.definition.source_metadata.operationCompositionSuccessorV1).toMatchObject({parentDefinitionId:s.c.definition.id,parentBaselineId:s.c.baseline.id,capturedParentSha256:record.capturedParentSha256});
    expect(await s.config.verifyCore()).toMatchObject({status:'PASS_CURRENT_CARTRIDGE_RETAINED_OPERATION_ONLY',quantitySourcesChanged:false,contentScopeUnchanged:true,procurementRows:1,FULL:false});
    expect(JSON.stringify(record)).toBe(before);
  });
  test.each(['wrong parent','wrong capture hash','wrong revision','wrong passport hash','rehashed operation','new paid row','quantity AST','source body','locator body','baseline value','lineage'])(
    'rejects cartridge retained forgery: %s',kind=>{
      for(const record of records){
        if(['wrong parent','wrong capture hash','wrong revision','wrong passport hash'].includes(kind)){
          const r=copy(record);if(kind==='wrong parent'){
            expect(()=>preparedCartridgeCurrentRetainedConfigR388(copy(record),{releaseId:'forged',searchReleaseId:record.parentSearchReleaseId})).toThrow();
            expect(()=>preparedCartridgeCurrentRetainedConfigR388(copy(record),{releaseId:record.parentReleaseId,searchReleaseId:'forged'})).toThrow();
            r.capture.definition.catalog_id='forged';
          }
          if(kind==='wrong capture hash')r.capturedParentSha256='f'.repeat(64);
          if(kind==='wrong revision'){r.capture.definition.definition_version++;r.capturedParentSha256=masterRetainedParentCaptureSha256R1(r.capture);}
          if(kind==='wrong passport hash'){r.contentPassport.decision.technicalScopeStatus='FORGED_SCOPE_PROMOTION';r.contentPassportSha256=masterOperationValueSha256R1(r.contentPassport);}
          expect(()=>currentSetup(r)).toThrow();continue;
        }
        const s=currentSetup(record);
        if(kind==='rehashed operation'){
          const i=copy(s.input),m=i.config.binding.retainParentBindings!.operationCompositionOnly!;
          const first=Object.values(m.operationByRowId)[0]!;first.operationTitleRu='forged';
          (m as Json).operationMapSha256=masterOperationValueSha256R1(m.operationByRowId);
          expect(()=>masterRetainParentBindingsOptInR1(i)).toThrow(/EXACT_REVIEWED_CARTRIDGE_OPERATION_MAP/);continue;
        }
        if(kind==='new paid row'||kind==='quantity AST'){
          const n=copy(s.next);if(kind==='new paid row')n.resources.push({...n.resources[0],row_id:'forged:second-owner'});else n.formulas[0].ast={kind:'literal',value:999};
          expect(()=>assertMasterRetainedParentComputationR1(s.input,n,'REPRESENTATIVE')).toThrow();continue;
        }
        if(kind==='source body'||kind==='locator body'){
          const i=copy(s.input);if(kind==='source body')(i.newSource as Json).metadata={};else(i.newLocators[0] as Json).excerpt_sha256='f'.repeat(64);
          expect(()=>masterRetainParentBindingsOptInR1(i)).toThrow();continue;
        }
        const p=copy(s.plan);if(kind==='baseline value')p.baseline.input_values[Object.keys(p.baseline.input_values)[0]!]=999;
        else p.definition.source_metadata.operationCompositionSuccessorV1.parentDefinitionId='11111111-1111-4111-8111-111111111111';
        expect(()=>assertMasterRetainedBindingPlanR1(s.input,p,s.expected)).toThrow();
      }
    });
});

describe('Exact current CT126 unchanged missing operation retention seam',()=>{
  const records=JSON.parse(readFileSync(resolve(__dirname,'../../../data/estimate-benchmarks/fixtures/ct126-current-unchanged-absent-operations-r408.json'),'utf8')).records.map((r:Json)=>({...r,operationByRowId:(reviewedCurrentFinishingOperationsR414 as Record<string,Record<string,Json|null>>)[r.catalogId]})) as Json[];
  const mode=(r:Json)=>({contract:'master-operation-composition-only/r1' as const,capturedContentPassport:r.contentPassport,
    capturedContentPassportSha256:masterOperationValueSha256R1(r.contentPassport),operationByRowId:r.operationByRowId,
    operationMapSha256:masterOperationValueSha256R1(r.operationByRowId),unchangedAbsentOperationRows:r.unchangedAbsentOperationRows});
  const next=(r:Json)=>({parameters:r.capture.parameters,formulas:r.capture.formulas,resources:r.capture.resources.map((row:Json)=>
    r.operationByRowId[row.row_id]===null?row:{...row,resource_graph:{...row.resource_graph,operationCompositionV1:r.operationByRowId[row.row_id]}})});
  test.each(records)('$catalogId retains all149 rows and exact59 field absences under the exact reviewed current anchor',r=>{
    const before=JSON.stringify(r),m=mode(r),n=next(r);
    expect(assertMasterOperationUnchangedAbsentRowsR408(r.capture,m).size).toBe(59);
    assertMasterOperationCompositionComputationR1(r.capture,m,n,'REPRESENTATIVE');
    for(const item of r.unchangedAbsentOperationRows){const row=n.resources.find((row:Json)=>row.row_id===item.rowId)!;
      expect(row).toEqual(r.capture.resources.find((row:Json)=>row.row_id===item.rowId));expect(Object.hasOwn(row.resource_graph,'operationCompositionV1')).toBe(false);}
    assertMasterOperationCompositionDeclarationR1({catalogId:r.catalogId,capture:r.capture,
      captureSha256:masterRetainedParentCaptureSha256R1(r.capture),mode:m,newParameterSources:{}});
    expect(JSON.stringify(r)).toBe(before);
  });
  test.each(['removed absent row','new unmapped row','absent owner drift','absent graph drift','forged absent descriptor','null existing descriptor',
    'wrong captured resource ID','missing absence identity','map row removal','null without optin','wrong current definition','wrong current revision'])(
    'rejects unchanged-absence forgery: %s',kind=>{
      for(const record of records){const r=copy(record),m=mode(r),n=copy(next(r)),absent=r.unchangedAbsentOperationRows[0],
        row=n.resources.find((v:Json)=>v.row_id===absent.rowId),mapped=r.capture.resources.find((v:Json)=>r.operationByRowId[v.row_id]!==null);
        if(kind==='removed absent row')n.resources=n.resources.filter((v:Json)=>v.row_id!==absent.rowId);
        else if(kind==='new unmapped row')n.resources.push({...row,row_id:row.row_id+':forged'});
        else if(kind==='absent owner drift')row.cost_owner_id='forged';
        else if(kind==='absent graph drift')row.resource_graph.costTreatment='forged';
        else if(kind==='forged absent descriptor')row.resource_graph.operationCompositionV1=copy(r.operationByRowId[mapped.row_id]);
        else {
          if(kind==='null existing descriptor')m.operationByRowId[mapped.row_id]=null;
          if(kind==='wrong captured resource ID')m.unchangedAbsentOperationRows[0].resourceSpecId=mapped.id;
          if(kind==='missing absence identity')m.unchangedAbsentOperationRows.pop();
          if(kind==='map row removal')delete m.operationByRowId[absent.rowId];
          if(kind==='null without optin')delete (m as Json).unchangedAbsentOperationRows;
          if(kind==='wrong current definition')r.capture.definition.id=mapped.id;
          if(kind==='wrong current revision')r.capture.definition.definition_version++;
          expect(()=>assertMasterOperationUnchangedAbsentRowsR408(r.capture,m)).toThrow();continue;
        }
        expect(()=>assertMasterOperationCompositionComputationR1(r.capture,m,n,'REPRESENTATIVE')).toThrow();
      }
    });
});


describe('Exact actual twelve current finishing retained recipes R414',()=>{
 const records=[...ct126CurrentMetadataRecordsR411(),...skirtingCurrentMetadataRecordsR411()];
 const prepare=(record:Json,parent:{releaseId:string;searchReleaseId:string})=>record.family.startsWith('CT126')
  ?ct126CurrentRetainedMetadataConfigR411(record,parent):skirtingCurrentRetainedMetadataConfigR411(record,parent);
 const current=(record:Json)=>setup(record,(r)=>prepare(r,{releaseId:record.membership.release_id,searchReleaseId:record.searchDocument.search_release_id}));
 test.each(records)('$catalogId retains current rows, sources, baseline, lineage and real durable operations',async record=>{
  const bytes=JSON.stringify(record),s=current(record);
  expect(s.config.catalogAppend).toBeUndefined();expect(masterRetainParentBindingsOptInR1(s.input)).not.toBeNull();expect(resolveMasterExistingNormativeRegistryReuseR1(s.input)).not.toBeNull();
  assertMasterRetainedBindingPlanR1(s.input,s.plan,s.expected);
  expect(s.plan.resources).toHaveLength(record.capture.resources.length);expect(s.plan.bindings).toHaveLength(record.capture.bindings.length);
  expect(s.c.normativeSources).toEqual(record.capture.normativeSources);expect(s.plan.baseline.input_values).toEqual(record.capture.baseline.input_values);
  expect(s.plan.definition.source_metadata.retainedParentBindingSuccessorV1).toEqual(record.capture.definition.source_metadata.retainedParentBindingSuccessorV1);
  expect(s.plan.definition.source_metadata.retainedParentBindingLineageV1).toEqual(record.capture.definition.source_metadata.retainedParentBindingLineageV1);
  expect(s.config.search.sourceProvenance).toEqual(record.searchDocument.source_provenance);
  if(record.family.startsWith('CT126')){expect(s.c.bindings).toHaveLength(7);expect(s.c.normativeSources).toHaveLength(2);expect(s.c.normativeLocators).toHaveLength(2);
   for(const item of record.unchangedAbsentOperationRows){const row=s.config.resourceDefinitions.find(row=>row.row_id===item.rowId)!;
    expect(Object.hasOwn(row.resource_graph,'operationCompositionV1')).toBe(false);expect(row).toEqual(record.capture.resources.find((row:Json)=>row.row_id===item.rowId));}}
  else{expect(record.capture.normativeLocators).toHaveLength(12);expect(s.c.normativeLocators).toHaveLength(1);}
  const result=await s.config.verifyCore();expect(result).toMatchObject({status:'PASS_CURRENT_MODEL_METADATA_ARITHMETIC_INVARIANT_ONLY',sourceQuantityNormsChanged:false,actualObjectFactsAccepted:false,FULL:false});
  if(record.family.startsWith('CT126'))expect(result.actualBaselineDurable.assertedRows).toBe(1);
  expect(result.controlEvidence).toHaveLength(record.family.startsWith('CT126')?2:1);expect(JSON.stringify(record)).toBe(bytes);
 });
 const examples=[records.find(row=>row.family.startsWith('CT126'))!,records.find(row=>row.family.startsWith('SKIRTING'))!];
 test.each(['wrong parent','rehashed captured body','rehashed passport','rehashed reviewed operation','new paid row','changed source','changed locator','changed baseline','changed lineage'])(
  'rejects current retained recipe forgery: %s',kind=>{
   for(const record of examples){const s=current(record);
    if(kind==='wrong parent'){expect(()=>prepare(copy(record),{releaseId:'forged',searchReleaseId:record.searchDocument.search_release_id})).toThrow();continue;}
    if(kind==='rehashed captured body'||kind==='rehashed passport'){
     const i=copy(s.input),opt=i.config.binding.retainParentBindings!;
     if(kind==='rehashed captured body'){opt.capturedParent.definition.definition_version++;(opt as Json).capturedParentSha256=masterRetainedParentCaptureSha256R1(opt.capturedParent);}
     else{opt.operationCompositionOnly!.capturedContentPassport.decision.technicalScopeStatus='FORGED_SCOPE_PROMOTION';
      (opt.operationCompositionOnly as Json).capturedContentPassportSha256=masterOperationValueSha256R1(opt.operationCompositionOnly!.capturedContentPassport);}
     expect(()=>masterRetainParentBindingsOptInR1(i)).toThrow();continue;
    }
    if(kind==='rehashed reviewed operation'){
     const i=copy(s.input),m=i.config.binding.retainParentBindings!.operationCompositionOnly!,op=Object.values(m.operationByRowId).find(v=>v!==null)!;
     op.operationTitleRu='forged';(m as Json).operationMapSha256=masterOperationValueSha256R1(m.operationByRowId);
     expect(()=>masterRetainParentBindingsOptInR1(i)).toThrow(/EXACT_REVIEWED_CURRENT_FINISHING_OPERATION_MAP/);continue;
    }
    if(kind==='new paid row'){const n=copy(s.next);n.resources.push({...n.resources[0],row_id:'forged:extra-owner'});expect(()=>assertMasterRetainedParentComputationR1(s.input,n,'REPRESENTATIVE')).toThrow();continue;}
    if(kind==='changed source'||kind==='changed locator'){
     const i=copy(s.input);if(kind==='changed source')(i.newSource as Json).metadata={};else(i.newLocators[0] as Json).excerpt_sha256='f'.repeat(64);
     expect(()=>masterRetainParentBindingsOptInR1(i)).toThrow();continue;
    }
    const p=copy(s.plan);if(kind==='changed baseline')p.baseline.input_values[Object.keys(p.baseline.input_values)[0]!]=999;
    else p.definition.source_metadata.operationCompositionSuccessorV1.parentDefinitionId='11111111-1111-4111-8111-111111111111';
    expect(()=>assertMasterRetainedBindingPlanR1(s.input,p,s.expected)).toThrow();
   }
 });
});


describe('Existing writer current-parent authority for retained finishing R416',()=>{
 const records=[...ct126CurrentMetadataRecordsR411(),...skirtingCurrentMetadataRecordsR411()];
 const prepare=(r:Json,parent:{releaseId:string;searchReleaseId:string})=>r.family.startsWith('CT126')
  ?ct126CurrentRetainedMetadataConfigR411(r,parent):skirtingCurrentRetainedMetadataConfigR411(r,parent);
 const observed=(r:Json,c:ReturnType<typeof prepare>)=>{
  const capture=c.binding.retainParentBindings!.capturedParent;
  return{membership:[{release_id:r.membership.release_id,catalog_id:r.catalogId,definition_version_id:r.membership.definition_version_id,
   approved_template_baseline_id:r.membership.approved_template_baseline_id,definition_hash:r.membership.definition_hash}],
   capture,newSources:[c.binding.reuseExistingNormativeRegistry!.source],newLocators:[...c.binding.reuseExistingNormativeRegistry!.locators],contentPassport:r.contentPassport};
 };
 const input=(c:ReturnType<typeof prepare>)=>{const {created_at:_timestamp,...source}=c.binding.reuseExistingNormativeRegistry!.source;
  return{config:c,newSource:source,newLocators:c.binding.reuseExistingNormativeRegistry!.locators};};
 test('a candidate parent does not grant observed membership authority or rewrite the retained origin',()=>{
  for(const r of records){const bytes=JSON.stringify(r),candidate={releaseId:'11111111-1111-4111-8111-111111111111',searchReleaseId:'22222222-2222-4222-8222-222222222222'},
   c=prepare(copy(r),candidate),i=input(c),snapshot=observed(r,c);
   expect(c.parentReleaseId).toBe(candidate.releaseId);expect(c.parentSearchReleaseId).toBe(candidate.searchReleaseId);
   expect(c.binding.retainParentBindings!.capturedParent.definition.id).toBe(r.capture.definition.id);
   expect(()=>assertMasterRetainedBindingSnapshotR1(i,snapshot)).toThrow(/MANIFEST_ANCHOR_DRIFT/);
   expect(JSON.stringify(r)).toBe(bytes);
  }
 });
 test.each(['release','definition','baseline','hash'])('existing writer rejects a wrong current %s with the whole source capture intact',field=>{
  for(const r of records){const c=prepare(copy(r),{releaseId:r.membership.release_id,searchReleaseId:r.searchDocument.search_release_id}),i=input(c),snapshot=observed(r,c);
   assertMasterRetainedBindingSnapshotR1(i,snapshot);
   const changed=copy(snapshot),member=changed.membership[0]!;
   if(field==='release')member.release_id='11111111-1111-4111-8111-111111111111';
   else if(field==='definition')member.definition_version_id='11111111-1111-4111-8111-111111111111';
   else if(field==='baseline')member.approved_template_baseline_id='11111111-1111-4111-8111-111111111111';
   else member.definition_hash='f'.repeat(64);
   expect(()=>assertMasterRetainedBindingSnapshotR1(i,changed)).toThrow(/MANIFEST_ANCHOR_DRIFT/);
  }
 });
});


describe('Native skirting parameter contracts R462',()=>{
 const records=skirtingCurrentMetadataRecordsR411();
 test('retains all eight native profile contracts and every captured source row',()=>{
  expect(records).toHaveLength(8);
  for(const record of records){const bytes=JSON.stringify(record),s=setup(record,r=>skirtingCurrentRetainedMetadataConfigR411(r,{releaseId:r.membership.release_id,searchReleaseId:r.searchDocument.search_release_id}));
   const native=record.capture.definition.source_metadata.contract;
   expect(skirtingCurrentNativeContractR1(record.capture)).toBe(native);expect(s.config.contract).toBe(native);expect(s.plan.contract).toBe(native);
   expect(new Set(s.plan.parameters.map(row=>row.truth_metadata.contract))).toEqual(new Set([native]));
   expect(s.config.parameterDefinitions).toEqual(record.capture.parameters);expect(s.config.formulaDefinitions).toEqual(record.capture.formulas);
   const source=record.capture.normativeSources.find((row:Json)=>row.source_key===record.sourceKey);
   expect(s.config.binding.reuseExistingNormativeRegistry!.source).toEqual(source);
   expect(source.metadata.contract).toBe('rik-expo-app.s27-35.skirting-glue-wet_zone.v1');
   expect(record.capture.normativeLocators).toHaveLength(12);expect(s.c.normativeLocators).toHaveLength(1);
   expect(JSON.stringify(record)).toBe(bytes);
  }
 });
 test.each(['missing','mixed'] as const)('rejects %s parameter contract in the whole capture',kind=>{
  const original=records[0]!.capture as Parameters<typeof skirtingCurrentNativeContractR1>[0],bytes=JSON.stringify(original);
  const changed={...original,parameters:original.parameters.map((row,index)=>{
   const {contract:_contract,...rest}=row.truth_metadata;
   return kind==='missing'?{...row,truth_metadata:rest}:index===0?{...row,truth_metadata:{...rest,contract:'FORGED_MIXED_NATIVE_CONTRACT'}}:row;
  })};
  expect(()=>skirtingCurrentNativeContractR1(changed)).toThrow(/CURRENT_NATIVE_PARAMETER_CONTRACT/);
  expect(JSON.stringify(original)).toBe(bytes);
 });
});
