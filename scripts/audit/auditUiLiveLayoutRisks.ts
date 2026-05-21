import { printAuditSlice, writeMaxArchitectureScaleRiskAudit50kArtifacts } from "./maxArchitectureScaleRiskAudit50k.shared";

const report = writeMaxArchitectureScaleRiskAudit50kArtifacts();
printAuditSlice("ui_risk_map", report.uiRiskMap);
