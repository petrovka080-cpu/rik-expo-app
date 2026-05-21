import { printAuditSlice, writeMaxArchitectureScaleRiskAudit50kArtifacts } from "./maxArchitectureScaleRiskAudit50k.shared";

const report = writeMaxArchitectureScaleRiskAudit50kArtifacts();
printAuditSlice("security_privacy", report.securityPrivacy);
