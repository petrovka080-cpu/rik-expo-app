import { printAuditSlice, writeMaxArchitectureScaleRiskAudit50kArtifacts } from "../audit/maxArchitectureScaleRiskAudit50k.shared";

const report = writeMaxArchitectureScaleRiskAudit50kArtifacts();
printAuditSlice("global_ui_no_overlap_proof", report.uiRiskMap);
