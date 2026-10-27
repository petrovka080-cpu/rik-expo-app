import assert from 'node:assert/strict';
import {canonicalEstimateOperationReferences as operationReferences,canonicalEstimateResourceOperationSections as operationSections} from '../backendPlatform/canonicalEstimateOperationComposition';
import {facadeCurrentWetDefinitionR3 as build,compileFacadeCurrentWetR3 as compileSource,facadeCurrentWetGeometryR5 as geometryIds,facadeCurrentWetPrimaryR3 as primary,facadeCurrentWetControlR3 as control,facadeCurrentWetNeedIdsR3 as needs,FACADE_CURRENT_WET_PREFIX_R3 as prefix,facadeCurrentWetSystemR3 as rawPack} from './facadeCurrentWetSystemR3';
import {compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from '../backendPlatform/canonicalProfessionalPdf';
import {escapeCanonicalArtifactHtml} from '../backendPlatform/canonicalEstimateArtifactContract';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
const pack=rawPack as Record<string,any>,id=(k:string)=>prefix+':'+k;
const compile=async(fixture:Record<string,unknown>,options:Parameters<typeof compileSource>[1]={})=>{
 const known=new Set(build().parameters.map(q=>q.parameter_id));
 const submitted=Object.fromEntries(Object.entries(fixture).filter(([id])=>geometryIds.some(geometry=>geometry===id)||!known.has(id)));
 const confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>known.has(id)&&!geometryIds.some(geometry=>geometry===id)));
 return compileSource(submitted,{...options,confirmedParameters});
};
const row=(r:any,k:string)=>{const x=r.rows.find((x:any)=>x.row_id===id(k));assert(x,'ACTUAL_ROW:'+k);return x;};
describe('current whole wet-system profile R3 — author UNRUN',()=>{
 test('15 applicable published labour operations,28 applicable physical stock types, no paint/EPS substitution',()=>{const d=build();assert.equal(d.resources.filter(r=>r.row_id.startsWith(id('labour:'))).length,15);assert.equal(d.resources.filter(r=>r.row_id.startsWith(id('stock:'))).length,28);assert(!d.resources.some(r=>r.row_id===id('labour:painting')||r.row_id.includes('eps-jigsaw')));assert.equal(pack.physicalProvision.length,29);assert.equal(pack.labor.length,16);});
 test('independent material oracle for100m² and actual110m² base/finish',async()=>{const r=await compile(control());for(const [key,expected]of Object.entries({'bonding-dry-consumed':'550','base-dry-consumed':'605','junction-dry-consumed':'20','adhesive-supply':'1175','water-supply':'259.25','insulation-supply':'13.2','mesh-supply':'131','substrate-primer-supply':'20','finish-primer-supply':'27.5','coloured-render-supply':'297'}))assert.equal(cmp(row(r,key).quantity,expected),0,key);assert.equal(r.preliminaryNeeds.length,4);assert.deepEqual(r.preliminaryNeeds.map(n=>n.row_id).sort(),[...needs].sort());});
 test('literal labour is multiplied by actual operation measure, never by crew size',async()=>{const r=await compile(control());for(const [key,expected]of Object.entries({'labour:bonding':'47','labour:anchors':'34.038','labour:base':'34.617','labour:mixing':'7.8725','labour:scaffold':'52.2','labour:horizontal-feed':'3.96','labour:vertical-feed':'2.66'}))assert.equal(cmp(row(r,key).quantity,expected),0,key);});
 for(const fronts of ['1','2'])test('whole physical stock uses only the proven12person front: '+fronts,async()=>{const r=await compile(control({current_fronts12_count:fronts}));for(const e of pack.physicalProvision.filter((e:any)=>e.selectedForMW)){const x=row(r,'stock:'+e.key),expected=fronts==='1'?String(e.quantity):String(BigInt(e.quantity)*2n);assert.equal(cmp(x.quantity,expected),0);assert.equal(x.included_in_estimate,false);assert.equal(x.included_in_procurement,false);}assert.equal(cmp(row(r,'stock:buckets-aggregate').quantity,fronts==='1'?'10':'20'),0);});
 test('source tooling stock is independent of facade area and of the14person monthly productivity example',async()=>{const a=await compile(control({current_wet_area_m2:'50'})),b=await compile(control({current_wet_area_m2:'500'}));for(const e of pack.physicalProvision.filter((e:any)=>e.selectedForMW))assert.equal(cmp(row(a,'stock:'+e.key).quantity,row(b,'stock:'+e.key).quantity),0);assert.equal(row(a,'stock:mortar-mixer').quantity,'1');});
 for(const [mode,key,bought]of [['Собственное обеспечение на период ППР','own',false],['Услуга обеспечения на период ППР','hired',true],['Новая поставка для рабочего фронта','buy',true]] as const)test('one owner per physical unit in explicit supply mode '+key,async()=>{const r=await compile(control({current_tools_mode:mode}));for(const e of pack.physicalProvision.filter((e:any)=>e.selectedForMW)){const owners=r.rows.filter(x=>x.row_id.startsWith(id('tool:'+e.key+':')));assert.equal(owners.length,1);assert.equal(owners[0]!.row_id,id('tool:'+e.key+':'+key));assert.equal(owners[0]!.included_in_procurement,bought);assert.equal(cmp(owners[0]!.quantity,row(r,'stock:'+e.key).quantity),0);}});
 test('one dry-mixture supply owner is shared by three operations without duplicated procurement',async()=>{const r=await compile(control()),owners=r.rows.filter(x=>x.included_in_procurement&&x.row_id===id('adhesive-supply'));assert.equal(owners.length,1);for(const k of ['bonding-dry','base-dry','junction-dry']){const x=row(r,k+'-consumed');assert.equal(x.included_in_estimate,false);assert.equal(x.included_in_procurement,false);}assert(r.rows.every(r=>r.unit_price===null));});
 for(const [label,patch]of [['unsupportedthickness',{current_insulation_thickness_mm:'100'}],['zeroFronts',{current_fronts12_count:'0'}],['fractionalFronts',{current_fronts12_count:'1.5'}],['wrongWholeMethod',{current_wet_exact_method:'BOLIX_MW120'}],['longHorizontalRoute',{current_horizontal_feed_distance_m:'30.001'}],['highVerticalRoute',{current_vertical_feed_height_m:'10.001'}],['primerWithoutSourceFit',{current_substrate_primer_trial_g_m2:'99'}],['unknownPaintAddon',{current_paint_coats:'2'}]]as const)test(label+' rejects without fallback',()=>assert.rejects(()=>compile(control(patch)),{code:'PARAMETER_VALIDATION_FAILED'}));
 for(const key of ['working_parts_wear','access_system','quality_services','cleanup_delivery'])test('unknown whole-cycle norm stays internal: '+key,async()=>{for(const q of ['0','1','77'])await assert.rejects(()=>compile(control({['current_unknown_'+key]:q})),{code:'PARAMETER_VALIDATION_FAILED'});});
 test('common PDF shows all unknown quantities and functional material/tool names',async()=>{const parameters=control(),r=await compile(parameters),before=JSON.stringify(r),revision={id:'TEST_ONLY_CORE',release_id:'TEST_ONLY',catalog_id:pack.currentCatalogId,checksum_sha256:'0'.repeat(64),row_count:r.rows.length,currency_code:'KGS',input_parameters:parameters};const pdf=buildCanonicalProfessionalPdfProjection({revision,rows:r.rows as any,preliminaryNeeds:r.preliminaryNeeds as any,workTitleRu:'Минераловатный фасад с цветной силиконовой штукатуркой'});assertCanonicalProfessionalPdfMoneyCells(pdf.html);assert(pdf.html.includes('Не рассчитано'));for(const n of r.preliminaryNeeds)assert(pdf.html.includes(escapeCanonicalArtifactHtml(n.title_ru)));assert.equal(JSON.stringify(r),before);});
 test('INFO rawprice200 is retained but never creates second payable/procurement ownership',async()=>{const key=id('stock:mortar-mixer'),r=await compile(control(),{rowOverrides:{[key]:{unitPrice:'200',includedInEstimate:true,provenance:{kind:'manual',reason:'TEST_ONLY reference equipment price'}}}}),x=row(r,'stock:mortar-mixer');assert.equal(cmp(x.unit_price,'200'),0);assert.equal(x.included_in_estimate,false);assert.equal(x.included_in_procurement,false);});
 test('zero front stays empty and every declared default stays null',async()=>{assert(build().parameters.every(q=>q.default_value===null));const r=await compile({current_wet_area_m2:'0'});assert.equal(r.preliminaryNeeds.length,0);assert(!r.rows.some(x=>x.included_in_estimate||x.included_in_procurement));});
 test('whole existing method exposes six measured areas/routes, never crew, stock or technical rates',()=>{
  const d=build();assert.deepEqual(d.parameters.filter(q=>q.truth_metadata.visibility_role==='USER_INPUT').map(q=>q.parameter_id),[...geometryIds]);assert.deepEqual(d.ordinaryParameterIds,[...geometryIds]);
  for(const q of d.parameters.filter(q=>!geometryIds.some(id=>id===q.parameter_id)&&q.truth_metadata.value_source_role!=='COMPILER_DERIVED_RESOURCE_QUANTITY')){
   const provenance=q.truth_metadata.provenance;assert(provenance&&typeof provenance==='object'&&!Array.isArray(provenance));assert.equal(q.truth_metadata.visibility_role,'INTERNAL_ONLY');
   assert.equal((provenance as Record<string,unknown>).consumer_input_role_v1,'APPLICATION_TECHNICAL');
  }
 });
 test('stock, trial norms and anchor BOM echoes reject in wrapper and direct core',async()=>{
  const d=build(),fixture=control(),geometry=Object.fromEntries(Object.entries(fixture).filter(([id])=>geometryIds.some(geometry=>geometry===id))),confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>!geometryIds.some(geometry=>geometry===id)));
  for(const id of ['current_fronts12_count','current_anchor_count','current_substrate_primer_trial_g_m2','current_tools_mode'])for(const value of [fixture[id],null,undefined]){
   const submittedParameters={...geometry,[id]:value};assert.throws(()=>compileSource(submittedParameters,{confirmedParameters}),{code:'PARAMETER_VALIDATION_FAILED'});
   await assert.rejects(()=>compileCanonicalEstimateCore({operation:'compile',compilerVersion:'TEST_ONLY_EXISTING_WET_TRUSTED_BOUNDARY_R5',catalogId:pack.currentCatalogId,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters,confirmedParameters,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:hash}),{code:'PARAMETER_VALIDATION_FAILED'});
  }
 });
 test('known geometry cannot manufacture the missing project, twelve-person fronts or cleanup norm',async()=>{
  const fixture=control(),geometry=Object.fromEntries(Object.entries(fixture).filter(([id])=>geometryIds.some(geometry=>geometry===id))),r=await compileSource(geometry);
  for(const needId of needs)assert(r.preliminaryNeeds.some(n=>n.row_id===needId&&n.quantity===null));
  assert(!r.rows.some(x=>x.included_in_estimate||x.included_in_procurement));assert(build().parameters.every(q=>q.default_value===null));
 });

});

test('existing shared resources survive the real common operation consumer with one owner',()=>{
  const d=build();
  const related=d.resources.filter(resource=>{
   const raw=resource.resource_graph.operationCompositionV1;
   return raw!==null&&typeof raw==='object'&&!Array.isArray(raw)
    &&Array.isArray((raw as Record<string,unknown>).additionalOperations)
    &&((raw as Record<string,unknown>).additionalOperations as unknown[]).length>0;
  });
  assert(related.length>0,'ACTUAL_WHOLE_METHOD_MUST_HAVE_SHARED_RESOURCES');
  const sections=operationSections(d.resources.map(resource=>({rowId:resource.row_id,titleRu:resource.title_ru,operation:resource.resource_graph.operationCompositionV1})));
  for(const resource of related){
   const raw=resource.resource_graph.operationCompositionV1;assert(raw&&typeof raw==='object'&&!Array.isArray(raw));
   const declared=(raw as Record<string,unknown>).additionalOperations;assert(Array.isArray(declared));
   const refs=operationReferences(raw);assert.equal(refs.length,declared.length+1,'COMMON_CONSUMER_MUST_KEEP_EVERY_DECLARED_USE:'+resource.row_id);
   assert.equal(sections.filter(section=>section.resourceIds.includes(resource.row_id)).length,1,'ONE_RESOURCE_OWNER:'+resource.row_id);
   assert.equal(sections.reduce((count,section)=>count+section.sharedResources.filter(shared=>shared.rowId===resource.row_id).length,0),declared.length,'SAME_ID_IN_EVERY_ADDITIONAL_OPERATION:'+resource.row_id);
   for(const reference of refs){
    const section=sections.find(section=>section.operation?.operationId===reference.operationId&&section.operation.groupId===reference.groupId);assert(section);
    assert(section.resourceIds.includes(resource.row_id)||section.sharedResources.some(shared=>shared.rowId===resource.row_id));
   }
  }
});
