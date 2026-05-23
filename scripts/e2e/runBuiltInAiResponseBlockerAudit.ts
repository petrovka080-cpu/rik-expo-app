import { writeBuiltInAiProofArtifacts } from "./builtInAiProofShared";

const artifacts = writeBuiltInAiProofArtifacts();
console.log(JSON.stringify(artifacts.auditMatrix, null, 2));
if (artifacts.auditMatrix.final_status !== "GREEN_BUILT_IN_AI_RESPONSE_BLOCKER_AUDIT_READY") process.exit(1);
