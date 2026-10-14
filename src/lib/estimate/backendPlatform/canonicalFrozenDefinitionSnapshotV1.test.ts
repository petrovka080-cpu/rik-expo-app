import {readFrozenDefinitionSnapshotV1 as read} from './canonicalFrozenDefinitionSnapshotV1';
const artifact:unknown=require('../../../../data/estimate-benchmarks/fixtures/concrete-base-two-parents-s27-69.json');
test('reads the existing full models by reference and preserves all metadata and bytes',()=>{
 const before=JSON.stringify(artifact),result=read(artifact,'models');expect(result).toBe(artifact);expect(result.models).toHaveLength(2);expect(JSON.stringify(artifact)).toBe(before);
});
test.each(['root','array','identity','parameter','formula','resource'])('rejects damaged frozen structure: %s',change=>{
 const changed=structuredClone(read(artifact,'models'));
 if(change==='root'){expect(()=>read(null,'models')).toThrow('snapshot structure invalid');return;}
 if(change==='array')(changed as unknown as {models:unknown}).models={};
 if(change==='identity')changed.models[0]!.definition.definition_sha256='forged';
 if(change==='parameter')changed.models[0]!.parameters[0]!.required='yes';
 if(change==='formula')changed.models[0]!.formulas[0]!.ast=null;
 if(change==='resource')changed.models[0]!.resources[0]!.resource_graph=null;
 expect(()=>read(changed,'models')).toThrow('snapshot structure invalid');
});
