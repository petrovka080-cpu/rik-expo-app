import { parseEstimateReadinessManifest } from "./catalogArtifactDataContract";

// Static literal require is resolved by Metro/Node to the SAME real artifact.
// Runtime schema validation replaces the enormous inferred JSON literal type;
// no ambient declaration, alternate resolver, data projection or hidden default.
const artifact: unknown = require("../../../data/estimate-templates/estimate-10000-readiness-manifest.json");
export const estimate10000ReadinessManifest = parseEstimateReadinessManifest(artifact);
