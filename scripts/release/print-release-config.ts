import { buildReleaseConfigText } from "../../src/shared/release/releaseInfo";
import { loadReleaseConfigSummary } from "./releaseConfig.shared";

const summary = loadReleaseConfigSummary();
const args = new Set(process.argv.slice(2));

if (args.has("--json")) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(buildReleaseConfigText(summary));
}
