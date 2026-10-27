import * as Updates from "expo-updates";

export type OtaCheckResult = {
  isAvailable: boolean;
  isFetched: boolean;
  message: string;
  error?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "Unknown OTA error");
}

function getBlockedResult(operation: "check" | "fetch" | "check-fetch"): OtaCheckResult | null {
  if (__DEV__) {
    return {
      isAvailable: false,
      isFetched: false,
      message: "Dev mode: OTA actions are disabled in Expo development mode.",
    };
  }

  if (!Updates.isEnabled) {
    return {
      isAvailable: false,
      isFetched: false,
      message: "expo-updates is disabled for this build, so OTA actions are unavailable.",
    };
  }

  if (operation === "fetch") {
    return null;
  }

  return null;
}

export async function checkOtaNow(): Promise<OtaCheckResult> {
  const blocked = getBlockedResult("check");
  if (blocked) return blocked;

  try {
    const result = await Updates.checkForUpdateAsync();

    if (!result.isAvailable) {
      return {
        isAvailable: false,
        isFetched: false,
        message: "Новых OTA-обновлений нет.",
      };
    }

    return {
      isAvailable: true,
      isFetched: false,
      message: "Найдено OTA-обновление. Его можно скачать.",
    };
  } catch (error) {
    return {
      isAvailable: false,
      isFetched: false,
      message: "Не удалось проверить OTA.",
      error: getErrorMessage(error),
    };
  }
}

export async function fetchOtaNow(): Promise<OtaCheckResult> {
  const blocked = getBlockedResult("fetch");
  if (blocked) return blocked;

  try {
    const result = await Updates.fetchUpdateAsync();

    if (result.isNew) {
      return {
        isAvailable: true,
        isFetched: true,
        message:
          "Обновление скачано. Полностью закройте приложение, откройте его, затем еще раз закройте и откройте снова.",
      };
    }

    return {
      isAvailable: false,
      isFetched: false,
      message: "Скачивать нечего: новое OTA не найдено.",
    };
  } catch (error) {
    return {
      isAvailable: false,
      isFetched: false,
      message: "Не удалось скачать OTA.",
      error: getErrorMessage(error),
    };
  }
}

export async function checkAndFetchOtaNow(): Promise<OtaCheckResult> {
  const blocked = getBlockedResult("check-fetch");
  if (blocked) return blocked;

  try {
    const checkResult = await Updates.checkForUpdateAsync();

    if (!checkResult.isAvailable) {
      return {
        isAvailable: false,
        isFetched: false,
        message: "Новых OTA-обновлений нет.",
      };
    }

    const fetchResult = await Updates.fetchUpdateAsync();

    if (fetchResult.isNew) {
      return {
        isAvailable: true,
        isFetched: true,
        message:
          "OTA-обновление скачано. Полностью закройте приложение, откройте его, затем еще раз закройте и откройте снова.",
      };
    }

    return {
      isAvailable: true,
      isFetched: false,
      message: "OTA найдено, но скачать его не удалось или оно уже было скачано ранее.",
    };
  } catch (error) {
    return {
      isAvailable: false,
      isFetched: false,
      message: "Ошибка OTA check/fetch.",
      error: getErrorMessage(error),
    };
  }
}
