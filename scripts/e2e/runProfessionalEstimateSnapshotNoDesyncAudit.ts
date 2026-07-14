import { runProfessionalEstimateSnapshotNoDesyncAudit } from "./professionalEstimate1500WorkCases";

const result = runProfessionalEstimateSnapshotNoDesyncAudit();
console.log(JSON.stringify(result, null, 2));
