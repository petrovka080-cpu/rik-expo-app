import {validateCanonicalEstimateParameters} from '../../../src/lib/estimate/backendPlatform/parameterConstraints';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalProfessionalPdfReviewAcknowledgmentV1,canonicalProfessionalPdfReportOriginalAuditV1} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import expected from '../../../data/estimate-benchmarks/fixtures/facade-nvf-steel-porcelain-independent-r221.json';
import steelOracle from '../../../data/estimate-benchmarks/fixtures/facade-steel-siding-whole-independent-r59.json';
import porcelainOracle from '../../../data/estimate-benchmarks/fixtures/facade-porcelain-whole-independent-r59.json';
import {facadeSteelSidingPackR2 as steel} from '../../../src/lib/estimate/v4/facadeSteelSidingKrer15R2';
import {facadePorcelainProfileR59 as porcelain,facadePorcelainGeometryR59 as porcelainGeometry,
 facadePorcelainControlR59 as porcelainControl} from '../../../src/lib/estimate/v4/facadePorcelainWholeR59';
import {facadeNvfSteelPorcelainDefinitionR221 as definition,facadeNvfSteelPorcelainCompletenessR221 as completeness,
 facadeNvfSteelPorcelainCapturedParentR221 as captured,facadeNvfSteelPorcelainIdentityR221 as identity,
 facadeNvfSteelPorcelainPrimarySelectionR221 as selection,facadeNvfSteelPorcelainNewMethodInputR221 as compileInput,type FacadeNvfSteelPorcelainCompileOptionsR221,
 type FacadeNvfSteelPorcelainReadbackR221} from '../../../src/lib/estimate/v4/facadeNvfSteelPorcelainOneOwnerR221';
import {facadeVentilatedSteelDefinitionR5 as acceptedSteelDefinition,facadeVentilatedSteelCompletenessR5 as acceptedSteelMap,facadeVentilatedSteelPrimarySelectionR5 as acceptedSteelSelection,type FacadeVentilatedSteelReadbackR5} from '../../../src/lib/estimate/v4/facadeVentilatedSteelExistingOwnerR5';
import {facadeVentilatedPorcelainDefinitionR214 as porcelainOnlyDefinition,facadeVentilatedPorcelainCompletenessR214 as porcelainOnlyMap,type FacadeVentilatedPorcelainReadbackR214} from '../../../src/lib/estimate/v4/facadeVentilatedPorcelainExistingOwnerR214';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimateCompileCoreResult as Result} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalManualMachineHourPriceCoverageV1} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import {compareFormulaGraphDecimals as cmp} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from '../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactPreliminaryNeeds,canonicalArtifactMoney,escapeCanonicalArtifactHtml} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {facadeNvfSteelPorcelainSourceRequirementR221} from './prepareFacadeNvfSteelPorcelainOneOwnerR221';
const srid=(key:string)=>steel.prefix+':'+key,prid=(key:string)=>porcelain.prefix+':'+key;
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const row=(result:Result,id:string)=>{const value=result.rows.find(r=>r.row_id===id);assert(value,id);return value;};
const quantity=(result:Result,id:string,value:string)=>assert.equal(cmp(row(result,id).quantity,value),0,id);
type Overrides=NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']>;
function steelReadback(area:string):FacadeVentilatedSteelReadbackR5{return{
 sourceNormId:'15-01-065-01',sourceSha256:steel.source.sha256,netFacadeAreaM2:area,projectDocumentSha256:'f'.repeat(64),
 approvedProjectReference:'TEST_ONLY independent whole source BOM;not an authenticated actual project',
 projectBasis:steel.projectBasisValue,methodConformanceDeclaration:steel.sourceFitValue,
 productionConditions:'ИСХОДНЫЕ_НОРМАЛЬНЫЕ_УСЛОВИЯ_КРЕР15_ПРИНЯТЫ_ПРОЕКТОМ',projectBOM:{...steelOracle.testOnlyProjectBOM},
 machineFulfilment:Object.fromEntries(steel.rows.filter(r=>r.category==='equipment').map(r=>[r.key,'hired' as const]))};}
function porcelainReadback(area:string,more:Record<string,unknown>={}):FacadeVentilatedPorcelainReadbackR214{
 const control=porcelainControl(),values=Object.fromEntries(Object.entries(control).filter(([id])=>!porcelainGeometry.some(g=>g===id)));
 return{sourceKey:'gox_facade_ventilated_porcelain_whole_r3',sourceArtifactSha256:'726daf4928c2c3e98fc85aa16be6dfb2d276a856d5382fc8a3f6e73a1ef4d763',
  netFacadeAreaM2:area,documentSha256:'a'.repeat(64),documentReference:'TEST_ONLY held independent source fixture;no actual object approval',values:{...values,...more}};
}
function steelPrices():Overrides{
 const result:Overrides={[srid('labour')]:{unitPrice:steelOracle.testOnlyLabourUnitPrice,provenance:{kind:'manual',reason:'TEST_ONLY independent price'}}};
 for(const m of steelOracle.materialOwners){result[srid(m.owner)]={unitPrice:m.unitPrice,provenance:{kind:'manual',reason:'TEST_ONLY whole supply'}};
  result[srid(m.consumed)]={unitPrice:m.unitPrice,includedInEstimate:true,includedInProcurement:true,
   provenance:{kind:'manual',reason:'TEST_ONLY reference cannot create another payment/order'}};}
 for(const m of steelOracle.machineOwners){const id=srid(m.hired);result[id]={unitPrice:m.unitPrice,
  machineHourPriceCoverageV1:canonicalManualMachineHourPriceCoverageV1({rowId:id,unitPrice:m.unitPrice,currencyCode:'KGS'}),
  provenance:{kind:'manual',reason:'consumer_estimate_row_batch_edit'}};}
 return result;
}
function porcelainPrices(mode:'own'|'hired'|'buy'):Overrides{
 const prices=porcelainOracle.testOnlyPrices,result:Overrides={};
 for(const k of Object.keys(porcelainOracle.laborQuantities100))result[prid('labor:'+k)]={unitPrice:prices.labor,provenance:{kind:'manual',reason:'TEST_ONLY source labour price'}};
 for(const m of porcelainOracle.materialOwners)result[prid(m.owner)]={unitPrice:prices.material,provenance:{kind:'manual',reason:'TEST_ONLY source supply price'}};
 for(const t of porcelainOracle.stockResources)result[prid('tool:'+t.key+':'+mode)]={unitPrice:prices.toolMode[mode],
  provenance:{kind:'manual',reason:'TEST_ONLY explicit PPR provision period price,not retail inheritance'}};
 result[prid('stock:facade-platform')]={unitPrice:prices.stockReference,includedInEstimate:true,includedInProcurement:true,
  provenance:{kind:'manual',reason:'TEST_ONLY informational reference stays unpaid and unordered'}};
 return result;
}
function assertSelected(result:Result,prefix:string,needs:number){
 assert(result.rows.every(r=>r.row_id.startsWith(prefix+':')),'NO_ACTIVE_LEGACY_OR_OTHER_SOURCE_ROWS');
 assert(result.preliminaryNeeds.every(r=>r.row_id.startsWith(prefix+':')),'NO_OTHER_PROFILE_NEEDS_LEAK');
 assert.equal(result.preliminaryNeeds.length,needs);
}
function assertSteel(result:Result,index:0|2){
 assertSelected(result,steel.prefix,21);const sample=steelOracle.sourceRawCases[index];
 for(const[k,v]of Object.entries(sample.raw))quantity(result,srid(k+(k==='labour'?'':'-consumed')),v);
 const bom:Readonly<Record<string,string>>=steelOracle.testOnlyProjectBOM;
 for(const m of steelOracle.materialOwners)if(m.projectQuantityKey){const value=bom[m.projectQuantityKey];assert(value);
  quantity(result,srid(m.owner),value);if(m.literalP)quantity(result,srid(m.consumed),value);}
 for(const n of steelOracle.protectedNeeds)assert(result.preliminaryNeeds.some(x=>x.row_id===n.rowId&&x.quantity===null));
}
function assertPorcelain(result:Result,half=false){
 assertSelected(result,porcelain.prefix,5);assert.equal(result.rows.length,83);
 for(const[k,v]of Object.entries(half?porcelainOracle.laborQuantities50:porcelainOracle.laborQuantities100))quantity(result,prid('labor:'+k),v);
 for(const m of porcelainOracle.materialOwners){const value=m.key==='stone-wool'&&half?'5.5':m.quantity;
  quantity(result,prid(m.consumed),value);quantity(result,prid(m.owner),value);}
 for(const t of porcelainOracle.stockResources)quantity(result,prid('stock:'+t.key),t.quantity);
 for(const key of porcelainOracle.protectedNeedKeys)assert(result.preliminaryNeeds.some(n=>n.row_id===prid('need:'+key)&&n.quantity===null));
}
function publicMoney(result:Result,mode:'own'|'hired'|'buy',pdfIssuancePurpose:'STANDARD'|'PRELIMINARY_REVIEW'){
 const reference=row(result,prid('stock:facade-platform'));assert.equal(reference.unit_price,'200');assert.equal(reference.amount,'200');
 assert.equal(reference.included_in_estimate,false);assert.equal(reference.included_in_procurement,false);
 const before=JSON.stringify(result),revision={id:'TEST_ONLY_COMPOSED_NVF_'+mode,release_id:'TEST_ONLY_NOT_SAVED',catalog_id:identity.catalogId,
  checksum_sha256:'0'.repeat(64),row_count:result.rows.length,currency_code:'KGS',input_parameters:result.parameters,
  amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
 let pdfReviewNegativeCases=0;
 // This is an unsaved source-fragment fixture, never saved source authority.
 const reportRevision=pdfIssuancePurpose==='PRELIMINARY_REVIEW'?{...revision,
  definition_version_id:"TEST_ONLY_UNPUBLISHED_COMPOSED_NVF_SOURCE_FRAGMENT",
  checksum_sha256:canonicalEstimateSha256HexText(canonicalEstimateStableJson({contract:'TEST_ONLY_UNSAVED_SOURCE_FRAGMENT_SNAPSHOT/r1',
   parameters:result.parameters,rows:result.rows,preliminaryNeeds:result.preliminaryNeeds}))}:revision;
 const reportNeeds=canonicalArtifactPreliminaryNeeds(reportRevision,{issuancePurpose:pdfIssuancePurpose});
 const reportResources=[...result.rows,...reportNeeds];
 const reportInput={revision:reportRevision,rows:result.rows,preliminaryNeeds:reportNeeds,
  workTitleRu:"Монтаж вентилируемого фасада",issuancePurpose:pdfIssuancePurpose};
 const reviewAck=pdfIssuancePurpose==='PRELIMINARY_REVIEW'?canonicalProfessionalPdfReviewAcknowledgmentV1({
  revision:reportRevision,resources:reportResources,
  request:{acknowledgedPreliminaryReview:true,revisionId:reportRevision.id,releaseId:reportRevision.release_id,
   definitionVersionId:"TEST_ONLY_UNPUBLISHED_COMPOSED_NVF_SOURCE_FRAGMENT",checksumSha256:reportRevision.checksum_sha256},
  actorUserId:'TEST_ONLY_SOURCE_FRAGMENT_UNIT_ACTOR',acknowledgedAt:'2026-10-30T00:00:00.000Z'}):undefined;
 if(pdfIssuancePurpose==='PRELIMINARY_REVIEW'){
  assert(reviewAck);
  const originalAudit=canonicalProfessionalPdfReportOriginalAuditV1({revision:reportRevision,resources:reportResources});
  assert.equal(originalAudit.pdfAllowed,false);assert.equal(originalAudit.definitionAdmissionAllowed,false);
  assert.equal(originalAudit.completeClaimAllowed,false);
  assert.equal(originalAudit.issues.filter(issue=>issue.code==='RESOURCE_UNIT_UNRESOLVED').length,5);
  assert(originalAudit.issues.some(issue=>issue.code==='INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED'));
  assert.throws(()=>buildCanonicalProfessionalPdfProjection(reportInput),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
  pdfReviewNegativeCases++;
  assert.throws(()=>buildCanonicalProfessionalPdfProjection({...reportInput,
   reviewAcknowledgmentV1:{...reviewAck,checksumSha256:'0'.repeat(64)}}),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
  pdfReviewNegativeCases++;
 }
 const projection=buildCanonicalProfessionalPdfProjection({...reportInput,reviewAcknowledgmentV1:reviewAck});
 if(pdfIssuancePurpose==='PRELIMINARY_REVIEW'){
  assert(projection.html.includes('saved-report-warnings'));assert(projection.html.includes('composition-acceptance'));
 }
 assertCanonicalProfessionalPdfMoneyCells(projection.html);
 const name=escapeCanonicalArtifactHtml(porcelainOracle.publicResourceNames['stock:facade-platform']);
 const display=[...projection.html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gu)].filter(m=>m[1]?.includes('<strong>'+name+'</strong>'))
  .map(m=>({number:m[1]!.match(/<td class="number">(.*?)<\/td>/u)?.[1],cells:[...m[1]!.matchAll(/<td class="money">(.*?)<\/td>/gu)].map(c=>c[1])}));
 const refs=display.filter(r=>r.cells[0]===canonicalArtifactMoney('200','KGS')),
  owners=display.filter(r=>r.cells[0]===canonicalArtifactMoney(porcelainOracle.testOnlyPrices.toolMode[mode],'KGS')),
  uses=porcelainOracle.stockResources.find(t=>t.key==='facade-platform')!.operationKeys.length;
 assert.equal(refs.length,uses);assert(refs.every(r=>r.cells[1]===''));assert.equal(new Set(refs.map(r=>r.number)).size,1);
 assert.equal(owners.length,uses);assert.equal(owners.filter(r=>r.cells[1]!=='').length,1);
 assert.equal(projection.pricedRowCount,44);assert.equal(projection.preliminaryNeedCount,5);assert.equal(JSON.stringify(result),before);return pdfReviewNegativeCases;
}
export async function verifyFacadeNvfSteelPorcelainFiniteR221(observer:Readonly<{
 onEntry?:(count:number,phase:string)=>void;onCoreCall?:(count:number,phase:string)=>void;onOutcome?:(phase:string,value:unknown)=>void;
}>={},pdfIssuancePurpose:'STANDARD'|'PRELIMINARY_REVIEW'='STANDARD'){
 const sourceRoot=resolve(__dirname,'../../..');for(const pin of expected.sourceArtifactPins)
  assert.equal(createHash('sha256').update(readFileSync(resolve(sourceRoot,pin.path))).digest('hex'),pin.sha256,'EXACT_PRIMARY_SOURCE_ARTIFACT:'+pin.path);
 const model=definition(),map=completeness(),parent=captured().capture,requirement=facadeNvfSteelPorcelainSourceRequirementR221();
 assert.deepEqual([model.parameters.length,model.formulas.length,model.resources.length],[197,260,260]);assert.equal(map.entries.length,204);
 assert.deepEqual(model.resources.slice(0,76),parent.resources);assert.deepEqual(model.formulas.slice(0,76),parent.formulas);
 const steelBefore=acceptedSteelDefinition(),porcelainBefore=porcelainOnlyDefinition();
 assert.deepEqual(model.resources.slice(0,140),steelBefore.resources,'ALL76_PARENT_AND64_STEEL_ROWS_EXACT');
 assert.deepEqual(model.formulas.slice(0,140),steelBefore.formulas,'ALL_STEEL_CURRENT_FORMULAS_EXACT');
 assert.deepEqual(model.formulas.slice(140),porcelainBefore.formulas.slice(76),'ALL120_PORCELAIN_FORMULAS_EXACT');
 const normalizedRow=(row:typeof model.resources[number])=>{const{ordinal:_ordinal,row_sha256:_sha,...value}=row;return value;};
 assert.deepEqual(model.resources.slice(140).map(normalizedRow),porcelainBefore.resources.slice(76).map(normalizedRow),
  'PORCELAIN_ONLY_GLOBAL_ROW_ORDINAL_AND_OWN_HASH_CHANGED');
 const normalizedParameter=(parameter:typeof model.parameters[number])=>{const{ordinal:_ordinal,...value}=parameter;return value;};
 assert.deepEqual(model.parameters.slice(117).map(normalizedParameter),porcelainBefore.parameters.slice(52).map(normalizedParameter),
  'PORCELAIN_ONLY_GLOBAL_PARAMETER_ORDINAL_CHANGED');
 for(const parameter of steelBefore.parameters)if(parameter.parameter_id!==identity.selector)
  assert.deepEqual(model.parameters.find(p=>p.parameter_id===parameter.parameter_id),parameter,'EVERY_OTHER_STEEL_PARENT_PARAMETER_EXACT');
 assert.deepEqual(selection().selections.slice(0,4),acceptedSteelSelection().selections);
 assert.equal(selection().selections.length,5);
 assert.deepEqual(map.entries.slice(0,84),acceptedSteelMap().entries,'ALL_ACCEPTED_STEEL84_MAP_ENTRIES_EXACT');
 assert.deepEqual(map.entries.slice(84),porcelainOnlyMap().entries.slice(31),'ALL_ORIGINAL_PORCELAIN120_MAP_ENTRIES_EXACT');
 assert.equal(model.resources.filter(r=>r.source_metadata?.sourceRole==='UNRESOLVED_APPLICATION_NORM').length,51);

 assert.equal(new Set(model.parameters.map(p=>p.parameter_id)).size,197);assert.equal(new Set(model.resources.map(r=>r.row_id)).size,260);
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
 assert.deepEqual([requirement.steel.knownParameterIds.length,requirement.steel.boundRowIds.length],[expected.steel.knownNewParameters,expected.steel.boundRows]);
 assert.deepEqual([...requirement.steel.knownParameterIds].sort(),[...expected.steel.knownNewParameterIds].sort());
 assert.equal(requirement.steel.derivedParameterIds.length,expected.steel.derivedNewParameters);
 assert.equal(requirement.steel.unresolvedParameterIds.length,expected.steel.protectedNeeds);
 assert.equal(new Set([...requirement.steel.knownParameterIds,...requirement.steel.derivedParameterIds,...requirement.steel.unresolvedParameterIds]).size,expected.steel.nativeParameters);
 assert.deepEqual([requirement.porcelain.knownParameterIds.length,requirement.porcelain.boundRowIds.length],[36,115]);
 let entries=0,core=0,saved=0,rejects=0,pre=0,pdfReviewNegativeCases=0;const observed:string[]=[];
 const call=async(phase:string,input:Record<string,unknown>,options:FacadeNvfSteelPorcelainCompileOptionsR221={})=>{
  observed.push(phase);observer.onEntry?.(++entries,phase);let entered=false;
  try{const request=compileInput(input,{...options,hashJson:value=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value))});entered=true;observer.onCoreCall?.(++core,phase);
   const result=await compileCanonicalEstimateCore(request);saved++;observer.onOutcome?.(phase,result);return result;
  }catch(error){rejects++;if(!entered)pre++;observer.onOutcome?.(phase,{expectedReject:phase.includes('-reject-'),stage:entered?'CORE':'PRE_CORE',
   name:error instanceof Error?error.name:null,message:error instanceof Error?error.message:null,
   code:error!==null&&typeof error==='object'&&'code'in error?error.code:null});throw error;}
 };
 const s=(area:string)=>({[identity.selector]:identity.steelChoice,[identity.steelArea]:area});
 const p=(area:string)=>({[identity.selector]:identity.porcelainChoice,[identity.porcelainArea]:area,porcelain_work_top_height_m:'30'});
 const srb=(area:string):FacadeNvfSteelPorcelainReadbackR221=>({profile:'steel',value:steelReadback(area)});
 const prb=(area:string,more:Record<string,unknown>={}):FacadeNvfSteelPorcelainReadbackR221=>({profile:'porcelain',value:porcelainReadback(area,more)});
 const full=await call('01-steel-unpriced100',s('100'),{readback:srb('100')});assertSteel(full,0);
 const double=await call('02-steel-double200-sameBOM',s('200'),{readback:srb('200')});assertSteel(double,2);
 for(const m of steelOracle.materialOwners)if(m.projectQuantityKey)assert.equal(cmp(row(full,srid(m.owner)).quantity,row(double,srid(m.owner)).quantity),0);
 const pricedSteel=await call('03-steel-priced-hired',s('100'),{readback:srb('100'),rowOverrides:steelPrices()});assertSteel(pricedSteel,0);
 assert.equal(cmp(pricedSteel.totals.amount,steelOracle.expectedPricedAmounts.total),0);
 assert.equal(pricedSteel.rows.filter(r=>r.included_in_estimate).length,16);assert.equal(pricedSteel.rows.filter(r=>r.included_in_procurement).length,15);
 for(const m of steelOracle.materialOwners){assert.equal(row(pricedSteel,srid(m.consumed)).included_in_estimate,false);assert.equal(row(pricedSteel,srid(m.consumed)).included_in_procurement,false);}
 const porcelainFull=await call('04-porcelain-unpriced100',p('100'),{readback:prb('100')});assertPorcelain(porcelainFull);
 const half=await call('05-porcelain-half50-sameBOM',p('50'),{readback:prb('50')});assertPorcelain(half,true);
 for(const[mode,phase]of[['own','06-porcelain-priced-own'],['hired','07-porcelain-priced-hired'],['buy','08-porcelain-priced-buy']] as const){
  const r=await call(phase,p('100'),{readback:prb('100',{porcelain_tools_mode:porcelainOracle.provisionModes[mode]}),rowOverrides:porcelainPrices(mode)});
  assertPorcelain(r);assert.equal(cmp(r.totals.amount,porcelainOracle.expectedMoney.total[mode]),0);
  assert.equal(r.rows.filter(x=>x.included_in_estimate).length,44);assert.equal(r.rows.filter(x=>x.included_in_procurement).length,mode==='own'?23:39);
  for(const m of porcelainOracle.materialOwners){const consumed=row(r,prid(m.consumed)),owner=row(r,prid(m.owner));
   assert.equal(consumed.included_in_estimate,false);assert.equal(consumed.included_in_procurement,false);assert.equal(owner.included_in_estimate,true);assert.equal(owner.included_in_procurement,true);}
  for(const t of porcelainOracle.stockResources){const raw=row(r,prid('stock:'+t.key)),owner=row(r,prid('tool:'+t.key+':'+mode));
   assert.equal(raw.included_in_estimate,false);assert.equal(raw.included_in_procurement,false);assert.equal(owner.included_in_estimate,true);
   assert.equal(owner.included_in_procurement,mode!=='own');assert.equal(cmp(raw.quantity,owner.quantity),0);
   assert.equal(r.rows.filter(x=>x.row_id.startsWith(prid('tool:'+t.key+':'))).length,1);}
  pdfReviewNegativeCases+=publicMoney(r,mode,pdfIssuancePurpose);
 }
 const zero=await call('09-zero-porcelain',p('0'));assert.equal(zero.rows.length,0);assert.equal(zero.preliminaryNeeds.length,0);assert.equal(zero.totals.amount,'0');
 const missingP=await call('10-porcelain-missing-readback',p('100'));assert(!missingP.rows.some(r=>r.included_in_estimate||r.included_in_procurement));
 for(const key of porcelainOracle.protectedNeedKeys)assert(missingP.preliminaryNeeds.some(n=>n.row_id===prid('need:'+key)&&n.quantity===null));
 const missingS=await call('11-steel-missing-readback',s('100'));assert.equal(missingS.rows.length,0);assert.equal(missingS.preliminaryNeeds.length,64);
 const partial=porcelainReadback('100'),partialValues={...partial.values};delete partialValues.porcelain_bom_bracket;
 const missingBracket=await call('12-porcelain-partial-bracket',p('100'),{readback:{profile:'porcelain',value:{...partial,values:partialValues}}});
 assert.equal(missingBracket.preliminaryNeeds.length,8);
 for(const key of['labor:brackets','consumed:bracket','supply:bracket']){assert(!missingBracket.rows.some(r=>r.row_id===prid(key)));assert(missingBracket.preliminaryNeeds.some(n=>n.row_id===prid(key)&&n.quantity===null));}
 await assert.rejects(()=>call('13-reject-steel-with-porcelain-readback',s('100'),{readback:prb('100')}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('14-reject-porcelain-with-steel-readback',p('100'),{readback:srb('100')}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('15-reject-cross-profile-public-measure',{...s('100'),[identity.porcelainArea]:'100'},{readback:srb('100')}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('16-reject-wrong-steel-source',s('100'),{readback:{profile:'steel',value:{...steelReadback('100'),sourceSha256:'0'.repeat(64)}}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('17-reject-wrong-porcelain-source',p('100'),{readback:{profile:'porcelain',value:{...porcelainReadback('100'),sourceArtifactSha256:'0'.repeat(64)}}}),{code:'PARAMETER_VALIDATION_FAILED'});
 await assert.rejects(()=>call('18-reject-old-primary-for-steel',s('100'),{readback:srb('100'),parentPrimaryMeasure:{parameterId:'facade_area_m2',unitId:'m2'}}),{code:'PRIMARY_MEASURE_NEW_ROOT_REQUIRED'});
 await assert.rejects(()=>call('19-reject-steel-primary-for-porcelain',p('100'),{readback:prb('100'),parentPrimaryMeasure:{parameterId:identity.steelArea,unitId:'m2'}}),{code:'PRIMARY_MEASURE_NEW_ROOT_REQUIRED'});
 // A saved row amendment is not a supplied application norm. Both contracts
 // remain observable: deliberate quantities persist, unresolved source facts do not close.
 const protectedKey=porcelainOracle.protectedNeedKeys[0]!,protectedRowId=prid('need:'+protectedKey),
  protectedParameterId='porcelain_internal_'+protectedKey.replaceAll('-','_');
 const protectedParameter=model.parameters.find(parameter=>parameter.parameter_id===protectedParameterId);assert(protectedParameter);
 assert.equal(protectedParameter.default_value,null);assert.equal(protectedParameter.truth_metadata.value_source_role,'UNRESOLVED_APPLICATION_NORM');
 const rejectedNorm=(error:unknown)=>error!==null&&typeof error==='object'&&'code'in error&&error.code==='PARAMETER_VALIDATION_FAILED'
  &&error instanceof Error&&error.message==='unresolved application norm cannot be supplied '+protectedParameterId;
 assert.throws(()=>validateCanonicalEstimateParameters(model.parameters,{[protectedParameterId]:'0'}),rejectedNorm);
 assert.throws(()=>validateCanonicalEstimateParameters(model.parameters,{},
  {confirmedParameters:{[protectedParameterId]:'0'}}),rejectedNorm);
 const manualProvenance={kind:'manual',reason:'TEST_ONLY saved row quantity only; missing application norm remains unresolved'};
 const manual=await call('20-manual-need-quantity-preserves-source-hold',p('100'),{readback:prb('100'),
  rowOverrides:{[protectedRowId]:{quantity:'0',provenance:manualProvenance}}});
 assertSelected(manual,porcelain.prefix,5);
 assert.deepEqual(manual.parameters,porcelainFull.parameters,'MANUAL_ROW_DOES_NOT_SUPPLY_SOURCE_PARAMETERS');
 assert.deepEqual(manual.rows,porcelainFull.rows,'NO_NEW_PAID_OR_PROCUREMENT_OWNER_FROM_MANUAL_NEED');
 assert.deepEqual(manual.totals,porcelainFull.totals,'MANUAL_NEED_DOES_NOT_CHANGE_ONE_PAY_TOTALS');
 assert.equal(manual.parameters[protectedParameterId]??null,null);
 const previousNeed=porcelainFull.preliminaryNeeds.find(need=>need.row_id===protectedRowId),
  manualNeed=manual.preliminaryNeeds.find(need=>need.row_id===protectedRowId);assert(previousNeed);assert(manualNeed);
 assert.equal(previousNeed.quantity,null);assert.equal(manualNeed.quantity,'0');
 assert.equal(manualNeed.unit_id,previousNeed.unit_id);assert(!String(manualNeed.unit_id??'').trim(),'SOURCE_UNIT_STILL_UNRESOLVED');
 assert.equal(manualNeed.need_state,previousNeed.need_state);assert.equal(manualNeed.selected,previousNeed.selected);
 assert.equal(manualNeed.procurement_eligible,false);assert.deepEqual(manualNeed.missing_parameter_ids,previousNeed.missing_parameter_ids);
 assert(manualNeed.missing_parameter_ids.includes(protectedParameterId));assert.deepEqual(manualNeed.normative_trace,previousNeed.normative_trace);
 assert.deepEqual(manual.preliminaryNeeds.filter(need=>need.row_id!==protectedRowId),
  porcelainFull.preliminaryNeeds.filter(need=>need.row_id!==protectedRowId),'OTHER_FOUR_UNKNOWN_NEEDS_UNCHANGED');
 const trace=manualNeed.calculation_trace,previousTrace=previousNeed.calculation_trace;
 assert(record(trace),'MANUAL_NEED_CALCULATION_TRACE_REQUIRED');assert(record(previousTrace),'ORIGINAL_NEED_CALCULATION_TRACE_REQUIRED');
 assert.equal(trace.manualQuantityOverride,true);assert.equal(trace.calculatedQuantityBeforeOverride,null);
 assert.deepEqual(trace.manualAmendment,manualProvenance);assert.equal(trace.formulaId,previousTrace.formulaId);
 assert.equal(trace.formulaAstSha256,previousTrace.formulaAstSha256);
 assert.deepEqual(trace.resourceGraph,previousTrace.resourceGraph,'SOURCE_OPERATION_AND_ONE_PAY_GRAPH_UNCHANGED');
 await assert.rejects(()=>call('21-reject-row-quantity-without-manual-provenance',p('100'),{readback:prb('100'),
  rowOverrides:{[protectedRowId]:{quantity:'0'}}}),{code:'ROW_AMENDMENT_INVALID'});
 assert.deepEqual(observed,expected.expectedEntryPhases);assert.deepEqual([entries,core,saved,rejects,pre],[21,14,13,8,7]);
 return{status:'FINITE_SAME260ROW_DEFINITION_TEST_ONLY_NOT_ORDINARY_CONFIG_ACCEPTANCE',entries,actualCore:core,savedResults:saved,strictRejects:rejects,preCoreRejects:pre,
  onePhysicalOwner:identity.catalogId,old76RowsPreserved:true,steel64RowsPreserved:true,porcelain120RowsPreserved:true,independentMapEntries:204,
  definitionWideProtectedNeeds:51,steelSelectedNeeds:21,porcelainSelectedNeeds:5,actualSourceClosures:0,actualObjectsApproved:0,
  pdfIssuancePurpose,pdfReviewNegativeCases,
  sourceAuthorityConfig:'HOLD_SHARED_CONTRACT',normalLocked:'UNRUN_FOR_THIS_COMPOSITION',publisherCalls:0,databaseDml:0,READY:false,FULL:false};
}
