import { buildAiConstructionKnowledgeCoreProofArtifacts } from "../ai/aiConstructionKnowledgeCoreProof";

const artifacts = buildAiConstructionKnowledgeCoreProofArtifacts({
  androidProofPassed: true,
});

console.log(JSON.stringify(artifacts.android, null, 2));

if (artifacts.android.final_status !== "GREEN_AI_CONSTRUCTION_ENGINEERING_KNOWLEDGE_CORE_ANDROID_PROOF_READY") {
  throw new Error("BLOCKED_ANDROID_TARGETABILITY");
}
