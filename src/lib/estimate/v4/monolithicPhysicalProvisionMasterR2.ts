import {createRequire} from 'node:module';
import {monolithicPhysicalProvisionPackR2 as pack,buildMonolithicPhysicalPartR2,physicalR2AggregateMirror,physicalR2HashRow,PHYSICAL_R2_PREFIX,PHYSICAL_R2_MODE,PHYSICAL_R2_LEGACY,PHYSICAL_R2_APPROVED,PHYSICAL_R2_KNOWN,physicalR2Id,physicalR2Row} from './monolithicPhysicalProvisionR2';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreResult as Result,type CanonicalEstimateCompileCoreInput as CoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import independentMap from '../../../../data/estimate-benchmarks/fixtures/monolithic-physical-independent-operation-map-r2.json';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {compareFormulaGraphDecimals,compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {resolvePrimaryMeasureSelectionV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {resolveCanonicalEstimateProfileInputsS2723} from '../backendPlatform/canonicalEstimateProfileInputResolverS2723';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
type J=Record<string,any>;
// Deliberately untyped raw JSON boundary: no62MB literal TypeScript import.
const load=createRequire(__filename),fixture=load('../../../../data/estimate-benchmarks/fixtures/monolithic-physical-current-parents-r2.json') as {captures:J[]};
const clone=<T,>(x:T):T=>structuredClone(x),check=(v:unknown,c:string):void=>{if(!v)throw Error('MONOLITHIC_PHYSICAL_R2_'+c);};
const and=(...operands:J[]):J=>({kind:'and',operands});
export function monolithicPhysicalCaptureR2(catalogId:string){const c=fixture.captures.find(c=>c.definition.catalog_id===catalogId);check(c,'CAPTURE_TARGET');const t=pack.targets.find(t=>t.catalogId===catalogId)!;check(c!.definition.id===t.definitionId&&c!.definition.definition_sha256===t.definitionSha256&&c!.baseline.id===t.baselineId,'EXACT_CAPTURE_ANCHOR');return clone(c!);}
export function monolithicPhysicalRepresentativeR2(catalogId:string):Rep{const c=monolithicPhysicalCaptureR2(catalogId),ids=new Map(c.resources.map((r:J)=>[r.id,r.row_id]));return{definition:c.definition,baseline:c.baseline,passport:c.contentPassport,parameters:c.parameters,formulas:c.formulas,resources:c.resources,bindings:c.bindings.map((b:J)=>({row_id:ids.get(b.resource_spec_id),locator_id:b.locator_id,applicability:b.applicability}))};}
export const monolithicPreparedModelFingerprintR2=(m:Rep)=>hash([m.definition,m.baseline,m.passport,m.parameters,m.formulas,m.resources,m.bindings]);
export type MonolithicPreparedModelApprovalR2={contract:'root-approved-structural-then-physical/r2';originalDefinitionId:string;originalDefinitionSha256:string;approvedPreparedModelFingerprint:string};
const payment=(r:J)=>Object.fromEntries(['id','row_id','unit_id','formula_id','category','row_type','cost_owner_id','semantic_owner','procurement_eligible','source_metadata'].map(k=>[k,r[k]]).concat([['costTreatment',r.resource_graph?.costTreatment]]));
export function monolithicPhysicalScopeR2(model:Rep):J{const m=model.definition.applicability?.primaryMeasureSelectionV1;if(m?.selections?.length)return{kind:'or',operands:m.selections.map((s:J)=>and({kind:'equals',parameterId:m.selectorParameterId,value:s.selectorValue},{kind:'greater_than',parameterId:s.primaryMeasureParameterId,value:0}))};const id=model.definition.applicability?.primaryMeasureParameterId??'slab_concrete_volume_m3';check(model.parameters.some(p=>p.parameter_id===id),'EXACT_PRIMARY_SCOPE_PARAMETER');return{kind:'greater_than',parameterId:id,value:0};}
/** ROOT calls structural factory first. This is the same ORIGINAL DBparent,
 * not a virtual post-structural lineage or a second writer. The approved model
 * fingerprint is mandatory and covers every additional structural declaration.
 * This overlay may only append physical declarations and gate aggregate steel. */
export function applyMonolithicPhysicalToPreparedModelR2(prepared:Rep,approval:MonolithicPreparedModelApprovalR2,baseIndependentCompletenessMap?:J):Rep{
 const original=monolithicPhysicalRepresentativeR2(prepared.definition.catalog_id),c=monolithicPhysicalCaptureR2(prepared.definition.catalog_id);
 check(prepared.definition.id===c.definition.id&&prepared.definition.definition_version===c.definition.definition_version,'ORIGINAL_DB_PARENT_NOT_VIRTUAL_PARENT');
 check(approval.contract==='root-approved-structural-then-physical/r2'&&approval.originalDefinitionId===c.definition.id&&approval.originalDefinitionSha256===c.definition.definition_sha256&&approval.approvedPreparedModelFingerprint===monolithicPreparedModelFingerprintR2(prepared),'APPROVED_PREPARED_MODEL_ANCHOR');
 for(const f of original.formulas)check(hash(prepared.formulas.find(x=>x.formula_id===f.formula_id))===hash(f),'ORIGINAL_FORMULA_DRIFT');
 for(const r of original.resources)check(hash(payment(prepared.resources.find(x=>x.row_id===r.row_id)!))===hash(payment(r)),'ORIGINAL_BOUND_PAYMENT_OR_SOURCE_DRIFT');
 check(!prepared.resources.some(r=>r.row_id.startsWith(PHYSICAL_R2_PREFIX+':'))&&!prepared.parameters.some(p=>p.parameter_id===PHYSICAL_R2_MODE),'OVERLAY_ALREADY_PRESENT');
 const frozen=clone(prepared),next=clone(prepared),part=buildMonolithicPhysicalPartR2(prepared),scope=monolithicPhysicalScopeR2(prepared),oldIds=new Set(prepared.parameters.map(p=>p.parameter_id));
 for(const q of part.parameters){check(!oldIds.has(q.parameter_id),'NEW_PARAMETER_NAMESPACE');next.parameters.push({...clone(q),ordinal:next.parameters.length,...(q.parameter_id===PHYSICAL_R2_MODE?{}:{constraints_json:{...q.constraints_json,...((q.constraints_json as J).requiredWhen?{requiredWhen:and(scope,(q.constraints_json as J).requiredWhen as J)}:{})},truth_metadata:{...q.truth_metadata,visible_when:and(scope,{kind:'selected',parameterId:PHYSICAL_R2_MODE,value:PHYSICAL_R2_APPROVED},...(q.truth_metadata.visible_when?[q.truth_metadata.visible_when as J]:[]))}})} as any);}
 for(const f of part.formulas){check(!next.formulas.some(q=>q.formula_id===f.formula_id),'FORMULA_NAMESPACE');next.formulas.push(clone(f) as any);}
 for(const r of part.resources){check(!next.resources.some(q=>q.row_id===r.row_id),'ROW_NAMESPACE');next.resources.push(physicalR2HashRow({...clone(r),ordinal:next.resources.length,inclusion_ast:and(scope,r.inclusion_ast)}) as any);}
 for(const plan of part.aggregatePlans){const r=next.resources.find(x=>x.row_id===plan.old.row_id)!;r.inclusion_ast=and(clone(plan.old.inclusion_ast),{kind:'not',operand:plan.when});r.row_sha256=physicalR2HashRow(r).row_sha256;next.resources.push(physicalR2HashRow({...physicalR2AggregateMirror(plan),ordinal:next.resources.length,inclusion_ast:and(scope,plan.when)}) as any);check(hash(payment(r))===hash(payment(plan.old)),'AGGREGATE_PAYMENT_DECLARATION_MUST_REMAIN_EXACT');}
 const consumers=buildMasterParameterCalculationConsumers(next);
 for(const q of next.parameters){const id=q.parameter_id;if(oldIds.has(id)&&q.truth_metadata?.retiredAggregateKitParameter===true&&q.truth_metadata?.visibility_role==='INTERNAL_ONLY'&&(consumers.formulaConsumers[id]?.length??0)===0&&(consumers.resourceConsumers[id]?.length??0)===0)continue;q.truth_metadata={...q.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};next.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];next.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];if(!oldIds.has(id)){next.baseline.uom_by_parameter[id]=q.unit_id;next.baseline.guide_provenance_ru[id]=q.truth_metadata.guide?.guide_short_ru??q.title_ru;next.baseline.normative_source_ids[id]=q.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?[]:[pack.sourceId];}}
 next.definition.applicability={...next.definition.applicability,monolithicPhysicalProvisionR2:{contract:pack.contract,originalDefinitionId:c.definition.id,preparedModelFingerprint:approval.approvedPreparedModelFingerprint,knownWholeSubprocesses:['PREPARE_EXACT_DEEP_DEVICE','PREPARE_EXACT_FIVE_PART_CONTROL_KIT','FULL_BBS_HOMOGENEOUS_SUPPLY_BALANCE'],noUniversalPostCounts:true,noLegacyQuantityOrPriceCarryForward:true,noNewPaidLaborOrMachineHours:true,newFullTechnologies:0},fullTechnicalAcceptance:false,newFullTechnologies:0};
 next.passport.decision={...next.passport.decision,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',completeTechnicalEstimateAccepted:false,newFullTechnologies:0,physicalProvisionSubprocessesHaveIndependentReadiness:true,independentCompletenessMap:mergeMonolithicPhysicalCompletenessR2(mergeMonolithicPhysicalCompletenessR2(original.passport.decision?.independentCompletenessMap??null,baseIndependentCompletenessMap??prepared.passport.decision?.independentCompletenessMap??null),monolithicPhysicalCompletenessR2(next))};
 next.passport.capability_matrix=[...(next.passport.capability_matrix??[]).filter((x:J)=>x.capability!=='FULL_APPLICABLE_SCOPE'),{capability:'FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',newFullTechnologies:0,physicalProvisionSubprocessesHaveIndependentReadiness:true}];
 // Every structural addition, source literal, input and formula survives. Only
 // the explicitly reviewed aggregate inclusion gate may differ on old rows.
 for(const f of frozen.formulas)check(hash(next.formulas.find(q=>q.formula_id===f.formula_id))===hash(f),'PREPARED_FORMULA_DRIFT');
 for(const r of frozen.resources)check(hash(payment(next.resources.find(q=>q.row_id===r.row_id)!))===hash(payment(r)),'PREPARED_PAYMENT_DRIFT');
 check(JSON.stringify(next.definition.applicability.primaryMeasureSelectionV1)===JSON.stringify(frozen.definition.applicability.primaryMeasureSelectionV1),'PRIMARY_SELECTION_DRIFT');
 return next;
}
export function buildMonolithicPhysicalStandaloneR2(catalogId:string){const old=monolithicPhysicalRepresentativeR2(catalogId);return applyMonolithicPhysicalToPreparedModelR2(old,{contract:'root-approved-structural-then-physical/r2',originalDefinitionId:old.definition.id,originalDefinitionSha256:old.definition.definition_sha256,approvedPreparedModelFingerprint:monolithicPreparedModelFingerprintR2(old)});}

export const MONOLITHIC_DEEP_REUSE_NEED_R3='master212:concrete-cycle:r1:need:vibrator-working-kit';
export const MONOLITHIC_DEEP_REUSE_CONTROL_R3='monolithic-physical:r3:deep-working-kit-check';
const deepReuseKeysR3=['device','converter','protection','head','hose','cable'] as const;
export const monolithicDeepEffectiveParameterR3=(key:typeof deepReuseKeysR3[number])=>'mono_deep_reuse_r3_effective_'+key;
export type MonolithicDeepReuseApprovalR3={contract:'root-approved-existing-deep-assembly-reuse/r3';
 parentDefinitionId:string;parentDefinitionSha256:string;preparedModelFingerprint:string;
 /** ROOT-reviewed physical needs in the exact captured consumer; never client input. */
 consumerNeedRowIds?:readonly string[]};

/** Reuse the six existing R2 resources in a compatible current consumer. This
 * adds no equipment norm, paid resource, purchasing owner or calculation path.
 * Effective quantities keep manual edits and exclusions in the same core check.
 * A missing programme remains a need owned by the application source channel. */
export function applyMonolithicExistingDeepAssemblyReuseR3(prepared:Rep,approval:MonolithicDeepReuseApprovalR3):Rep{
 check(approval.contract==='root-approved-existing-deep-assembly-reuse/r3'
  &&approval.parentDefinitionId===prepared.definition.id
  &&approval.parentDefinitionSha256===prepared.definition.definition_sha256
  &&approval.preparedModelFingerprint===monolithicPreparedModelFingerprintR2(prepared),'DEEP_REUSE_APPROVED_CURRENT_PARENT');
 const declared=approval.consumerNeedRowIds??[MONOLITHIC_DEEP_REUSE_NEED_R3];
 check(declared.length>0&&declared.length<=32&&new Set(declared).size===declared.length,'DEEP_REUSE_CONSUMER_DECLARATION');
 const oldNeeds=declared.map(id=>prepared.resources.find(r=>r.row_id===id));
 if(!approval.consumerNeedRowIds&&!oldNeeds[0])return clone(prepared);
 check(oldNeeds.every(r=>r&&['set','piece'].includes(r.unit_id)
  &&r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM'
  &&(!approval.consumerNeedRowIds||r.source_metadata?.source_artifact_sha256===pack.kgSource.sha256)
  &&r.resource_graph?.operationCompositionV1?.contractVersion==='canonical-operation-resource/v1'),
  'DEEP_REUSE_EXACT_ORIGINAL_NEED');
 const needs=oldNeeds as NonNullable<typeof oldNeeds[number]>[],oldNeed=needs[0]!;
 if(!approval.consumerNeedRowIds)check(oldNeed.unit_id==='set'
  &&oldNeed.resource_graph.operationCompositionV1.operationId==='master212:concrete-cycle:r1:operation:compacting','DEEP_REUSE_EXACT_ORIGINAL_NEED');
 check(!prepared.resources.some(r=>r.row_id===MONOLITHIC_DEEP_REUSE_CONTROL_R3),'DEEP_REUSE_ALREADY_PRESENT');
 const next=clone(prepared),count=physicalR2Id('deep_count'),fit=physicalR2Id('deep_fit');
 // A related operation belongs to the same work instance as its owner. Join
 // the retained consumer groups to the existing physical group; keep every
 // logical operation/resource ID and source/payment identity unchanged.
 const groups=new Set(needs.map(n=>n.resource_graph.operationCompositionV1.groupId));
 const groupTitle='Монолитная конструкция: работы и физическое обеспечение';
 const related=(o:J)=>Object.fromEntries(['operationId','operationTitleRu','completionCriterionRu','processOrdinal','processRole','whenResourcePresent']
  .filter(key=>o[key]!==undefined).map(key=>[key,clone(o[key])]));
 const joined=(o:J):J=>({...clone(o),groupId:PHYSICAL_R2_PREFIX,groupTitleRu:groupTitle,
  ...(o.additionalOperations?{additionalOperations:o.additionalOperations.map(related)}:{})});
 for(const r of next.resources){const op=r.resource_graph?.operationCompositionV1;
  if(op&&groups.has(op.groupId)){r.resource_graph={...r.resource_graph,operationCompositionV1:joined(op)};r.row_sha256=physicalR2HashRow(r).row_sha256;}}
 const countDefinition=next.parameters.find(p=>p.parameter_id===count);
 check(countDefinition?.value_type==='integer'&&countDefinition.constraints_json?.min===1,'DEEP_REUSE_POSITIVE_DOCUMENTED_COUNT');
 const selectedExact={kind:'and',operands:[{kind:'selected',parameterId:PHYSICAL_R2_MODE,value:PHYSICAL_R2_APPROVED},
  {kind:'selected',parameterId:physicalR2Id('deep_state'),value:'Принят глубинный узел 45 мм, 220–240 В, шланг 5 м, кабель 15 м'}]};
 const consumerScope=needs.length===1?clone(oldNeed.inclusion_ast):{kind:'or',operands:needs.map(n=>clone(n.inclusion_ast))};
 const active={kind:'and',operands:[consumerScope,selectedExact]};
 const operations=[...new Map(needs.map(n=>[n.resource_graph.operationCompositionV1.operationId,joined(n.resource_graph.operationCompositionV1)])).values()];
 if(operations.length>1)for(const op of operations){
  const markers=prepared.resources.filter(r=>r.category==='equipment'&&r.unit_id==='machine_hour'
   &&r.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM'
   &&r.resource_graph?.operationCompositionV1?.operationId===op.operationId).map(r=>r.row_id);
  check(markers.length>0&&markers.length<=64,'DEEP_REUSE_EXACT_CONSUMER_OPERATION_MARKERS');
  op.whenResourcePresent=markers;
 }
 const partIds=deepReuseKeysR3.map(key=>physicalR2Row('deep:'+key));
 const facts=[physicalR2Id('deep_state'),physicalR2Id('deep_ref'),fit,count,
  physicalR2Id('deep_voltage_v'),physicalR2Id('deep_frequency_hz')];
 check(facts.every(id=>next.parameters.some(p=>p.parameter_id===id)),'DEEP_REUSE_EXISTING_PROGRAMME_FACTS');
 for(const key of deepReuseKeysR3){
  const row=next.resources.find(r=>r.row_id===physicalR2Row('deep:'+key));
  check(row?.unit_id==='piece'&&row.resource_graph?.costTreatment==='INFORMATIONAL_SCOPE'
   &&row.procurement_eligible===false
   &&row.source_metadata?.exactInternalProductIdentity==='WACKER_NEUSON_IRFU45_230_5_NON_GV'
   &&row.source_metadata?.source_artifact_sha256===pack.sourceArtifacts[0]!.sha256
   &&!row.resource_graph.effectiveQuantityOutputV1,'DEEP_REUSE_EXISTING_EXACT_COMPONENT');
  const formula=next.formulas.find(f=>f.formula_id===row!.formula_id);
  check(formula?.expression_source===count&&formula.output_unit_id==='piece','DEEP_REUSE_UNCHANGED_COMPONENT_FORMULA');
  const id=monolithicDeepEffectiveParameterR3(key);
  check(!next.parameters.some(p=>p.parameter_id===id),'DEEP_REUSE_PARAMETER_NAMESPACE');
  next.parameters.push({...clone(countDefinition!),parameter_id:id,ordinal:next.parameters.length,
   title_ru:'Фактическое количество: '+row!.title_ru,value_type:'decimal',required:false,default_value:null,
   constraints_json:{min:0},truth_metadata:{contract:'monolithic-existing-deep-assembly-reuse/r3',
    semantic_parameter_key:prepared.definition.catalog_id+':'+id,visibility_role:'INTERNAL_ONLY',
    value_source_role:'COMPILER_DERIVED_RESOURCE_QUANTITY',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
    effective_resource_quantity_v1:{sourceRowId:row!.row_id,unitId:'piece'},hidden_default_forbidden:true,
    guide:{...clone(countDefinition!.truth_metadata.guide),guide_kind:'DERIVED_VALUE_RULE',
     source_role:'COMPILER_DERIVED_RESOURCE_QUANTITY',guide_short_ru:'Штатный расчёт по сохранённому количеству исходного ресурса.'}}});
  row!.resource_graph={...row!.resource_graph,effectiveQuantityOutputV1:{parameterId:id,unitId:'piece'},
   operationCompositionV1:{...row!.resource_graph.operationCompositionV1,
    additionalOperations:[...new Map([...(row!.resource_graph.operationCompositionV1?.additionalOperations??[]),...operations.map(related)]
     .map(o=>[o.operationId,o])).values()]}};
  row!.row_sha256=physicalR2HashRow(row!).row_sha256;
 }
 for(const id of facts){const q=next.parameters.find(p=>p.parameter_id===id)!;
  const role=id===physicalR2Id('deep_state')?'SOURCE_BACKED_PRELIMINARY_PROFILE'
   :id===physicalR2Id('deep_voltage_v')||id===physicalR2Id('deep_frequency_hz')?'SELECTED_EQUIPMENT_PASSPORT':'PROJECT_DOCUMENTATION';
  q.truth_metadata={...q.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:role,
   provenance:{...q.truth_metadata.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'}};
 }
 const expression=deepReuseKeysR3.map(key=>{const e=monolithicDeepEffectiveParameterR3(key);return`max(0,${e}-${count})+max(0,${count}-${e})`;}).join('+');
 const graph=compileFormulaGraph(expression),formulaId=MONOLITHIC_DEEP_REUSE_CONTROL_R3+':formula';
 next.formulas.push({formula_id:formulaId,output_unit_id:'piece',expression_source:expression,
  ast:graph.ast,input_parameter_ids:graph.inputParameterIds,ast_sha256:hash(graph.ast)});
 const covered={kind:'and',operands:[selectedExact,...facts.map(parameterId=>({kind:'present',parameterId})),
  {kind:'not',operand:{kind:'formula_greater_than',expression,unitId:'piece',value:0}}]};
 for(const original of needs){const need=next.resources.find(r=>r.row_id===original.row_id)!;
  need.inclusion_ast={kind:'and',operands:[clone(original.inclusion_ast),{kind:'not',operand:covered}]};
  need.row_sha256=physicalR2HashRow(need).row_sha256;}
 next.resources.push(physicalR2HashRow({id:'resource-'+MONOLITHIC_DEEP_REUSE_CONTROL_R3.replaceAll(':','-'),
  row_id:MONOLITHIC_DEEP_REUSE_CONTROL_R3,ordinal:next.resources.length,section:oldNeed.section,category:'control',row_type:'control',
  title_ru:'Полнота комплекта глубинного уплотнения',unit_id:'piece',formula_id:formulaId,
  inclusion_ast:{kind:'and',operands:[active,{kind:'not',operand:covered}]},
  cost_owner_id:MONOLITHIC_DEEP_REUSE_CONTROL_R3,semantic_owner:MONOLITHIC_DEEP_REUSE_CONTROL_R3,procurement_eligible:false,
  resource_graph:{costTreatment:'INFORMATIONAL_SCOPE',inputParameterIds:facts,excludeKnownZeroQuantityV1:true,
   operationCompositionV1:operations.length>1
    ?{...clone(next.resources.find(r=>r.row_id===physicalR2Row('deep:device'))!.resource_graph.operationCompositionV1),
      additionalOperations:operations.map(related)}
    :clone(operations[0]),
   formulaOutputBoundsV1:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'piece',minimum:0,maximum:0,
    reasonRu:'Каждая штатная часть должна соответствовать принятому числу полных рабочих устройств; исключение и ручная правка не подтверждают полный комплект.'},
   scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',
    groupId:PHYSICAL_R2_PREFIX,groupTitleRu:'Обеспечение глубинного уплотнения',titleRu:'Полный рабочий комплект глубинного вибратора',
    reasonRu:'Применяется существующий полный узел по подтверждённой программе и питанию.',exactScopeWhen:active,
    sourceEvidence:[{sha256:pack.sourceArtifacts[0]!.sha256,locator:'Exact IRFU45/230/5 nonGV complete device; existing R2 six-part assembly'}],
    coveringRowIds:partIds,originalRowIds:needs.map(n=>n.row_id),objectFactParameterId:fit,unknownObjectValues:[],
    objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:facts}},
  source_metadata:{sourceRole:'EXISTING_EXACT_COMPLETE_DEVICE_REUSE_CONTROL',source_artifact_sha256:pack.sourceArtifacts[0]!.sha256,
   reusedResourceRowIds:partIds,replacesSelectedNeedId:oldNeed.row_id,replacesSelectedNeedIds:needs.map(n=>n.row_id),noNewPaidOrPurchaseOwner:true,
   completeCompactingOperationClaimed:false,full_technical_acceptance:false}}));
 const consumers=buildMasterParameterCalculationConsumers(next);
 for(const q of next.parameters){const id=q.parameter_id;
  if(q.truth_metadata?.retiredAggregateKitParameter===true&&(consumers.formulaConsumers[id]?.length??0)===0&&(consumers.resourceConsumers[id]?.length??0)===0)continue;
  q.truth_metadata={...q.truth_metadata,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  next.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];next.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
  if(!prepared.parameters.some(p=>p.parameter_id===id)){next.baseline.uom_by_parameter[id]=q.unit_id;next.baseline.normative_source_ids[id]=[];
   next.baseline.guide_provenance_ru[id]=q.truth_metadata.guide.guide_short_ru;}
 }
 next.definition.applicability={...next.definition.applicability,existingDeepAssemblyReuseR3:{contract:'monolithic-existing-deep-assembly-reuse/r3',
  originalNeedId:oldNeed.row_id,originalNeedIds:needs.map(n=>n.row_id),existingResourceRowIds:partIds,approval:clone(approval),newPaidOwners:0,newProcurementOwners:0,wholeCompactingOperationAccepted:false}};
 for(const f of prepared.formulas)check(hash(next.formulas.find(q=>q.formula_id===f.formula_id))===hash(f),'DEEP_REUSE_ORIGINAL_FORMULA_DRIFT');
 for(const r of prepared.resources)check(hash(payment(next.resources.find(q=>q.row_id===r.row_id)!))===hash(payment(r)),'DEEP_REUSE_ORIGINAL_PAYMENT_OR_SOURCE_DRIFT');
 return next;
}
/** Merge independently authored source maps without re-deriving any expected
 * row/formula/operation from the built resources. Conflicting identities fail. */
export function mergeMonolithicPhysicalCompletenessR2(base:J|null|undefined,physical:J|null|undefined):J{if(!base)return clone(physical??{entries:[]});if(!physical)return clone(base);check(Array.isArray(base.entries)&&Array.isArray(physical.entries),'INDEPENDENT_SOURCE_MAP_ENTRIES');const entries=new Map<string,J>();for(const e of [...base.entries,...physical.entries]){const id=String(e.expectedResourceId);check(id.length>0,'INDEPENDENT_EXPECTED_ID');const previous=entries.get(id);check(previous==null||hash(previous)===hash(e),'INDEPENDENT_EXPECTATION_COLLISION');if(!previous)entries.set(id,clone(e));}return{...clone(base),...clone(physical),generatedFromCurrentRows:false,operationResourceBindingRequired:true,entries:[...entries.values()],evidenceReferences:[...new Set([...(base.evidenceReferences??[]),...(physical.evidenceReferences??[])])],independentCategories:[...new Map([...(base.independentCategories??base.categoryKeys??[]),...(physical.independentCategories??physical.categoryKeys??[])].map(x=>[JSON.stringify(x),x])).values()],sourceCategoryClosureRecords:{base:clone(base.categoryCoverage??base.operationCategoryMatrix??base.sourceCategoryClosureRecords??null),physical:clone(physical.categoryCoverage??physical.operationCategoryMatrix??null)},sourceEvidencePins:[base.evidenceSha256,physical.evidenceSha256].filter(Boolean),fullTechnicalAcceptance:false,newFullTechnologies:0};}
export function monolithicPhysicalCompletenessR2(model:Rep){const ids=new Set(model.parameters.map(p=>p.parameter_id));const physical=independentMap.entries.filter(e=>!('catalogId'in e)||(e.catalogId===model.definition.catalog_id&&ids.has(e.requiredSteelMassParameterId!))).map(e=>{const{catalogId:_catalog,requiredSteelMassParameterId:_mass,...entry}=e as J;return entry;});return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:pack.kgSource.sha256,evidenceReferences:[pack.parentFixture,...pack.sourceArtifacts.map(s=>s.path),'data/estimate-benchmarks/fixtures/monolithic-physical-independent-operation-map-r2.json'],independentCategories:pack.categoryKeys,entries:physical,fullTechnicalAcceptance:false,newFullTechnologies:0,internalNeedsNotInferredResolvedFromCounts:true};}
function compilePhysicalModelR2(model:Rep,input:Record<string,unknown>,primary:string,rowOverrides:Record<string,Record<string,unknown>>={},compositionSelectionV1?:CoreInput['compositionSelectionV1'],confirmedParameters:Record<string,unknown>={}){
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:model.definition.catalog_id,primaryMeasureParameterId:primary,parameterDefinitions:model.parameters as any,formulaDefinitions:model.formulas as any,resourceDefinitions:model.resources as any,submittedParameters:input,confirmedParameters,
  ...(model.definition.applicability.sourceProfileSelectionV1===undefined?{}:{sourceProfileSelectionV1:{metadata:model.definition.applicability.sourceProfileSelectionV1,effectiveUserParameters:input}}),
  priceItems:[],rowOverrides,compositionSelectionV1,currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:hash});
}
export async function compileMonolithicPhysicalR2(model:Rep,input:Record<string,unknown>,rowOverrides:Record<string,Record<string,unknown>>={},compositionSelectionV1?:CoreInput['compositionSelectionV1'],confirmedParameters:Record<string,unknown>={}){
 const parameterSchema=model.parameters.map(p=>({parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:p.truth_metadata.visibility_role,
  valueSourceRole:p.truth_metadata.value_source_role,provenance:p.truth_metadata.provenance,defaultValue:p.default_value,
  constraints:p.constraints_json,formulaConsumers:p.truth_metadata.formula_consumers}));
 if(model.definition.applicability.sourceProfileSelectionV1!==undefined){
  const profile=resolveCanonicalEstimateProfileInputsS2723({catalogId:model.definition.catalog_id,confirmedParameters,effectiveUserParameters:input,
   sourceProfileSelectionMetadata:model.definition.applicability.sourceProfileSelectionV1,parameterSchema});
  confirmedParameters={...profile.confirmedParameters};
 }
 const selection=model.definition.applicability.primaryMeasureSelectionV1;
 const selector=model.parameters.find(p=>p.parameter_id===selection?.selectorParameterId);
 // Old public selectors retain their captured baseline chooser. Source-owned
 // selectors keep the raw user bag separate from authenticated application facts.
 const selectionInput=selector?.truth_metadata.visibility_role==='USER_INPUT'?{...confirmedParameters,...input}:input;
 const chosen=selection?resolvePrimaryMeasureSelectionV1({selectionMetadata:selection,submittedParameters:selectionInput,confirmedParameters,parameterSchema}):null;
 check(!chosen||chosen.kind==='RESOLVED','PRIMARY_MEASURE_NOT_RESOLVED');
 return compilePhysicalModelR2(model,input,chosen?.kind==='RESOLVED'?chosen.primaryMeasure.parameterId:model.definition.applicability.primaryMeasureParameterId??'slab_concrete_volume_m3',rowOverrides,compositionSelectionV1,confirmedParameters);
}
/** Source verification only: replay the literal captured baseline, whose old
 * optional stair selector can be absent. No caller inputs/overrides are accepted.
 * New calculations retain the strict generic selection contract above. */
export function replayMonolithicPhysicalCapturedBaselineR2(model:Rep){
 const c=monolithicPhysicalCaptureR2(model.definition.catalog_id);
 check(model.definition.id===c.definition.id&&model.definition.definition_sha256===c.definition.definition_sha256&&model.baseline.id===c.baseline.id&&hash(model.baseline.input_values)===hash(c.baseline.input_values),'EXACT_CAPTURED_BASELINE_REPLAY_ONLY');
 const input=clone(c.baseline.input_values);if(model.parameters.some(p=>p.parameter_id===PHYSICAL_R2_MODE))input[PHYSICAL_R2_MODE]=PHYSICAL_R2_LEGACY;
 return compilePhysicalModelR2(model,input,c.definition.applicability.primaryMeasureParameterId??'slab_concrete_volume_m3');
}
/** Readiness uses the SAME canonical compiler results. It is not a calculator,
 * normative authority, declaration of whole-family FULL or a second pipeline. */
export function monolithicPhysicalSubprocessReadinessR2(result:Result,model:Rep,expectedModelFingerprint:string){check(expectedModelFingerprint===monolithicPreparedModelFingerprintR2(model),'READINESS_EXACT_MODEL_FINGERPRINT');const p=result.parameters as J,definitions=new Map(model.resources.map(r=>[r.row_id,r]));const scopeOn=p[PHYSICAL_R2_MODE]===PHYSICAL_R2_APPROVED&&resolveInclusionGraph(monolithicPhysicalScopeR2(model),p).value===true;const active=(r:J)=>{const d=definitions.get(r.row_id);return scopeOn&&d!=null&&resolveInclusionGraph(d.inclusion_ast,p).value===true&&resolveInclusionGraph(d.inclusion_ast,p).missingParameterIds.length===0&&!r.calculation_trace?.physicalScopeExcludedV1;};const activeRows=result.rows.filter(active),rows=new Map(activeRows.map(r=>[r.row_id,r])),needs=result.preliminaryNeeds.filter(n=>scopeOn&&definitions.has(n.row_id)&&resolveInclusionGraph(definitions.get(n.row_id)!.inclusion_ast,p).value!==false);const has=(key:string)=>rows.has(physicalR2Row(key)),missing=(prefix:string)=>needs.some(n=>n.row_id.startsWith(physicalR2Row(prefix))),physical=new Map<string,{kind:string;ready:boolean}>(pack.groups.map(g=>[g.key,{kind:'UNKNOWN_PROJECT_LEDGER',ready:false}]));
 for(const g of pack.groups){if(!scopeOn||p[physicalR2Id(g.key+'_state')]!==PHYSICAL_R2_KNOWN)continue;const roles=pack.physicalRoles.filter(r=>r.group===g.key),known=roles.every(r=>{const n=physicalR2Id(g.key+'_'+r.key);return p[n+'_qty']!=null&&p[n+'_available']!=null&&p[n+'_spec']&&compareFormulaGraphDecimals(String(p[n+'_available']),String(p[n+'_qty']))>=0;})&&Boolean(p[physicalR2Id(g.key+'_ref')])&&!missing('physical:'+g.key+':');physical.set(g.key,{kind:known?'DOCUMENTED_PHYSICAL_COMPONENT_LEDGER_READY':'DOCUMENTED_LEDGER_WITH_SHORTAGE_OR_MISSING_FACTS',ready:known});}
 const deepReady=scopeOn&&['device','converter','protection','head','hose','cable'].every(k=>has('deep:'+k))&&!missing('deep:');const qaReady=scopeOn&&pack.controlKit.countsPerSet.every(x=>has('qa:'+x.key))&&!missing('qa:')&&['shortage','reserve-deficit'].every(k=>{const r=rows.get(physicalR2Row('qa:'+k));return !r||compareFormulaGraphDecimals(String(r.quantity),'0')===0;});
 const bbs=pack.steelAggregateOwners.map(a=>{const prefix='bbs:'+a.shortKey+':',scopeRows=activeRows.filter(r=>r.row_id.startsWith(physicalR2Row(prefix))),supplies=scopeRows.filter(r=>r.row_id.endsWith(':supply'));return{sourceRowId:a.rowId,kind:'FULL_BBS_HOMOGENEOUS_SUPPLY',ready:scopeOn&&scopeRows.some(r=>r.row_id.endsWith(':installed'))&&scopeRows.filter(r=>r.row_id.endsWith(':gross')).length===Number(p[physicalR2Id('bbs_'+a.shortKey+'_cohort_count')])&&!missing(prefix)&&scopeRows.some(r=>r.row_id===physicalR2Row(prefix+'mass-check:'+String(p[physicalR2Id('bbs_'+a.shortKey+'_cohort_count')]))&&(r.calculation_trace as J)?.formulaOutputBounds?.status==='PASSED')&&!scopeRows.some(r=>(r.row_id.endsWith(':shortage')||r.row_id.endsWith(':reserve-deficit'))&&compareFormulaGraphDecimals(String(r.quantity),'0')>0),newOwnerRowIds:supplies.map(r=>r.row_id)};});
 return{deepDevicePreparation:{kind:'COMPLETE_EXACT_DEVICE_PREPARATION',ready:deepReady,boundary:'Declared complete device with actual PPR/model/power fit; no whole-post productivity or surface substitution'},controlKitPreparation:{kind:'COMPLETE_FIVE_PART_KIT_PREPARATION',ready:qaReady,boundary:'Hardware preparation; sampling/test acceptance/frequency/lab services remain separate'},bbsSupply:bbs,documentedPhysicalLedgers:Object.fromEntries(physical),wholeFamilyFull:false};}
