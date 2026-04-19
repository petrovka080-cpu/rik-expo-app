/**
 * useOfficePostReturnTracing — custom hook for post-return observability.
 *
 * F1 extraction: bundles all post-return tracing callbacks, refs, and
 * lifecycle effects that were inline in OfficeHubScreen.
 *
 * This hook owns:
 * - Post-return section/subtree tracking refs
 * - cancelAnimationFrame/InteractionManager cleanup
 * - Keyboard bridge subscription
 * - Layout/content-size observation wrappers
 * - Post-return trace scheduling (idle → animation frame → interaction)
 *
 * No business logic changed. No navigation semantics changed.
 * This is purely observability/diagnostic code.
 */

import React, { useCallback, useMemo, useRef } from "react";
import {
  InteractionManager,
  Keyboard,
  type LayoutChangeEvent,
} from "react-native";

import {
  type PostReturnSectionKey,
  type SectionKey,
} from "./officeHub.constants";
import type { OfficeAccessScreenData } from "./officeAccess.types";
import {
  buildOfficePostReturnExtra,
  buildOfficePostReturnProbeFlags,
  formatPostReturnSections,
  planOfficePostReturnSectionDone,
  planOfficePostReturnTraceStart,
} from "./officePostReturnTracing.model";
import {
  recordOfficeNativeAnimationFrameDone,
  recordOfficeNativeAnimationFrameStart,
  recordOfficeNativeCallbackFailure,
  recordOfficeNativeContentSizeDone,
  recordOfficeNativeContentSizeStart,
  recordOfficeNativeFocusCallbackDone,
  recordOfficeNativeFocusCallbackStart,
  recordOfficeNativeInteractionDone,
  recordOfficeNativeInteractionStart,
  recordOfficeNativeKeyboardEvent,
  recordOfficeNativeLayoutDone,
  recordOfficeNativeLayoutStart,
  recordOfficePostReturnChildMountDone,
  recordOfficePostReturnChildMountStart,
  recordOfficePostReturnFailure,
  recordOfficePostReturnIdleDone,
  recordOfficePostReturnIdleStart,
  recordOfficePostReturnLayoutCommit,
  recordOfficePostReturnSectionRenderDone,
  recordOfficePostReturnSectionRenderStart,
  recordOfficePostReturnSubtreeDone,
  recordOfficePostReturnSubtreeFailure,
  recordOfficePostReturnSubtreeStart,
  recordOfficeReentryComponentMount,
  recordOfficeReentryRenderSuccess,
  type OfficePostReturnProbe,
  type OfficePostReturnSubtree,
} from "../../lib/navigation/officeReentryBreadcrumbs";

type UseOfficePostReturnTracingParams = {
  postReturnProbeLabel: string;
  activePostReturnProbe: readonly OfficePostReturnProbe[];
  routeScopeActive: boolean;
  /** Shared ref — lives in parent component */
  focusCycleRef: React.MutableRefObject<number>;
  /** Shared ref — lives in parent component */
  isMountedRef: React.MutableRefObject<boolean>;
  /** Shared ref — lives in parent component */
  offsetsRef: React.MutableRefObject<Record<SectionKey, number>>;
};

export function useOfficePostReturnTracing(
  params: UseOfficePostReturnTracingParams,
) {
  const {
    postReturnProbeLabel,
    activePostReturnProbe,
    routeScopeActive,
    focusCycleRef,
    isMountedRef,
    offsetsRef,
  } = params;

  const {
    disableScrollCallbacks,
    disableLayoutCallbacks,
    disableContentSizeCallbacks,
    disableKeyboardBridge,
    disableInteractionManager,
    disableAnimationFrame,
  } = useMemo(
    () => buildOfficePostReturnProbeFlags(activePostReturnProbe),
    [activePostReturnProbe],
  );

  // --- Tracing-owned refs ---
  const postReturnFrameRef = useRef<number | null>(null);
  const postReturnInteractionRef = useRef<ReturnType<
    typeof InteractionManager.runAfterInteractions
  > | null>(null);
  const postReturnPendingSectionsRef = useRef<PostReturnSectionKey[]>([]);
  const postReturnCommittedSectionsRef = useRef<Set<PostReturnSectionKey>>(
    new Set(),
  );
  const postReturnLayoutCommitRef = useRef(false);
  const postReturnStartedSubtreesRef = useRef<Set<OfficePostReturnSubtree>>(
    new Set(),
  );
  const postReturnCompletedSubtreesRef = useRef<Set<OfficePostReturnSubtree>>(
    new Set(),
  );
  const postReturnLayoutFallbackTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // --- Callbacks ---

  const buildPostReturnExtra = useCallback(
    (extra?: Record<string, unknown>) =>
      buildOfficePostReturnExtra({
        focusCycle: focusCycleRef.current,
        sectionsLabel: formatPostReturnSections(
          postReturnPendingSectionsRef.current,
        ),
        probeLabel: postReturnProbeLabel,
        extra,
      }),
    [focusCycleRef, postReturnProbeLabel],
  );

  const buildNativeCallbackExtra = useCallback(
    (callback: string, extra?: Record<string, unknown>) =>
      buildPostReturnExtra({
        callback,
        ...(extra ?? {}),
      }),
    [buildPostReturnExtra],
  );

  const runObservedNativeCallback = useCallback(
    <T,>(params: {
      callback: string;
      phase:
        | "focus"
        | "layout"
        | "content_size"
        | "interaction"
        | "animation_frame";
      run: () => T;
    }): T | undefined => {
      const extra = buildNativeCallbackExtra(params.callback);
      try {
        switch (params.phase) {
          case "focus":
            recordOfficeNativeFocusCallbackStart(extra);
            break;
          case "layout":
            recordOfficeNativeLayoutStart(extra);
            break;
          case "content_size":
            recordOfficeNativeContentSizeStart(extra);
            break;
          case "interaction":
            recordOfficeNativeInteractionStart(extra);
            break;
          case "animation_frame":
            recordOfficeNativeAnimationFrameStart(extra);
            break;
        }

        const result = params.run();

        switch (params.phase) {
          case "focus":
            recordOfficeNativeFocusCallbackDone(extra);
            break;
          case "layout":
            recordOfficeNativeLayoutDone(extra);
            break;
          case "content_size":
            recordOfficeNativeContentSizeDone(extra);
            break;
          case "interaction":
            recordOfficeNativeInteractionDone(extra);
            break;
          case "animation_frame":
            recordOfficeNativeAnimationFrameDone(extra);
            break;
        }

        return result;
      } catch (error: unknown) {
        recordOfficeNativeCallbackFailure({
          error,
          errorStage: params.phase,
          extra,
        });
        // Post-return diagnostics must never escalate an observed native
        // callback failure into a fatal navigation crash.
        return undefined;
      }
    },
    [buildNativeCallbackExtra],
  );

  const recordPostReturnSubtreeStart = useCallback(
    (subtree: OfficePostReturnSubtree, extra?: Record<string, unknown>) => {
      if (postReturnStartedSubtreesRef.current.has(subtree)) return;
      postReturnStartedSubtreesRef.current.add(subtree);
      recordOfficePostReturnSubtreeStart(
        buildPostReturnExtra({
          subtree,
          ...(extra ?? {}),
        }),
      );
    },
    [buildPostReturnExtra],
  );

  const recordPostReturnSubtreeDone = useCallback(
    (subtree: OfficePostReturnSubtree, extra?: Record<string, unknown>) => {
      if (postReturnCompletedSubtreesRef.current.has(subtree)) return;
      if (!postReturnStartedSubtreesRef.current.has(subtree)) {
        recordPostReturnSubtreeStart(subtree, extra);
      }
      postReturnCompletedSubtreesRef.current.add(subtree);
      recordOfficePostReturnSubtreeDone(
        buildPostReturnExtra({
          subtree,
          ...(extra ?? {}),
        }),
      );
    },
    [buildPostReturnExtra, recordPostReturnSubtreeStart],
  );

  const handleSubtreeLayout = useCallback(
    (
      subtree: OfficePostReturnSubtree,
      callback = `subtree_layout:${subtree}`,
    ) => {
      if (disableLayoutCallbacks) return undefined;

      return (_event: LayoutChangeEvent) => {
        runObservedNativeCallback({
          callback,
          phase: "layout",
          run: () => {
            recordPostReturnSubtreeDone(subtree);
          },
        });
      };
    },
    [
      disableLayoutCallbacks,
      recordPostReturnSubtreeDone,
      runObservedNativeCallback,
    ],
  );

  const handleSubtreeFailure = useCallback(
    (subtree: OfficePostReturnSubtree, error: Error, info: React.ErrorInfo) => {
      recordOfficePostReturnSubtreeFailure({
        error,
        errorStage: "subtree_boundary",
        extra: buildPostReturnExtra({
          subtree,
          componentStack: String(info.componentStack || "")
            .trim()
            .slice(0, 2000),
        }),
      });
    },
    [buildPostReturnExtra],
  );

  const cancelPostReturnIdle = useCallback(() => {
    if (
      postReturnFrameRef.current != null &&
      typeof cancelAnimationFrame === "function"
    ) {
      cancelAnimationFrame(postReturnFrameRef.current);
    }
    postReturnFrameRef.current = null;
    postReturnInteractionRef.current?.cancel?.();
    postReturnInteractionRef.current = null;
    if (postReturnLayoutFallbackTimeoutRef.current != null) {
      clearTimeout(postReturnLayoutFallbackTimeoutRef.current);
    }
    postReturnLayoutFallbackTimeoutRef.current = null;
  }, []);

  const recordPostReturnSectionDone = useCallback(
    (section: PostReturnSectionKey) => {
      const pendingSections = postReturnPendingSectionsRef.current;
      const committedSections = postReturnCommittedSectionsRef.current;
      const plan = planOfficePostReturnSectionDone({
        section,
        pendingSections,
        committedSections,
        layoutCommitted: postReturnLayoutCommitRef.current,
      });

      if (
        !plan.shouldCommitLayout &&
        !plan.shouldRecordSectionDone &&
        !plan.shouldRecordChildMountDone
      ) {
        return;
      }

      if (plan.shouldCommitLayout) {
        postReturnLayoutCommitRef.current = true;
        recordOfficePostReturnLayoutCommit(
          buildPostReturnExtra({
            section,
            sections: plan.sectionsLabel,
          }),
        );
      }

      if (!plan.shouldRecordSectionDone) return;

      committedSections.add(section);
      recordOfficePostReturnSectionRenderDone(
        buildPostReturnExtra({
          section,
          sections: plan.sectionsLabel,
        }),
      );

      if (plan.shouldRecordChildMountDone) {
        recordOfficePostReturnChildMountDone(
          buildPostReturnExtra({
            sections: plan.sectionsLabel,
          }),
        );
      }
    },
    [buildPostReturnExtra],
  );

  const handleSectionLayout = useCallback(
    (section: PostReturnSectionKey, offsetKey?: SectionKey) =>
      disableLayoutCallbacks
        ? undefined
        : (event: LayoutChangeEvent) => {
            runObservedNativeCallback({
              callback: `section_layout:${section}`,
              phase: "layout",
              run: () => {
                if (offsetKey) {
                  offsetsRef.current[offsetKey] = event.nativeEvent.layout.y;
                }
                recordPostReturnSectionDone(section);
              },
            });
          },
    [
      disableLayoutCallbacks,
      offsetsRef,
      recordPostReturnSectionDone,
      runObservedNativeCallback,
    ],
  );

  const handleScrollLayout = useMemo(() => {
    if (disableLayoutCallbacks || disableScrollCallbacks) return undefined;
    return (event: LayoutChangeEvent) => {
      runObservedNativeCallback({
        callback: "scroll_view:onLayout",
        phase: "layout",
        run: () => {
          void event;
          recordPostReturnSubtreeDone("scroll_view_layout");
        },
      });
    };
  }, [
    disableLayoutCallbacks,
    disableScrollCallbacks,
    recordPostReturnSubtreeDone,
    runObservedNativeCallback,
  ]);

  const handleContentSizeChange = useMemo(() => {
    if (disableScrollCallbacks || disableContentSizeCallbacks) return undefined;
    return (contentWidth: number, contentHeight: number) => {
      runObservedNativeCallback({
        callback: "scroll_view:onContentSizeChange",
        phase: "content_size",
        run: () => {
          recordPostReturnSubtreeDone("scroll_view_content", {
            contentWidth,
            contentHeight,
          });
        },
      });
    };
  }, [
    disableContentSizeCallbacks,
    disableScrollCallbacks,
    recordPostReturnSubtreeDone,
    runObservedNativeCallback,
  ]);

  const startPostReturnTrace = useCallback(
    (next: OfficeAccessScreenData) => {
      const focusCycle = focusCycleRef.current;
      const tracePlan = planOfficePostReturnTraceStart(
        next,
        activePostReturnProbe,
      );
      const nextSections = tracePlan.sections;
      const sections = tracePlan.sectionsLabel;

      cancelPostReturnIdle();
      postReturnPendingSectionsRef.current = nextSections;
      postReturnCommittedSectionsRef.current = new Set();
      postReturnLayoutCommitRef.current = false;
      postReturnStartedSubtreesRef.current = new Set();
      postReturnCompletedSubtreesRef.current = new Set();

      recordOfficePostReturnChildMountStart(
        buildPostReturnExtra({
          focusCycle,
          sections,
        }),
      );
      nextSections.forEach((section) => {
        recordOfficePostReturnSectionRenderStart(
          buildPostReturnExtra({
            focusCycle,
            section,
            sections,
          }),
        );
      });
      recordOfficePostReturnIdleStart(
        buildPostReturnExtra({
          focusCycle,
          sections,
        }),
      );

      if (disableLayoutCallbacks && nextSections.length > 0) {
        postReturnLayoutFallbackTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          nextSections.forEach((section) => {
            recordPostReturnSectionDone(section);
          });
        }, 0);
      }

      const finishIdle = () => {
        if (!isMountedRef.current) return;
        recordPostReturnSubtreeStart("idle_callback", {
          focusCycle,
          sections,
        });
        recordOfficePostReturnIdleDone(
          buildPostReturnExtra({
            focusCycle,
            sections,
          }),
        );
        recordPostReturnSubtreeDone("idle_callback", {
          focusCycle,
          sections,
        });
        if (tracePlan.shouldCompleteChildMountInIdle) {
          recordOfficePostReturnChildMountDone(
            buildPostReturnExtra({
              focusCycle,
              sections,
            }),
          );
        }
      };

      const scheduleIdle = () => {
        try {
          if (disableInteractionManager) {
            finishIdle();
            return;
          }

          postReturnInteractionRef.current =
            InteractionManager.runAfterInteractions(() =>
              runObservedNativeCallback({
                callback: "InteractionManager.runAfterInteractions",
                phase: "interaction",
                run: () => {
                  finishIdle();
                },
              }),
            );
        } catch (error: unknown) {
          recordOfficePostReturnFailure({
            error,
            errorStage: "post_return_idle_schedule",
            extra: buildPostReturnExtra({
              focusCycle,
              sections,
            }),
          });
        }
      };

      if (
        !disableAnimationFrame &&
        typeof requestAnimationFrame === "function"
      ) {
        postReturnFrameRef.current = requestAnimationFrame(() => {
          runObservedNativeCallback({
            callback: "requestAnimationFrame",
            phase: "animation_frame",
            run: () => {
              scheduleIdle();
            },
          });
        });
        return;
      }

      scheduleIdle();
    },
    [
      activePostReturnProbe,
      buildPostReturnExtra,
      cancelPostReturnIdle,
      disableAnimationFrame,
      disableInteractionManager,
      disableLayoutCallbacks,
      focusCycleRef,
      isMountedRef,
      recordPostReturnSubtreeDone,
      recordPostReturnSubtreeStart,
      recordPostReturnSectionDone,
      runObservedNativeCallback,
    ],
  );

  // --- Lifecycle effects ---

  React.useLayoutEffect(() => {
    if (!routeScopeActive) return;

    recordPostReturnSubtreeStart("layout_effect_mount");
    recordOfficeReentryComponentMount(buildPostReturnExtra());
    recordPostReturnSubtreeDone("layout_effect_mount");
  }, [
    buildPostReturnExtra,
    routeScopeActive,
    recordPostReturnSubtreeDone,
    recordPostReturnSubtreeStart,
  ]);

  React.useEffect(() => {
    isMountedRef.current = routeScopeActive;
    if (!routeScopeActive) {
      cancelPostReturnIdle();
      return () => {
        isMountedRef.current = false;
        cancelPostReturnIdle();
      };
    }

    recordPostReturnSubtreeStart("render_effect_mount");
    recordOfficeReentryRenderSuccess(buildPostReturnExtra());
    recordPostReturnSubtreeDone("render_effect_mount");
    return () => {
      isMountedRef.current = false;
      cancelPostReturnIdle();
    };
  }, [
    buildPostReturnExtra,
    cancelPostReturnIdle,
    isMountedRef,
    routeScopeActive,
    recordPostReturnSubtreeDone,
    recordPostReturnSubtreeStart,
  ]);

  React.useEffect(() => {
    if (!routeScopeActive || disableKeyboardBridge) return;

    const events = [
      "keyboardWillShow",
      "keyboardDidShow",
      "keyboardWillHide",
      "keyboardDidHide",
    ] as const;
    const subscriptions = events.map((eventName) =>
      Keyboard.addListener(eventName, () => {
        recordOfficeNativeKeyboardEvent(
          buildNativeCallbackExtra(`Keyboard.${eventName}`),
        );
      }),
    );

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [buildNativeCallbackExtra, disableKeyboardBridge, routeScopeActive]);

  return {
    buildPostReturnExtra,
    buildNativeCallbackExtra,
    runObservedNativeCallback,
    recordPostReturnSubtreeStart,
    recordPostReturnSubtreeDone,
    handleSubtreeLayout,
    handleSubtreeFailure,
    cancelPostReturnIdle,
    recordPostReturnSectionDone,
    handleSectionLayout,
    handleScrollLayout,
    handleContentSizeChange,
    startPostReturnTrace,
  };
}
