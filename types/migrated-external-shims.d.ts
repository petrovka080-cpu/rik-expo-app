declare module "react-i18next" {
  import type * as React from "react";

  export const initReactI18next: {
    type: string;
    init: (...args: unknown[]) => void;
  };

  export function useTranslation(): {
    t: (...args: unknown[]) => string;
    i18n: {
      language: string;
      changeLanguage: (language: string) => Promise<void> | void;
      use?: (...args: unknown[]) => unknown;
      init?: (...args: unknown[]) => unknown;
    };
  };

  export const Trans: React.ComponentType<{ children?: React.ReactNode }>;
}

declare module "i18next" {
  const i18n: {
    language: string;
    use: (...args: unknown[]) => typeof i18n;
    init: (...args: unknown[]) => Promise<void> | void;
    changeLanguage: (language: string) => Promise<void> | void;
  };

  export default i18n;
}

declare module "expo-localization" {
  export function getLocales(): {
    languageCode?: string | null;
  }[];
}

declare module "react-native-markdown-display" {
  import type * as React from "react";

  const Markdown: React.ComponentType<{
    children?: React.ReactNode;
    style?: unknown;
  }>;

  export default Markdown;
}

declare module "@google/genai" {
  export class GoogleGenAI {
    constructor(options: { apiKey: string });
    chats: {
      create(options: unknown): {
        sendMessage(input: unknown): Promise<{ text?: string }>;
      };
    };
    models: {
      generateContent(input: unknown): Promise<{ text?: string }>;
    };
  }
}

declare module "expo-image-manipulator" {
  export enum SaveFormat {
    JPEG = "jpeg",
    PNG = "png",
    WEBP = "webp",
  }

  export function manipulateAsync(
    uri: string,
    actions: Record<string, unknown>[],
    saveOptions?: {
      compress?: number;
      format?: SaveFormat;
    }
  ): Promise<{
    uri: string;
    width: number;
    height: number;
  }>;
}
