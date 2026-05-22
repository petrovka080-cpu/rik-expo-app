import {
  ALL_SCREENS_ENTERPRISE_GREEN_STATUS,
  writeAllScreensEnterpriseArtifacts,
} from "./allScreensEnterpriseRuntimeAcceptance.shared";

const report = writeAllScreensEnterpriseArtifacts();
console.log(
  report.noOverlap.app_bottom_nav_safe_area_present && !report.noOverlap.raw_route_labels_found
    ? "GREEN_ALL_SCREENS_NO_OVERLAP_READY"
    : report.matrix.final_status,
);

if (report.matrix.final_status !== ALL_SCREENS_ENTERPRISE_GREEN_STATUS) {
  process.exitCode = 1;
}
