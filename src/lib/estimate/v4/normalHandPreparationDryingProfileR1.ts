import pack from '../../../../data/estimate-benchmarks/source-packs/normal-hand-preparation-drying-r1.json';
export const normalHandPreparationDryingPackR1=pack;
/** A selected physical drying method and paired-pack balance. The consumer
 * owns its already admitted preparation schedule and saved consumed driver;
 * this helper does not calculate workers, phases, medical work or washwater. */
export function normalHandPreparationDryingExpressionsR1(preparationsExpression:string,effectiveConsumedPiecesExpression?:string){
 if(pack.towelsPerPreparation!==2||pack.towelsPerPairedPack!==2||pack.productCode!=='DYNJPE2220A'
  ||pack.sizeCm.join('x')!=='37x69'||!pack.singleUse||pack.surgicalClinicalRegimeTransferred
  ||pack.constructionNormClaimed||pack.powerRequired||pack.waterQuantityClosed)
  throw Error('NORMAL_HAND_DRYING_EXACT_SELECTED_PHYSICAL_PROFILE_REQUIRED');
 const nominalUsePcs=`(${preparationsExpression})*2`,consumedPcs=effectiveConsumedPiecesExpression??nominalUsePcs,
  orderPcs=`ceil((${consumedPcs})/2)*2`;
 return{nominalUsePcs,consumedPcs,orderPcs,orderPairedPacks:`(${orderPcs})/2`,
  reservePcs:`(${orderPcs})-(${consumedPcs})`,orderQuantumPcs:'2'};
}
