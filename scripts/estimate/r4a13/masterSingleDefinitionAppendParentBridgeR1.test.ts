// Actual historical curb receipts exercise the generic contract; no water proof is invented.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolveSingleDefinitionAppendParentBridgeR1, type AppendParentBridgeExpectationR1} from './masterSingleDefinitionAppendParentBridgeR1';
const ap='.release-runtime/r568/next-wave/masonry-krer08/current-guards/parent-curb-apply-r1.json';
const rp='data/estimate-benchmarks/fixtures/masonry005-parent-curb-readback-r1.json';
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const publication=JSON.parse(readFileSync(ap,'utf8')),readback=JSON.parse(readFileSync(rp,'utf8'));
const expected:AppendParentBridgeExpectationR1={
 applyStatus:'GREEN_GRANITE_KERB_CEMENT_COLUMN03_PREPARED_NOT_ACTIVE',readbackContract:'curb03-existing-governed-independent-readback/v1',readbackStatus:'PASS_CURB03_APPLY_INDEPENDENT_PAYLOAD_READBACK',
 publicationResultSha256:'6e84d717214f738ebe8dbc79d39e0c052ab9eb28334f4e58c3ef86b5d67e7935',
 source:{head:'c6acf562e6c6e0b42a0af37b76a4d3411a9cf9cc',tree:'fdb588413afafa8aab7dcde95b8a0f4792c18453'},
 parent:{definitionReleaseId:'77fb927f-72aa-5981-b243-c0a5e68bc3d9',searchReleaseId:'089161ff-00ab-5d96-9aa1-58f91e6139a2'},
 successor:{definitionReleaseId:'63d97ccc-3e50-5320-993b-63915d3a04f6',searchReleaseId:'21206ca4-cec9-57b0-8ed1-58bf97bc2cc7'},
 parentManifestCount:10462,catalogId:'canonical-work:master:granite_kerb_1gp_install_cement_concrete_pavement_standard',sourceId:'KRER27_2015_GRANITE_KERB_1GP_CEMENT_270201003',groupId:'wg:expanded:curbs',shape:[50,27,27],normativeBindings:21,priceBindings:0,unresolvedNeeds:6,
};
const input=()=>structuredClone({publication,readback,expected,currentSource:{...expected.source}});
it('uses exact closed actual historical proof bytes and preserves the inputs',()=>{
 expect(sha(readFileSync(ap))).toBe(expected.publicationResultSha256);
 expect(sha(readFileSync(rp))).toBe('9b5e7c1151060d76c9438ac7d2c6300ab85158096a62d2a055a34b7a2c3eca52');
 const value=input(),before=JSON.stringify(value);expect(resolveSingleDefinitionAppendParentBridgeR1(value)).toEqual(expected.successor);expect(JSON.stringify(value)).toBe(before);
});
const negatives:[string,(v:ReturnType<typeof input>)=>void][]=[
 ['dry instead of apply',v=>{v.publication.mutationPerformed=false;}],
 ['idempotent instead of fresh append',v=>{v.publication.idempotent=true;}],
 ['wrong apply status',v=>{v.publication.status='DRY';}],
 ['wrong parent definition',v=>{v.publication.predecessor.releaseId='00000000-0000-0000-0000-000000000000';}],
 ['wrong parent search',v=>{v.publication.predecessor.searchReleaseId='00000000-0000-0000-0000-000000000000';}],
 ['old target already existed',v=>{v.publication.predecessor.targetAbsentForAppend=false;}],
 ['configured zero shape masquerading as real absence',v=>{v.publication.predecessor.shape=[0,0,0];}],
 ['wrong source head',v=>{v.publication.source.head='0'.repeat(40);}],
 ['wrong source tree',v=>{v.publication.source.tree='0'.repeat(40);}],
 ['current code source drift',v=>{v.currentSource.head='0'.repeat(40);}],
 ['hashed dirty source',v=>{v.publication.source.hashedDirtySourceAccepted=true;}],
 ['wrong explicit successor',v=>{v.expected={...v.expected,successor:{...v.expected.successor,definitionReleaseId:'00000000-0000-0000-0000-000000000000'}};}],
 ['released instead of prepared',v=>{v.publication.audit.release.status='active';}],
 ['activation timestamp',v=>{v.publication.audit.release.activated_at='2026-10-18';}],
 ['wrong appended catalog',v=>{v.publication.publisherPreflight.plans[0].catalogId='other';}],
 ['second appended catalog',v=>{v.publication.publisherPreflight.plans.push(v.publication.publisherPreflight.plans[0]);}],
 ['wrong normative source',v=>{v.publication.publisherPreflight.plans[0].normativeSourceKeys=['other'];}],
 ['wrong group',v=>{v.publication.audit.searchPlacement.group_id='other';}],
 ['changed prior mapping in apply',v=>{v.publication.audit.unrelatedManifestChanges=1;}],
 ['deletion plus replacement with unchanged final count',v=>{v.readback.preservation.unrelatedManifestChanges=1;}],
 ['wrong parent manifest count',v=>{v.readback.preservation.parentManifestCount=10461;}],
 ['extra inserted membership',v=>{v.readback.preservation.successorManifestCount=10464;}],
 ['wrong binding count',v=>{v.publication.publisherPersistedSelfAudit.normativeBindingCount=20;}],
 ['price binding transferred',v=>{v.publication.publisherPersistedSelfAudit.compatiblePriceBindingCount=1;}],
 ['inherited price binding',v=>{v.publication.publisherPersistedSelfAudit.inheritedCompatiblePriceBindingCount=1;}],
 ['wrong need count',v=>{v.readback.newState.unresolvedNeeds=5;}],
 ['technical full ready',v=>{v.publication.audit.target.decision.technicalScopeStatus='READY';}],
 ['wrong payload',v=>{v.readback.newState.payloadSha256='0'.repeat(64);}],
 ['readback bound to another apply',v=>{v.readback.publicationResultSha256='0'.repeat(64);}],
 ['readback error',v=>{v.readback.error='failed';}],
 ['unclosed readback',v=>{v.readback.connectionClosed=false;}],
 ['no rollback',v=>{v.readback.transactionRolledBack=false;}],
 ['write transaction',v=>{v.readback.transactionReadOnly=false;}],
 ['database mutation by readback',v=>{v.readback.databaseWritesPerformed=true;}],
 ['missing payload section',v=>{v.readback.newState.projectionSections.pop();}],
 ['wrong payload row count',v=>{v.readback.newState.projectionSections[3].rows=26;}],
 ['reused normative source',v=>{v.readback.freshOwnedIdCounts.normativeSource=0;}],
 ['production mutation',v=>{v.publication.productionAccessed=true;}],
 ['complete type claim',v=>{v.readback.acceptedNewCompleteTypes=1;}],
 ['missing explicit publication hash',v=>{v.expected={...v.expected,publicationResultSha256:''};}],
];
it.each(negatives)('rejects %s',(_label,mutate)=>{const value=input();mutate(value);expect(()=>resolveSingleDefinitionAppendParentBridgeR1(value)).toThrow();});
