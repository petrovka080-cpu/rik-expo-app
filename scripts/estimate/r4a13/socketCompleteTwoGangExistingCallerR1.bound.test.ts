import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isAbsolute,resolve} from 'node:path';
import completeness from '../../../data/estimate-benchmarks/fixtures/socket-complete-two-gang-existing-owner-independent-r1.json';
import {prepareSocketCompleteSurfaceCurrentMasterR266 as config,compileSocketCompleteTwoGangCurrentMasterR1 as compile,
  type SocketCurrentMasterContextR266} from './prepareSocketCompleteSurfaceCurrentMasterR266';
import {socketCompleteTwoGangSourcePackR1 as pack,socketCompleteTwoGangSourceRowR1 as row}
  from '../../../src/lib/estimate/backendPlatform/socketCompleteTwoGangExistingOwnerR1';
import {electricalVerificationOwnedPostPackR1 as instruments} from '../../../src/lib/estimate/v4/electricalVerificationOwnedPostR1';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {buildCanonicalRevisionCommitPayload} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';

function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function pin(value:unknown){assert(record(value));assert(typeof value.path==='string'&&typeof value.sha256==='string');return{path:value.path,sha256:value.sha256};}
function actualContext():SocketCurrentMasterContextR266{
  const path=process.env.SOCKET_R266_BOUND_CONTEXT_PATH;assert(typeof path==='string'&&isAbsolute(path),'ACTUAL_ROOT_BOUND_PARENT_REQUIRED');
  const raw:unknown=JSON.parse(readFileSync(path,'utf8'));assert(record(raw));assert(typeof raw.sourceRoot==='string');
  return{sourceRoot:raw.sourceRoot,currentFullParent:pin(raw.currentFullParent),actualScopedSourceRead:pin(raw.actualScopedSourceRead)};
}
const id=(key:string)=>pack.parameterPrefix+key.replaceAll('-','_');
const input=():Record<string,unknown>=>({q:'100',[pack.methodParameterId]:pack.method,[id('node_count')]:'2'});
const selectedConfig=(ctx:SocketCurrentMasterContextR266,parameters:Record<string,unknown>)=>
  config({...ctx,completeTwoGangSourceCandidateR1:{enabled:true,submittedParameters:parameters}});

function savedArtifactNeeds(result:Awaited<ReturnType<typeof compile>>,rowOverrides:unknown={}){
  const checksum=hash(result.revisionProjection),payload=buildCanonicalRevisionCommitPayload({
    rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,checksumSha256:checksum,
    compilerVersion:pack.contract,parameters:result.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},
    effectiveUserParameters:result.parameters,parentRevisionId:null,identityContract:{fixture:'TEST_ONLY_NOT_SAVED'},
    derivedParameters:result.derivedParameters,preliminaryNeeds:result.preliminaryNeeds,
    purchaseSupplyIndexV1:result.purchaseSupplyIndexV1,compositionSelectionV1:result.compositionSelectionV1});
  return canonicalArtifactPreliminaryNeeds({id:'TEST_ONLY_SOURCE_HELD',release_id:'TEST_ONLY_NOT_SAVED',catalog_id:pack.catalogId,
    checksum_sha256:checksum,row_count:result.rows.length,amendment_contract:{...payload,rowOverrides:structuredClone(rowOverrides??{})}});
}

describe('complete two-gang source wave through the actual existing socket Config and backend caller; UNRUN',()=>{
  let context:SocketCurrentMasterContextR266;
  beforeAll(()=>{context=actualContext();});
  it('keeps the old Config unchanged without the explicit complete source-wave context',()=>{
    const before=config(context),after=config({...context,completeTwoGangSourceCandidateR1:{enabled:true,submittedParameters:{q:'100'}}});
    expect(after.parameterDefinitions).toEqual(before.parameterDefinitions);
    expect(after.formulaDefinitions).toEqual(before.formulaDefinitions);
    expect(after.resourceDefinitions).toEqual(before.resourceDefinitions);
    expect(after.binding).toEqual(before.binding);
    expect(after.sourcePaths).toEqual(before.sourcePaths);
  });
  it('uses the guarded real single parent, preserves all legacy bodies and builds one complete supply owner',()=>{
    const before=config(context),after=selectedConfig(context,input());
    expect(after.parameterDefinitions).toHaveLength(83);
    expect(after.formulaDefinitions).toHaveLength(128);
    expect(after.resourceDefinitions).toHaveLength(128);
    expect(after.parameterDefinitions.slice(29).every(p=>!Object.hasOwn(p.truth_metadata,'guide')
      &&p.truth_metadata.projectAuthenticated===false&&p.truth_metadata.sourceAuthorityPromoted===false)).toBe(true);
    expect(after.resourceDefinitions.slice(0,87).map(r=>{const{inclusion_ast:_i,row_sha256:_h,...body}=r;return body;}))
      .toEqual(before.resourceDefinitions.map(r=>{const{inclusion_ast:_i,row_sha256:_h,...body}=r;return body;}));
    expect(after.binding).toEqual(before.binding);
    expect(after.verifyTargetPrecondition?.toString()).toBe(before.verifyTargetPrecondition?.toString());
    const owned=after.resourceDefinitions.filter(r=>r.row_id.startsWith(pack.prefix+':'));
    expect(owned.filter(r=>r.resource_graph.purchaseBalanceV1!=null).map(r=>r.row_id)).toEqual(pack.materials.map(m=>row(m.key+':order')));
    expect(owned.filter(r=>r.row_id.startsWith(row('own:'))).every(r=>r.cost_owner_id===null&&!r.procurement_eligible
      &&r.resource_graph.costTreatment==='INFORMATIONAL_SCOPE')).toBe(true);
    expect(owned.some(r=>/:(mechanism|box|jumper):/u.test(r.row_id))).toBe(false);
    for(const source of [pack.primary,...pack.secondaryPrimaryArtifacts])
      expect(after.sourcePaths).toContain(source.logicalPath);
    expect(new Set(after.sourcePaths).size).toBe(after.sourcePaths.length);
    expect(pack.secondaryPrimaryArtifacts).toHaveLength(2);
    expect(pack.secondaryPrimaryArtifacts[0]).toMatchObject({sha256:'c870413fed05a7f74fdcec61522f1e98e3e4bfa6fbd528a50ce2ba4bbb3e5fc5',
      readPdfPages:[1,2,3,4,5,6,7,8],remainingPagesNotRead:[],articleMappingStatus:'PRIMARY_CERTIFICATE_ROW_069742L_MISA2HG_SCREWLESS_CONSTRUCTION_ONLY',actualLotOrTerminalFitAdmitted:false,
      exactArticleConstruction:{salesReference:'069742L',functionType:'MISA2HG',terminalType:'SCREWLESS',actualLotFitAdmitted:false}});
    expect(owned.every(r=>JSON.stringify(r.source_metadata).includes(pack.secondaryPrimaryArtifacts[0]!.sha256))).toBe(true);
    const catalogue=pack.secondaryPrimaryArtifacts.find(s=>s.key===pack.factoryIncludedSupply.sourceArtifactKey);assert(catalogue);
    expect(catalogue).toMatchObject({sha256:'182785e0e6ecdbb10729708b3f53ce010c3cf4efc92cdb88ebfeb5c4d4dbf7bb',bytes:180843,
      totalPdfPages:1,readPdfPages:[1],sourceAuthorityPromoted:false,
      visualEvidence:{pngSha256:'a3019c38e2738ad11cff04a1b2d0b87070787f6644fe14f8c3c3f31bbcbda7cc',physicalPage:1,
        visibleFamilyReferences:['069730L','069742L','069744L'],horizontalAndVerticalAutomaticSubheadingsOverrideGeneralScrewText:true}});
    expect(createHash('sha256').update(readFileSync(resolve(context.sourceRoot,catalogue.logicalPath))).digest('hex')).toBe(catalogue.sha256);
    expect(completeness.evidenceSha256).toBe(createHash('sha256').update(readFileSync(resolve(context.sourceRoot,
      'data/estimate-benchmarks/source-packs/socket-complete-two-gang-existing-owner-source-r1.json'))).digest('hex'));
    expect(completeness.entries).toHaveLength(41);
    expect(pack.factoryIncludedSupply).toMatchObject({salesReference:'069742L',completeFactoryAssembly:true,
      frame:{included:true,suppliedState:'NOT_CLIPPED',separateQuantityAuthored:false},
      entryEndpieces:{factorySuppliedCountPerCompleteAssembly:3,meaning:'SUPPLIED_EMBOUTS_NOT_USED_CABLE_ENTRIES',usedEntryCount:null},
      separateComponentCostOrProcurementRowsAllowed:false,newInstallationOrConsumptionNorm:false,
      actualLotOrProjectFitAdmitted:false,composable069576L069672LPairAdmitted:false});
    const assemblies=owned.filter(r=>r.row_id.startsWith(row('assembly:')));
    expect(assemblies).toHaveLength(6);
    expect(owned.filter(r=>!assemblies.includes(r)).every(r=>r.resource_graph.factoryIncludedSupplyV1===undefined)).toBe(true);
    for(const resource of assemblies){
      expect(resource.resource_graph.factoryIncludedSupplyV1).toMatchObject({sourceArtifactSha256:catalogue.sha256,
        completeAssemblyOwnerRowId:row('assembly:order'),frameIncluded:true,frameSuppliedState:'NOT_CLIPPED',
        factorySuppliedEntryEndpiecesPerAssembly:3,actualUsedCableEntries:null,createsSeparateQuantityCostOrProcurementRows:false});
    }
    expect(owned.some(r=>/:(frame|embouts|entry-endpieces):/u.test(r.row_id))).toBe(false);
    expect(owned.every(r=>JSON.stringify(r.source_metadata).includes(catalogue.sha256))).toBe(true);
    expect(after.applicability.sourceOnlyCompleteTwoGangWaveV1).toMatchObject({registrySourceId:null,registryNormId:null,
      sourceAuthorityPromoted:false,projectAuthenticated:false,fullTechnicalAcceptance:false,oldSingleBindingsExtended:false});
  });
  it('keeps one whole factory assembly per actual node and never copies legacy q100 or two ports into supply',async()=>{
    const result=await compile(input(),context,{enableCompleteTwoGangSourceCandidateR1:true});
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds.find(n=>n.row_id===row('assembly:consumed'))?.quantity).toBe('2');
    expect(result.preliminaryNeeds.filter(n=>n.row_id.startsWith(pack.prefix+':'))
      .every(n=>n.missing_parameter_ids.includes(id('source_readback'))&&!Object.hasOwn(n,'amount'))).toBe(true);
    const artifacts=savedArtifactNeeds(result);expect(artifacts).toHaveLength(result.preliminaryNeeds.length);
    expect(artifacts.every(n=>n.included_in_estimate===false&&n.included_in_procurement===false&&n.procurement_eligible===false&&n.amount===null)).toBe(true);
    expect(result.totals.amount).toBe('0');
    const model=selectedConfig(context,input()),services=['delivery','waste-removal'];
    expect(model.resourceDefinitions.filter(r=>r.row_id.startsWith(pack.prefix+':')&&r.resource_graph.excludeKnownZeroQuantityV1===true).map(r=>r.row_id))
      .toEqual(services.map(row));
    const provenance={kind:'manual',reason:'TEST_ONLY retain reference prices while complete-product source remains held'};
    for(const trips of ['0','1',undefined]){
      const parameters:Record<string,unknown>={...input()};
      if(trips!==undefined){parameters[id('delivery_trips')]=trips;parameters[id('waste_trips')]=trips;}
      const output=await compile(parameters,context,{enableCompleteTwoGangSourceCandidateR1:true,rowOverrides:{
        [row('delivery')]:{unitPrice:'77',provenance},[row('waste-removal')]:{unitPrice:'88',provenance}}});
      expect(output.rows).toEqual([]);
      for(const [key,price,parameter] of [['delivery','77','delivery_trips'],['waste-removal','88','waste_trips']] as const){
        const needs=output.preliminaryNeeds.filter(n=>n.row_id===row(key));expect(needs).toHaveLength(1);
        const need=needs[0];assert(need);
        expect(need).toMatchObject({quantity:trips??null,unit_price:price});
        expect(need.missing_parameter_ids).toContain(id('source_readback'));
        expect(Object.hasOwn(need,'amount')).toBe(false);
        expect(need.calculation_trace).toMatchObject({resourceGraph:{excludeKnownZeroQuantityV1:true}});
        if(trips===undefined)expect(need.missing_parameter_ids).toContain(id(parameter));
      }
    }
  });
  it('separates the existing direct and dowel conditions without inventing holes or a fastener rate',()=>{
    const direct={...input(),[id('fixing')]:pack.fixingModes[0]},dowels={...input(),[id('fixing')]:pack.fixingModes[1]};
    const d=selectedConfig(context,direct);
    for(const r of d.resourceDefinitions.filter(r=>r.row_id.startsWith(row('anchors:')))){
      expect(resolveInclusionGraph(r.inclusion_ast,direct).value).toBe(false);
      expect(resolveInclusionGraph(r.inclusion_ast,dowels).value).toBe(true);
    }
    expect(pack.scopeRu).toContain('готовые крепёжные отверстия');
  });
  it('uses the existing effective homogeneous purchase balance while source admission stays held',async()=>{
    const parameters={...input(),[id('node_count')]:'8',[id('assembly_stock')]:'3',[id('assembly_reserve')]:'1',
      [id('assembly_quantum')]:'4',[id('assembly_specification')]:'TEST_ONLY not an approved supplier offer',
      [id('assembly_stock_fit')]:'TEST_ONLY not an authenticated warehouse'};
    const result=await compile(parameters,context,{enableCompleteTwoGangSourceCandidateR1:true});
    expect(result.preliminaryNeeds.find(n=>n.row_id===row('assembly:order'))?.quantity).toBe('8');
    expect(result.preliminaryNeeds.find(n=>n.row_id===row('assembly:order'))?.missing_parameter_ids).toContain(id('source_readback'));
    expect(result.rows).toEqual([]);
  });
  it('cannot promote source admission with a manual quantity, price or payable switch',async()=>{
    const rowOverrides={[row('assembly:order')]:{quantity:'2',unitPrice:'77',includedInEstimate:true,includedInProcurement:true,
      provenance:{kind:'manual',reason:'TEST_ONLY preserve real source hold'}}};
    const result=await compile(input(),context,{enableCompleteTwoGangSourceCandidateR1:true,rowOverrides});
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds.find(n=>n.row_id===row('assembly:order'))?.missing_parameter_ids).toContain(id('source_readback'));
    const raw=result.preliminaryNeeds.find(n=>n.row_id===row('assembly:order'));assert(raw);
    expect(raw).toMatchObject({quantity:'2',unit_price:'77',procurement_eligible:true});
    const saved=savedArtifactNeeds(result,rowOverrides).filter(n=>n.row_id===raw.row_id);expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({quantity:'2',unit_price:'77',amount:null,included_in_estimate:false,included_in_procurement:false,procurement_eligible:false});
  });
  it('rejects an invented source acceptance through the actual submitted-parameter channel',async()=>{
    await expect(compile({...input(),[id('source_readback')]:'verified'},context,{enableCompleteTwoGangSourceCandidateR1:true}))
      .rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  });
  it('does not silently rebind the frozen composable instrument kit to another operation group',async()=>{
    await expect(compile({...input(),[instruments.methodId]:instruments.method},context,{enableCompleteTwoGangSourceCandidateR1:true}))
      .rejects.toThrow('COMPLETE_TWO_GANG_COMPOSABLE_INSTRUMENT_BINDING_NOT_ADMITTED');
  });
  it('runs the ordinary Config verifyCore and strict41 plus preserved87 completeness maps through existing guards',async()=>{
    const result=await selectedConfig(context,input()).verifyCore();
    expect(result).toMatchObject({status:'ACTUAL_COMPLETE_TWO_GANG_SOURCE_CANDIDATE_NOT_ADMISSION',sourceAuthorityPromoted:false,
      projectAuthenticated:false,full:false,ready:false});
    expect(result.result.rows).toEqual([]);
    expect(result.result.preliminaryNeeds.find((n:{row_id:string})=>n.row_id===row('assembly:consumed'))?.quantity).toBe('2');
  });
});
