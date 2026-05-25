export {
  runRequestEstimateCatalogBoqNoHacksAudit as runRequestEstimateCatalogBoqReleaseNoHacksAudit,
} from "./runRequestEstimateCatalogBoqNoHacksAudit";

import { runRequestEstimateCatalogBoqNoHacksAudit } from "./runRequestEstimateCatalogBoqNoHacksAudit";

if (require.main === module) {
  const audit = runRequestEstimateCatalogBoqNoHacksAudit();
  console.log(audit.final_status);
  if (!audit.no_hacks_audit_passed) {
    console.error(JSON.stringify(audit.forbidden_findings, null, 2));
    process.exitCode = 1;
  }
}
