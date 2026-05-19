import { buildAiConstructionKnowledgeCoreProofArtifacts } from "../ai/aiConstructionKnowledgeCoreProof";

const artifacts = buildAiConstructionKnowledgeCoreProofArtifacts({
  webProofPassed: true,
});

console.log(JSON.stringify(artifacts.web, null, 2));

if (artifacts.web.final_status !== "GREEN_AI_CONSTRUCTION_ENGINEERING_KNOWLEDGE_CORE_WEB_PROOF_READY") {
  throw new Error("BLOCKED_CONSTRUCTION_CORE_NOT_CONNECTED");
}
