import type { AiButtonActionEntry, AiScreenActionEntry } from "./aiAppActionTypes";

export type AiActionGraphEvidenceRef = {
  id: string;
  kind: "screen_registry" | "button_registry" | "domain_entity" | "policy";
  title: string;
  source: "app_action_graph_registry_v1";
};

function normalizeEvidenceToken(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildAiScreenActionEvidence(screen: AiScreenActionEntry): AiActionGraphEvidenceRef[] {
  return [
    {
      id: `app_graph:screen:${normalizeEvidenceToken(screen.screenId)}`,
      kind: "screen_registry",
      title: `Screen action graph: ${screen.screenId}`,
      source: "app_action_graph_registry_v1",
    },
    {
      id: `app_graph:policy:${normalizeEvidenceToken(screen.screenId)}:${screen.approvalBoundary}`,
      kind: "policy",
      title: `Screen approval boundary: ${screen.approvalBoundary}`,
      source: "app_action_graph_registry_v1",
    },
    ...screen.businessEntities.map((entity) => ({
      id: `app_graph:entity:${normalizeEvidenceToken(screen.screenId)}:${entity}`,
      kind: "domain_entity" as const,
      title: `Screen entity: ${entity}`,
      source: "app_action_graph_registry_v1" as const,
    })),
  ];
}

export function buildAiButtonActionEvidence(button: AiButtonActionEntry): AiActionGraphEvidenceRef[] {
  return [
    {
      id: `app_graph:button:${normalizeEvidenceToken(button.buttonId)}`,
      kind: "button_registry",
      title: `Button action graph: ${button.buttonId}`,
      source: "app_action_graph_registry_v1",
    },
    {
      id: `app_graph:policy:${normalizeEvidenceToken(button.buttonId)}:${button.riskLevel}`,
      kind: "policy",
      title: `Button risk boundary: ${button.riskLevel}`,
      source: "app_action_graph_registry_v1",
    },
    ...button.sourceEntities.map((entity) => ({
      id: `app_graph:entity:${normalizeEvidenceToken(button.buttonId)}:${entity}`,
      kind: "domain_entity" as const,
      title: `Button entity: ${entity}`,
      source: "app_action_graph_registry_v1" as const,
    })),
  ];
}

export function toAiActionGraphEvidenceIds(
  evidence: readonly AiActionGraphEvidenceRef[],
): string[] {
  return evidence
    .map((ref) => ref.id)
    .filter((id) => id.trim().length > 0);
}

export function hasAiActionGraphEvidence(evidenceRefs: readonly string[]): boolean {
  return evidenceRefs.some((ref) => ref.trim().length > 0);
}
