import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadRoofSingle539RealR224InputsR24} from './roofSingle539RealR224InputsR24';
import {prepareRoofSingle539WholeLayersR24} from './prepareRoofSingle539WholeLayersR24';
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const sourceRoot=process.env.ROOF_SINGLE539_SOURCE_ROOT_R24,outputRoot=process.env.ROOF_SINGLE539_ACTUAL_OUTPUT_R24;
assert(sourceRoot&&outputRoot,'ROOT_OWNED_SNAPSHOT_AND_FRESH_OUTPUT_REQUIRED');assert(!existsSync(outputRoot),'FRESH_ACTUAL_OUTPUT_REQUIRED');mkdirSync(outputRoot,{recursive:true});
let recorded=0;const record=(name:string,value:unknown)=>writeFileSync(resolve(outputRoot,String(++recorded).padStart(4,'0')+'.json'),JSON.stringify({name,value},null,2)+'\n',{flag:'wx'});
const inputs=loadRoofSingle539RealR224InputsR24();record('actual-r224-provenance-before-constructor',{readEvidence:inputs.source.readEvidence,captureSha256:inputs.source.capturedScopedNormativeRegistry.captureSha256,sourceAdmission:false});
const config=prepareRoofSingle539WholeLayersR24({releaseId:'2df79e8d-4012-5557-87c0-f36285f59f17',searchReleaseId:'9b042edf-ca06-50f6-969a-556e6d14547a',sourceRoot,outputRoot},{...inputs,record});
const retained=config.binding.retainParentBindings;assert(retained,'ORDINARY_RETAINED_BINDING_REQUIRED');const bound=[config.binding.rowId,...(config.binding.additionalRowIds??[])];
const rowId='roof:lower-layers:krer12-01503-01402:project-chain-check',row=config.resourceDefinitions.find(r=>r.row_id===rowId),captured=retained.capturedParent.resources.find(r=>r.row_id===rowId);
assert(row&&captured,'EXACT_HISTORICAL_SCOPE_COMPANION_RETAINED');const graph=row.resource_graph;assert(object(graph),'PUBLIC_RESOURCE_GRAPH_REQUIRED');const scope=graph.scopeRequirementV1;
record('ordinary-config-construction-before-assert',{catalogId:config.catalogId,normColumns:config.normId.split('/').length,boundRows:bound.length,resources:config.resourceDefinitions.length,oldParameters:retained.capturedParent.parameters.length,oldBindings:retained.capturedParent.bindings.length,scopeRowId:rowId,scopeOperation:graph.operationCompositionV1??null,scopeKind:object(scope)?scope.kind:null,coreEntries:0,fullTechnicalAcceptance:false});
assert.equal(config.catalogId,'canonical-work:base:roofing_interior_flat_roof_install_technical_room');assert.equal(config.catalogAppend,undefined);assert.equal(config.normId.split('/').length,31);
assert.equal(bound.length,282);assert.equal(new Set(bound).size,282);assert.equal(config.resourceDefinitions.length,570);assert.equal(retained.capturedParent.parameters.length,152);assert.equal(retained.capturedParent.bindings.length,186);
assert.equal(config.capturedScopedNormativeRegistry,inputs.source.capturedScopedNormativeRegistry);assert.equal(graph.operationCompositionV1,undefined);assert(object(scope)&&scope.kind==='OBJECT_SCOPE'&&scope.objectFactMode==='PROJECT_APPLICABILITY_ONLY'&&Array.isArray(scope.projectOperationContextsV1)&&scope.projectOperationContextsV1.length===4);
const newNativeIds=new Set(Object.keys(inputs.source.perRow));assert.equal(newNativeIds.size,234,'EXACT_NEW_NATIVE_ROWS_REQUIRED');
assert(Array.isArray(scope.coveringRowIds)&&Array.isArray(scope.originalRowIds));const historicalReferenceIds:string[]=[];
for(const refs of [scope.coveringRowIds,scope.originalRowIds])for(const id of refs){assert(typeof id==='string');historicalReferenceIds.push(id);}
for(const context of scope.projectOperationContextsV1){assert(object(context)&&Array.isArray(context.resourceRowIds));for(const id of context.resourceRowIds){assert(typeof id==='string');historicalReferenceIds.push(id);}}
const newNativeOverlap=historicalReferenceIds.filter(id=>newNativeIds.has(id));record('historical-project-chain-does-not-close-new-source-norms-before-assert',{newNativeRows:newNativeIds.size,historicalContexts:scope.projectOperationContextsV1.length,newNativeOverlap,operationOwner:null,sourceAdmission:false});
assert.deepEqual(newNativeOverlap,[],'HISTORICAL_SCOPE_MUST_NOT_CLOSE_NEW234_NORMS');assert.deepEqual(graph,captured.resource_graph);
assert.equal(row.unit_id,captured.unit_id);assert.equal(row.formula_id,captured.formula_id);assert.equal(row.cost_owner_id,captured.cost_owner_id);assert.deepEqual(row.source_metadata,captured.source_metadata);
assert(inputs.layers.physicalBindings.every(binding=>binding.owner===null),'UNKNOWN_PHYSICAL_STOCK_REMAINS_NULL');record('construction-smoke-outcome',{status:'PASS_ORDINARY_CONFIG_CONSTRUCTION_ONLY',coreEntries:0,sourceAdmission:false,normalLockedRegistered:'UNRUN',FULL:false});
console.log(JSON.stringify({status:'PASS_ORDINARY_CONFIG_CONSTRUCTION_ONLY',coreEntries:0,sourceAdmission:false,FULL:false}));
