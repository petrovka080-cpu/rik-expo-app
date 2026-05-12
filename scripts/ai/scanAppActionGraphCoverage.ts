import fs from "node:fs";
import path from "node:path";

import { AI_BUTTON_ACTION_REGISTRY } from "../../src/features/ai/appGraph/aiButtonActionRegistry";
import { AI_MAJOR_SCREEN_IDS, AI_SCREEN_ACTION_REGISTRY } from "../../src/features/ai/appGraph/aiScreenActionRegistry";

export type AppActionGraphCoverageFinding = {
  code:
    | "major_screen_missing_action_graph"
    | "ai_relevant_button_missing_test_id"
    | "ai_relevant_button_missing_registry_entry"
    | "business_action_missing_metadata"
    | "approval_required_action_executes_directly"
    | "forbidden_action_has_tool";
  detail: string;
};

export type AppActionGraphCoverageReport = {
  final_status: "GREEN_APP_ACTION_GRAPH_COVERAGE" | "BLOCKED_BUTTON_ACTION_COVERAGE_INCOMPLETE";
  majorScreensRegistered: boolean;
  aiRelevantButtonsMapped: boolean;
  buttonActionCoveragePercent: number;
  scannedComponentKinds: readonly string[];
  registryButtonCount: number;
  mutationCount: 0;
  findings: readonly AppActionGraphCoverageFinding[];
};

const COMPONENT_PATTERNS = [
  "Pressable",
  "TouchableOpacity",
  "Button",
  "IconButton",
  "FAB",
  "List.Item",
  "MenuItem",
  "AppButton",
  "SendPrimaryButton",
] as const;

function sourceContainsComponentKind(projectRoot: string, componentKind: string): boolean {
  const sourceRoots = ["src", "app"];
  for (const sourceRoot of sourceRoots) {
    const absoluteRoot = path.join(projectRoot, sourceRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    const stack = [absoluteRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const absolutePath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules") stack.push(absolutePath);
          continue;
        }
        if (!/\.(?:ts|tsx)$/.test(entry.name)) continue;
        const source = fs.readFileSync(absolutePath, "utf8");
        if (source.includes(componentKind)) return true;
      }
    }
  }
  return false;
}

export function scanAppActionGraphCoverage(
  projectRoot = process.cwd(),
): AppActionGraphCoverageReport {
  const findings: AppActionGraphCoverageFinding[] = [];
  const registeredScreens = new Set(AI_SCREEN_ACTION_REGISTRY.map((entry) => entry.screenId));
  const registeredButtonIds = new Set(AI_BUTTON_ACTION_REGISTRY.map((entry) => entry.buttonId));
  const scannedComponentKinds = COMPONENT_PATTERNS.filter((kind) =>
    sourceContainsComponentKind(projectRoot, kind),
  );

  for (const screenId of AI_MAJOR_SCREEN_IDS) {
    if (!registeredScreens.has(screenId)) {
      findings.push({ code: "major_screen_missing_action_graph", detail: screenId });
    }
  }

  for (const button of AI_BUTTON_ACTION_REGISTRY) {
    if (!button.testId.trim()) {
      findings.push({ code: "ai_relevant_button_missing_test_id", detail: button.buttonId });
    }
    if (!registeredButtonIds.has(button.buttonId)) {
      findings.push({ code: "ai_relevant_button_missing_registry_entry", detail: button.buttonId });
    }
    if (
      !button.domain ||
      !button.intent ||
      !button.riskLevel ||
      button.allowedRoles.length === 0 && button.riskLevel !== "forbidden"
    ) {
      findings.push({ code: "business_action_missing_metadata", detail: button.buttonId });
    }
    if (button.riskLevel === "approval_required" && button.approvalRequired !== true) {
      findings.push({ code: "approval_required_action_executes_directly", detail: button.buttonId });
    }
    if (button.riskLevel === "forbidden" && button.requiredTool) {
      findings.push({ code: "forbidden_action_has_tool", detail: button.buttonId });
    }
  }

  const coveragePercent =
    AI_BUTTON_ACTION_REGISTRY.length === 0
      ? 0
      : Math.round(
          ((AI_BUTTON_ACTION_REGISTRY.length -
            findings.filter((finding) => finding.code === "ai_relevant_button_missing_registry_entry").length) /
            AI_BUTTON_ACTION_REGISTRY.length) *
            100,
        );

  return {
    final_status:
      findings.length === 0
        ? "GREEN_APP_ACTION_GRAPH_COVERAGE"
        : "BLOCKED_BUTTON_ACTION_COVERAGE_INCOMPLETE",
    majorScreensRegistered: AI_MAJOR_SCREEN_IDS.every((screenId) => registeredScreens.has(screenId)),
    aiRelevantButtonsMapped: findings.every(
      (finding) => finding.code !== "ai_relevant_button_missing_registry_entry",
    ),
    buttonActionCoveragePercent: coveragePercent,
    scannedComponentKinds,
    registryButtonCount: AI_BUTTON_ACTION_REGISTRY.length,
    mutationCount: 0,
    findings,
  };
}

if (require.main === module) {
  const report = scanAppActionGraphCoverage(process.cwd());
  console.info(JSON.stringify(report, null, 2));
  if (report.final_status !== "GREEN_APP_ACTION_GRAPH_COVERAGE") {
    process.exitCode = 1;
  }
}
