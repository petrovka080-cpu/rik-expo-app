import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { Platform, type ScrollView } from "react-native";

import {
  markRequestEstimateIntentStage,
  requestEstimateIntentLifecycle,
} from "../../lib/navigation/requestEstimateLaunchLifecycle";
import { recordRequestEstimateLaunchStage } from "../../lib/navigation/requestEstimateLaunchObservability";
import type { RequestEstimateLaunchPayloadV1 } from "../../lib/navigation/requestEstimateLaunchPayload";

export function markAiDraftSessionReady(
  payload: RequestEstimateLaunchPayloadV1,
): boolean {
  if (
    !markRequestEstimateIntentStage(payload.launchId, "DRAFT_SESSION_READY")
  ) {
    return false;
  }
  recordRequestEstimateLaunchStage({
    stage: "DRAFT_SESSION_READY",
    payload,
    detail: { adapter: "ai_assistant_estimate_pipeline" },
  });
  return true;
}

export function acknowledgeAiUiLaunch(
  payload: RequestEstimateLaunchPayloadV1,
  projection: "ai_launch_projection" | "ai_estimate_projection",
): void {
  if (!markRequestEstimateIntentStage(payload.launchId, "UI_READY")) return;
  recordRequestEstimateLaunchStage({
    stage: "UI_READY",
    payload,
    detail: { projection },
  });
  if (
    !markRequestEstimateIntentStage(payload.launchId, "INTENT_ACKNOWLEDGED")
  ) {
    return;
  }
  recordRequestEstimateLaunchStage({
    stage: "INTENT_ACKNOWLEDGED",
    payload,
  });
}

function acknowledgeAiPromptLaunch(
  payload: RequestEstimateLaunchPayloadV1,
): void {
  if (!markAiDraftSessionReady(payload)) return;
  acknowledgeAiUiLaunch(payload, "ai_launch_projection");
}

export function useAIAssistantPendingLaunchSubscription({
  launchPayload,
  setRuntimeLaunchPayload,
}: {
  launchPayload: RequestEstimateLaunchPayloadV1 | null;
  setRuntimeLaunchPayload: Dispatch<
    SetStateAction<RequestEstimateLaunchPayloadV1 | null>
  >;
}) {
  useEffect(() => {
    if (!launchPayload) return;
    setRuntimeLaunchPayload((current) => {
      if (current?.launchId === launchPayload.launchId) return current;
      if (
        current &&
        Date.parse(current.issuedAt) > Date.parse(launchPayload.issuedAt)
      ) {
        return current;
      }
      return launchPayload;
    });
  }, [launchPayload, setRuntimeLaunchPayload]);

  useEffect(() => {
    const syncPendingAiLaunch = () => {
      const pending = requestEstimateIntentLifecycle.getPending();
      if (
        pending?.target.payload.route !== "/ai" ||
        pending.stage === "INTENT_RECEIVED" ||
        pending.stage === "URL_PARSED" ||
        pending.stage === "AUTH_PENDING" ||
        pending.stage === "AUTH_RESOLVED"
      ) {
        return;
      }
      if (Platform.OS === "android") {
        console.info(
          `[RikWarmDeepLink] AI_RUNTIME_LAUNCH_SYNC ${JSON.stringify({
            launchId: pending.target.payload.launchId,
            autoSend: pending.target.payload.parameters.autoSend ?? null,
            stage: pending.stage,
          })}`,
        );
      }
      setRuntimeLaunchPayload((current) =>
        current?.launchId === pending.target.payload.launchId
          ? current
          : pending.target.payload,
      );
    };
    syncPendingAiLaunch();
    return requestEstimateIntentLifecycle.subscribe(syncPendingAiLaunch);
  }, [setRuntimeLaunchPayload]);
}

export function useAIAssistantLaunchRuntimeEffects({
  booting,
  effectiveLaunchPayload,
  launchAutoSend,
  launchPrompt,
  input,
  loading,
  messagesLength,
  send,
  setInput,
  handledPromptRef,
  acknowledgedPromptLaunchRef,
  messagesScrollRef,
}: {
  booting: boolean;
  effectiveLaunchPayload: RequestEstimateLaunchPayloadV1 | null;
  launchAutoSend: string | undefined;
  launchPrompt: string;
  input: string;
  loading: boolean;
  messagesLength: number;
  send: (textParam?: string) => Promise<void>;
  setInput: (value: string) => void;
  handledPromptRef: MutableRefObject<string>;
  acknowledgedPromptLaunchRef: MutableRefObject<string>;
  messagesScrollRef: MutableRefObject<ScrollView | null>;
}) {
  useEffect(() => {
    if (booting || !launchPrompt) return;

    const key = `${effectiveLaunchPayload?.launchId ?? "route"}::${launchPrompt}::${launchAutoSend === "1" ? "1" : "0"}`;
    if (handledPromptRef.current === key) return;
    handledPromptRef.current = key;

    if (launchAutoSend === "1") {
      const autoSendPayload = effectiveLaunchPayload;
      if (Platform.OS === "android" && autoSendPayload) {
        console.info(
          `[RikWarmDeepLink] AI_AUTO_SEND_STARTED ${JSON.stringify({
            launchId: autoSendPayload.launchId,
          })}`,
        );
      }
      void send(launchPrompt).then(() => {
        if (Platform.OS === "android" && autoSendPayload) {
          console.info(
            `[RikWarmDeepLink] AI_AUTO_SEND_RESOLVED ${JSON.stringify({
              launchId: autoSendPayload.launchId,
            })}`,
          );
        }
      });
      return;
    }

    setInput(launchPrompt);
  }, [
    booting,
    effectiveLaunchPayload,
    handledPromptRef,
    launchAutoSend,
    launchPrompt,
    send,
    setInput,
  ]);

  useEffect(() => {
    if (
      booting ||
      !effectiveLaunchPayload ||
      launchAutoSend === "1" ||
      input.trim() !== launchPrompt ||
      acknowledgedPromptLaunchRef.current === effectiveLaunchPayload.launchId
    ) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      acknowledgeAiPromptLaunch(effectiveLaunchPayload);
      acknowledgedPromptLaunchRef.current = effectiveLaunchPayload.launchId;
    });
    return () => cancelAnimationFrame(frame);
  }, [
    acknowledgedPromptLaunchRef,
    booting,
    effectiveLaunchPayload,
    input,
    launchAutoSend,
    launchPrompt,
  ]);

  useEffect(() => {
    if (messagesLength === 0) return undefined;
    const timeout = setTimeout(() => {
      messagesScrollRef.current?.scrollToEnd({ animated: false });
    }, 100);
    return () => clearTimeout(timeout);
  }, [loading, messagesLength, messagesScrollRef]);
}
