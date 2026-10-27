import pack from '../../../../data/estimate-benchmarks/source-packs/marly-skin-normal-provision-r1.json';
export const marlySkinNormalProvisionPackR1=pack;
export const marlySkinRequiredHandHygieneR1=pack.handHygiene;
/** Source-owned expressions only. Actual geometry, worker-hours, phase restarts,
 * operation links and cost ownership remain with each compatible adapter. */
export function marlySkinNormalSupplyExpressionsR1(plannedApplicationsExpression:string,effectiveNominalUseExpression?:string){
 if(pack.canL!=='0.1'||pack.normalHandApplicationsPerCanApprox!==150||pack.normalSupplyBlockApplications!==400||pack.normalSupplyBlockCans!==3||pack.protectionPeriodHours!==4||!pack.capacityIsApproximate)throw Error('MARLY_EXACT_SOURCE_PROFILE_REQUIRED');
 const applications=effectiveNominalUseExpression?`(${effectiveNominalUseExpression})*150/0.1`:plannedApplicationsExpression,
  nominalUseL=`(${plannedApplicationsExpression})*0.1/150`,orderCans=`ceil((${applications})/400)*3`,orderL=`ceil((${applications})/400)*0.3`,effective=effectiveNominalUseExpression??nominalUseL;
 return{nominalUseL,orderCans,orderL,reserveL:`(${orderL})-(${effective})`};
}
