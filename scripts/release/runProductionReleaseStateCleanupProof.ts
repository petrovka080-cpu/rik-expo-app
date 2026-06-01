import {
  writeProductionReleaseStateCleanupProof,
} from "./releaseStateCleanupCore";
import { RELEASE_VERIFY_CORE_GREEN_STATUS } from "./releaseTargetScope";

const result = writeProductionReleaseStateCleanupProof(process.cwd());

console.log(result.matrix.final_status);

if (result.matrix.final_status !== RELEASE_VERIFY_CORE_GREEN_STATUS) {
  process.exitCode = 1;
}
