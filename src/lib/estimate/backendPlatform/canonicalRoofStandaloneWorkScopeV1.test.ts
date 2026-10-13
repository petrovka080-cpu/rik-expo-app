import fixture from '../../../../data/estimate-benchmarks/fixtures/roof-standalone-scope-parents-s27-69.json';
import oldFixture from '../../../../data/estimate-benchmarks/fixtures/roof-screed25-five-parents-s27-69.json';
import policy from '../../../../data/estimate-benchmarks/source-packs/roof-standalone-work-scope-s27-69.json';
import binding from '../../../../data/estimate-benchmarks/source-packs/roof-screed25-five-bindings-s27-69.json';
import pack from '../../../../data/estimate-benchmarks/source-packs/roof-screed25-companion-s27-67.json';
import screed15 from '../../../../data/estimate-benchmarks/source-packs/roof-cement-screed15-five-s27-63.json';
import {buildRoofStandaloneWorkScopeSuccessorV1 as build,buildRoofStandaloneWorkScopeMigrationProofV1 as proof,admitRoofStandaloneWorkScopeMigrationProofV1 as admit,ROOF_STANDALONE_WORK_SCOPE_SHA_V1} from './canonicalRoofStandaloneWorkScopeV1';
import {admitRoofScreed25StandaloneMigrationProofV1 as admitOriginal} from './canonicalRoofScreed25StandaloneMigrationV1';
import {isRoofScreed25StandaloneCatalogV1} from './canonicalRoofScreed25StandaloneV1';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualExclusionMigrationBindings as exclusions,assertCanonicalStoredManualPriceReleaseMigration} from './canonicalManualPriceReleaseMigration';
import {assertCanonicalCompositionSelectionReleaseMigrationV1} from './canonicalEstimateCompositionSelectionV1';
import {compileCanonicalEstimateCore} from './canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
const identity=(r:any)=>({id:r.definition.id,catalogId:r.definition.catalog_id,sha256:r.definition.definition_sha256});
const facts={q:'20',[screed15.systemParameterId]:binding.systemYesRu,[pack.conditionsParameterId]:pack.conditionsYesRu,[pack.areaParameterId]:pack.areaYesRu};
const compile=(r:any,p:any=facts)=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:r.definition.catalog_id,compilerVersion:policy.contract,parameterDefinitions:r.parameters,formulaDefinitions:r.formulas,resourceDefinitions:r.resources,submittedParameters:p,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:137,hashJson:async v=>estimateDeterministicHash(v)});
const input=(index=0)=>{const from=fixture.reps[index],to=build(from);const i={from,to,fromDefinition:identity(from),toDefinition:{id:'00000000-0000-5000-8000-000000000006',catalogId:from.definition.catalog_id,sha256:'a'.repeat(64)}};return {...i,proof:proof(i)};};

test.each(fixture.reps.map((r,i)=>[r.definition.catalog_id,i]))('exact standalone scope preserves quantities and historical owners: %s',async(_id,index)=>{
 const i=input(index),before=JSON.stringify(i.from),old=await compile(i.from),next=await compile(i.to);
 expect(JSON.stringify(i.from)).toBe(before);expect(i.to.parameters).toEqual(i.from.parameters);expect(i.to.formulas).toEqual(i.from.formulas);
 expect(i.to.resources).toHaveLength(137);expect(next.rows.map(r=>[r.row_id,r.quantity,r.included_in_estimate])).toEqual(old.rows.map(r=>[r.row_id,r.quantity,r.included_in_estimate]));
 const remaining=(x:typeof next)=>x.preliminaryNeeds.filter(r=>r.row_id.includes(':remaining:'));
 expect(remaining(old)).toHaveLength(59);expect(remaining(next)).toHaveLength(43);
 const missingIds=new Set(next.preliminaryNeeds.map(r=>r.row_id));
 for(const suffix of policy.outsideRequestedWorkSuffixes)expect(missingIds.has(`${screed15.prefix}:remaining:${suffix}`)).toBe(false);
 const scopeRows=i.to.resources.filter(r=>Object.hasOwn(r.source_metadata,'standaloneWorkScopeV1'));expect(scopeRows).toHaveLength(16);
 expect(i.to.passport.decision.completeTechnicalEstimateAccepted).toBe(false);
 const legacy=await compile(i.to,{q:'20',[screed15.systemParameterId]:screed15.legacyChoiceRu}),oldLegacy=await compile(i.from,{q:'20',[screed15.systemParameterId]:screed15.legacyChoiceRu});
 expect(legacy.rows.map(r=>[r.row_id,r.quantity])).toEqual(oldLegacy.rows.map(r=>[r.row_id,r.quantity]));
 const noBase={...facts};delete noBase[pack.areaParameterId];const unconfirmed=await compile(i.to,noBase);
 expect(unconfirmed.rows.some(r=>r.included_in_estimate)).toBe(false);expect(unconfirmed.preliminaryNeeds.some(r=>r.missing_parameter_ids.includes(pack.areaParameterId))).toBe(true);
});

test.each(fixture.reps.map((r,i)=>[r.definition.catalog_id,i]))('safe migration preserves all manual values/exclusions and the accepted four-to-five ancestor: %s',(_id,index)=>{
 const i=input(index),a=admit(i)!;expect(a).not.toBeNull();expect(prices(a.normalizedTo)).toEqual(prices(i.from));expect(exclusions(a.normalizedTo)).toEqual(exclusions(i.from));
 const original=oldFixture.reps.find(r=>r.definition.catalog_id===i.from.definition.catalog_id)!;
 expect(admitOriginal({proof:i.from.definition.source_metadata.roofScreed25StandaloneMigrationV1,fromDefinition:identity(original),toDefinition:identity(i.from),from:original,to:i.from})).not.toBeNull();
 const rowId=`${screed15.prefix}:remaining:components_07`,override={[rowId]:{unitPrice:'123',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual',reason:'saved'}}};
 expect(()=>assertCanonicalStoredManualPriceReleaseMigration({parentOverrides:override,requestedOverrides:override,parentCustomRows:[],requestedCustomRows:[],fromBindings:prices(i.from),toBindings:prices(a.normalizedTo),fromExclusionBindings:exclusions(i.from),toExclusionBindings:exclusions(a.normalizedTo),parentCurrency:'KGS',requestedCurrency:'KGS'})).not.toThrow();
 expect(()=>assertCanonicalCompositionSelectionReleaseMigrationV1({selection:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[],excludedRowIds:[rowId]},from:i.from,to:a.normalizedTo})).not.toThrow();
});

test.each(['rate','own_requirement','arbitrary_parent','policy'])('fresh proof cannot authorize unintended mutation: %s',kind=>{
 const i=input();if(kind==='rate')i.to.formulas[0].ast={kind:'literal',value:'999'} as any;
 if(kind==='own_requirement')i.to.resources.find(r=>r.row_id.endsWith(':remaining:materials_02'))!.inclusion_ast={kind:'literal',value:false} as any;
 if(kind==='arbitrary_parent')i.fromDefinition.id='00000000-0000-5000-8000-000000000005';
 const p=proof(i);if(kind==='policy')p.policySha256='b'.repeat(64);expect(admit({...i,proof:p})).toBeNull();
});

test('version six needs the exact source and scope identity; arbitrary future versions remain unadmitted',()=>{
 const r=fixture.reps[0],metadata={...r.definition.source_metadata,roofStandaloneWorkScopeV1:ROOF_STANDALONE_WORK_SCOPE_SHA_V1};
 expect(isRoofScreed25StandaloneCatalogV1({catalogId:r.definition.catalog_id,definitionVersion:6,metadata})).toBe(true);
 expect(isRoofScreed25StandaloneCatalogV1({catalogId:r.definition.catalog_id,definitionVersion:6,metadata:r.definition.source_metadata})).toBe(false);
 expect(isRoofScreed25StandaloneCatalogV1({catalogId:r.definition.catalog_id,definitionVersion:7,metadata})).toBe(false);
});
