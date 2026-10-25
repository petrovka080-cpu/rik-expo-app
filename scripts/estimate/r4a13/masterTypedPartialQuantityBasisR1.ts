import {createHash} from 'node:crypto';
import {formulaAstInputParameterIds} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {inclusionGraphEvidenceParameterIds} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';

type Json=Record<string,any>;
const contract='master-typed-partial-quantity-basis/r1' as const;
type Source=Readonly<{sourceId:string;sourceKey:string;artifactSha256:string;locatorId:string;locatorExcerptSha256:string;locatorPayload:Json}>;
type Method=Readonly<{parameterId:string;value:string;version:string}>;
type Fact=Readonly<{parameterId:string;unitId:string|null;valueType:string;consumerRole:string;guideSnapshotSha256:string;guideVersion:string}>;
type Assumption=Fact&Readonly<{sourceParameterId:string;valuePath:readonly string[];value:number}>;
type Model=Readonly<{parameters:readonly Json[];formulas:readonly Json[];resources:readonly Json[]}>;
type Base=Readonly<{contract:typeof contract;kind:string;source:Source;method:Method;resourceRowIds:readonly string[]}>;
export type MasterTypedPartialQuantityBasisR1=
 |Base&Readonly<{kind:'DEFERRED_PROJECT_QUANTITIES';parameters:readonly Fact[]}>
 |Base&Readonly<{kind:'VERSIONED_PRELIMINARY_QUANTITY_PROFILE';profileId:string;sourceSchemaVersion:string;sourceArtifactUtf8:string;
   assumptions:readonly Assumption[];primaryMeasureParameterId:string;projectQuantities:Readonly<{parameters:readonly Fact[];resourceRowIds:readonly string[]}>}>;
export type MasterTypedQuantityPayloadR1=Model&Readonly<{passport:Json;baseline:Json}>;
const copy=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
const same=(a:unknown,b:unknown)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const sha=(text:string)=>createHash('sha256').update(text,'utf8').digest('hex');
const idsEqual=(a:readonly string[],b:readonly string[])=>same([...a].sort(),[...b].sort());
const record=(x:unknown):x is Json=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const requireThat=(value:unknown,code:string):void=>{if(!value)throw Error('TYPED_PARTIAL_QUANTITY_'+code);};
const exactKeys=(x:unknown,keys:readonly string[])=>record(x)&&idsEqual(Object.keys(x),keys);
const hash=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{64}$/u.test(x);
const uniqueIds=(x:unknown,allowEmpty=false):x is string[]=>Array.isArray(x)&&(allowEmpty||x.length>0)&&x.length<=256
 &&x.every(v=>typeof v==='string'&&v.trim()===v&&v.length>0)&&new Set(x).size===x.length;
const factKeys=['parameterId','unitId','valueType','consumerRole','guideSnapshotSha256','guideVersion'];

// Inspect every potential inclusion branch, even if another literal branch is
// decisive with an empty input. The existing leaf inspector owns AST semantics.
function inclusionInputs(ast:Json):string[]{
 if(ast.kind==='and'||ast.kind==='or'){
  const children=ast.operands??ast.conditions;
  requireThat(Array.isArray(children)&&children.length>0&&children.every(record),'INCLUSION_CHILDREN');
  return [...new Set((children as Json[]).flatMap(inclusionInputs))];
 }
 if(ast.kind==='not'){requireThat(record(ast.operand),'INCLUSION_OPERAND');return inclusionInputs(ast.operand);}
 return inclusionGraphEvidenceParameterIds(ast,{});
}
/** Static dependency inspection only; quantities still use the canonical compiler. */
export function masterTypedPartialQuantityDependentRowsR1(model:Model,parameterIds:readonly string[]):string[]{
 const parameters=new Set(parameterIds),formulas=new Map<string,string[]>(),rows:string[]=[],errors:string[]=[];
 for(const f of model.formulas){
  try{
  requireThat(typeof f.formula_id==='string'&&!formulas.has(f.formula_id),'FORMULA_IDS');
  const actual=formulaAstInputParameterIds(f.ast);
  requireThat(uniqueIds(f.input_parameter_ids,true)&&idsEqual(actual,f.input_parameter_ids),'FORMULA_INPUT_WITNESS:'+f.formula_id);
  formulas.set(f.formula_id,actual);
  }catch(error){errors.push(String((error as Error).message));}
 }
 const rowIds=new Set<string>();
 for(const row of model.resources){
  try{
  requireThat(typeof row.row_id==='string'&&!rowIds.has(row.row_id)&&formulas.has(row.formula_id),'RESOURCE_FORMULA');rowIds.add(row.row_id);
  const declared=row.resource_graph?.inputParameterIds;
  requireThat(declared===undefined||uniqueIds(declared,true),'RESOURCE_GATE_IDS:'+row.row_id);
  const inclusion=inclusionInputs(row.inclusion_ast??{kind:'literal',value:true});
  if([...(formulas.get(row.formula_id)??[]),...(declared??[]),...inclusion].some(id=>parameters.has(id)))rows.push(row.row_id);
  }catch(error){errors.push(String((error as Error).message)+':'+row.row_id);}
 }
 requireThat(errors.length===0,'DEPENDENCY_MODEL:'+errors.join(','));
 requireThat(uniqueIds(rows),'DEPENDENT_ROWS');return rows;
}
function fact(model:Model,id:string):Fact{
 const p=model.parameters.find(p=>p.parameter_id===id);requireThat(p,'PARAMETER_MISSING:'+id);
 const t=p!.truth_metadata,g=t?.guide;
 return{parameterId:id,unitId:p!.unit_id??null,valueType:p!.value_type,consumerRole:t?.provenance?.consumer_input_role_v1,
  guideSnapshotSha256:g?.source_snapshot_hash,guideVersion:g?.guide_version};
}
/** Construction records evidence, but does not grant publication admission. */
export function makeMasterDeferredProjectQuantityBasisR1(input:Model&Readonly<{parameterIds:readonly string[];source:Source;method:Method}>):MasterTypedPartialQuantityBasisR1{
 return{contract,kind:'DEFERRED_PROJECT_QUANTITIES',source:copy(input.source),method:copy(input.method),
  parameters:input.parameterIds.map(id=>fact(input,id)),resourceRowIds:masterTypedPartialQuantityDependentRowsR1(input,input.parameterIds)};
}
export function makeMasterPreliminaryQuantityProfileBasisR1(input:Model&Readonly<{source:Source;method:Method;profileId:string;
 sourceArtifactUtf8:string;primaryMeasureParameterId:string;projectParameterIds:readonly string[];
 assumptions:readonly Readonly<{parameterId:string;sourceParameterId:string;valuePath:readonly string[];value:number}>[]}>):MasterTypedPartialQuantityBasisR1{
 const source=JSON.parse(input.sourceArtifactUtf8),assumptions=input.assumptions.map(a=>({...fact(input,a.parameterId),...copy(a)}));
 const projectRows=masterTypedPartialQuantityDependentRowsR1(input,input.projectParameterIds);
 const profileRows=masterTypedPartialQuantityDependentRowsR1(input,assumptions.map(a=>a.parameterId));
 return{contract,kind:'VERSIONED_PRELIMINARY_QUANTITY_PROFILE',source:copy(input.source),method:copy(input.method),profileId:input.profileId,
  sourceSchemaVersion:source.schemaVersion,sourceArtifactUtf8:input.sourceArtifactUtf8,primaryMeasureParameterId:input.primaryMeasureParameterId,
  assumptions,projectQuantities:{parameters:input.projectParameterIds.map(id=>fact(input,id)),resourceRowIds:projectRows},
  resourceRowIds:[...new Set([...profileRows,...projectRows])]};
}
export function masterTypedPartialQuantityCapabilityR1(b:MasterTypedPartialQuantityBasisR1,_resources:readonly Json[]):Json{
 return{capability:'FULL_APPLICABLE_SCOPE',status:b.kind==='DEFERRED_PROJECT_QUANTITIES'?'NEEDS_PROJECT_QUANTITIES':'PRELIMINARY_PROFILE',
  preliminaryCompositionOnly:true,partialQuantityBasis:copy(b)};
}
export function masterTypedPartialQuantityReadinessR1(b:MasterTypedPartialQuantityBasisR1,resources:readonly Json[]):Json{
 return{quantityScope:'PARTIAL',technicalScopeStatus:masterTypedPartialQuantityCapabilityR1(b,resources).status,
  preliminaryCompositionOnly:true,partialQuantityBasis:copy(b),engineeringAcceptance:false};
}
export function hasMasterTypedPartialQuantityBasisR1(passport:Json):boolean{
 return Object.hasOwn(passport?.decision??{},'partialQuantityBasis')
  ||Array.isArray(passport?.capability_matrix)&&passport.capability_matrix.some((c:Json)=>record(c)&&Object.hasOwn(c,'partialQuantityBasis'));
}
/** Shared preparation/publisher validator. Independent errors are accumulated;
 * an invalid container stops only inspection of that container, never its peers. */
export function validateMasterTypedPartialQuantityBasisR1(input:MasterTypedQuantityPayloadR1):string[]{
 const errors:string[]=[],check=(ok:unknown,code:string)=>{if(!ok)errors.push('TYPED_PARTIAL_QUANTITY_'+code);};
 const attempt=(code:string,fn:()=>void)=>{try{fn();}catch(error){errors.push('TYPED_PARTIAL_QUANTITY_'+code+':'+String((error as Error).message));}};
 check(Array.isArray(input.parameters)&&input.parameters.every(record),'PARAMETERS_CONTAINER');
 check(Array.isArray(input.formulas)&&input.formulas.every(record),'FORMULAS_CONTAINER');
 check(Array.isArray(input.resources)&&input.resources.every(record),'RESOURCES_CONTAINER');
 check(record(input.baseline),'BASELINE_CONTAINER');
 if(errors.length)return errors;
 const decision=input.passport?.decision,caps=input.passport?.capability_matrix;
 if(!record(decision)||!Array.isArray(caps))return ['TYPED_PARTIAL_QUANTITY_PASSPORT'];
 const scopeCaps=caps.filter((c:Json)=>c?.capability==='FULL_APPLICABLE_SCOPE');check(scopeCaps.length===1,'CAPABILITY');
 const cap=scopeCaps[0]??{},raw=decision.partialQuantityBasis;
 if(!record(raw))return [...errors,'TYPED_PARTIAL_QUANTITY_OBJECT'];
 const b=raw as MasterTypedPartialQuantityBasisR1,common=['contract','kind','source','method','resourceRowIds'];
 check(uniqueIds(input.parameters.map(p=>p.parameter_id)),'PARAMETER_IDS');
 check(uniqueIds(input.formulas.map(f=>f.formula_id)),'FORMULA_IDS');
 check(uniqueIds(input.resources.map(r=>r.row_id)),'MODEL_RESOURCE_IDS');
 const isProject=b.kind==='DEFERRED_PROJECT_QUANTITIES',isProfile=b.kind==='VERSIONED_PRELIMINARY_QUANTITY_PROFILE';
 check(b.contract===contract&&exactKeys(b,isProject?[...common,'parameters']:isProfile?[...common,'profileId','sourceSchemaVersion',
  'sourceArtifactUtf8','assumptions','primaryMeasureParameterId','projectQuantities']:[]),'DECLARATION');
 const sourceOk=exactKeys(b.source,['sourceId','sourceKey','artifactSha256','locatorId','locatorExcerptSha256','locatorPayload'])
  &&typeof b.source.sourceId==='string'&&b.source.sourceId.length>0&&typeof b.source.sourceKey==='string'&&b.source.sourceKey.trim().length>0
  &&hash(b.source.artifactSha256)&&typeof b.source.locatorId==='string'&&b.source.locatorId.length>0&&hash(b.source.locatorExcerptSha256)&&record(b.source.locatorPayload);
 check(sourceOk,'SOURCE_DECLARATION');
 const methodOk=exactKeys(b.method,['parameterId','value','version'])&&Object.values(b.method).every(x=>typeof x==='string'&&x.length>0);check(methodOk,'METHOD');
 check(uniqueIds(b.resourceRowIds)&&b.resourceRowIds.every(id=>input.resources.filter(r=>r.row_id===id).length===1),'RESOURCE_IDS');
 check(same(cap.partialQuantityBasis,b),'CAPABILITY_BASIS');
 check(decision.quantityScope==='PARTIAL'&&decision.preliminaryCompositionOnly===true&&cap.preliminaryCompositionOnly===true
  &&decision.technicalScopeStatus===cap.status&&cap.status===(isProject?'NEEDS_PROJECT_QUANTITIES':'PRELIMINARY_PROFILE'),'PARTIAL_DECLARATION');
 check(decision.engineeringAcceptance===false,'ENGINEERING_ACCEPTANCE');
 check(!Object.hasOwn(decision,'unresolvedResourceRowIds')&&!Object.hasOwn(cap,'unresolvedResourceRowIds'),'MISSING_NORM_BRANCH_MIXED');
 check(!input.parameters.some(p=>p.truth_metadata?.value_source_role==='UNRESOLVED_APPLICATION_NORM'),'APPLICATION_NORM_CONFLICT');
 if(methodOk){
  const p=input.parameters.find(p=>p.parameter_id===b.method.parameterId),t=p?.truth_metadata;
  check(p?.value_type==='enum'&&t?.visibility_role==='INTERNAL_ONLY'&&t?.provenance?.consumer_input_role_v1==='APPLICATION_TECHNICAL'
   &&same(p.constraints_json?.values,[b.method.value])&&input.baseline.input_values?.[b.method.parameterId]===b.method.value
   &&input.baseline.input_classification?.[b.method.parameterId]==='RUNTIME_STRUCTURAL_DEFAULT','METHOD_SELECTION');
  check(t?.guide?.guide_version===b.method.version,'METHOD_VERSION');
 }
 const runtime=canonicalApprovedBaselineRuntimeParameters(input.baseline);
 const facts=(proofs:unknown):string[]=>{
  if(!Array.isArray(proofs)||proofs.length>128||!uniqueIds(proofs.map(p=>p?.parameterId))){check(false,'FACT_IDS');return [];}
  for(const proof of proofs as Fact[]){
   const suffix=':'+proof.parameterId,p=input.parameters.find(p=>p.parameter_id===proof.parameterId),t=p?.truth_metadata,g=t?.guide;
   check(exactKeys(proof,factKeys),'FACT_PROOF'+suffix);
   check(p?.default_value===null,'FACT_DEFAULT'+suffix);
   check(p&&t?.visibility_role==='USER_INPUT'&&['PROJECT_SPECIFIC_INPUT','CONDITIONAL_PROJECT_FACT'].includes(t?.value_source_role)
    &&['OBJECT_FACT','ADVANCED_OPTION'].includes(t?.provenance?.consumer_input_role_v1),'FACT_ROLE'+suffix);
   if(p)check(same(fact(input,proof.parameterId),proof),'FACT_SNAPSHOT'+suffix);else check(false,'FACT_MISSING'+suffix);
   check(g?.guide_validation_policy==='MANDATORY_BLOCK'&&['PROJECT_DEFINED','MEASUREMENT_RULE'].includes(g?.guide_kind)
    &&['PROJECT_DOCUMENTATION','USER_SUPPLIED_OBJECT_FACT'].includes(g?.source_role)
    &&typeof g?.source_document==='string'&&g.source_document.length>0&&typeof g?.source_locator==='string'&&g.source_locator.length>0
    &&hash(proof.guideSnapshotSha256)&&typeof proof.guideVersion==='string'&&proof.guideVersion.length>0,'FACT_GUIDE'+suffix);
   check(!Object.hasOwn(runtime,proof.parameterId),'FACT_RUNTIME_DEFAULT'+suffix);
   if(Object.hasOwn(input.baseline.input_values??{},proof.parameterId))check(input.baseline.input_classification?.[proof.parameterId]==='VALIDATION_FIXTURE','FACT_FIXTURE_CLASSIFICATION'+suffix);
   if(sourceOk)check(same(input.baseline.normative_source_ids?.[proof.parameterId],[b.source.sourceKey]),'FACT_SOURCE'+suffix);
  }
  return proofs.map(p=>p.parameterId);
 };
 const dependencies=(ids:readonly string[],declared:unknown,code:string)=>attempt(code,()=>{
  requireThat(uniqueIds(declared)&&idsEqual(masterTypedPartialQuantityDependentRowsR1(input,ids),declared),'EXACT_DEPENDENCIES');
 });
 if(isProject){
  const ids=facts(b.parameters);
  // This branch describes the project's still-unentered quantity facts in the
  // representative scenario. A QA value cannot silently remove one such gap.
  for(const id of ids)check(!Object.hasOwn(input.baseline.input_values??{},id),'DEFERRED_FACT_HAS_QA_VALUE:'+id);
  const deferred=input.parameters.filter(p=>p.truth_metadata?.visibility_role==='USER_INPUT'
   &&['PROJECT_SPECIFIC_INPUT','CONDITIONAL_PROJECT_FACT'].includes(p.truth_metadata?.value_source_role)
   &&!Object.hasOwn(input.baseline.input_values??{},p.parameter_id)).map(p=>p.parameter_id);
  check(idsEqual(deferred,ids),'PROJECT_EXACT_KEYS');
  if(ids.length)dependencies(ids,b.resourceRowIds,'PROJECT_DEPENDENCIES');
 }
 if(isProfile){
  let source:Json|undefined;
  check(typeof b.profileId==='string'&&methodOk&&b.profileId===b.method.value,'PROFILE_VERSION');
  const artifactOk=typeof b.sourceArtifactUtf8==='string'&&Buffer.byteLength(b.sourceArtifactUtf8)<=128*1024;
  check(artifactOk&&sourceOk&&sha(b.sourceArtifactUtf8)===b.source.artifactSha256,'PROFILE_ARTIFACT_HASH');
  if(artifactOk){
   try{const parsed:unknown=JSON.parse(b.sourceArtifactUtf8);if(record(parsed))source=parsed;else check(false,'PROFILE_SOURCE_JSON_OBJECT');}
   catch(error){check(false,'PROFILE_SOURCE_JSON:'+String((error as Error).message));}
  }
  check(source&&typeof b.sourceSchemaVersion==='string'&&source.schemaVersion===b.sourceSchemaVersion&&source.authoredIndependentlyFromDefinitionRows===true
   &&record(source.selectedPreliminaryProfile)&&typeof source.selectedPreliminaryProfile.assumptionPolicy==='string'
   &&source.selectedPreliminaryProfile.assumptionPolicy.length>0,'PROFILE_SOURCE_SCHEMA');
  const locator=sourceOk?b.source.locatorPayload:{};
  const locatorOk=locator.kind==='COMPOSITE_TECHNOLOGY_PROFILE'&&locator.sourcePackSha256===b.source?.artifactSha256
   &&uniqueIds(locator.visibleAssumptions)&&uniqueIds(locator.normativeInputs)
   &&!locator.visibleAssumptions.some((id:string)=>locator.normativeInputs.includes(id));check(locatorOk,'PROFILE_LOCATOR');
  const assumptionsOk=Array.isArray(b.assumptions)&&uniqueIds(b.assumptions.map(p=>p?.parameterId))
   &&uniqueIds(b.assumptions.map(p=>p?.sourceParameterId));check(assumptionsOk,'PROFILE_ASSUMPTION_IDS');
  if(assumptionsOk){
   if(locatorOk)check(idsEqual(b.assumptions.map(p=>p.sourceParameterId),locator.visibleAssumptions),'PROFILE_EXACT_ASSUMPTIONS');
   for(const proof of b.assumptions){
    const suffix=':'+proof.parameterId,p=input.parameters.find(p=>p.parameter_id===proof.parameterId),t=p?.truth_metadata;
    check(exactKeys(proof,[...factKeys,'sourceParameterId','valuePath','value'])&&typeof proof.value==='number'&&Number.isFinite(proof.value),'PROFILE_PROOF'+suffix);
    const path=proof.valuePath,pathOk=Array.isArray(path)&&path.length===2&&path[0]==='selectedPreliminaryProfile'&&typeof path[1]==='string'
     &&!['__proto__','constructor','prototype'].includes(path[1]);check(pathOk,'PROFILE_VALUE_PATH'+suffix);
    if(source&&pathOk)check(same(source.selectedPreliminaryProfile?.[path[1]!],proof.value),'PROFILE_SOURCE_VALUE'+suffix);
    check(p&&t?.visibility_role==='INTERNAL_ONLY'&&t?.value_source_role==='SOURCE_BACKED_PRELIMINARY_PROFILE'
     &&t?.provenance?.consumer_input_role_v1==='APPLICATION_TECHNICAL'&&t?.runtime_profile_classification==='ASSUMPTION','PROFILE_CLASSIFICATION'+suffix);
    check(t?.profile_version===b.profileId&&t?.guide?.source_snapshot_hash===b.source?.artifactSha256
     &&t?.guide?.guide_validation_policy==='PROTECTED_VERSIONED_PROFILE_CONSTANT','PROFILE_GUIDE_VERSION'+suffix);
    if(p)check(same(fact(input,proof.parameterId),Object.fromEntries(factKeys.map(k=>[k,(proof as Json)[k]]))),'PROFILE_SNAPSHOT'+suffix);
    check(p&&(p.default_value===null||same(p.default_value,proof.value))&&same(p.constraints_json?.min,proof.value)&&same(p.constraints_json?.max,proof.value),'PROFILE_PROTECTED_VALUE'+suffix);
    check(same(input.baseline.input_values?.[proof.parameterId],proof.value)&&input.baseline.input_classification?.[proof.parameterId]==='ASSUMPTION','PROFILE_BASELINE_CLASSIFICATION_VALUE'+suffix);
    if(sourceOk)check(same(input.baseline.normative_source_ids?.[proof.parameterId],[b.source.sourceKey]),'PROFILE_BASELINE_SOURCE'+suffix);
   }
  }
  const primary=input.parameters.find(p=>p.parameter_id===b.primaryMeasureParameterId);
  check(primary?.default_value===null&&primary.truth_metadata?.visibility_role==='USER_INPUT'&&primary.truth_metadata?.value_source_role==='CONDITIONAL_PROJECT_FACT'
   &&!Object.hasOwn(runtime,b.primaryMeasureParameterId),'PRIMARY_MEASUREMENT');
  const projectOk=exactKeys(b.projectQuantities,['parameters','resourceRowIds']);check(projectOk,'PROFILE_PROJECT_QUANTITIES');
  if(projectOk){
   const ids=facts(b.projectQuantities.parameters),projects=input.parameters.filter(p=>p.parameter_id!==b.primaryMeasureParameterId
    &&p.truth_metadata?.visibility_role==='USER_INPUT'&&p.truth_metadata?.value_source_role==='CONDITIONAL_PROJECT_FACT').map(p=>p.parameter_id);
   check(idsEqual(projects,ids),'PROFILE_PROJECT_EXACT_KEYS');
   if(ids.length)dependencies(ids,b.projectQuantities.resourceRowIds,'PROFILE_PROJECT_DEPENDENCIES');
   if(ids.length&&assumptionsOk)attempt('PROFILE_DEPENDENCIES',()=>{
    const rows=[...new Set([...masterTypedPartialQuantityDependentRowsR1(input,ids),...masterTypedPartialQuantityDependentRowsR1(input,b.assumptions.map(p=>p.parameterId))])];
    requireThat(uniqueIds(b.resourceRowIds)&&idsEqual(rows,b.resourceRowIds),'EXACT_DEPENDENCIES');
   });
  }
 }
 return [...new Set(errors)];
}
export function canonicalPublisherTypedPartialQuantityScopeIsConsistentR1(input:MasterTypedQuantityPayloadR1):boolean{
 return validateMasterTypedPartialQuantityBasisR1(input).length===0;
}
/** Called only after the existing complete retained REGISTERED reread; no SQL,
 * registry mutation, caller-label admission, or synthetic source is added. */
export function assertMasterTypedPartialQuantityRegistryR1(basis:MasterTypedPartialQuantityBasisR1,snapshot:Readonly<{newSources:readonly Json[];newLocators:readonly Json[]}>):void{
 const s=snapshot.newSources.filter(s=>s.id===basis.source.sourceId&&s.source_key===basis.source.sourceKey);
 const l=snapshot.newLocators.filter(l=>l.id===basis.source.locatorId&&l.source_id===basis.source.sourceId);
 requireThat(s.length===1&&l.length===1&&s[0].artifact_sha256===basis.source.artifactSha256
  &&l[0].excerpt_sha256===basis.source.locatorExcerptSha256&&same(l[0].locator,basis.source.locatorPayload),'REGISTERED_SOURCE_LOCATOR_ARTIFACT');
 if(basis.kind==='VERSIONED_PRELIMINARY_QUANTITY_PROFILE')requireThat(s[0].metadata?.sourceKind==='COMPOSITE_TECHNOLOGY_PROFILE'
  &&s[0].metadata?.universalConsumptionClaimed===false&&s[0].metadata?.universalProductivityClaimed===false,'REGISTERED_PROFILE');
}
