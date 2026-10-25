// Exact historical context admission, separate from calculation and migration permission.
import {roofPreparationMigrationSemanticHashV1 as semantics,type RoofPreparationMigrationModelV1 as Model} from '../../../src/lib/estimate/backendPlatform/canonicalRoofPreparationMigrationV1';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {readRoofStageRestorationV6} from '../../../src/lib/estimate/backendPlatform/canonicalRoofScreed25MigrationV1';
import {createHash} from 'node:crypto';
import {canonicalDefinitionPublicationStableValueR1 as publicationValue} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
type Json=Record<string,any>;
const registration=require('../../../data/estimate-benchmarks/fixtures/master36-roof-retained-history-edge-r1.json')as Json;
const continuation=require('../../../data/estimate-benchmarks/fixtures/roof-retained-history-v14-continuation-r11.json')as Json;
const same=(a:unknown,b:unknown)=>stable(a)===stable(b);
const fail=():never=>{throw Object.assign(new Error('Exact retained roof history context is not admitted.'),{code:'DEFINITION_INTEGRITY_FAILED'});};
const check:(value:unknown)=>asserts value=(value)=>{if(!value)fail();};
const terminalKeys=['roofStandaloneWorkScopeMigrationV1','roofScreed25StandaloneMigrationV1','roofScreed25MigrationV1','roofHangingGuttersMigrationV1','roofLowerLayersMigrationV1','roofMetalTrimMigrationV1','roofScreedMigrationV1','roofValleyMigrationV1','roofPreparationMigrationV1'];
const shape=(m:Model)=>[m.parameters.length,m.formulas.length,m.resources.length];
const unique=(m:Model)=>new Set(m.parameters.map(p=>p.parameter_id)).size===m.parameters.length&&new Set(m.formulas.map(f=>f.formula_id)).size===m.formulas.length&&new Set(m.resources.map(r=>r.row_id)).size===m.resources.length;
export type RoofRuntimeHistoryContextR1={kind:'CURRENT'}|{kind:'VALIDATED_HISTORICAL_ONLY';historicalParentDefinitionId:string;historicalParentCaptureSha256:string;historicalReceiptSha256:string;currentStageReceiptAllowed:false};
/** Native definitions retain their original strict finite functions. Only this
 * one reviewed published edge may classify inherited proofs as historical. */
export function roofRetainedHistoryDispatchR1(definition:Json):'CURRENT'|'REQUIRES_EXACT_PARENT_AND_CHAIN'{
 const meta=definition.source_metadata??{},terminal=terminalKeys.map(k=>meta[k]).find(Boolean),edge=meta.retainedParentBindingSuccessorV1;
 if(definition.id===continuation.current.id)return'REQUIRES_EXACT_PARENT_AND_CHAIN';
 if(definition.id===registration.current.id)return'REQUIRES_EXACT_PARENT_AND_CHAIN';
 const knownLaterParent=(id:unknown)=>id===continuation.parent.id||id===continuation.current.id;
 if(knownLaterParent(edge?.parentDefinitionId)||(Array.isArray(meta.retainedParentBindingLineageV1?.entries)
  &&meta.retainedParentBindingLineageV1.entries.some((entry:Json)=>knownLaterParent(entry?.parentDefinitionId))))fail();
 // An unregistered child of the known parent cannot opt in by retaining marker.
 if(edge?.parentDefinitionId===registration.parent.id)fail();
 if(!terminal||terminal.toDefinitionId===definition.id)return'CURRENT';
 return fail();
}
const publicationHash=(v:unknown):string=>{const encoded=JSON.stringify(publicationValue(v));check(typeof encoded==='string');return createHash('sha256').update(encoded).digest('hex');};
const projectionFieldsR11={
 parameters:['parameter_id','value_type','unit_id','title_ru','required','default_value','constraints_json','truth_metadata'],
 formulas:['formula_id','output_unit_id','expression_source','ast','input_parameter_ids','ast_sha256'],
 resources:['row_id','section','category','title_ru','row_type','unit_id','formula_id','inclusion_ast','resource_graph','semantic_owner','cost_owner_id','procurement_eligible','source_metadata'],
};
const projectR11=(m:Model,kind:keyof typeof projectionFieldsR11):Json[]=>{
 const key=kind==='parameters'?'parameter_id':kind==='formulas'?'formula_id':'row_id';
 return m[kind].map(v=>Object.fromEntries(projectionFieldsR11[kind].map(k=>[k,v[k]??null])))
  .sort((a,b)=>String(a[key]).localeCompare(String(b[key])));
};
const omitR11=(v:Json,keys:readonly string[])=>Object.fromEntries(Object.entries(v).filter(([k])=>!keys.includes(k)));
/** One fixed actual v14 edge. Full runtime projections supplement the unchanged
 * historical semantic codec, which intentionally omits guide/provenance/UI.
 * No publisher import, request declaration, condition evaluator or chain walk. */
export function assertExactRoofRetainedHistoryV14EdgeR11(input:{currentDefinition:Json;currentModel:Model;parentDefinition:Json;parentModel:Model}):void{
 const{currentDefinition:d,currentModel:current,parentDefinition:p,parentModel:parent}=input,r=continuation;
 check(r.contract==='finite-roof-retained-history-v14-continuation/r11'&&r.current.id==='5392622f-64e6-5c92-85e9-6b1417bf4f29'
  &&r.parent.id===registration.current.id&&r.parent.sha256===registration.current.sha256);
 for(const[definition,model,pin]of [[d,current,r.current],[p,parent,r.parent]]as const){
  check(definition.id===pin.id&&definition.definition_sha256===pin.sha256&&definition.definition_version===pin.definitionVersion
   &&definition.catalog_id===r.catalogId&&unique(model)&&same(shape(model),pin.shape));
  for(const kind of ['parameters','formulas','resources']as const)check(publicationHash(projectR11(model,kind))===pin.runtimePins[kind+'Sha256']);
  check(publicationHash(definition.applicability)===pin.applicabilitySha256&&publicationHash(definition.source_metadata)===pin.sourceMetadataSha256);
 }
 check(same(projectionFieldsR11,r.projectionFields)&&same(d.applicability.primaryMeasureSelectionV1,registration.primarySelection));
 check(publicationHash(d.applicability)===publicationHash({...p.applicability,sourceProfileSelectionV1:r.sourceProfileSelectionMetadata}));
 const dm=d.source_metadata,pm=p.source_metadata,lineage=dm.retainedParentBindingLineageV1;
 check(lineage?.contract==='master-retained-binding-lineage/v1'&&Array.isArray(lineage.entries)&&lineage.entries.length===1
  &&publicationHash(lineage.entries[0])===publicationHash(r.exactLineageEntry));
 const edge=lineage.entries[0],authority=edge.successor.truthAuthorityOnlyV1,profile=authority.sourceProfileMetadataOnlyV1,reuse=profile.existingSourceConsumerReuseV1;
 check(edge.sequence===1&&edge.parentDefinitionId===p.id&&edge.parentDefinitionSha256===p.definition_sha256
  &&edge.previousSourceMetadataSha256===publicationHash(pm)&&edge.previousSuccessorSha256===publicationHash(pm.retainedParentBindingSuccessorV1));
 check(publicationHash(dm.retainedParentBindingSuccessorV1)===publicationHash(pm.retainedParentBindingSuccessorV1)
  &&publicationHash(omitR11(dm,['contract','masterSha256','sourceFingerprint','retainedParentBindingLineageV1']))===publicationHash(omitR11(pm,['contract','masterSha256','sourceFingerprint'])));
 check(publicationHash(authority)===publicationHash(r.compactAuthority)&&same([authority.parameterIds.length,profile.inputPresentationOnlyV1.parameterIds.length,reuse.parameterIds.length,reuse.rowIds.length],[22,17,6,16]));
 const ids=[...authority.parameterIds,...profile.inputPresentationOnlyV1.parameterIds,...reuse.parameterIds,profile.selectorParameterId];
 check(new Set(ids).size===46&&same([...ids].sort(),Object.keys(r.truthChanges).sort()));
 const oldP=new Map(parent.parameters.map(q=>[String(q.parameter_id),q])),newP=new Map(current.parameters.map(q=>[String(q.parameter_id),q]));
 const changed:string[]=[];
 for(const q of projectR11(current,'parameters')){
  const old=oldP.get(String(q.parameter_id));check(old);
  check(publicationHash(omitR11(q,['truth_metadata']))===publicationHash(omitR11(Object.fromEntries(projectionFieldsR11.parameters.map(k=>[k,old[k]??null])),['truth_metadata'])));
  if(publicationHash(q.truth_metadata)!==publicationHash(old.truth_metadata)){
   changed.push(String(q.parameter_id));const truth=r.truthChanges[q.parameter_id];check(truth&&publicationHash(old.truth_metadata)===truth.capturedTruthMetadataSha256&&publicationHash(q.truth_metadata)===truth.afterTruthMetadataSha256);
  }
 }
 check(same(changed.sort(),[...ids].sort()));
 const truthMap=(list:readonly string[])=>Object.fromEntries(list.map(id=>{const old=oldP.get(id);check(old);return[id,{capturedTruthMetadata:old.truth_metadata,...r.truthChanges[id]}];}));
 const oldSelector=oldP.get(profile.selectorParameterId),newSelector=newP.get(profile.selectorParameterId);check(oldSelector&&newSelector);
 check(publicationHash(truthMap(authority.parameterIds))===authority.changesSha256&&publicationHash(truthMap(profile.inputPresentationOnlyV1.parameterIds))===profile.inputPresentationOnlyV1.changesSha256
  &&publicationHash(oldSelector.truth_metadata)===profile.capturedSelectorTruthMetadataSha256
  &&publicationHash(newSelector.truth_metadata)===profile.afterSelectorTruthMetadataSha256);
 check(publicationHash(r.reuseTruthChanges)===reuse.truthChangesSha256&&publicationHash(r.resourceChanges)===reuse.resourceChangesSha256&&publicationHash(r.additionsBySha256)===reuse.additionsSha256);
 const oldR=new Map(projectR11(parent,'resources').map(q=>[String(q.row_id),q])),actualChanged:string[]=[];
 for(const row of projectR11(current,'resources')){
  const old=oldR.get(String(row.row_id));check(old);
  check(publicationHash(omitR11(row,['inclusion_ast']))===publicationHash(omitR11(old,['inclusion_ast'])));
  if(publicationHash(row.inclusion_ast)!==publicationHash(old.inclusion_ast)){
   actualChanged.push(String(row.row_id));const change=r.resourceChanges[row.row_id],ast=row.inclusion_ast;
   check(change&&ast.kind==='or'&&ast.operands.length===2&&publicationHash(ast.operands[0])===publicationHash(old.inclusion_ast)
    &&ast.operands[1].kind==='and'&&publicationHash(ast.operands[1])===change.additionSha256
    &&publicationHash(old.inclusion_ast)===change.capturedInclusionSha256&&publicationHash(ast)===change.afterInclusionSha256);
  }
 }
 check(same(actualChanged.sort(),[...reuse.rowIds].sort())&&same(Object.keys(r.locatorGroups).map(id=>r.locatorGroups[id].capturedBoundRowIds.length).sort((a,b)=>a-b),[7,9]));
 check(publicationHash(projectR11(current,'formulas'))===publicationHash(projectR11(parent,'formulas')));
}
export function assertExactRoofRetainedHistoryEdgeR1(input:{currentDefinition:Json;currentModel:Model;parentDefinition:Json;parentModel:Model}):void{
 const{currentDefinition:d,currentModel:current,parentDefinition:p,parentModel:parent}=input,r=registration;
 check(d.id===r.current.id&&d.catalog_id===r.catalogId&&d.definition_sha256===r.current.sha256&&d.definition_version===13&&d.definition_version===r.current.definitionVersion);
 check(p.id===r.parent.id&&p.catalog_id===r.catalogId&&p.definition_sha256===r.parent.sha256&&p.definition_version===12&&p.definition_version===r.parent.definitionVersion);
 check(unique(current)&&unique(parent)&&same(shape(current),r.current.shape)&&same(shape(parent),r.parent.shape));
 // Existing normalizer ignores SQL ids/timestamps/ordinal/row_sha/_binding fields,
 // and uses the SAME fields present in both catalog and worker SELECTs.
 check(semantics(current)===r.current.semanticSha256&&semantics(parent)===r.parent.semanticSha256);
 check(same(d.applicability?.primaryMeasureSelectionV1,r.primarySelection));
 const dm=d.source_metadata??{},pm=p.source_metadata??{};
 check(!Object.hasOwn(dm,'retainedParentBindingContinuationV1')&&!Object.hasOwn(pm,'retainedParentBindingSuccessorV1'));
 check(same(dm.retainedParentBindingSuccessorV1,r.retainedSlot));
 for(const key of ['contract','masterSha256','sourceFingerprint'])check(dm[key]===r.currentLifecycle[key]);
 const lifecycle=new Set(['contract','masterSha256','sourceFingerprint']);
 for(const key of Object.keys(pm))if(!lifecycle.has(key))check(same(dm[key],pm[key]));
 check(same(Object.keys(dm).sort(),[...Object.keys(pm),'retainedParentBindingSuccessorV1'].sort()));
 const terminal=pm[r.historyTerminalProofKey];check(terminal?.toDefinitionId===r.parent.id&&terminal?.toDefinitionSha256===r.parent.sha256);
 // In particular the original seven proof objects keep old from/to IDs/hashes.
 for(const key of terminalKeys)if(pm[key]!=null)check(same(dm[key],pm[key]));
}
/** The callbacks are server-owned SQL readers and the UNCHANGED old fixed-chain
 * validator. They are not request booleans, aliases, or an ancestry walker. */
export async function resolveRoofRetainedHistoryContextR1(input:{currentDefinition:Json;currentModel:Model;
 loadExactParent:(definitionId:string)=>Promise<{definition:Json;model:Model}>;
 validateOriginalFixedChain:(definition:Json,model:Model)=>Promise<{receipt:unknown}|null>;
}):Promise<RoofRuntimeHistoryContextR1>{
 if(roofRetainedHistoryDispatchR1(input.currentDefinition)==='CURRENT')return{kind:'CURRENT'};
 const retained=input.currentDefinition.id===continuation.current.id?await input.loadExactParent(continuation.parent.id):null;
 if(retained)assertExactRoofRetainedHistoryV14EdgeR11({...input,parentDefinition:retained.definition,parentModel:retained.model});
 const parent=await input.loadExactParent(registration.parent.id);
 assertExactRoofRetainedHistoryEdgeR1({currentDefinition:retained?.definition??input.currentDefinition,currentModel:retained?.model??input.currentModel,parentDefinition:parent.definition,parentModel:parent.model});
 const path=await input.validateOriginalFixedChain(parent.definition,parent.model);
 const receipt=readRoofStageRestorationV6(path?.receipt);
 check(receipt!=null&&receipt.definitionId===registration.parent.id&&receipt.definitionSha256===registration.parent.sha256&&receipt.catalogId===registration.catalogId);
 // DO NOT return/stamp the old V6 as a current receipt. This is only audit evidence.
 return{kind:'VALIDATED_HISTORICAL_ONLY',historicalParentDefinitionId:registration.parent.id,
  historicalParentCaptureSha256:registration.parent.capturedParentSha256,historicalReceiptSha256:receipt!.receiptSha256,currentStageReceiptAllowed:false};
}
