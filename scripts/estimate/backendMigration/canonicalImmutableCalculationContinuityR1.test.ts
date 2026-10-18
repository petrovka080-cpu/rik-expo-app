import type {PoolClient} from 'pg';
import {readCanonicalImmutableCalculationIdentityR1 as readIdentity,readCanonicalSameImmutableCalculationR1 as readSame,
  assertCanonicalImmutableCalculationSavedInputsR1 as saved} from './canonicalImmutableCalculationContinuityR1';

const row={catalog_id:'canonical-work:master:water',definition_version_id:'c7a94a94-d3fa-5754-9aab-d9f63c953d1b',
  definition_sha256:'a'.repeat(64),approved_template_baseline_id:'22f25d3d-2e26-5c57-9832-e4668af7afb7'};
const parent=()=>({status:'ready',release_id:'old-release',catalog_id:row.catalog_id,definition_version_id:row.definition_version_id,
  currency_code:'KGS',price_snapshot_ids:[],amendment_contract:{rowOverrides:{material:{quantity:'0.03',titleRu:'Моя краска',unitPrice:'77'}},customRows:[],
    parameterSources:{approvedTemplateBaselineId:row.approved_template_baseline_id,userParameters:{length:'100'}}}});
const client=(rows:unknown[][])=>{const query=jest.fn();for(const r of rows)query.mockResolvedValueOnce({rows:r});return {query} as unknown as Pick<PoolClient,'query'>;};

it('reads the exact manifest definition and baseline without writing or accepting client authority',async()=>{
 const c=client([[row],[row]]),result=await readSame(c,parent(),'new-release');expect(result?.definitionVersionId).toBe(row.definition_version_id);
 const calls=jest.mocked(c.query).mock.calls;expect(calls).toHaveLength(2);
 for(const [sql]of calls){expect(String(sql)).toContain('b.definition_version_id=d.id');expect(String(sql)).toContain('m.baseline_ready and m.scenario_ready');expect(String(sql)).not.toMatch(/(?:insert|update|delete)\s/iu);}
});
it.each([[[]],[[row,row]]])('requires one whole scoped manifest anchor, not zero or an ambiguous result',async rows=>{
 expect(await readIdentity(client([rows]),'release',row.catalog_id)).toBeNull();
});
it('requires saved baseline provenance even when the same definition and baseline are in both manifests',async()=>{
 const p=parent();delete (p.amendment_contract.parameterSources as Partial<typeof p.amendment_contract.parameterSources>).approvedTemplateBaselineId;
 expect(await readSame(client([[row],[row]]),p,'new-release')).toBeNull();
});
it('keeps changed-baseline and changed-definition migrations on the existing strict path',async()=>{
 for(const changed of [{...row,definition_version_id:'11111111-1111-4111-8111-111111111111'},
   {...row,approved_template_baseline_id:'11111111-1111-4111-8111-111111111111'}]){
  expect(await readSame(client([[row],[changed]]),parent(),'new-release')).toBeNull();
 }
});
it('does not enter continuity for an ordinary same-release edit or an unready parent',async()=>{
 const c=client([]);expect(await readSame(c,parent(),'old-release')).toBeNull();expect(await readSame(c,{...parent(),status:'failed'},'new-release')).toBeNull();
 expect(c.query).not.toHaveBeenCalled();
});
it('inherits the saved empty snapshot list and full manual input; new changes require a later child',()=>{
 const p=parent(),body={currencyCode:'KGS',parameters:{},rowOverrides:p.amendment_contract.rowOverrides,customRows:[]};
 expect(saved(p,body)).toEqual([]);expect(()=>saved(p,{...body,parameters:{length:'99'}})).toThrow('Сначала продолжите');
 expect(()=>saved(p,{...body,rowOverrides:{}})).toThrow('Сначала продолжите');
});
