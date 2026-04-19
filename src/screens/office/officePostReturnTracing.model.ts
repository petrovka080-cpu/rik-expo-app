import type { OfficePostReturnProbe } from "../../lib/navigation/officeReentryBreadcrumbs";
import type { OfficeAccessScreenData } from "./officeAccess.types";
import {
  getVisiblePostReturnSections,
  type PostReturnSectionKey,
} from "./officeHub.constants";

export type OfficePostReturnProbeFlags = {
  disableScrollCallbacks: boolean;
  disableLayoutCallbacks: boolean;
  disableContentSizeCallbacks: boolean;
  disableKeyboardBridge: boolean;
  disableInteractionManager: boolean;
  disableAnimationFrame: boolean;
};

export type OfficePostReturnTraceStartPlan = {
  sections: PostReturnSectionKey[];
  sectionsLabel: string;
  shouldCompleteChildMountInIdle: boolean;
};

export type OfficePostReturnSectionDonePlan = {
  sectionsLabel: string;
  shouldCommitLayout: boolean;
  shouldRecordSectionDone: boolean;
  shouldRecordChildMountDone: boolean;
};

const NO_SECTION_DONE_PLAN: OfficePostReturnSectionDonePlan = {
  sectionsLabel: "none",
  shouldCommitLayout: false,
  shouldRecordSectionDone: false,
  shouldRecordChildMountDone: false,
};

export function buildOfficePostReturnProbeFlags(
  probe: readonly OfficePostReturnProbe[],
): OfficePostReturnProbeFlags {
  return {
    disableScrollCallbacks: probe.includes("no_scroll_callbacks"),
    disableLayoutCallbacks: probe.includes("no_layout_callbacks"),
    disableContentSizeCallbacks: probe.includes("no_content_size_callbacks"),
    disableKeyboardBridge: probe.includes("no_keyboard_bridge"),
    disableInteractionManager: probe.includes("no_interaction_manager"),
    disableAnimationFrame: probe.includes("no_animation_frame"),
  };
}

export function formatPostReturnSections(
  sections: readonly PostReturnSectionKey[],
) {
  return sections.join(",") || "none";
}

export function buildOfficePostReturnExtra(params: {
  focusCycle: number;
  sectionsLabel: string;
  probeLabel: string;
  extra?: Record<string, unknown>;
}) {
  const nextExtra: Record<string, unknown> = {
    owner: "office_hub",
    focusCycle: params.focusCycle,
    sections: params.sectionsLabel,
    ...(params.extra ?? {}),
  };

  if (params.probeLabel !== "all" && nextExtra.probe == null) {
    nextExtra.probe = params.probeLabel;
  }

  return nextExtra;
}

export function planOfficePostReturnTraceStart(
  data: OfficeAccessScreenData,
  probe: readonly OfficePostReturnProbe[],
): OfficePostReturnTraceStartPlan {
  const sections = getVisiblePostReturnSections(data, probe);
  return {
    sections,
    sectionsLabel: formatPostReturnSections(sections),
    shouldCompleteChildMountInIdle: sections.length === 0,
  };
}

export function planOfficePostReturnSectionDone(params: {
  section: PostReturnSectionKey;
  pendingSections: readonly PostReturnSectionKey[];
  committedSections: ReadonlySet<PostReturnSectionKey>;
  layoutCommitted: boolean;
}): OfficePostReturnSectionDonePlan {
  if (!params.pendingSections.includes(params.section)) {
    return NO_SECTION_DONE_PLAN;
  }

  const sectionsLabel = formatPostReturnSections(params.pendingSections);
  const shouldCommitLayout = !params.layoutCommitted;

  if (params.committedSections.has(params.section)) {
    return {
      sectionsLabel,
      shouldCommitLayout,
      shouldRecordSectionDone: false,
      shouldRecordChildMountDone: false,
    };
  }

  return {
    sectionsLabel,
    shouldCommitLayout,
    shouldRecordSectionDone: true,
    shouldRecordChildMountDone:
      params.committedSections.size + 1 === params.pendingSections.length,
  };
}
