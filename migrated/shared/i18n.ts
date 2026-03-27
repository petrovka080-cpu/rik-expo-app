type TranslationOptions = {
  defaultValue?: string;
  [key: string]: unknown;
};

const resolveDefaultValue = (args: unknown[]): string | undefined => {
  for (const arg of args.slice(1)) {
    if (typeof arg === "string" && arg.trim()) {
      return arg;
    }
    if (
      arg &&
      typeof arg === "object" &&
      "defaultValue" in (arg as TranslationOptions) &&
      typeof (arg as TranslationOptions).defaultValue === "string"
    ) {
      return (arg as TranslationOptions).defaultValue;
    }
  }
  return undefined;
};

const i18n = {
  language: "ru",
  async changeLanguage(language: string) {
    this.language = language;
  },
};

export function useTranslation() {
  return {
    t: (key: string, ...args: unknown[]) => resolveDefaultValue([key, ...args]) ?? key,
    i18n,
  };
}

export { i18n };
