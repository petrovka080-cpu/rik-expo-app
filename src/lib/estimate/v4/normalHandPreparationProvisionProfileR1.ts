import pack from '../../../../data/estimate-benchmarks/source-packs/normal-hand-preparation-provision-r1.json';
export const normalHandPreparationProvisionPackR1=pack;
/** A dose/pack balance, not a second worker/phase calculator. The consumer
 * supplies its already admitted finite number of pre-protection preparations. */
export function normalHandPreparationCleanserExpressionsR1(preparationsExpression:string,effectiveConsumedLExpression?:string){
 if(pack.doseMl!=='0.7'||pack.cartridgeL!=='1'||pack.dispenserCode!=='TPW1LDS'
  ||pack.dispenserFunctionalCount!==1||pack.waterQuantityClosed||pack.dryingQuantityClosed)
  throw Error('NORMAL_HAND_PREPARATION_EXACT_SOURCE_PROFILE_REQUIRED');
 const nominalUseL=`(${preparationsExpression})*0.0007`,consumedL=effectiveConsumedLExpression??nominalUseL,orderL=`ceil(${consumedL})`;
 return{nominalUseL,consumedL,orderL,reserveL:`(${orderL})-(${consumedL})`,orderQuantumL:'1',dispenserCount:'1'};
}
