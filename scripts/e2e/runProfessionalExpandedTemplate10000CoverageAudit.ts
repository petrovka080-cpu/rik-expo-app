import {
  buildProductionTemplate10000AcceptanceMatrix,
  buildProductionTemplate10000CategoryDistribution,
} from "../../src/lib/ai/estimateTemplate10000";
import { writeJsonArtifact } from "./professionalExpandedTemplate10000Audit.shared";

async function main() {
  await writeJsonArtifact("category_distribution.json", buildProductionTemplate10000CategoryDistribution());
  await writeJsonArtifact("coverage_matrix.json", buildProductionTemplate10000AcceptanceMatrix());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
