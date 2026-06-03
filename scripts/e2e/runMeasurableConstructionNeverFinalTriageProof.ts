import { runMeasurableConstructionNeverFinalTriageProof } from "./measurableConstructionNeverFinalTriageCore";

const result = runMeasurableConstructionNeverFinalTriageProof();
console.log(JSON.stringify(result.matrix, null, 2));
