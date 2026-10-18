// Pure evidence validator for one explicit, root-pinned append parent transition.
// Callers verify byte pins, real current source/pointer and source-specific rows.
// This function performs no IO, discovery, SQL, source rewriting or publication.
import {strict as assert} from 'node:assert';
type Json=Record<string,any>;
export type AppendParentPairR1=Readonly<{definitionReleaseId:string;searchReleaseId:string}>;
export type AppendParentBridgeExpectationR1=Readonly<{
 applyStatus:string;readbackContract:string;readbackStatus:string;publicationResultSha256:string;
 source:Readonly<{head:string;tree:string}>;parent:AppendParentPairR1;successor:AppendParentPairR1;
 parentManifestCount:number;catalogId:string;sourceId:string;groupId:string;
 shape:readonly[number,number,number];normativeBindings:number;priceBindings:number;unresolvedNeeds:number;
}>;
export function resolveSingleDefinitionAppendParentBridgeR1(input:Readonly<{
 publication:Json;readback:Json;expected:AppendParentBridgeExpectationR1;
 currentSource:Readonly<{head:string;tree:string}>;
}>):AppendParentPairR1{
 const {publication:p,readback:r,expected:e}=input;
 assert(/^[a-f0-9]{64}$/.test(e.publicationResultSha256),'BRIDGE_EXPLICIT_PUBLICATION_PIN_REQUIRED');
 for(const x of [e.source.head,e.source.tree])assert(/^[a-f0-9]{40}$/.test(x),'BRIDGE_EXPLICIT_SOURCE_REQUIRED');
 assert.deepEqual(input.currentSource,e.source,'BRIDGE_CURRENT_SOURCE_CHANGED');
 for(const pair of [e.parent,e.successor])for(const value of Object.values(pair))
  assert(/^[a-f0-9-]{36}$/.test(value),'BRIDGE_EXPLICIT_PAIR_REQUIRED');
 assert.notEqual(e.parent.definitionReleaseId,e.successor.definitionReleaseId);
 assert.notEqual(e.parent.searchReleaseId,e.successor.searchReleaseId);
 assert(Number.isSafeInteger(e.parentManifestCount)&&e.parentManifestCount>0);
 assert(e.shape.length===3&&e.shape.every(n=>Number.isSafeInteger(n)&&n>0));
 assert.equal(p.status,e.applyStatus,'BRIDGE_EXACT_APPLY_REQUIRED');
 assert.equal(p.mutationPerformed,true);assert.equal(p.idempotent,false);
 assert.equal(p.source.head,e.source.head);assert.equal(p.source.tree,e.source.tree);
 assert.equal(p.source.hashedDirtySourceAccepted,false,'BRIDGE_DIRTY_SOURCE_FORBIDDEN');
 assert.equal(p.predecessor.releaseId,e.parent.definitionReleaseId,'BRIDGE_CAPTURED_PARENT_CHANGED');
 assert.equal(p.predecessor.searchReleaseId,e.parent.searchReleaseId);
 assert.equal(p.predecessor.targetAbsentForAppend,true);assert.equal(p.predecessor.catalogId,e.catalogId);
 assert.equal(p.predecessor.definitionId,null);assert.equal(p.predecessor.shape,null);
 assert.equal(p.successor.releaseId,e.successor.definitionReleaseId,'BRIDGE_EXPLICIT_SUCCESSOR_CHANGED');
 assert.equal(p.successor.searchReleaseId,e.successor.searchReleaseId);
 assert.deepEqual(p.successor.shape,[...e.shape]);assert.equal(p.successor.definitionVersion,1);
 assert.equal(p.successor.nextCounts.definitions,e.parentManifestCount+1);
 assert.equal(p.audit.release.id,e.successor.definitionReleaseId);assert.equal(p.audit.release.status,'prepared');
 assert.equal(p.audit.release.activated_at,null);assert.equal(p.audit.release.definition_count,e.parentManifestCount+1);
 assert.equal(p.audit.search.definition_release_id,e.successor.definitionReleaseId);assert.equal(p.audit.search.release_status,'draft');
 assert.equal(p.audit.search.definition_version_id,p.successor.definitionId);
 assert.equal(p.audit.manifest.identities,e.parentManifestCount+1);assert.equal(p.audit.manifest.replaced,1);
 assert.equal(p.audit.unrelatedManifestChanges,0,'BRIDGE_UNRELATED_MANIFEST_CHANGED');
 for(const value of [p.audit.identity.catalog_id,p.audit.target.catalog_id,p.audit.search.catalog_id])assert.equal(value,e.catalogId);
 assert.equal(p.audit.searchPlacement.group_id,e.groupId);
 assert(Array.isArray(p.audit.searchPlacement.member_catalog_ids)&&p.audit.searchPlacement.member_catalog_ids.includes(e.catalogId));
 const plans=p.publisherPreflight.plans;assert.equal(plans.length,1,'BRIDGE_EXACTLY_ONE_APPENDED_CATALOG_REQUIRED');
 const plan=plans[0];assert.equal(plan.catalogId,e.catalogId);assert.deepEqual(plan.normativeSourceKeys,[e.sourceId]);
 assert.deepEqual([plan.parameters,plan.formulas,plan.resources],[...e.shape]);assert.equal(plan.normativeBindings,e.normativeBindings);
 const a=p.publisherPersistedSelfAudit;assert.equal(a.catalogId,e.catalogId);assert.equal(a.definitionId,p.successor.definitionId);
 assert.deepEqual([a.parameterCount,a.formulaCount,a.resourceCount],[...e.shape]);
 assert.equal(a.normativeBindingCount,e.normativeBindings);assert.equal(a.compatiblePriceBindingCount,e.priceBindings);
 assert.equal(a.inheritedCompatiblePriceBindingCount,0);assert(/^[a-f0-9]{64}$/.test(a.payloadSha256));
 assert.equal(plan.payloadSha256,a.payloadSha256);
 assert.equal(p.audit.target.decision.quantityScope,'PARTIAL');
 assert.equal(p.audit.target.decision.technicalScopeStatus,'NEEDS_SOURCE');
 assert.equal(p.audit.target.decision.activationAllowed,false);assert.equal(p.audit.target.decision.productionEligible,false);
 assert.equal(p.audit.target.decision.unresolvedResourceRowIds.length,e.unresolvedNeeds);
 for(const field of ['productionAccessed','deployPerformed','activationPerformed','releasePerformed','otaPerformed'])assert.equal(p[field],false);
 assert.equal(r.contract,e.readbackContract);assert.equal(r.status,e.readbackStatus,'BRIDGE_EXACT_CLOSED_READBACK_REQUIRED');
 assert.equal(r.error,null);assert.equal(r.publicationResultSha256,e.publicationResultSha256);
 assert.equal(r.sourceHead,e.source.head);assert.equal(r.transactionReadOnly,true);assert.equal(r.transactionRolledBack,true);
 assert.equal(r.connectionClosed,true);assert.equal(r.databaseWritesPerformed,false);
 // The pinned readback contract compares every prior mapping null-safely,
 // including missing rows. Counts plus exactly one plan prohibit extra inserts.
 assert.equal(r.preservation.unrelatedManifestChanges,0,'BRIDGE_INDEPENDENT_PARENT_MAPPING_CHANGED');
 assert.equal(r.preservation.parentManifestCount,e.parentManifestCount);
 assert.equal(r.preservation.successorManifestCount,e.parentManifestCount+1);
 assert.equal(r.newState.payloadSha256,a.payloadSha256,'BRIDGE_INDEPENDENT_PAYLOAD_CHANGED');
 assert.deepEqual([r.newState.parameters,r.newState.formulas,r.newState.resources],[...e.shape]);
 assert.equal(r.newState.definitionVersion,1);assert.equal(r.newState.normativeBindings,e.normativeBindings);
 assert.equal(r.newState.priceBindings,e.priceBindings);assert.equal(r.newState.quantityScope,'PARTIAL');
 assert.equal(r.newState.unresolvedNeeds,e.unresolvedNeeds);
 const projectionNames=['definition','parameters','formulas','resources','baseline','passport','bindings','priceBindings'];
 assert.deepEqual(r.newState.projectionSections.map((x:Json)=>x.name),projectionNames);
 for(const projection of r.newState.projectionSections)assert(/^[a-f0-9]{64}$/.test(projection.sha256));
 const projectionRows=[1,e.shape[0],e.shape[1],e.shape[2],1,1,e.normativeBindings,e.priceBindings];
 assert.deepEqual(r.newState.projectionSections.map((x:Json)=>x.rows),projectionRows);
 for(const field of ['release','definition','baseline','searchRelease','identity','normativeSource','normativeLocator','searchGroup','searchMembership'])
  assert.equal(r.freshOwnedIdCounts[field],1,'BRIDGE_EXACT_FRESH_APPEND_ID_COUNT:'+field);
 assert.equal(r.acceptedNewCompleteTypes,0);assert.equal(r.fullTechnicalAcceptance,false);
 return {...e.successor};
}
