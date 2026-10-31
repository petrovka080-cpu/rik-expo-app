import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ASPHALT_INSTALL_KRER27_RESOURCES} from '../../../src/lib/estimate/v4/asphaltInstallKrer27ProfileR1';
import {BRIDGE_ASPHALT_COMPLETE_RESOURCES} from '../../../src/lib/estimate/v4/bridgeAsphaltCompletePreliminaryProfileR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {masterOperationValueSha256R1} from './masterOperationCompositionOnlyR1';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
type Json=Record<string,any>;
const fixturePath='data/estimate-benchmarks/fixtures/asphalt-operation-current-parent-captures-r1.json';
export const asphaltOperationCapturesR1=()=>JSON.parse(readFileSync(fixturePath,'utf8')).records as Json[];
const criterion='Ресурсы относятся к указанной подработе. Общие ресурсы учтены один раз в своём разделе.';
function composition(groupId:string,groupTitleRu:string,stages:readonly(readonly[string,string])[]){
  const stage=(id:string)=>{const index=stages.findIndex(([key])=>key===id);assert.ok(index>=0,id);
    return {operationId:id,operationTitleRu:stages[index]![1],completionCriterionRu:criterion,processOrdinal:index+1,
      processRole:id==='common'?'COST_SUMMARY':'PROCESS'};};
  return (id:string,shared:readonly string[]=[])=>({contractVersion:'canonical-operation-resource/v1',groupId,groupTitleRu,
    ...stage(id),...(shared.length?{additionalOperations:shared.map(stage)}:{})});
}
export function asphaltOperationMapR1(record:Json):Record<string,Json>{
  const c=record.capture,rows=c.resources as Json[],map:Record<string,Json>={};
  if(record.catalogId==='canonical-work:expanded:bridge_asphalt'){
    assert.deepEqual(rows.map(r=>r.row_id).sort(),BRIDGE_ASPHALT_COMPLETE_RESOURCES.map(r=>r.row_id).sort());
    for(const row of BRIDGE_ASPHALT_COMPLETE_RESOURCES)map[row.row_id]=JSON.parse(JSON.stringify(row.resource_graph.operationCompositionV1));
  }else if(record.catalogId.endsWith('asphalt_level_standard')){
    const stages=[['base','Приёмка основания'],['tack','Нанесение вяжущего'],['feed','Доставка и приёмка смеси'],
      ['pave','Укладка выравнивающего слоя'],['breakdown','Предварительное уплотнение'],['intermediate','Основное уплотнение'],
      ['finish','Окончательное уплотнение'],['quality','Контроль слоя'],['docs','Оформление и сдача'],['common','Общие труд и техника']]as const;
    const op=composition('asphalt:level:retained','Сохранённый способ выравнивания',stages);
    const legacy=['tack','pave','feed','feed','feed','base','tack','feed','pave','breakdown','intermediate','finish','tack','pave','breakdown','intermediate','finish','quality','quality','quality','docs','common','docs','docs'];
    for(let i=0;i<legacy.length;i++){
      const row=rows.find(r=>r.row_id.endsWith(':r555:'+(i+1)));assert.ok(row);
      map[row.row_id]=op(legacy[i]!,legacy[i]==='common'?['base','tack','feed','pave','breakdown','intermediate','finish']:[]);
    }
    const source=new Map(ASPHALT_INSTALL_KRER27_RESOURCES.map(r=>[r.row_id,r.resource_graph.operationCompositionV1]));
    const norm=composition('asphalt:level:current','Выравнивающий слой',[['geometry','Объём слоя']]);
    for(const row of rows.filter(r=>r.row_id.startsWith('asphalt_level_r566_'))){
      const key=row.row_id.slice('asphalt_level_r566_'.length);
      const original=source.get(key);
      if(key==='asphalt:control:geometric-compacted-volume'){map[row.row_id]=norm('geometry');continue;}
      if(key==='asphalt:material:steel-towing-wire'){
        // KRER19 includes towing wire with side-stop preparation; no new consumption is assigned.
        const declared=source.get('asphalt:material:hardwood-side-stop-bars');assert.ok(declared);
        map[row.row_id]={...(declared as Json),groupId:'asphalt:level:current',groupTitleRu:'Выравнивающий слой'};continue;
      }
      assert.ok(original,'UNMAPPED_LEVEL_SOURCE_ROW:'+key);
      map[row.row_id]=JSON.parse(JSON.stringify({...original as Json,groupId:'asphalt:level:current',groupTitleRu:'Выравнивающий слой'},(_k,value)=>
        typeof value==='string'&&source.has(value)?'asphalt_level_r566_'+value:value));
    }
  }else if(record.catalogId.endsWith('asphalt_compact_standard')){
    const stages=[['ready','Приёмка смеси и температурного окна'],['pattern','Подготовка схемы укатки'],['breakdown','Предварительное уплотнение'],
      ['intermediate','Основное уплотнение'],['finish','Окончательное уплотнение'],['edges','Уплотнение кромок и швов'],
      ['local','Локальное уплотнение'],['correction','Исправление следов и дефектов'],['handover','Контроль и сдача покрытия'],
      ['quality','Контроль качества уплотнения'],['docs','Документы по уплотнению'],['zone','Организация рабочей зоны'],
      ['mobilization','Доставка и возврат катков'],['common','Общие труд и координация звена']]as const;
    const op=composition('asphalt:compaction:current','Уплотнение асфальтобетона',stages);
    const legacyOp=composition('asphalt:compaction:retained','Сохранённый способ уплотнения',stages);
    const legacy=['breakdown','intermediate','finish','breakdown','intermediate','finish','quality','common','docs','handover'];
    for(let i=0;i<legacy.length;i++){const row=rows.find(r=>r.row_id.endsWith(':r555:'+(i+1)));assert.ok(row);
      map[row.row_id]=legacyOp(legacy[i]!,legacy[i]==='common'?['breakdown','intermediate','finish']:[]);}
    const assign=(stage:string,ids:readonly string[],shared:readonly string[]=[])=>{for(const id of ids){assert.ok(rows.some(r=>r.row_id===id),id);assert.ok(!map[id],id);map[id]=op(stage,shared);}};
    assign('ready',['asphalt-compaction:operation:mat-readiness-temperature','asphalt-compaction:quality:temperature-window']);
    assign('pattern',['asphalt-compaction:operation:rolling-pattern-setup','asphalt-compaction:quality:rolling-pattern']);
    for(const phase of ['breakdown','intermediate','finish']){
      assign(phase,[`rc09:asphalt_compaction_${phase}_work`,`rc09:asphalt_compaction_${phase}_roller`,
        `asphalt-compaction:included:operator:${phase}`,`asphalt-compaction:included:fuel-fluids:${phase}`]);
      if(phase!=='intermediate')assign(phase,[`asphalt-compaction:included:wetting-water:${phase}`,`asphalt-compaction:included:scrapers:${phase}`]);
    }
    assign('intermediate',['asphalt-compaction:included:tire-wetting:intermediate']);
    assign('edges',['asphalt-compaction:operation:edges-joints','asphalt-compaction:quality:joint-edge-density']);
    assign('local',['asphalt-compaction:operation:inaccessible-local']);
    assign('correction',['asphalt-compaction:operation:marks-correction']);
    assign('handover',['asphalt-compaction:operation:final-handover']);
    assign('quality',['main-mat-density','smoothness-marks','visual-defects','full-coverage','instrument-readiness'].map(k=>'asphalt-compaction:quality:'+k));
    assign('docs',['rc09:asphalt_compaction_work_journal','rc09:asphalt_compaction_execution_documentation',
      ...['rolling-pattern-log','temperature-log','quality-protocols'].map(k=>'asphalt-compaction:document:'+k)]);
    assign('zone',['asphalt-compaction:organization:work-zone-control',...['traffic-cones','traffic-barriers','temporary-signs','flagger','ppe','safety-briefing'].map(k=>'asphalt-compaction:included:'+k)]);
    assign('mobilization',['breakdown','intermediate','finish'].map(k=>'asphalt-compaction:mobilization:'+k+'-roller'));
    assign('common',['rc09:asphalt_compaction_crew','asphalt-compaction:included:labor:road-worker','rc09:asphalt_compaction_large_area_organization'],
      ['ready','pattern','breakdown','intermediate','finish','edges','local','correction','handover']);
  }else throw Error('UNREVIEWED_OPERATION_CATALOG:'+record.catalogId);
  // The bridge authoring source repeats the primary contractVersion on related
  // stages. Store the canonical related-stage fields, preserving their meaning.
  for(const operation of Object.values(map))if(operation.additionalOperations)operation.additionalOperations=operation.additionalOperations.map((stage:Json)=>{
    const {contractVersion:_sameContract,...body}=stage;return body;
  });
  assert.deepEqual(Object.keys(map).sort(),rows.map(r=>r.row_id).sort());return map;
}
/** Data only. Reuses the existing Master runner, compiler, registry and writer. */
export function prepareAsphaltOperationCompositionSuccessorR1(record:Json,parent:Readonly<{
  releaseId:string;searchReleaseId:string;currentReleasePath:string;outputRoot:string;
}>):MasterSingleDefinitionSuccessorConfig{
  const c=record.capture,p=record.contentPassport,s=record.searchDocument,map=asphaltOperationMapR1(record);
  const locator=c.normativeLocators[0],source=c.normativeSources.find((r:Json)=>r.id===locator.source_id);
  const sourceKeys=c.normativeSources.map((r:Json)=>r.source_key);
  const fixtureSources=Object.fromEntries(Object.entries(c.baseline.normative_source_ids).map(([id,keys])=>[id,(keys as string[]).filter(k=>!sourceKeys.includes(k))]).filter(([,keys])=>(keys as string[]).length));
  const resources=c.resources.map((r:Json)=>({...r,resource_graph:{...r.resource_graph,operationCompositionV1:map[r.row_id]}}));
  const mode={contract:'master-operation-composition-only/r1' as const,capturedContentPassport:p,capturedContentPassportSha256:record.contentPassportSha256,
    operationByRowId:map,operationMapSha256:masterOperationValueSha256R1(map)};
  const compile=(rs:Json[])=>compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'asphalt-operation-metadata-only/r1',catalogId:record.catalogId,
    primaryMeasureParameterId:c.definition.applicability.primaryMeasureParameterId??'area_m2',parameterDefinitions:c.parameters,formulaDefinitions:c.formulas,
    resourceDefinitions:rs as Parameters<typeof compileCanonicalEstimateCore>[0]['resourceDefinitions'],submittedParameters:{},confirmedParameters:c.baseline.input_values,currencyCode:'KGS',maximumResourceRows:rs.length,hashJson:estimateDeterministicHash});
  return {contract:c.parameters[0].truth_metadata.contract,stopCode:'ASPHALT_OPERATION_COMPOSITION_R1',applicationName:'asphalt-operation-composition-r1',
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19 (8).txt',
    masterSha256:'a3e197db867ac7f479850b64d6b42efa17dcb989ffc524e734a27c8d0a97a073',
    parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath:parent.currentReleasePath,outputRoot:parent.outputRoot,
    sourcePaths:[fixturePath,'scripts/estimate/r4a13/prepareAsphaltOperationCompositionSuccessorR1.ts','scripts/estimate/r4a13/masterOperationCompositionOnlyR1.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
      'src/lib/estimate/v4/asphaltInstallKrer27ProfileR1.ts','src/lib/estimate/v4/bridgeAsphaltCompletePreliminaryProfileR1.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts'],
    catalogId:record.catalogId,sourceId:source.source_key,normId:'UNCHANGED_PARENT_BINDINGS_OPERATION_LINKS_ONLY',
    sourceMetadata:{source_title:source.title_ru,source_authority:source.authority,exact_locator:'Existing exact parent locator; operation links only',
      use_restriction:'Quantity sources and all existing scope limitations remain unchanged.',official_url:source.official_url,artifact_sha256:source.artifact_sha256},
    parameterDefinitions:[...c.parameters].sort((a,b)=>a.ordinal-b.ordinal),formulaDefinitions:c.formulas,resourceDefinitions:resources,shortInput:c.baseline.input_values,acceptanceInput:c.baseline.input_values,
    expectedParentShape:[c.parameters.length,c.formulas.length,c.resources.length],benchmarkOrdinal:0,validationScenario:'EXACT_CURRENT_PARENT_OPERATION_LINKS_NO_QUANTITY_DELTA',
    passport:{canonicalRuName:c.definition.passport.canonicalRuName,workKey:c.definition.passport.workKey,physicalResultRu:c.definition.passport.physicalResultRu,
      includedScopeRu:p.included_scope_ru,excludedScopeRu:p.excluded_scope_ru},applicability:c.definition.applicability,
    binding:{rowId:c.resources.find((r:Json)=>r.id===c.bindings[0].resource_spec_id).row_id,applicability:c.bindings[0].applicability,
      retainParentBindings:{capturedParent:c,capturedParentSha256:record.capturedParentSha256,newParameterSources:{},operationCompositionOnly:mode,
        ...(Object.keys(fixtureSources).length?{legacyCapturedFixtureSources:{contract:'master-retained-captured-fixture-provenance/r1' as const,parameterSources:fixtureSources as Record<string,string[]>}}:{})},
      reuseExistingNormativeRegistry:{contract:'master-existing-normative-registry-reuse/r1',locatorExcerptHashKind:'CAPTURED_PARENT_OPERATION_COMPOSITION_ONLY_R1',source,locators:c.normativeLocators}},
    locator:{key:locator.locator_key,payload:locator.locator},search:{primaryUom:s.primary_uom,canonicalNameRu:s.canonical_name_ru,aliases:s.aliases,
      shortScopeRu:s.short_scope_ru,keyDistinguishingParameters:s.key_distinguishing_parameters,clarificationFields:s.clarification_fields,
      includedBoundaries:s.included_boundaries,excludedBoundaries:s.excluded_boundaries,extraSearchTermsRu:'',sourceProvenance:s.source_provenance},
    forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'asphalt_operation_composition_r1',
    verifyCore:async()=>{
      const before=await compile(c.resources),after=await compile(resources);
      const arithmetic=(result:typeof before)=>({parameters:result.parameters,rows:result.rows.map(r=>({id:r.row_id,quantity:r.quantity,unit:r.unit_id,included:r.included_in_estimate,price:r.unit_price,amount:r.amount})),
        needs:JSON.parse(JSON.stringify(result.preliminaryNeeds,(key,value)=>
          key==='operationCompositionV1'||key==='need_sha256'?undefined:value)),totals:result.totals});
      assert.deepEqual(arithmetic(after),arithmetic(before));
      return {status:'PASS_EXACT_CURRENT_PARENT_OPERATION_ONLY',catalogId:record.catalogId,rows:resources.length,links:Object.keys(map).length,
        quantitySourcesChanged:false,contentScopeUnchanged:true,fixtureSha256:createHash('sha256').update(readFileSync(fixturePath)).digest('hex')};
    }};
}
