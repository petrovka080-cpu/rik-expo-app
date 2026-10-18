import {canonicalSameImmutableCalculationV1 as same,canonicalSavedApprovedTemplateBaselineIdV1 as baseline,
  parseCanonicalImmutableCalculationIdentityV1 as parse,assertCanonicalImmutableCalculationBridgeV1 as bridge} from './canonicalImmutableCalculationContinuityV1';

const identity={catalogId:'canonical-work:master:water',definitionVersionId:'c7a94a94-d3fa-5754-9aab-d9f63c953d1b',
  definitionSha256:'a'.repeat(64),approvedTemplateBaselineId:'22f25d3d-2e26-5c57-9832-e4668af7afb7'};
const proof=()=>({fromIdentity:identity,toIdentity:{...identity},savedCatalogId:identity.catalogId,
  savedDefinitionVersionId:identity.definitionVersionId,savedApprovedTemplateBaselineId:identity.approvedTemplateBaselineId});
const overrides={material:{quantity:'0.03',unitPrice:'77',titleRu:'Моя краска',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual'}}};
const custom=[{rowId:'custom-one',titleRu:'Моя строка',quantity:'2',unitPrice:'9',unitId:'pcs'}];
const inputs=()=>({parentCurrency:'KGS',requestedCurrency:'KGS',parentOverrides:overrides,requestedOverrides:JSON.parse(JSON.stringify(overrides)),
  parentCustomRows:custom,requestedCustomRows:JSON.parse(JSON.stringify(custom)),parentUserParameters:{length:'100',reference:'Мой проект'},requestedParameters:{},
  parentPriceSnapshotIds:[] as string[],requestedPriceSnapshotIds:undefined as unknown,parentCompositionSelection:null,requestedCompositionSelection:undefined as unknown});

it('proves exact immutable definition and baseline from both catalogues and saved provenance',()=>{
 expect(same(proof())).toBe(true);expect(parse(identity)).toEqual(identity);
 expect(baseline({parameterSources:{approvedTemplateBaselineId:identity.approvedTemplateBaselineId}})).toBe(identity.approvedTemplateBaselineId);
 expect(baseline({})).toBeNull();
});
it.each(['catalogId','definitionVersionId','definitionSha256','approvedTemplateBaselineId'] as const)('rejects another %s even if other fields match',key=>{
 const value=key==='definitionSha256'?'b'.repeat(64):key==='catalogId'?'canonical-work:master:other':'11111111-1111-4111-8111-111111111111';
 expect(same({...proof(),toIdentity:{...identity,[key]:value}})).toBe(false);
});
it('requires all identity fields and exact saved definition/baseline provenance',()=>{
 expect(same({...proof(),fromIdentity:{definitionVersionId:identity.definitionVersionId}})).toBe(false);
 expect(same({...proof(),savedApprovedTemplateBaselineId:null})).toBe(false);
 expect(same({...proof(),savedDefinitionVersionId:'11111111-1111-4111-8111-111111111111'})).toBe(false);
 expect(parse({...identity,clientAllow:true})).toBeNull();
});
it('preserves full saved quantity, price, title, exclusions and custom rows without mutating them',()=>{
 const input=inputs(),before=JSON.stringify(input);expect(bridge(input)).toEqual([]);expect(JSON.stringify(input)).toBe(before);
});
it('retains exact empty and nonempty snapshot lists without using new defaults',()=>{
 const input=inputs(),ids=['11111111-1111-4111-8111-111111111111'];
 expect(bridge({...input,requestedPriceSnapshotIds:[]})).toEqual([]);
 const result=bridge({...input,parentPriceSnapshotIds:ids});expect(result).toEqual(ids);expect(result).not.toBe(ids);
 expect(()=>bridge({...input,requestedPriceSnapshotIds:ids})).toThrow('Сначала продолжите');
});
it.each([
 ['new price',{requestedOverrides:{}}],['new custom row',{requestedCustomRows:[]}],['new currency',{requestedCurrency:'USD'}],
 ['new measurement',{requestedParameters:{length:'99'}}],['new composition',{requestedCompositionSelection:{excludedRowIds:['material']}}],
 ['malformed parameters',{requestedParameters:[]}],['missing saved snapshot provenance',{parentPriceSnapshotIds:null}],
])('rejects %s during the continuity bridge',(_label,change)=>expect(()=>bridge({...inputs(),...change})).toThrow('Сначала продолжите'));
it('accepts an exact repeat of saved user facts while derived outputs remain outside that snapshot',()=>{
 const input=inputs();expect(bridge({...input,requestedParameters:{...input.parentUserParameters}})).toEqual([]);
 expect(()=>bridge({...input,requestedParameters:{...input.parentUserParameters,derived_order:'4'}})).toThrow('Сначала продолжите');
});
