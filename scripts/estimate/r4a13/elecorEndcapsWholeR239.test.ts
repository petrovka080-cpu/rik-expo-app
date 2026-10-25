import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {verifyElecorEndcapsWholeR239} from './verifyElecorEndcapsWholeR239';

/** Existing Jest / existing core / existing PDF projector only. This source-only
 * callback does not admit a current DB parent or authenticate a project. */
describe('existing ELECOR complete end-node material owner',()=>{
  it('preserves the whole legacy owner and checks fourteen independent quantity/amendment outcomes',async()=>{
    const output=process.env.ELECOR_ENDCAP_R239_RAW_DIR,events:unknown[]=[];
    if(output)mkdirSync(output,{recursive:true});
    const save=(name:string,value:unknown)=>{events.push({name,value});
      if(output)writeFileSync(resolve(output,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
    let actualCalls=0;
    const proof=await verifyElecorEndcapsWholeR239({onCoreCall:(count,name)=>{actualCalls=count;
      if(output)writeFileSync(resolve(output,'actual-core-entry-counter.json'),JSON.stringify({actualCalls,name})+'\n');},onOutcome:save});
    save('final-finite-result',proof);
    expect(actualCalls).toBe(14);expect(proof.results).toBe(11);expect(proof.rejects).toBe(3);
    expect(events.filter(event=>typeof event==='object'&&event!==null&&'name'in event&&String(event.name).startsWith('actual-core-'))).toHaveLength(14);
    expect(proof.full).toBe(false);expect(proof.newCatalogs).toBe(0);expect(proof.actualProjectAuthenticated).toBe(false);
  });
});
