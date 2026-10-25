import {mkdirSync,writeFileSync} from 'node:fs';
import {isAbsolute,resolve} from 'node:path';
import {prepareElecorEndcapsBoundContextR248} from './prepareElecorEndcapsBoundContextR248';
import {prepareElecorEndcapsCurrentMasterR239} from './prepareElecorEndcapsCurrentMasterR239';

/** One ordinary Config callback on the real current v2 parent; no generic14 replay or SQL/publisher. */
describe('actual ELECOR v2 ordinary whole end-node finite',()=>{
  it('runs the existing fourteen core outcomes after whole-parent and exact source-preimage guards',async()=>{
    const output=process.env.ELECOR_ENDCAP_R248_RAW_DIR;
    if(!output||!isAbsolute(output))throw Error('EXPLICIT_FRESH_ACTUAL_RAW_OUTPUT_REQUIRED');
    mkdirSync(output,{recursive:true});let actualCalls=0;const outcomes:{name:string}[]=[];
    const save=(name:string,value:unknown)=>{outcomes.push({name});
      writeFileSync(resolve(output,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
    const bound=prepareElecorEndcapsBoundContextR248({sourceRoot:resolve(__dirname,'../../..'),
      onCoreCall:(count,name)=>{actualCalls=count;
        writeFileSync(resolve(output,'actual-core-entry-counter.json'),JSON.stringify({actualCalls,name})+'\n');},
      onOutcome:save});
    save('actual-bound-full-readset-before-config',bound.evidence);
    const config=prepareElecorEndcapsCurrentMasterR239(bound.context);
    save('ordinary-config-constructed-before-core',{catalogId:config.catalogId,shape:[config.parameterDefinitions.length,
      config.formulaDefinitions.length,config.resourceDefinitions.length],sourceId:config.sourceId,publisherExecuted:false,databaseWrites:0});
    const result=await config.verifyCore();save('final-actual-bound-finite-result',result);
    expect(actualCalls).toBe(14);expect(result.results).toBe(10);expect(result.rejects).toBe(4);
    expect(outcomes.filter(x=>x.name.startsWith('actual-core-'))).toHaveLength(14);
    expect(result.full).toBe(false);expect(result.newCatalogs).toBe(0);expect(result.actualProjectAuthenticated).toBe(false);
  });
});
