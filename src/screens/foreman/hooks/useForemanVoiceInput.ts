import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { recordPlatformObservability } from "../../../lib/observability/platformObservability";

export type ForemanVoiceStatus =
  | "ready"
  | "listening"
  | "recognizing"
  | "denied"
  | "unsupported"
  | "failed";

type WebSpeechRecognitionAlternative = {
  transcript?: string;
};

type WebSpeechRecognitionResultLike = {
  0?: WebSpeechRecognitionAlternative;
};

type WebSpeechRecognitionEventLike = {
  results?: ArrayLike<WebSpeechRecognitionResultLike>;
};

type WebSpeechRecognitionErrorEventLike = {
  error?: string;
};

type WebSpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: WebSpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type WebSpeechRecognitionCtor = new () => WebSpeechRecognitionInstance;

type NativeSpeechRecognitionResultLike = {
  transcript?: string;
};

type NativeSpeechRecognitionResultEventLike = {
  isFinal?: boolean;
  results?: NativeSpeechRecognitionResultLike[];
};

type NativeSpeechRecognitionErrorEventLike = {
  error?: string;
  message?: string;
};

type NativeSpeechSubscription = {
  remove: () => void;
};

type NativeSpeechRecognitionModuleLike = {
  requestPermissionsAsync: () => Promise<{ granted?: boolean }>;
  isRecognitionAvailable?: () => boolean;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (
    eventName: "start" | "end" | "result" | "error" | "nomatch",
    listener: (
      event:
        | NativeSpeechRecognitionResultEventLike
        | NativeSpeechRecognitionErrorEventLike
        | null,
    ) => void,
  ) => NativeSpeechSubscription;
};

type WebMediaTrackLike = {
  stop?: () => void;
};

type WebMediaStreamLike = {
  getTracks?: () => ArrayLike<WebMediaTrackLike>;
};

const getWebSpeechRecognitionCtor = (): WebSpeechRecognitionCtor | null => {
  if (Platform.OS !== "web") return null;
  const root = globalThis as Record<string, unknown>;
  const candidate = root.SpeechRecognition ?? root.webkitSpeechRecognition;
  return typeof candidate === "function" ? (candidate as WebSpeechRecognitionCtor) : null;
};

const getNativeSpeechRecognitionModule = (): NativeSpeechRecognitionModuleLike | null => {
  if (Platform.OS === "web") return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const candidate = require("expo-speech-recognition") as {
      ExpoSpeechRecognitionModule?: NativeSpeechRecognitionModuleLike;
    };
    return candidate?.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
};

const sanitizeTranscript = (value: string): string => {
  const tokens = String(value || "")
    .replace(/[.,;:()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const compact = tokens.filter((token, index) => token !== tokens[index - 1]);
  return compact.join(" ").trim();
};

const buildTranscriptValue = (baseValue: string, transcript: string): string => {
  const safeBase = String(baseValue || "").trim();
  const safeTranscript = sanitizeTranscript(transcript);
  if (!safeBase) return safeTranscript;
  if (!safeTranscript) return safeBase;
  return `${safeBase} ${safeTranscript}`.trim();
};

const recordVoiceObservability = (params: {
  event: string;
  result: "success" | "error" | "skipped";
  extra?: Record<string, unknown>;
  errorMessage?: string;
}) =>
  recordPlatformObservability({
    screen: "foreman",
    surface: "ai_quick_voice",
    category: "ui",
    event: params.event,
    result: params.result,
    errorMessage: params.errorMessage,
    extra: {
      inputKind: "voice",
      platform: Platform.OS,
      ...params.extra,
    },
  });

const mapWebErrorToMessage = (errorCode: string, fallbackMessage?: string): string => {
  const source = `${errorCode} ${fallbackMessage ?? ""}`.trim().toLowerCase();
  if (
    source.includes("not-allowed") ||
    source.includes("permission") ||
    source.includes("denied")
  ) {
    return "Доступ к микрофону запрещён в браузере. Разрешите микрофон для этого сайта и повторите попытку.";
  }
  if (
    source.includes("audio-capture") ||
    source.includes("not-found") ||
    source.includes("no device") ||
    source.includes("device not found")
  ) {
    return "Микрофон не найден или недоступен на этом устройстве.";
  }
  if (source.includes("no-speech") || source.includes("speech-timeout")) {
    return "Речь не распознана. Повторите запись или продолжите текстом.";
  }
  if (source.includes("network")) {
    return "Распознавание речи временно недоступно. Проверьте сеть и повторите попытку.";
  }
  if (source.includes("interrupted")) {
    return "Запись была прервана. Повторите попытку, когда микрофон не занят другим приложением.";
  }
  return fallbackMessage?.trim() || "Не удалось запустить голосовой ввод. Проверьте микрофон или продолжите текстом.";
};

const mapNativeErrorToMessage = (errorCode: string, fallbackMessage?: string): string => {
  const fallback = String(fallbackMessage || "").trim();
  const source = `${errorCode} ${fallback}`.trim().toLowerCase();
  if (source.includes("interrupted")) {
    return "Аудиосессия была прервана системой или другим приложением. Нажмите «Повторить» и попробуйте снова.";
  }
  if (errorCode === "not-allowed") {
    return "Доступ к микрофону или распознаванию речи запрещён. Остаётся текстовый ввод.";
  }
  if (errorCode === "service-not-allowed") {
    return "Сервис распознавания речи недоступен на устройстве. Остаётся текстовый ввод.";
  }
  if (errorCode === "network") {
    return "Распознавание речи требует сеть или сервис сейчас недоступен. Остаётся текстовый ввод.";
  }
  if (errorCode === "no-speech" || errorCode === "speech-timeout") {
    return "Речь не распознана. Повторите запись или продолжите текстом.";
  }
  if (errorCode === "busy") {
    return "Распознавание уже запущено. Дождитесь завершения или нажмите стоп.";
  }
  return fallback || "Не удалось распознать речь. Проверьте микрофон или продолжите текстом.";
};

export function useForemanVoiceInput(params: {
  visible?: boolean;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const webRecognitionRef = useRef<WebSpeechRecognitionInstance | null>(null);
  const nativeModuleRef = useRef<NativeSpeechRecognitionModuleLike | null>(null);
  const nativeSubscriptionsRef = useRef<NativeSpeechSubscription[]>([]);
  const sessionBaseValueRef = useRef("");
  const valueRef = useRef(params.value);
  const onChangeTextRef = useRef(params.onChangeText);
  const lastAppliedTranscriptRef = useRef("");
  const suppressNextValueObservationRef = useRef(false);
  const transcriptEditedRef = useRef(false);

  valueRef.current = params.value;
  onChangeTextRef.current = params.onChangeText;

  const detectSupported = useCallback(
    () => (Platform.OS === "web" ? getWebSpeechRecognitionCtor() != null : getNativeSpeechRecognitionModule() != null),
    [],
  );

  const [supported, setSupported] = useState<boolean>(detectSupported());
  const [status, setStatus] = useState<ForemanVoiceStatus>(supported ? "ready" : "unsupported");
  const [error, setError] = useState("");

  const removeNativeSubscriptions = useCallback(() => {
    for (const subscription of nativeSubscriptionsRef.current) {
      try {
        subscription.remove();
      } catch {
        // ignore teardown failures
      }
    }
    nativeSubscriptionsRef.current = [];
  }, []);

  const resetSession = useCallback(
    (nextSupported?: boolean) => {
      const resolvedSupported = nextSupported ?? detectSupported();
      setSupported(resolvedSupported);
      setError("");
      setStatus(resolvedSupported ? "ready" : "unsupported");
      lastAppliedTranscriptRef.current = "";
      suppressNextValueObservationRef.current = false;
      transcriptEditedRef.current = false;
    },
    [detectSupported],
  );

  const teardownActiveRecognition = useCallback(() => {
    webRecognitionRef.current?.abort();
    webRecognitionRef.current = null;
    removeNativeSubscriptions();
    nativeModuleRef.current?.abort();
    nativeModuleRef.current = null;
  }, [removeNativeSubscriptions]);

  useEffect(() => {
    const nextSupported = detectSupported();
    setSupported(nextSupported);
    setStatus(nextSupported ? "ready" : "unsupported");
    if (!nextSupported) {
      recordVoiceObservability({
        event: "voice_capability_missing",
        result: "skipped",
        extra: {
          guardReason: "voice_unsupported",
          capability: "speech_recognition",
        },
      });
    }
  }, [detectSupported]);

  useEffect(() => {
    const nextValue = String(params.value || "").trim();
    if (suppressNextValueObservationRef.current) {
      suppressNextValueObservationRef.current = false;
      return;
    }
    if (!lastAppliedTranscriptRef.current || transcriptEditedRef.current) return;
    if (!nextValue || nextValue === lastAppliedTranscriptRef.current) return;
    transcriptEditedRef.current = true;
    recordVoiceObservability({
      event: "voice_transcript_edited",
      result: "success",
      extra: {
        transcriptLength: lastAppliedTranscriptRef.current.length,
        editedLength: nextValue.length,
        manualTranscriptEdit: true,
      },
    });
  }, [params.value]);

  useEffect(() => {
    return () => {
      teardownActiveRecognition();
    };
  }, [teardownActiveRecognition]);

  useEffect(() => {
    if (params.visible) {
      resetSession();
      return;
    }
    teardownActiveRecognition();
    resetSession();
  }, [params.visible, resetSession, teardownActiveRecognition]);

  const stop = useCallback(() => {
    webRecognitionRef.current?.stop();
    nativeModuleRef.current?.stop();
    recordVoiceObservability({
      event: "voice_stop_requested",
      result: "success",
    });
  }, []);

  const requestWebMicrophonePermission = useCallback(async () => {
    if (Platform.OS !== "web") {
      return { granted: true, errorCode: "", errorMessage: "" };
    }

    const root = globalThis as {
      navigator?: {
        mediaDevices?: {
          getUserMedia?: (constraints: { audio: boolean }) => Promise<WebMediaStreamLike>;
        };
      };
    };
    const getUserMedia = root.navigator?.mediaDevices?.getUserMedia;
    if (typeof getUserMedia !== "function") {
      return { granted: true, errorCode: "", errorMessage: "" };
    }

    try {
      const stream = await getUserMedia({ audio: true });
      const tracks = stream?.getTracks?.() ?? [];
      for (let index = 0; index < tracks.length; index += 1) {
        try {
          tracks[index]?.stop?.();
        } catch {
          // ignore per-track cleanup failures
        }
      }
      return { granted: true, errorCode: "", errorMessage: "" };
    } catch (permissionError) {
      const details =
        permissionError && typeof permissionError === "object"
          ? (permissionError as { name?: unknown; message?: unknown })
          : null;
      return {
        granted: false,
        errorCode: String(details?.name ?? "not-allowed").trim().toLowerCase(),
        errorMessage: String(details?.message ?? "").trim(),
      };
    }
  }, []);

  const startWebRecognition = useCallback(async () => {
    const SpeechRecognitionCtor = getWebSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setStatus("unsupported");
      setError("Голосовой ввод недоступен на этой платформе.");
      recordVoiceObservability({
        event: "voice_start_blocked",
        result: "skipped",
        extra: { guardReason: "voice_unsupported" },
      });
      return;
    }

    const permission = await requestWebMicrophonePermission();
    if (!permission.granted) {
      setStatus("denied");
      setError(mapWebErrorToMessage(permission.errorCode, permission.errorMessage));
      recordVoiceObservability({
        event: "voice_permission_denied",
        result: "skipped",
        extra: {
          guardReason: "voice_permission_denied",
          errorCode: permission.errorCode,
        },
        errorMessage: permission.errorMessage || permission.errorCode || "voice_permission_denied",
      });
      return;
    }

    if (webRecognitionRef.current) {
      webRecognitionRef.current.abort();
      webRecognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError("");
      setStatus("listening");
      recordVoiceObservability({
        event: "voice_listening_started",
        result: "success",
      });
    };

    recognition.onresult = (event) => {
      const parts: string[] = [];
      const results = event.results ?? [];
      for (let index = 0; index < results.length; index += 1) {
        const result = results[index];
        const transcript = String(result?.[0]?.transcript || "").trim();
        if (!transcript) continue;
        parts.push(transcript);
      }

      const combined = sanitizeTranscript(parts.join(" "));
      if (combined) {
        const nextValue = buildTranscriptValue(sessionBaseValueRef.current, combined);
        lastAppliedTranscriptRef.current = nextValue;
        transcriptEditedRef.current = false;
        suppressNextValueObservationRef.current = true;
        onChangeTextRef.current(nextValue);
        recordVoiceObservability({
          event: "voice_transcript_inserted",
          result: "success",
          extra: {
            transcriptLength: combined.length,
            manualSubmitRequired: true,
            userConfirmedTranscript: false,
          },
        });
      }
      setStatus("recognizing");
    };

    recognition.onerror = (event) => {
      const errorCode = String(event.error || "").trim();
      if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
        setStatus("denied");
        setError(mapWebErrorToMessage(errorCode));
        recordVoiceObservability({
          event: "voice_permission_denied",
          result: "skipped",
          extra: {
            guardReason: "voice_permission_denied",
            errorCode,
          },
        });
        return;
      }
      if (errorCode === "aborted") {
        setStatus("ready");
        recordVoiceObservability({
          event: "voice_aborted",
          result: "skipped",
          extra: { guardReason: "voice_aborted" },
        });
        return;
      }
      setStatus("failed");
      setError(mapWebErrorToMessage(errorCode));
      recordVoiceObservability({
        event: "voice_recognition_failed",
        result: "error",
        errorMessage: errorCode || "voice_recognition_failed",
        extra: { errorCode },
      });
    };

    recognition.onend = () => {
      webRecognitionRef.current = null;
      setStatus((current) => (current === "denied" || current === "failed" ? current : "ready"));
    };

    webRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (startError) {
      webRecognitionRef.current = null;
      setStatus("failed");
      setError(mapWebErrorToMessage("start-failed"));
      recordVoiceObservability({
        event: "voice_start_failed",
        result: "error",
        errorMessage:
          startError instanceof Error ? startError.message : String(startError ?? "voice_start_failed"),
      });
    }
  }, [requestWebMicrophonePermission]);

  const startNativeRecognition = useCallback(() => {
    void (async () => {
      const module = getNativeSpeechRecognitionModule();
      if (!module) {
        setStatus("unsupported");
        setError("Нативный voice input недоступен. Нужен development build с speech module.");
        recordVoiceObservability({
          event: "voice_start_blocked",
          result: "skipped",
          extra: { guardReason: "voice_native_module_missing" },
        });
        return;
      }

      if (typeof module.isRecognitionAvailable === "function" && !module.isRecognitionAvailable()) {
        setStatus("unsupported");
        setError("Сервис распознавания речи недоступен на устройстве. Остаётся текстовый ввод.");
        recordVoiceObservability({
          event: "voice_start_blocked",
          result: "skipped",
          extra: { guardReason: "voice_service_unavailable" },
        });
        return;
      }

      teardownActiveRecognition();
      nativeModuleRef.current = module;

      nativeSubscriptionsRef.current = [
        module.addListener("start", () => {
          setError("");
          setStatus("listening");
          recordVoiceObservability({
            event: "voice_listening_started",
            result: "success",
          });
        }),
        module.addListener("result", (event) => {
          const resultEvent = event as NativeSpeechRecognitionResultEventLike | null;
          const combined = sanitizeTranscript(
            Array.isArray(resultEvent?.results)
              ? resultEvent.results.map((item) => String(item?.transcript || "").trim()).join(" ")
              : "",
          );
          if (combined) {
            const nextValue = buildTranscriptValue(sessionBaseValueRef.current, combined);
            lastAppliedTranscriptRef.current = nextValue;
            transcriptEditedRef.current = false;
            suppressNextValueObservationRef.current = true;
            onChangeTextRef.current(nextValue);
            recordVoiceObservability({
              event: "voice_transcript_inserted",
              result: "success",
              extra: {
                transcriptLength: combined.length,
                isFinal: resultEvent?.isFinal === true,
                manualSubmitRequired: true,
                userConfirmedTranscript: false,
              },
            });
          }
          setStatus(resultEvent?.isFinal ? "recognizing" : "listening");
        }),
        module.addListener("nomatch", () => {
          setStatus("failed");
          setError("Речь не распознана. Повторите запись или продолжите текстом.");
          recordVoiceObservability({
            event: "voice_no_match",
            result: "error",
            errorMessage: "voice_no_match",
          });
        }),
        module.addListener("error", (event) => {
          const errorEvent = event as NativeSpeechRecognitionErrorEventLike | null;
          const errorCode = String(errorEvent?.error || "").trim();
          if (errorCode === "aborted") {
            setStatus("ready");
            recordVoiceObservability({
              event: "voice_aborted",
              result: "skipped",
              extra: { guardReason: "voice_aborted" },
            });
            return;
          }
          if (errorCode === "not-allowed") {
            setStatus("denied");
            setError(mapNativeErrorToMessage(errorCode, errorEvent?.message));
            recordVoiceObservability({
              event: "voice_permission_denied",
              result: "skipped",
              extra: {
                guardReason: "voice_permission_denied",
                errorCode,
              },
            });
            return;
          }
          if (errorCode === "service-not-allowed") {
            setStatus("unsupported");
            setError(mapNativeErrorToMessage(errorCode, errorEvent?.message));
            recordVoiceObservability({
              event: "voice_start_blocked",
              result: "skipped",
              extra: {
                guardReason: "voice_service_unavailable",
                errorCode,
              },
            });
            return;
          }
          setStatus("failed");
          setError(mapNativeErrorToMessage(errorCode, errorEvent?.message));
          recordVoiceObservability({
            event: "voice_recognition_failed",
            result: "error",
            errorMessage: errorEvent?.message || errorCode || "voice_recognition_failed",
            extra: { errorCode },
          });
        }),
        module.addListener("end", () => {
          removeNativeSubscriptions();
          nativeModuleRef.current = null;
          setStatus((current) =>
            current === "denied" || current === "failed" || current === "unsupported" ? current : "ready",
          );
        }),
      ];

      const permission = await module.requestPermissionsAsync();
      if (!permission?.granted) {
        removeNativeSubscriptions();
        nativeModuleRef.current = null;
        setStatus("denied");
        setError("Доступ к микрофону или распознаванию речи не выдан. Остаётся текстовый ввод.");
        recordVoiceObservability({
          event: "voice_permission_denied",
          result: "skipped",
          extra: {
            guardReason: "voice_permission_denied",
            permissionGranted: false,
          },
        });
        return;
      }

      try {
        module.start({
          lang: "ru-RU",
          interimResults: true,
          continuous: false,
          maxAlternatives: 1,
          iosTaskHint: "search",
        });
      } catch (startError) {
        removeNativeSubscriptions();
        nativeModuleRef.current = null;
        setStatus("failed");
        setError(mapNativeErrorToMessage("", startError instanceof Error ? startError.message : ""));
        recordVoiceObservability({
          event: "voice_start_failed",
          result: "error",
          errorMessage:
            startError instanceof Error ? startError.message : String(startError ?? "voice_start_failed"),
        });
      }
    })();
  }, [removeNativeSubscriptions, teardownActiveRecognition]);

  const start = useCallback(() => {
    sessionBaseValueRef.current = String(valueRef.current || "").trim();
    lastAppliedTranscriptRef.current = "";
    transcriptEditedRef.current = false;
    setError("");
    recordVoiceObservability({
      event: "voice_start_requested",
      result: "success",
      extra: {
        baseValueLength: sessionBaseValueRef.current.length,
      },
    });

    if (Platform.OS === "web") {
      void startWebRecognition();
      return;
    }

    startNativeRecognition();
  }, [startNativeRecognition, startWebRecognition]);

  return {
    supported,
    status,
    error,
    isActive: status === "listening" || status === "recognizing",
    start,
    stop,
  };
}
