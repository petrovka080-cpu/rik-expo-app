import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {isAbsolute,resolve} from 'node:path';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {appendOptionalAutomaticOwnerR1} from '../../../src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {facadeVentilatedSteelDefinitionR5 as steelDefinition,facadeVentilatedSteelCapturedParentR5 as originalParent,
  facadeVentilatedSteelCompletenessR5 as steelCompleteness,facadeVentilatedSteelPrimarySelectionR5 as steelPrimary,
  facadeVentilatedSteelSelectorR5 as selector,facadeVentilatedSteelChoiceR5 as steelChoice,
  facadeVentilatedSteelCatalogR5 as catalogId} from '../../../src/lib/estimate/v4/facadeVentilatedSteelExistingOwnerR5';
import {facadeSteelSidingPackR2 as steel} from '../../../src/lib/estimate/v4/facadeSteelSidingKrer15R2';
import {facadePorcelainDefinitionR59 as porcelainDefinition,facadePorcelainCompletenessR59 as porcelainCompleteness,
  facadePorcelainChoiceR59 as porcelainChoice,facadePorcelainPrimaryR59 as porcelainArea,
  facadePorcelainGeometryR59 as porcelainGeometry,facadePorcelainProfileR59 as porcelain} from '../../../src/lib/estimate/v4/facadePorcelainWholeR59';
import {facadeNvfSteelPorcelainDefinitionR221 as independentDefinition,
  facadeNvfSteelPorcelainCompletenessR221 as independentCompleteness,
  facadeNvfSteelPorcelainPrimarySelectionR221 as independentPrimary} from '../../../src/lib/estimate/v4/facadeNvfSteelPorcelainOneOwnerR221';
import {facadeVentilatedSteelRetainedOptionsR5,facadeVentilatedSteelMasterConfigR5} from './prepareFacadeVentilatedSteelExistingOwnerR5';
import {facadeVentilatedPorcelainMasterConfigR214} from './prepareFacadeVentilatedPorcelainExistingOwnerR214';
import {verifyFacadeNvfSteelPorcelainFiniteR221} from './verifyFacadeNvfSteelPorcelainOneOwnerR221';
import {masterRetainedParentCaptureSha256R1,masterRetainParentBindingsOptInR1,
  prepareMasterRetainedBindingRepresentativeR1,validateMasterRetainedBindingAppendV1,type MasterRetainParentBindingsR1,
  type MasterRetainedParentCaptureR1,type MasterRetainedBindingGuardInputR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {buildMasterPublicationResourceRowsR1,hashMasterSingleDefinitionSuccessorReceiptR1 as valueSha,
  resolveMasterExistingNormativeRegistryReuseR1,resolveMasterSingleDefinitionBindingRowIds,
  resolveMasterSingleDefinitionBindingApplicabilityByRowId,resolveMasterSingleDefinitionLocatorExcerptSha256R1,
  validateIndependentCompletenessMapReferences,resolveMasterRetainedBaselineInputClassificationR1,type MasterExistingNormativeRegistryReuseR1,
  type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';

const contract='gox.facade.existing-nvf.porcelain-after-actual-steel/r226';
const steelContract='gox.facade.ventilated.steel-existing-owner/r5';
const ownPath='scripts/estimate/r4a13/prepareFacadeNvfPorcelainAfterActualSteelR226.ts';
const firstSubjectPins=[
  {
    "logicalPath": "src/lib/estimate/v4/facadeVentilatedSteelExistingOwnerR5.ts",
    "sha256": "f3ddb09bfab8683994f0f8b2a83e1e5f3e61bab410035fe4daf038d42f70213c"
  },
  {
    "logicalPath": "scripts/estimate/r4a13/prepareFacadeVentilatedSteelExistingOwnerR5.ts",
    "sha256": "f41a642e694b44b138bed1d2425b91a53cce5152932e231c458c76ae748e0533"
  },
  {
    "logicalPath": "src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts",
    "sha256": "e8462dd8ac1cd520f24eacc421d40beeaffd3e1554e869704c2e966c61431439"
  },
  {
    "logicalPath": "scripts/estimate/r4a13/facadeVentilatedSteelExistingConsumerR5.test.ts",
    "sha256": "7817769fcf1b5fd50d77402ff1e6f4b12abb0677fba4f9c38e9d72389bad9691"
  },
  {
    "logicalPath": "src/lib/estimate/v4/facadeSteelSidingWholeR59.ts",
    "sha256": "e0fef1c03367194c8e15fd4191bfb92264e597c1557b37671fd94351e03b965a"
  },
  {
    "logicalPath": "data/estimate-benchmarks/source-packs/facade-steel-siding-current-whole-r59.json",
    "sha256": "18d1e8a9b2c40096a521c82b948e1462c84708e2eeb0c79f4451bb84701cc1ef"
  },
  {
    "logicalPath": "data/estimate-benchmarks/fixtures/facade-steel-siding-whole-independent-r59.json",
    "sha256": "7e3215eb865c67405934a0615954deff13b32b127e8ac9949654bf17100b7aa2"
  },
  {
    "logicalPath": "data/estimate-benchmarks/fixtures/facade-ventilated-current-v6-parent-source-r5.json",
    "sha256": "6906232983df646806484a2d131b8c546ff2dd7739140e3d9ccc7000ae8b5652"
  },
  {
    "logicalPath": "data/estimate-benchmarks/fixtures/facade-steel-siding-current-identity-readback-r5-57.json",
    "sha256": "922293ce786a9527d84ab0220e039d1313183bed7765ef2e51f2a700bd9d9e4c"
  }
];
const selectedSourcePaths=[
  "data/estimate-benchmarks/fixtures/facade-nvf-steel-porcelain-independent-r221.json",
  "data/estimate-benchmarks/fixtures/facade-porcelain-existing-owner-independent-r214.json",
  "data/estimate-benchmarks/fixtures/facade-porcelain-whole-independent-r59.json",
  "data/estimate-benchmarks/fixtures/facade-steel-siding-current-identity-readback-r5-57.json",
  "data/estimate-benchmarks/fixtures/facade-steel-siding-whole-independent-r59.json",
  "data/estimate-benchmarks/fixtures/facade-ventilated-current-v6-parent-source-r5.json",
  "data/estimate-benchmarks/source-packs/facade-porcelain-current-whole-r59.json",
  "data/estimate-benchmarks/source-packs/facade-steel-siding-current-whole-r59.json",
  "data/estimate-benchmarks/source-packs/facade-steel-siding-operation-provision-r2.json",
  "scripts/estimate/r4a13/facadeNvfSequentialSparseBaselineR226.fixtures.ts",
  "scripts/estimate/r4a13/facadeNvfSequentialSparseBaselineR226.test.ts",
  "scripts/estimate/r4a13/facadeNvfSteelPorcelainOneOwnerR221.test.ts",
  "scripts/estimate/r4a13/facadeVentilatedPorcelainExistingOwnerR214.test.ts",
  "scripts/estimate/r4a13/facadeVentilatedSteelExistingConsumerR5.test.ts",
  "scripts/estimate/r4a13/masterExactVentilatedApprovedSparseBaselineR62.ts",
  "scripts/estimate/r4a13/masterMonolithicRepairGeometryVisibilityOnlyR60.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts",
  "scripts/estimate/r4a13/prepareFacadeNvfPorcelainAfterActualSteelR226.ts",
  "scripts/estimate/r4a13/prepareFacadeNvfSteelPorcelainOneOwnerR221.ts",
  "scripts/estimate/r4a13/prepareFacadeVentilatedPorcelainExistingOwnerR214.ts",
  "scripts/estimate/r4a13/prepareFacadeVentilatedSteelExistingOwnerR5.ts",
  "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts",
  "scripts/estimate/r4a13/verifyFacadeNvfSteelPorcelainOneOwnerR221.ts",
  "src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts",
  "src/lib/estimate/v4/facadeNvfSteelPorcelainOneOwnerR221.ts",
  "src/lib/estimate/v4/facadePorcelainWholeR59.ts",
  "src/lib/estimate/v4/facadeSteelSidingWholeR59.ts",
  "src/lib/estimate/v4/facadeVentilatedPorcelainExistingOwnerR214.ts",
  "src/lib/estimate/v4/facadeVentilatedSteelExistingOwnerR5.ts"
];
const sourceHashPattern=/^[0-9a-f]{64}$/u;
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const same=(left:unknown,right:unknown)=>assert.deepEqual(stable(left),stable(right));
const fileSha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
function hold(code:string,detail:unknown):never{throw Object.assign(new Error(code),{code,detail,coreCalls:0,publisherCalls:0,databaseDml:0});}
function list(value:unknown):asserts value is Record<string,unknown>[]{assert(Array.isArray(value)&&value.every(record));}
function strings(value:unknown):string[]{assert(Array.isArray(value)&&value.every(item=>typeof item==='string'));return[...value];}
function text(value:unknown):string{assert(typeof value==='string'&&value.length>0);return value;}
function omit(row:Readonly<Record<string,unknown>>,fields:readonly string[]){return Object.fromEntries(Object.entries(row).filter(([key])=>!fields.includes(key)));}
function sorted(rows:readonly Readonly<Record<string,unknown>>[],key:string){return[...rows].sort((a,b)=>text(a[key]).localeCompare(text(b[key]),'en'));}
function rowsSame(a:readonly Readonly<Record<string,unknown>>[],b:readonly Readonly<Record<string,unknown>>[],key:string){same(sorted(a,key),sorted(b,key));}
function uuid(seed:string){const bytes=Buffer.from(valueSha(seed).slice(0,32),'hex');bytes[6]=(bytes[6]!&15)|80;bytes[8]=(bytes[8]!&63)|128;
  const h=bytes.toString('hex');return`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}

export type ActualPinnedJsonR226=Readonly<{path:string;sha256:string}>;
type ActualCapture=Readonly<{definition:MasterRetainedParentCaptureR1['definition'];baseline:MasterRetainedParentCaptureR1['baseline'];
  parameters:AutomaticOwnerDefinition['parameters'];formulas:AutomaticOwnerDefinition['formulas'];resources:AutomaticOwnerDefinition['resources'];
  bindings:MasterRetainedParentCaptureR1['bindings'];normativeSources:MasterRetainedParentCaptureR1['normativeSources'];
  normativeLocators:MasterRetainedParentCaptureR1['normativeLocators']}>;
type ParentPacket=Readonly<{readOnly:true;databaseWrites:0;sameRawFullRowsReadTwice:true;
  currentParents:readonly Readonly<{catalogId:string;capture:ActualCapture;contentPassport:Readonly<Record<string,unknown>>;
    approvedSourceDefinition:MasterRetainedParentCaptureR1['definition']}>[]}>;
export type FacadeNvfActualSteelStageR226=Readonly<{
  /** Real committed publisher receipt. A dry-run, old finite result or a predicted ID is not an input. */
  steelReceipt:ActualPinnedJsonR226;
  /** The existing full-parent capture format, produced AFTER the committed steel step by actual two reads. */
  steelParentCapture:ActualPinnedJsonR226;
  /** Existing full retained-reader output, querying the PORCELAIN source key against that same parent/release. */
  porcelainSourceReadset:ActualPinnedJsonR226;
  /** Unchanged existing reader's completed query-NNN.json: SQL, values and rawRows, not a declared source-key label. */
  porcelainSourceQuery:ActualPinnedJsonR226;
  porcelainLocatorQuery:ActualPinnedJsonR226;
  /** The actual local prepared pointer written by that first publisher, never a fabricated next-release pointer. */
  releasePointer:ActualPinnedJsonR226;
  /** Only if the readset actually contains this existing primary source. The shared resolver admits it. */
  porcelainRegistryReuse?:MasterExistingNormativeRegistryReuseR1;
}>;
export type FacadeNvfPorcelainSecondContextR226=Readonly<{actual:FacadeNvfActualSteelStageR226;sourceRoot:string;outputRoot?:string;
  onEntry?:(count:number,phase:string)=>void;onCoreCall?:(count:number,phase:string)=>void;onOutcome?:(phase:string,result:unknown)=>void}>;

function pinned(input:ActualPinnedJsonR226):unknown{
  assert(isAbsolute(input.path)&&sourceHashPattern.test(input.sha256),'ACTUAL_ABSOLUTE_PIN_REQUIRED');
  assert(statSync(input.path).size<=4*1024*1024,'ACTUAL_JSON_4MIB_LIMIT');
  assert.equal(fileSha(input.path),input.sha256,'ACTUAL_BYTES_CHANGED');
  const value:unknown=JSON.parse(readFileSync(input.path,'utf8'));return value;
}
function actualQuery(input:ActualPinnedJsonR226,expectedSql:string,expectedValues:unknown){
  const q=pinned(input);assert(record(q));assert(q.phase==='NORMAL'||q.phase==='LOCKED_REREAD');
  const sql=text(q.sql);assert.equal(sql.replace(/\s+/gu,' ').trim(),expectedSql);
  same(q.values,expectedValues);assert.equal(q.sqlSha256,valueSha(sql));assert.equal(q.valuesSha256,valueSha(q.values));
  list(q.rawRows);assert.equal(q.rows,q.rawRows.length);assert(q.rawRows.length<=1,'EXACT_PRIMARY_ONE_SOURCE_ONE_LOCATOR_SCOPE');
  assert.equal(q.rowsSha256,valueSha(q.rawRows));
  return q.rawRows.map(row=>{const parsed:unknown=JSON.parse(text(row.raw));assert(record(parsed));return parsed;});
}
function assertReceipt(value:unknown):asserts value is Record<string,unknown>{
  assert(record(value));assert.equal(value.schemaVersion,steelContract+'.receipt.v1');
  const {receiptSha256,...body}=value;assert.equal(receiptSha256,valueSha(body),'ACTUAL_RECEIPT_BODY_SHA');
  assert.equal(value.status,'GREEN_FACADE_VENTILATED_STEEL_R5_PREPARED_NOT_ACTIVE');
  assert.equal(value.mutationPerformed,true,'REAL_FIRST_WRITE_REQUIRED');assert.equal(value.idempotent,false);
  for(const key of['productionAccessed','deployPerformed','activationPerformed','releasePerformed','otaPerformed'])assert.equal(value[key],false,key);
  assert(record(value.source)&&sourceHashPattern.test(text(value.source.fingerprint)));list(value.source.sourceHashes);
  assert(record(value.predecessor)&&record(value.successor)&&record(value.audit)&&record(value.coreAcceptance));
  assert.equal(value.predecessor.catalogId,catalogId);assert.equal(value.predecessor.definitionId,originalParent().capture.definition.id);
  same(value.predecessor.shape,[52,76,76]);assert.notEqual(value.successor.definitionId,value.predecessor.definitionId);
  same(value.successor.shape,[117,140,140]);
  for(const key of['releaseId','searchReleaseId','definitionId','baselineId'])assert(uuidPattern.test(text(value.successor[key])));
  assert(Number.isInteger(value.successor.definitionVersion)&&Number(value.successor.definitionVersion)>6);
  assert.equal(value.coreAcceptance.status,'FINITE_EXISTING_NVF_CURRENT_STEEL_COMPOSITION_NOT_PUBLICATION');
  for(const[key,count]of Object.entries({logicalEntries:13,coreCalls:9,canonicalResults:8,expectedRejects:5,preCoreRejects:4,coreRejects:1}))
    assert.equal(value.coreAcceptance[key],count,key);
  assert(record(value.audit.target));assert.equal(value.audit.target.catalog_id,catalogId);
  assert.equal(value.audit.target.definition_version_id,value.successor.definitionId);
  same([value.audit.target.parameters,value.audit.target.formulas,value.audit.target.resources],[117,140,140]);
}
/** Checks source-owned data against the accepted first-stage model and the
 * existing publisher's explicit persisted projections. DB IDs/times are read,
 * not predicted. Their references are checked by the unchanged shared guard. */
function assertPacket(value:unknown,receipt:Record<string,unknown>,firstConfig:Config):asserts value is ParentPacket{
  assert(record(value));assert.equal(value.readOnly,true);assert.equal(value.databaseWrites,0);assert.equal(value.sameRawFullRowsReadTwice,true);
  list(value.currentParents);assert.equal(value.currentParents.length,1);const parent=value.currentParents[0]!;
  assert.equal(parent.catalogId,catalogId);assert(record(parent.capture)&&record(parent.contentPassport)&&record(parent.approvedSourceDefinition));
  const c=parent.capture;assert(record(c.definition)&&record(c.baseline));assert(record(receipt.successor));
  const s=receipt.successor;
  assert.equal(c.definition.id,s.definitionId);assert.equal(c.definition.release_id,s.releaseId);assert.equal(c.definition.catalog_id,catalogId);
  assert.equal(c.definition.definition_version,s.definitionVersion);assert(sourceHashPattern.test(text(c.definition.definition_sha256)));
  assert.equal(c.baseline.id,s.baselineId);assert.equal(c.baseline.definition_version_id,s.definitionId);assert.equal(c.baseline.catalog_id,catalogId);
  assert.equal(c.baseline.accepted_release_id,s.releaseId);assert(record(c.definition.source_metadata));
  list(c.parameters);list(c.formulas);list(c.resources);list(c.bindings);list(c.normativeSources);list(c.normativeLocators);
  same([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length],[117,140,140,47]);
  const model=steelDefinition(),original=originalParent().capture,oldFormulas=new Set(original.formulas.map(f=>f.formula_id));
  const expectedParameters=model.parameters.map(p=>({parameter_id:p.parameter_id,ordinal:p.ordinal,value_type:p.value_type,unit_id:p.unit_id,
    title_ru:p.title_ru,required:p.required,default_value:null,constraints_json:p.constraints_json,
    truth_metadata:{...p.truth_metadata,contract:steelContract,semantic_parameter_key:catalogId+':'+p.parameter_id}}));
  rowsSame(c.parameters.map(p=>{assert.equal(p.definition_version_id,s.definitionId);assert.equal(p.approved_template_baseline_id,s.baselineId);
    return omit(p,['definition_version_id','approved_template_baseline_id']);}),expectedParameters,'parameter_id');
  const expectedFormulas=model.formulas.map(f=>({formula_id:f.formula_id,output_unit_id:f.output_unit_id,expression_source:f.expression_source,
    ast:f.ast,input_parameter_ids:f.input_parameter_ids,ast_sha256:oldFormulas.has(f.formula_id)?f.ast_sha256:valueSha(f.ast)}));
  rowsSame(c.formulas.map(f=>{assert.equal(f.definition_version_id,s.definitionId);return omit(f,['definition_version_id']);}),expectedFormulas,'formula_id');
  const publishedResources=buildMasterPublicationResourceRowsR1(model.resources);
  const fullFormulaRows=model.formulas.map(f=>({...f,ast_sha256:oldFormulas.has(f.formula_id)?f.ast_sha256:valueSha(f.ast)})),
    parameterSchemaSha256=valueSha(model.parameters.map(p=>({...p}))),definitionSchemaSha256=valueSha({formulaRows:fullFormulaRows,resourceRows:publishedResources});
  assert.equal(c.baseline.parameter_schema_sha256,parameterSchemaSha256);
  assert.equal(c.definition.definition_sha256,valueSha({contract:steelContract,catalogId,parameterSchemaSha256,definitionSchemaSha256}));
  same(c.baseline.input_values,{...firstConfig.acceptanceInput,...firstConfig.runtimeProfileInput});
  same(c.baseline.input_classification,Object.fromEntries(model.parameters.map(p=>[p.parameter_id,
    resolveMasterRetainedBaselineInputClassificationR1(p.parameter_id,firstConfig.runtimeProfileClassification??{},firstConfig.binding.retainParentBindings)])));
  const firstRetained=firstConfig.binding.retainParentBindings;assert(firstRetained);
  same(c.baseline.normative_source_ids,{...original.baseline.normative_source_ids,...Object.fromEntries(
    Object.entries(firstRetained.newParameterSources).map(([id,spec])=>[id,spec.sourceIds]))});
  rowsSame(c.resources.map(r=>{assert.equal(r.definition_version_id,s.definitionId);assert(uuidPattern.test(text(r.id)));
    assert(sourceHashPattern.test(text(r.row_sha256)));assert(typeof r.created_at==='string');
    const expected=publishedResources.find(row=>row.row_id===r.row_id);assert(expected);
    assert.equal(r.row_sha256,valueSha({contract:steelContract,targetCatalogId:catalogId,resource:expected}));
    const oldResource:unknown=original.resources.find(row=>row.row_id===r.row_id);let expectedSemanticOwner:unknown=catalogId+':'+r.row_id;
    if(oldResource){assert(record(oldResource));expectedSemanticOwner=oldResource.semantic_owner;}
    assert.equal(r.semantic_owner,expectedSemanticOwner);
    return omit(r,['id','definition_version_id','semantic_owner','row_sha256','created_at']);}),
    publishedResources.map(row=>omit(row,['id','row_sha256','semantic_owner','definition_version_id','created_at'])),'row_id');
  for(const old of original.normativeSources)same(c.normativeSources.find(row=>row.id===old.id),old);
  for(const old of original.normativeLocators)same(c.normativeLocators.find(row=>row.id===old.id),old);
  const newSources=c.normativeSources.filter(row=>!original.normativeSources.some(old=>old.id===row.id));assert.equal(newSources.length,1);
  const registeredSteel=newSources[0]!;assert.equal(registeredSteel.source_key,steel.sourceId);assert.equal(registeredSteel.artifact_sha256,steel.source.sha256);
  const sm=firstConfig.sourceMetadata;same(omit(registeredSteel,['id','created_at']),{source_key:steel.sourceId,title_ru:sm.source_title,authority:sm.source_authority,
    official_url:sm.official_url??null,artifact_sha256:sm.artifact_sha256??null,effective_from:sm.effective_from??null,effective_to:null,
    metadata:{contract:steelContract,sourceKind:sm.source_kind??'PROJECT_DOCUMENTATION_REQUIRED',useRestriction:sm.use_restriction,
      universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}});
  const newLocators=c.normativeLocators.filter(row=>!original.normativeLocators.some(old=>old.id===row.id));assert.equal(newLocators.length,1);
  assert.equal(newLocators[0]!.source_id,registeredSteel.id);
  same(omit(newLocators[0]!,['id']),{source_id:registeredSteel.id,locator_key:firstConfig.locator.key,locator:firstConfig.locator.payload,
    excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(firstConfig)});
  const sourceByResource=new Map(c.resources.map(row=>[row.id,row.row_id]));
  const oldRowByResource=new Map(original.resources.map(row=>[row.id,row.row_id]));
  for(const old of original.bindings)assert(c.bindings.some(b=>sourceByResource.get(b.resource_spec_id)===oldRowByResource.get(old.resource_spec_id)
    &&b.locator_id===old.locator_id&&valueSha(b.applicability)===valueSha(old.applicability)));
  const childRows=new Set(model.resources.filter(row=>!original.resources.some(old=>old.row_id===row.row_id)
    &&row.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM').map(row=>row.row_id));assert.equal(childRows.size,43);
  const newBindings=c.bindings.filter(b=>b.locator_id===newLocators[0]!.id);assert.equal(newBindings.length,43);
  assert(newBindings.every(b=>b.definition_version_id===s.definitionId&&childRows.has(text(sourceByResource.get(b.resource_spec_id)))));
  assert.equal(new Set(newBindings.map(b=>b.resource_spec_id)).size,43);
  const firstApplicability=resolveMasterSingleDefinitionBindingApplicabilityByRowId(firstConfig,publishedResources,[text(newLocators[0]!.id)]);
  for(const b of newBindings)same(b.applicability,firstApplicability[text(sourceByResource.get(b.resource_spec_id))]);
  const decision=parent.contentPassport.decision;assert(record(decision));same(decision.independentCompletenessMap,steelCompleteness());
  assert(record(c.definition.applicability));same(c.definition.applicability.primaryMeasureSelectionV1,steelPrimary());
  same(parent.approvedSourceDefinition,originalParent().approvedSourceDefinition);
}
function logicalDefinition(model:AutomaticOwnerDefinition){return{
  parameters:sorted(model.parameters.map(p=>({...omit(p,['definition_version_id','approved_template_baseline_id']),
    truth_metadata:omit(p.truth_metadata,['contract','semantic_parameter_key'])})),
    'parameter_id'),
  formulas:sorted(model.formulas.map(f=>omit(f,['definition_version_id','ast_sha256'])),'formula_id'),
  resources:sorted(model.resources.map(r=>omit(r,['id','row_sha256','definition_version_id','semantic_owner','row_type','created_at'])),'row_id')};}

function disjoint(oldIds:readonly string[],newIds:readonly string[],label:string){
  const ids=new Set(oldIds);if(newIds.some(id=>ids.has(id)))hold('EXISTING_NVF_STAGE2_IDENTIFIER_COLLISION',label);
}

function appendPorcelain(actual:ActualCapture):AutomaticOwnerDefinition{
  const child=porcelainDefinition(),condition={kind:'equals' as const,parameterId:selector,value:porcelainChoice};
  disjoint(actual.parameters.map(p=>p.parameter_id),child.parameters.map(p=>p.parameter_id),'parameter_id');
  disjoint(actual.formulas.map(f=>f.formula_id),child.formulas.map(f=>f.formula_id),'formula_id');
  disjoint(actual.resources.map(r=>r.row_id),child.resources.map(r=>r.row_id),'row_id');
  const parameters=[...actual.parameters].sort((a,b)=>a.ordinal-b.ordinal).map(p=>{if(p.parameter_id!==selector)return p;
    assert(record(p.constraints_json));same(p.constraints_json.values,steelPrimary().selections.map(s=>s.selectorValue));assert(record(p.truth_metadata.guide));
    return{...p,constraints_json:{...p.constraints_json,values:[...steelPrimary().selections.map(s=>s.selectorValue),porcelainChoice]},
      truth_metadata:{...p.truth_metadata,guide:{...p.truth_metadata.guide,source_profile_references_v1:[
        {selectorValue:steelChoice,sourceKey:steel.sourceId,sourceSha256:steel.source.sha256,exactMethod:steel.normId},
        {selectorValue:porcelainChoice,sourceKey:porcelain.sourceId,exactMethod:'ST_KG_V_T_PORCELAIN10_SOURCE_METHOD'}]}}};});
  const parent:AutomaticOwnerDefinition={parameters,formulas:actual.formulas,resources:actual.resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
    ordinaryParameterIds:parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id)};
  const scoped={...child,parameters:child.parameters.map(p=>porcelainGeometry.some(id=>id===p.parameter_id)
    ?{...p,truth_metadata:{...p.truth_metadata,visible_when:condition}}:p)};
  const joined=appendOptionalAutomaticOwnerR1({parent,child:scoped,when:condition}),consumers=buildMasterParameterCalculationConsumers(joined);
  return{...joined,ordinaryParameterIds:[...parent.ordinaryParameterIds,...porcelainGeometry],parameters:joined.parameters.map(p=>({...p,
    truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}

/** SOURCE_ONLY constructor. No publisher/SQL call exists here. It cannot be
 * called with v6 or with a predicted successor: all four actual pinned inputs
 * are mandatory. The unchanged R70 admission is deliberately run before the
 * constructor returns; its real sparse-baseline refusal is not bypassed. */
export function facadeNvfPorcelainAfterActualSteelMasterConfigR226(context:FacadeNvfPorcelainSecondContextR226):Config{
  assert(isAbsolute(context.sourceRoot));assert.equal(resolve(context.sourceRoot),resolve(__dirname,'../../..'),'ONE_ACTUAL_SOURCE_ROOT_REQUIRED');
  const own=(path:string)=>resolve(context.sourceRoot,path);
  const receipt=pinned(context.actual.steelReceipt);assertReceipt(receipt);assert(record(receipt.successor)&&record(receipt.predecessor));const next=receipt.successor;
  const firstConfig=facadeVentilatedSteelMasterConfigR5({releaseId:text(receipt.predecessor.releaseId),searchReleaseId:text(receipt.predecessor.searchReleaseId),
    sourceRoot:context.sourceRoot});
  assert(record(receipt.source));list(receipt.source.sourceHashes);
  assert.equal(receipt.source.branch,firstConfig.expectedBranch);
  for(const pin of firstSubjectPins)assert(receipt.source.sourceHashes.some(row=>row.path===pin.logicalPath&&row.sha256===pin.sha256),
    'FIRST_STEEL_SUBJECT_BYTES_MUST_MATCH_ITS_REAL_RECEIPT:'+pin.logicalPath);
  const packet=pinned(context.actual.steelParentCapture);assertPacket(packet,receipt,firstConfig);const parent=packet.currentParents[0]!,capture=parent.capture;
  const pointer=pinned(context.actual.releasePointer);assert(record(pointer));assert.equal(pointer.productionAccessed,false);
  assert.equal(pointer.definitionReleaseId,next.releaseId);assert.equal(pointer.searchReleaseId,next.searchReleaseId);
  assert.equal(pointer.definitionReleaseStatus,'prepared');assert.equal(pointer.searchReleaseStatus,'draft');
  assert(record(receipt.audit)&&record(receipt.audit.manifest)&&record(receipt.audit.search));
  assert.equal(pointer.definitionSnapshotSha256,receipt.audit.manifest.snapshot);assert.equal(pointer.manifestHashChainSha256,receipt.audit.manifest.snapshot);
  assert.equal(pointer.searchHashChainSha256,receipt.audit.search.snapshot_sha256);
  const baselineConfig=facadeVentilatedPorcelainMasterConfigR214({releaseId:text(next.releaseId),searchReleaseId:text(next.searchReleaseId),
    sourceRoot:context.sourceRoot,outputRoot:context.outputRoot});
  const readset=pinned(context.actual.porcelainSourceReadset);assert(record(readset)&&record(readset.capture));
  same(readset.capture,capture);list(readset.membership);assert.equal(readset.membership.length,1);const member=readset.membership[0]!;
  assert.equal(member.release_id,next.releaseId);assert.equal(member.catalog_id,catalogId);assert.equal(member.definition_version_id,next.definitionId);
  assert.equal(member.approved_template_baseline_id,next.baselineId);assert.equal(member.definition_hash,capture.definition.definition_sha256);
  list(readset.newSources);list(readset.newLocators);const reuse=context.actual.porcelainRegistryReuse;
  if(readset.newSources.length===0){assert.equal(readset.newLocators.length,0);assert.equal(reuse,undefined);}
  else{if(readset.newSources.length!==1||!reuse)hold('EXISTING_NVF_PORCELAIN_REGISTRY_REUSE_REVIEW_REQUIRED',readset.newSources);
    assert.equal(reuse.source.source_key,porcelain.sourceId);same(reuse.source,readset.newSources[0]);rowsSame(reuse.locators,readset.newLocators,'id');}
  const actualPrimarySourceId=reuse?text(reuse.source.id):uuid(contract+':'+porcelain.sourceId+':source');
  const actualPrimaryLocatorIds=reuse?reuse.locators.map(row=>text(row.id)):
    [uuid(contract+':'+porcelain.sourceId+':'+baselineConfig.locator.key+':locator')];
  assert.equal(actualPrimaryLocatorIds.length,1);
  const querySources=actualQuery(context.actual.porcelainSourceQuery,
    'select row_to_json(t)::text raw from (select * from public.estimate_normative_source where id=$1 or source_key=$2 limit 2)t',
    [actualPrimarySourceId,porcelain.sourceId]);rowsSame(querySources,readset.newSources,'id');
  const queryLocators=actualQuery(context.actual.porcelainLocatorQuery,reuse?
    'select row_to_json(t)::text raw from (select * from public.estimate_normative_locator where id=any($1::uuid[]) or (source_id=$2 and locator_key=any($3::text[])) limit 2)t':
    'select row_to_json(t)::text raw from (select * from public.estimate_normative_locator where id=any($1::uuid[]) or source_id=$2 limit 2)t',
    [actualPrimaryLocatorIds,actualPrimarySourceId,...(reuse?[reuse.locators.map(row=>text(row.locator_key))]:[])]);
  rowsSame(queryLocators,readset.newLocators,'id');
  const model=appendPorcelain(capture),independent=independentDefinition();same(logicalDefinition(model),logicalDefinition(independent));
  same([...model.ordinaryParameterIds].sort(),[...independent.ordinaryParameterIds].sort());same([model.parameters.length,model.formulas.length,model.resources.length],[197,260,260]);
  assert(record(parent.contentPassport.decision));const oldMap=parent.contentPassport.decision.independentCompletenessMap;assert(record(oldMap));list(oldMap.entries);
  const childMap=porcelainCompleteness(),map={...oldMap,entries:[...oldMap.entries,...childMap.entries],componentMaps:[oldMap,childMap],
    generatedFromCurrentRows:false,fullTechnicalAcceptance:false,newFULL:0};same(map,independentCompleteness());assert.equal(map.entries.length,204);
  same(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
  assert(record(receipt.source));list(receipt.source.sourceHashes);
  const firstSubjectSourcePath='scripts/estimate/r4a13/prepareFacadeVentilatedSteelExistingOwnerR5.ts';
  assert(receipt.source.sourceHashes.some(row=>row.path===firstSubjectSourcePath&&row.sha256===fileSha(own(firstSubjectSourcePath))),
    'FIRST_STEEL_CONFIG_BYTES_MUST_MATCH_THE_REAL_RECEIPT');
  const oldOptions=facadeVentilatedSteelRetainedOptionsR5(context.sourceRoot),legacy=oldOptions.legacyTemplateAssumptionSources;assert(legacy);
  assert(legacy.approvedSourceEvidence);same(readset.legacyApprovedSourceDefinition,legacy.approvedSourceEvidence.capturedSourceDefinition);
  const metadata=capture.definition.source_metadata;assert(record(metadata));assert(record(metadata.retainedParentBindingSuccessorV1));
  const lineage=metadata.retainedParentBindingLineageV1;assert(record(lineage));assert.equal(lineage.contract,'master-retained-binding-lineage/v1');
  list(lineage.entries);assert(lineage.entries.length>0);const latestSuccessor=lineage.entries[lineage.entries.length-1]!.successor;assert(record(latestSuccessor));
  const capturedParentSha256=masterRetainedParentCaptureSha256R1(capture),append={contract:'master-retained-binding-append/v1' as const,
    capturedSourceMetadata:structuredClone(metadata),capturedSourceMetadataSha256:valueSha(metadata),capturedPreviousSuccessorSha256:valueSha(latestSuccessor)};
  // The original slot remains the approval anchor. Append continuity belongs
  // to the actual latest steel successor and the unchanged full-chain owner.
  const state=validateMasterRetainedBindingAppendV1({capture,capturedParentSha256,catalogId,stopCode:'FACADE_NVF_PORCELAIN_AFTER_ACTUAL_STEEL_R226'},append);
  assert.equal(state.latest.contract,steelContract);assert.equal(state.latest.sourceId,steel.sourceId);assert.equal(state.latest.sourceFingerprint,receipt.source.fingerprint);
  assert.equal(state.latest.parentDefinitionId,originalParent().capture.definition.id);assert.equal(state.latest.parentBaselineId,originalParent().capture.baseline.id);
  assert.equal(state.latest.capturedParentSha256,oldOptions.capturedParentSha256);
  const oldIds=new Set(capture.parameters.map(p=>p.parameter_id));
  const retained:MasterRetainParentBindingsR1={capturedParent:capture,capturedParentSha256,
    ...(reuse?{}:{capturedSourcePreimage:{sourceKey:porcelain.sourceId,expected:null}}),legacyTemplateAssumptionSources:structuredClone(legacy),
    successorProvenanceAppendV1:append,
    newParameterSources:Object.fromEntries(model.parameters.filter(p=>!oldIds.has(p.parameter_id)).map(p=>[p.parameter_id,
      p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED' as const,sourceIds:[]}:
        p.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?{kind:'DERIVED' as const,sourceIds:[]}:
          {kind:'KNOWN' as const,sourceIds:[porcelain.sourceId]}]))};
  same(Object.keys(retained.newParameterSources).sort(),porcelainDefinition().parameters.map(p=>p.parameter_id).sort());
  const newRows=model.resources.filter(row=>!capture.resources.some(old=>old.row_id===row.row_id)
    &&row.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM').map(row=>row.row_id);assert.equal(newRows.length,115);
  const oldNeeds=strings(parent.contentPassport.decision.unresolvedResourceRowIds),newNeedIds=model.resources.filter(row=>!capture.resources.some(old=>old.row_id===row.row_id)
    &&row.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM').map(row=>row.row_id);same([oldNeeds.length,newNeedIds.length],[46,5]);
  const sourcePaths=[...new Set([...baselineConfig.sourcePaths,...firstConfig.sourcePaths,...selectedSourcePaths,ownPath])];
  for(const path of sourcePaths)fileSha(own(path));
  const config:Config={...baselineConfig,contract,stopCode:'FACADE_NVF_PORCELAIN_AFTER_ACTUAL_STEEL_R226',applicationName:'facade-nvf-porcelain-after-actual-steel-r226',
    sourcePaths,parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,expectedParentShape:[117,140,140],
    parentReleaseId:text(next.releaseId),parentSearchReleaseId:text(next.searchReleaseId),currentReleasePath:context.actual.releasePointer.path,
    shortInput:structuredClone(capture.baseline.input_values),acceptanceInput:structuredClone(capture.baseline.input_values),
    passport:{...baselineConfig.passport,includedScopeRu:[...strings(parent.contentPassport.included_scope_ru),
      'Сохранённый стальной метод и керамогранит на видимых кляммерах в одном существующем владельце НВФ.'],
      excludedScopeRu:strings(parent.contentPassport.excluded_scope_ru),independentCompletenessMap:map,unresolvedApplicableResourceRowIds:[...oldNeeds,...newNeedIds]},
    applicability:{...structuredClone(capture.definition.applicability),primaryMeasureSelectionV1:independentPrimary(),
      sourceProfilesByExplicitChoice:{...capture.definition.applicability.sourceProfilesByExplicitChoice,
        [porcelainChoice]:baselineConfig.applicability.sourceProfilesByExplicitChoice[porcelainChoice]},
      retainedParentCaptureSha256:retained.capturedParentSha256,normalLockedPreflightRequired:true,fullTechnicalAcceptance:false},
    binding:{...baselineConfig.binding,rowId:newRows[0]!,additionalRowIds:newRows.slice(1),retainParentBindings:retained,
      ...(reuse?{reuseExistingNormativeRegistry:reuse}:{}),applicability:{contract,oneExistingCatalogOwner:true,
        originalParentDefinitionId:capture.definition.id,fullTechnicalAcceptance:false}},
    locator:{...baselineConfig.locator,payload:{...baselineConfig.locator.payload,contract,independentCompletenessMap:map,
      exactParentDefinitionId:capture.definition.id,firstStageActualReceiptSha256:receipt.receiptSha256}},
    search:{...baselineConfig.search,includedBoundaries:independentPrimary().selections.map(s=>s.selectorValue),sourceProvenance:{...baselineConfig.search.sourceProvenance,
      contract,exactParentDefinitionId:capture.definition.id,firstStageActualReceiptSha256:receipt.receiptSha256,newCatalogIds:0}},
    receiptFileStem:'facade_nvf_porcelain_after_actual_steel_r226',verifyCore:async()=>{
      verifyFacadeNvfSecondRetainedPureR226(config);const finite=await verifyFacadeNvfSteelPorcelainFiniteR221(context);
      return{status:'FINITE_SEQUENTIAL_SAME_OWNER_STEEL_PORCELAIN_NOT_PUBLICATION',finite,
        firstStageActualReceiptSha256:receipt.receiptSha256,capturedActualParentSha256:retained.capturedParentSha256,READY:false,FULL:false};}};
  // Do not defer this to publication: current R70's real sparse-baseline HOLD
  // must occur before returning an apparently usable ordinary Config.
  verifyFacadeNvfSecondRetainedPureR226(config);return config;
}

export function verifyFacadeNvfSecondRetainedPureR226(config:Config):void{
  const retained=config.binding.retainParentBindings;assert(retained);assert.equal(config.catalogAppend,undefined);
  assert.equal(retained.additionalCapturedExistingRegistryV1,undefined,'STEEL_IS_RETAINED_PARENT_NOT_AN_ADDITIONAL_SOURCE_TUPLE');
  assert.equal(config.sourceId,porcelain.sourceId);const m=config.sourceMetadata,id=uuid(config.contract+':'+config.sourceId+':source'),
    locatorId=uuid(config.contract+':'+config.sourceId+':'+config.locator.key+':locator');
  const candidate:MasterRetainedBindingGuardInputR1&Readonly<{config:Config}>={config,newSource:{id,source_key:config.sourceId,title_ru:m.source_title,authority:m.source_authority,
    official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:m.effective_from??null,effective_to:null,
    metadata:{contract:config.contract,sourceKind:m.source_kind??'PROJECT_DOCUMENTATION_REQUIRED',useRestriction:m.use_restriction,
      universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
    newLocators:[{id:locatorId,source_id:id,locator_key:config.locator.key,locator:config.locator.payload,
      excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
  const reuse=resolveMasterExistingNormativeRegistryReuseR1(candidate);
  const input=reuse?{...candidate,newSource:reuse.managedSource,newLocators:reuse.locators}:candidate;
  assert(masterRetainParentBindingsOptInR1(input));assert.equal(input.newLocators.length,1,'EXACT_ONE_COMPOSITE_PRIMARY_SOURCE_LOCATOR');
  const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions),locatorIds=input.newLocators.map(row=>text(row.id)),
    applicable=resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,resources,locatorIds),
    bindings=resolveMasterSingleDefinitionBindingRowIds(config,resources,locatorIds).map(row_id=>({row_id,locator_id:locatorIds[0]!,applicability:applicable[row_id]}));
  const oldFormulas=new Set(retained.capturedParent.formulas.map(f=>f.formula_id)),formulas=config.formulaDefinitions.map(f=>({...f,
    ast_sha256:oldFormulas.has(f.formula_id)?f.ast_sha256:valueSha(f.ast)}));
  const fingerprint=valueSha({purpose:'PURE_ACTUAL_SUCCESSOR_RETAINED_REPRESENTATIVE_NOT_DB_PUBLICATION',capture:retained.capturedParentSha256,
    firstStageReceipt:config.locator.payload.firstStageActualReceiptSha256});
  const result=prepareMasterRetainedBindingRepresentativeR1(input,{parameters:config.parameterDefinitions,formulas,resources,newBindings:bindings,
    successorProvenance:{contract:config.contract,sourceId:config.sourceId,normId:config.normId,parentDefinitionId:retained.capturedParent.definition.id,
      parentBaselineId:retained.capturedParent.baseline.id,capturedParentSha256:retained.capturedParentSha256,sourceFingerprint:fingerprint},
    lifecycleMetadata:{contract:config.contract,masterSha256:config.masterSha256,sourceFingerprint:fingerprint}});
  assert.equal(result.expectedNormativeBindingCount,162);assert.equal(bindings.length,115);
  for(const[id,sources]of Object.entries(retained.capturedParent.baseline.normative_source_ids))same(result.normativeSourceIds[id],sources);
}
