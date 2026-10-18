// Prospective pure factory tests. All execution belongs to root; no PG or writes.
import args from '../../../data/estimate-benchmarks/fixtures/ceramic02703-factory-arguments-r1.json';
import {ceramicFloorCementMortarKrer11Column03AppendConfigR1 as factory,
 type CeramicFloor02703AppendEvidenceR1} from './prepareCeramicFloorCementMortarKrer11Column03AppendR1';
import {ceramicFloor02703PackR1 as pack,ceramicFloor02703PrefixR1 as prefix} from '../../../src/lib/estimate/v4/ceramicFloorCementMortarKrer11Column03R1';
const evidence:CeramicFloor02703AppendEvidenceR1=args.evidence;

it('builds a source-specific partial append against the captured current pair',()=>{
 const c=factory(evidence);
 expect([c.parentReleaseId,c.parentSearchReleaseId]).toEqual(['aca4fa71-60c2-57db-83c8-5c8be93175a7','0c4a0ed7-a579-57ae-9104-4e088dd09963']);
 expect(c.catalogId).toBe(pack.catalogId);expect(c.sourceId).toBe(pack.sourceId);
 expect(c.catalogAppend).toMatchObject({requireUniqueWorkKey:true,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},
  identity:{namespace:'global',domain:'tile_stone',sourceIdentity:pack.proposedIdentity.sourceIdentityId,workKey:pack.proposedIdentity.workKey},
  searchPlacement:{groupMode:'create',groupId:'wg:master:ceramic_floor_cement_mortar_m150',membershipOrdinal:0,publicationState:'ADMITTED_BACKEND'}});
 expect(c.expectedParentShape).toEqual([0,0,0]);expect(c.shortInput).toEqual({net_ceramic_floor_area_m2:100});expect(c.runtimeProfileInput).toEqual({});
 expect(c.resourceDefinitions).toHaveLength(29);
 expect([c.binding.rowId,...c.binding.additionalRowIds!]).toHaveLength(19);
 expect(c.passport.unresolvedApplicableResourceRowIds).toEqual(pack.gaps.map(g=>prefix+':'+g.id));
 for(const m of pack.materials)expect(c.passport.independentCompletenessMap?.entries.some((e:{resolution:{rowId:string}})=>e.resolution.rowId===prefix+':'+m.id+'-order')).toBe(true);
 expect(c.applicability).toMatchObject({quantityScope:'PARTIAL',fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,unknownPricesRemainUnknown:true,historicBindingsInherited:false});
});
it('verifies quantities, operated-price isolation and six unresolved obligations using the common compiler',async()=>{
 const c=factory(evidence);
 await expect(c.verifyCore()).resolves.toEqual({status:'PARTIAL_SOURCE_BOUND_CERAMIC02703',knownRows:20,resourceDefinitions:29,compositeBindings:19,openNeeds:6,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0});
});
it.each(Object.keys(evidence) as (keyof CeramicFloor02703AppendEvidenceR1)[])('refuses a changed captured evidence pin %s before loading',key=>{
 expect(()=>factory({...evidence,[key]:{...evidence[key],sha256:'0'.repeat(64)}})).toThrow('EXACT_PIN:'+key);
});
it('keeps skirting and source consumption distinct from derived order/billing owners',()=>{
 const c=factory(evidence),ids=[c.binding.rowId,...c.binding.additionalRowIds!];
 for(const m of pack.materials){expect(ids).toContain(prefix+':'+m.id+'-consumed');expect(ids).not.toContain(prefix+':'+m.id+'-order');}
 for(const g of pack.gaps)expect(ids).not.toContain(prefix+':'+g.id);
 expect(c.search.primaryUom).toBe('m2');expect(c.search.aliases.join(' ')).not.toMatch(/CM11|CE40|CT17|CS25|керамогранит/iu);
 expect(c.sourceMetadata.artifact_sha256).toBe('e56ef148df993609c325b7d505c54b1806e8185a4fd7a1550b15266144538223');
});
