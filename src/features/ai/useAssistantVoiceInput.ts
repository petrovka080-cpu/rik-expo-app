import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";

export type AssistantVoiceStatus =
  | "ready"
  | "listening"
  | "recognizing"
  | "denied"
  | "unsupported"
  | "failed";

type AssistantVoiceScreen = "buyer" | "director" | "foreman";

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

const mapNativeErrorToMessage = (errorCode: string, fallbackMessage?: string): string => {
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
  return fallbackMessage?.trim() || "Не удалось распознать речь. Проверьте микрофон или продолжите текстом.";
};

const recordAssistantVoice = (params: {
  screen: AssistantVoiceScreen | null;
  event: string;
  result: "success" | "error" | "skipped";
  extra?: Record<string, unknown>;
  errorMessage?: string;
}) =>
  params.screen
    ? recordPlatformObservability({
    screen: params.screen,
    surface: "assistant_voice",
    category: "ui",
    event: params.event,
    result: params.result,
    errorMessage: params.errorMessage,
    extra: {
      inputKind: "voice",
      platform: Platform.OS,
      manualSubmitRequired: true,
      ...params.extra,
    },
    })
    : null;

export function useAssistantVoiceInput(params: {
  screen: AssistantVoiceScreen | null;
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

  const supported =
    Platform.OS === "web"
      ? getWebSpeechRecognitionCtor() != null
      : getNativeSpeechRecognitionModule() != null;

  const [status, setStatus] = useState<AssistantVoiceStatus>(supported ? "ready" : "unsupported");
  const [error, setError] = useState("");

  const removeNativeSubscriptions = useCallback(() => {
    for (const subscription of nativeSubscriptionsRef.current) {
      try {
        subscription.remove();
      } catch {}
    }
    nativeSubscriptionsRef.current = [];
  }, []);

  useEffect(() => {
    const nextSupported =
      Platform.OS === "web"
        ? getWebSpeechRecognitionCtor() != null
        : getNativeSpeechRecognitionModule() != null;
    setStatus(nextSupported ? "ready" : "unsupported");
    if (!nextSupported) {
      recordAssistantVoice({
        screen: params.screen,
        event: "voice_capability_missing",
        result: "skipped",
        extra: {
          guardReason: "voice_unsupported",
          capability: "speech_recognition",
        },
      });
    }
  }, [params.screen]);

  useEffect(() => {
    const nextValue = String(params.value || "").trim();
    if (suppressNextValueObservationRef.current) {
      suppressNextValueObservationRef.current = false;
      return;
    }
    if (!lastAppliedTranscriptRef.current || transcriptEditedRef.current) return;
    if (!nextValue || nextValue === lastAppliedTranscriptRef.current) return;
    transcriptEditedRef.current = true;
    recordAssistantVoice({
      screen: params.screen,
      event: "voice_transcript_edited",
      result: "success",
      extra: {
        transcriptLength: lastAppliedTranscriptRef.current.length,
        editedLength: nextValue.length,
        manualTranscriptEdit: true,
      },
    });
  }, [params.screen, params.value]);

  useEffect(() => {
    return () => {
      webRecognitionRef.current?.abort();
      webRecognitionRef.current = null;
      removeNativeSubscriptions();
      nativeModuleRef.current?.abort();
      nativeModuleRef.current = null;
    };
  }, [removeNativeSubscriptions]);

  const stop = useCallback(() => {
    webRecognitionRef.current?.stop();
    nativeModuleRef.current?.stop();
    recordAssistantVoice({
      screen: params.screen,
      event: "voice_stop_requested",
      result: "success",
    });
  }, [params.screen]);

  const startWebRecognition = useCallback(() => {
    const SpeechRecognitionCtor = getWebSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setStatus("unsupported");
      setError("Голосовой ввод недоступен на этой платформе.");
      recordAssistantVoice({
        screen: params.screen,
        event: "voice_start_blocked",
        result: "skipped",
        extra: { guardReason: "voice_unsupported" },
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
      recordAssistantVoice({
        screen: params.screen,
        event: "voice_listening_started",
        result: "success",
      });
    };

    recognition.onresult = (event) => {
      const parts: string[] = [];
      const results = event.results ?? [];
      for (let index = 0; index < results.length; index += 1) {
        const transcript = String(results[index]?.[0]?.transcript || "").trim();
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
        recordAssistantVoice({
          screen: params.screen,
          event: "voice_transcript_inserted",
          result: "success",
          extra: {
            transcriptLength: combined.length,
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
        setError("Доступ к микрофону запрещён. Остаётся текстовый ввод.");
        recordAssistantVoice({
          screen: params.screen,
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
        recordAssistantVoice({
          screen: params.screen,
          event: "voice_aborted",
          result: "skipped",
          extra: { guardReason: "voice_aborted" },
        });
        return;
      }
      setStatus("failed");
      setError("Не удалось распознать речь. Проверьте микрофон или продолжите текстом.");
      recordAssistantVoice({
        screen: params.screen,
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
    recognition.start();
  }, [params.screen]);

  const startNativeRecognition = useCallback(() => {
    void (async () => {
      const module = getNativeSpeechRecognitionModule();
      if (!module) {
        setStatus("unsupported");
        setError("Нативный voice input недоступен. Нужен development build с speech module.");
        recordAssistantVoice({
          screen: params.screen,
          event: "voice_start_blocked",
          result: "skipped",
          extra: { guardReason: "voice_native_module_missing" },
        });
        return;
      }

      if (typeof module.isRecognitionAvailable === "function" && !module.isRecognitionAvailable()) {
        setStatus("unsupported");
        setError("Сервис распознавания речи недоступен на устройстве. Остаётся текстовый ввод.");
        recordAssistantVoice({
          screen: params.screen,
          event: "voice_start_blocked",
          result: "skipped",
          extra: { guardReason: "voice_service_unavailable" },
        });
        return;
      }

      removeNativeSubscriptions();
      nativeModuleRef.current?.abort();
      nativeModuleRef.current = module;

      nativeSubscriptionsRef.current = [
        module.addListener("start", () => {
          setError("");
          setStatus("listening");
          recordAssistantVoice({
            screen: params.screen,
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
            recordAssistantVoice({
              screen: params.screen,
              event: "voice_transcript_inserted",
              result: "success",
              extra: {
                transcriptLength: combined.length,
                isFinal: resultEvent?.isFinal === true,
                userConfirmedTranscript: false,
              },
            });
          }
          setStatus(resultEvent?.isFinal ? "recognizing" : "listening");
        }),
        module.addListener("nomatch", () => {
          setStatus("failed");
          setError("Речь не распознана. Повторите запись или продолжите текстом.");
          recordAssistantVoice({
            screen: params.screen,
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
            recordAssistantVoice({
              screen: params.screen,
              event: "voice_aborted",
              result: "skipped",
              extra: { guardReason: "voice_aborted" },
            });
            return;
          }
          if (errorCode === "not-allowed") {
            setStatus("denied");
            setError(mapNativeErrorToMessage(errorCode, errorEvent?.message));
            recordAssistantVoice({
              screen: params.screen,
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
            recordAssistantVoice({
              screen: params.screen,
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
          recordAssistantVoice({
            screen: params.screen,
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
        recordAssistantVoice({
          screen: params.screen,
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
      } catch {
        removeNativeSubscriptions();
        nativeModuleRef.current = null;
        setStatus("failed");
        setError("Не удалось запустить распознавание речи. Остаётся текстовый ввод.");
        recordAssistantVoice({
          screen: params.screen,
          event: "voice_start_failed",
          result: "error",
          errorMessage: "voice_start_failed",
        });
      }
    })();
  }, [params.screen, removeNativeSubscriptions]);

  const start = useCallback(() => {
    sessionBaseValueRef.current = String(valueRef.current || "").trim();
    lastAppliedTranscriptRef.current = "";
    transcriptEditedRef.current = false;
    setError("");
    recordAssistantVoice({
      screen: params.screen,
      event: "voice_start_requested",
      result: "success",
      extra: {
        baseValueLength: sessionBaseValueRef.current.length,
      },
    });

    if (Platform.OS === "web") {
      startWebRecognition();
      return;
    }

    startNativeRecognition();
  }, [params.screen, startNativeRecognition, startWebRecognition]);

  return {
    supported,
    status,
    error,
    isActive: status === "listening" || status === "recognizing",
    start,
    stop,
  };
}
