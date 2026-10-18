// Prospective pure parent-transition checks. No DB, pointer write or publisher invocation.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {resolveBrickPartition005ParentRebaseR1} from './prepareBrickPartitionHalfKrer08Column05AppendR1';

type Json=Record<string,any>;
const fixtures=[
 ['.release-runtime/r568/next-wave/masonry-krer08/current-guards/parent-curb-apply-r1.json','6e84d717214f738ebe8dbc79d39e0c052ab9eb28334f4e58c3ef86b5d67e7935'],
 ['data/estimate-benchmarks/fixtures/masonry005-parent-curb-readback-r1.json','9b5e7c1151060d76c9438ac7d2c6300ab85158096a62d2a055a34b7a2c3eca52'],
] as const;
const load=(index:number):Json=>JSON.parse(readFileSync(resolve(process.cwd(),fixtures[index][0]),'utf8'));
const check=(publication=load(0),readback=load(1))=>resolveBrickPartition005ParentRebaseR1(publication,readback);

it.each(fixtures)('pins exact parent-transition proof bytes %s',(path,sha)=>{
 expect(createHash('sha256').update(readFileSync(resolve(process.cwd(),path))).digest('hex')).toBe(sha);
});
it('accepts only the preserved actual curb append from the historical masonry parent',()=>{
 expect(check()).toEqual({definitionReleaseId:'63d97ccc-3e50-5320-993b-63915d3a04f6',searchReleaseId:'21206ca4-cec9-57b0-8ed1-58bf97bc2cc7'});
});
const publicationMutations:Array<[string,(value:Json)=>void]>=[
 ['old definition parent changed',v=>{v.predecessor.releaseId='different-parent';}],
 ['old search parent changed',v=>{v.predecessor.searchReleaseId='different-search-parent';}],
 ['successor changed',v=>{v.successor.releaseId='unproven-successor';}],
 ['search successor changed',v=>{v.successor.searchReleaseId='unproven-search-successor';}],
 ['unrelated manifest changed',v=>{v.audit.unrelatedManifestChanges=1;}],
 ['different new identity',v=>{v.audit.target.catalog_id='canonical-work:master:brick_partition_half_unreinforced_upto4m_krer08_02_002_05';}],
 ['masonry group touched',v=>{v.audit.searchPlacement.group_id='wg:master:brick_partition_half_unreinforced_upto4m';}],
 ['masonry source touched',v=>{v.audit.target.decision.independentCompletenessMap.entries[0].sourceId='kg_krer08_02_002_05_half_brick_unreinforced_upto4m_r1';}],
];
it.each(publicationMutations)('rejects unproved publication transition: %s',(_label,mutate)=>{
 const value=load(0);mutate(value);expect(()=>check(value)).toThrow();
});
const readbackMutations:Array<[string,(value:Json)=>void]>=[
 ['not accepted',v=>{v.status='NOT_ACCEPTED';}],
 ['wrong apply bytes',v=>{v.publicationResultSha256='0'.repeat(64);}],
 ['independent unrelated change',v=>{v.preservation.unrelatedManifestChanges=1;}],
 ['floor not preserved',v=>{v.preservation.floor.unchanged=false;}],
 ['payload differs',v=>{v.newState.payloadSha256='0'.repeat(64);}],
 ['read not closed',v=>{v.connectionClosed=false;}],
];
it.each(readbackMutations)('rejects unproved independent preservation: %s',(_label,mutate)=>{
 const value=load(1);mutate(value);expect(()=>check(load(0),value)).toThrow();
});
