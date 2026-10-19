// Prospective shared-core cases NOT_RUN. No identity, registry, BOM, saved-history or publication admission.
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
import {ceramicSkirting03904CompletionDefinitionR1 as definition,ceramicSkirting03904SyntheticFactsR1 as facts,
 ceramicSkirting03904PackR1 as pack,ceramicSkirting03904FactIdsR1 as factIds,ceramicSkirting03904PrimaryR1 as length,
 ceramicSkirting03904CoverageConditionR1 as coverage,ceramicSkirting03904NeedParameterIdsR1 as needParameters,ceramicSkirting03904CompletenessMapR1 as completeness} from './ceramicSkirting03904CompletionR1';
import {ceramicFloor02703DefinitionR1 as parentDefinition,ceramicFloor02703PackR1 as parentPack} from './ceramicFloorCementMortarKrer11Column03R1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {canonicalPublisherPriceBindingIsCompatible} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const d=definition(),old=parentDefinition(),p=pack.prefix,target=pack.targetNeedRowId,whole=p+':whole-skirting-labour',included=p+':'+pack.includedOperation.id;
const physical=pack.physicalRows.map(r=>p+':'+r.id),info=physical.slice(1),allNewSource=[...physical,included];
const manual={kind:'manual',reason:'TEST_ONLY CONTROL77; not a supplier quote or approved object'};
const floor=(area='100'):Record<string,unknown>=>{
 const q:Record<string,unknown>={[parentPack.primaryMeasureParameterId]:area};for(const f of parentPack.scopeFacts)q[f.id]=f.value;
 for(const id of parentPack.requiredProjectReferences)q[id]='TEST_ONLY existing floor reference';for(const m of parentPack.machines)q[m.parameterId]=m.ownValue;
 for(const m of parentPack.materials){q[m.specificationId]='TEST_ONLY source-compatible product';q[m.parameterPrefix+'_stock']='0';q[m.parameterPrefix+'_reserve']='0';q[m.parameterPrefix+'_quantum']='0.001';}return q;
};
const compile=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[],def=d)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:parentPack.catalogId,compilerVersion:pack.contract,
 primaryMeasureParameterId:parentPack.primaryMeasureParameterId,parameterDefinitions:[...def.parameters],formulaDefinitions:[...def.formulas],resourceDefinitions:[...def.resources],submittedParameters:parameters,confirmedParameters:{...def.runtimeInput},rowOverrides,
 priceItems,currencyCode:'KGS',maximumResourceRows:def.resources.length,hashJson:async v=>estimateDeterministicHash(v)});
const row=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===id);
it('pins exact official source03904 and excludes identity/publication/technical acceptance claims',()=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),pack.source.path))).digest('hex')).toBe('e56ef148df993609c325b7d505c54b1806e8185a4fd7a1550b15266144538223');expect(pack.source.pages).toEqual([6,46,47]);expect(pack.normId).toBe('11-01-039-04');expect(pack.catalogId).toBeNull();expect(pack.publicationAllowed).toBe(false);expect(pack.fullTechnicalAcceptance).toBe(false);
});
it('adds only19parameters/11rows while retaining all48oldparameters/29oldformulas and28oldrows exact',()=>{
 expect([old.parameters.length,old.formulas.length,old.resources.length]).toEqual([48,29,29]);expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([67,40,40]);
 expect(d.parameters.slice(0,48)).toEqual(old.parameters);expect(d.formulas.slice(0,29)).toEqual(old.formulas);expect(d.resources.slice(0,29).filter(r=>r.row_id!==target)).toEqual(old.resources.filter(r=>r.row_id!==target));
 expect(d.parameters.map(q=>q.ordinal)).toEqual(Array.from({length:67},(_,i)=>i));expect(d.resources.map(r=>r.ordinal)).toEqual(Array.from({length:40},(_,i)=>i));expect(d.runtimeInput).toEqual(old.runtimeInput);expect(d.parameters.every(q=>q.default_value===null)).toBe(true);
});
it('oldskirting need changes only inclusion/rowhash and existing completionNeedTransition, no privateprovenance/source or payment rewrite',()=>{
 const a=old.resources.find(r=>r.row_id===target)!,b=d.resources.find(r=>r.row_id===target)!;const{inclusion_ast:_i,row_sha256:_h,source_metadata:_s,...abody}=a;const{inclusion_ast:_ii,row_sha256:_hh,source_metadata:_ss,...bbody}=b;expect(bbody).toEqual(abody);
 if(!b.source_metadata)throw Error('TEST_SKIRTING_SOURCE_METADATA_REQUIRED');const{completionNeedTransitionV1,...rest}=b.source_metadata;expect(rest).toEqual(a.source_metadata);expect(completionNeedTransitionV1).toEqual({featureContract:pack.contract,selectedMethodParameterId:pack.selector.id,resolvedOnlyForMethod:pack.selector.selected,resolvedThroughPaidOwnerRowId:whole,automaticLegacyPriceOrQuantityTransferAllowed:false});
 expect(b.inclusion_ast).toEqual({kind:'and',operands:[a.inclusion_ast,{kind:'not',operand:coverage()}]});expect(b.source_metadata?.normativeTrace).toEqual([]);
});
it.each(['missing','unconfirmed'])('%s selector keeps original floor rows/totals and oldskirting need without new03904 output',async mode=>{
 const input=floor();if(mode==='unconfirmed')input[pack.selector.id]=pack.selector.unconfirmed;const r=await compile(input),baseline=await compile(floor(),{},[],old);
 expect(r.rows).toEqual(baseline.rows);expect(r.totals).toEqual(baseline.totals);expect(r.preliminaryNeeds.map(n=>[n.row_id,n.quantity,n.need_state,n.unit_id,n.missing_parameter_ids])).toEqual(baseline.preliminaryNeeds.map(n=>[n.row_id,n.quantity,n.need_state,n.unit_id,n.missing_parameter_ids]));expect(allNewSource.every(id=>!row(r,id))).toBe(true);
});
it.each([
 ['10','2.36','0.006','10.1','0.016'],['12.5','2.95','0.0075','12.625','0.02'],['100','23.6','0.06','101','0.16'],
])('separate%s installedm yields exact source23.60/.06/101/.16 quantities once',async(m,h,truck,tile,mortar)=>{
 const r=await compile(facts(floor(),m));for(const[id,q]of[[whole,h],[p+':flatbed-truck',truck],[p+':straight-ceramic-skirting',tile],[p+':ready-mortar-m150',mortar],[included,m]])expect(row(r,id)).toMatchObject({quantity:q});
 expect(r.preliminaryNeeds.some(n=>n.row_id===target)).toBe(false);expect(r.totals.amount).toBe('0');expect(r.rows.filter(x=>allNewSource.includes(x.row_id)).every(x=>!x.included_in_procurement)).toBe(true);
});
it('independent floorarea doesnot scale or create the separate measured skirtinglength',async()=>{
 const a=await compile(facts(floor('100'),'12.5')),b=await compile(facts(floor('35.5'),'12.5'));expect(physical.map(id=>row(a,id)?.quantity)).toEqual(physical.map(id=>row(b,id)?.quantity));expect(row(a,parentPack.prefix+':whole-labor')?.quantity).not.toBe(row(b,parentPack.prefix+':whole-labor')?.quantity);
 expect(d.formulas.slice(29,34).every(f=>f.input_parameter_ids.join()===length)).toBe(true);
});
it('missinglength isnot copied from floorarea or suppliednormative101m',async()=>{
 const input=facts(floor(),'12.5');delete input[length];const r=await compile(input);expect(allNewSource.every(id=>!row(r,id))).toBe(true);expect(r.preliminaryNeeds.some(n=>n.row_id===target)).toBe(true);expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(length))).toBe(true);
});
it('missing parentfloor scope isnot manufactured from skirtinglength',async()=>{
 const input=facts(floor(),'12.5');delete input[parentPack.primaryMeasureParameterId];const r=await compile(input);expect(allNewSource.every(id=>!row(r,id))).toBe(true);expect(r.preliminaryNeeds.some(n=>n.row_id===target)).toBe(true);
});
it('wholeCONTROL77 price pays2.95h once:227.15, not an invented extra gluing or cutting job',async()=>{
 const r=await compile(facts(floor(),'12.5'),{[whole]:{unitPrice:'77',titleRu:'TEST_ONLY точный плинтус',provenance:manual}});expect(row(r,whole)).toMatchObject({quantity:'2.95',unit_price:'77',amount:'227.15'});expect(r.totals.amount).toBe('227.15');expect(row(r,included)?.included_in_estimate).toBe(false);
});
it.each(factIds)('missingexact03904 fact%s withholds newphysicalrows and retains oldneed',async id=>{
 const input=facts(floor(),'12.5');delete input[id];const r=await compile(input);expect(allNewSource.every(id=>!row(r,id))).toBe(true);expect(r.preliminaryNeeds.some(n=>n.row_id===target)).toBe(true);expect(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(id))).toBe(true);
});
const invalid:Array<[string,Record<string,unknown>]>= [
 ['PVC',{skirting03904_tile_scope:'PVC_GERFLOR6086'}],['wood',{skirting03904_tile_scope:'WOOD_SKIRTING'}],['cutfloor-tile',{skirting03904_tile_scope:'CUT_FROM_FLOOR_TILE_BY_HEIGHT'}],['cornerunit',{skirting03904_tile_scope:'AUTOMATIC_CORNER_TILE'}],
 ['drymortar',{skirting03904_mortar_scope:'DRY_MIX_DENSITY_DEFAULT'}],['M100',{skirting03904_mortar_scope:'READY_M100'}],['glue',{skirting03904_mortar_scope:'FORBO232_OR_CERESIT_ADHESIVE'}],
 ['auto-perimeter',{skirting03904_line_scope:'PERIMETER_FROM_FLOOR_AREA'}],['stock101',{skirting03904_supply_scope:'SOURCE101M_IS_STOCK_OR_EXTRA1PERCENT'}],['paid-parent-truck',{skirting03904_payment_scope:'USE_PARENT_FULL_TRUCK_SCOPE_FOR03904'}],
 ['second-install',{skirting03904_payment_scope:'ADD_GERFLOR_GLUE_LABOUR'}],['notready',{skirting03904_wall_base_scope:'FLOOR_ACCEPTANCE_AUTO_APPROVES_WALL'}],['zero',{[length]:'0'}],['negative',{[length]:'-1'}],['unknownselector',{[pack.selector.id]:'GUESS_OTHER_METHOD'}],
];
it.each(invalid)('rejects supplied%s instead of anothernorm/product/measure/default',async(_name,change)=>{
 await expect(compile({...facts(floor(),'12.5'),...change})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it.each(allNewSource)('manualquantity77 cannot replace computed source03904 row%s',async id=>{
 await expect(compile(facts(floor(),'12.5'),{[id]:{quantity:'77',provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
});
it.each([...info,included])('manual/snapshot77 on%s remains referenceonly, never financial or procurement',async id=>{
 const resource=d.resources.find(r=>r.row_id===id)!;
 for(const route of ['manual','snapshot'] as const){const r=await compile(facts(floor(),'12.5'),{[id]:{includedInEstimate:true,includedInProcurement:true,provenance:manual,...(route==='manual'?{unitPrice:'77'}:{})}},route==='snapshot'?[{price_key:resource.cost_owner_id!,unit_id:resource.unit_id,currency_code:'KGS',unit_price:'77',snapshot_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]:[]);
  expect(row(r,id)).toMatchObject({unit_price:'77',ownership_status:'OWNED_EXCLUDED',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');expect(row(r,whole)?.unit_price).toBeNull();}
});
it('reference tileamount rounds972.125to972.13 while never enteringtotal/procurement',async()=>{
 const id=p+':straight-ceramic-skirting';const r=await compile(facts(floor(),'12.5'),{[id]:{unitPrice:'77',provenance:manual}});expect(row(r,id)).toMatchObject({quantity:'12.625',amount:'972.13',included_in_estimate:false,included_in_procurement:false});expect(r.totals.amount).toBe('0');
});
it.each([...info,included])('realpublisher rejects equalowner/unit/key automaticprice inheritance onto%s',id=>{
 const target=d.resources.find(r=>r.row_id===id)!,source={...target,source_metadata:{}};expect(target.source_metadata?.automaticGenericPriceInheritanceAllowed).toBe(false);expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(false);
});
it('newwhole retains ordinary compatibleprice policy and explicitexclusion/title without changinginput',async()=>{
 const target=d.resources.find(r=>r.row_id===whole)!,source={...target,source_metadata:{}};expect(canonicalPublisherPriceBindingIsCompatible({sourceResource:source,targetResource:target,sourceBindingPriceKey:source.cost_owner_id})).toBe(true);
 const o={unitPrice:'77',titleRu:'TEST_ONLY отдельный плинтус',includedInEstimate:false,includedInProcurement:false,provenance:manual},before=JSON.stringify(o);const r=await compile(facts(floor(),'12.5'),{[whole]:o});expect(row(r,whole)).toMatchObject({quantity:'2.95',title_ru:o.titleRu,unit_price:'77',included_in_estimate:false});expect(r.totals.amount).toBe('0');expect(JSON.stringify(o)).toBe(before);
});
it('oldmanualprice/title/exclusion remain onoldwhole and do not auto-price newskirting',async()=>{
 const id=parentPack.prefix+':whole-labor',o={unitPrice:'77',titleRu:'TEST_ONLY прежний труд пола',includedInEstimate:false,provenance:manual};const a=await compile(floor(),{[id]:o},[],old),b=await compile(facts(floor(),'12.5'),{[id]:o});expect(row(b,id)).toEqual(row(a,id));expect(row(b,whole)?.unit_price).toBeNull();expect(b.totals.amount).toBe('0');
});
it('oldneedmanualprice/title isnot transferred onto newwhole; originalhistory not rewritten',async()=>{
 const r=await compile(facts(floor(),'12.5'),{[target]:{unitPrice:'77',titleRu:'TEST_ONLY старая потребность',provenance:manual}});expect(row(r,whole)?.unit_price).toBeNull();expect(r.totals.amount).toBe('0');
});
it('newINFOconsumption doesnot enlargeexistingfloorM150order or alterits procurementrowset',async()=>{
 const a=await compile(floor(),{},[],old),b=await compile(facts(floor(),'12.5'));const id=parentPack.prefix+':ready-mortar-m150-order';expect(row(b,id)).toEqual(row(a,id));expect(b.rows.filter(r=>r.included_in_procurement).map(r=>r.row_id)).toEqual(a.rows.filter(r=>r.included_in_procurement).map(r=>r.row_id));
 expect(row(b,p+':ready-mortar-m150')).toMatchObject({quantity:'0.02',included_in_estimate:false,included_in_procurement:false});
});
it.each(pack.openNeeds.map(n=>n.id))('newapplicationneed%s cannot be filledby0/1/order/price',async id=>{
 const rowId=p+':open:'+id,param='skirting03904_application_need_'+id.replaceAll('-','_');for(const value of ['0','1']){
  await expect(compile(facts(floor(),'12.5'),{[rowId]:{quantity:value,unitPrice:'77',provenance:manual}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  await expect(compile({...facts(floor(),'12.5'),[param]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});}
});
it('retains other5oldneeds and makes6newconcrete source/commercial tasks visible',async()=>{
 const r=await compile(facts(floor(),'12.5'));for(const g of parentPack.gaps.filter(g=>g.id!=='skirting'))expect(r.preliminaryNeeds.some(n=>n.row_id===parentPack.prefix+':'+g.id)).toBe(true);for(const g of pack.openNeeds)expect(r.preliminaryNeeds.some(n=>n.row_id===p+':open:'+g.id)).toBe(true);
 expect(r.preliminaryNeeds.some(n=>n.row_id===target)).toBe(false);expect(needParameters).toHaveLength(6);expect(d.resources.slice(34).every(r=>r.unit_id===''&&r.source_metadata?.automaticGenericPriceInheritanceAllowed===false&&JSON.stringify(r.source_metadata?.normativeTrace)==='[]'&&JSON.stringify(r.source_metadata?.normative_source_ids)==='[]')).toBe(true);
});
it.each(['skirting_height_mm','tile_piece_length_m','skirting_stock_m','skirting_waste_percent','water_for_skirting_m3','skirting_extra_glue_hours'])('unknownconversion/order/secondarylabourparameter%s doesnot get invented',async id=>{
 await expect(compile({...facts(floor(),'12.5'),[id]:'1'})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
});
it('finite40-entry map accounts forexistingfloor/newphysicalsource/includedoperation/openneeds',()=>{
 const map=completeness();expect(map.entries).toHaveLength(40);expect(map.generatedFromCurrentRows).toBe(false);expect(validateIndependentCompletenessMapReferences({completenessMap:map,resourceDefinitions:d.resources,formulaDefinitions:d.formulas})).toEqual([]);
});
