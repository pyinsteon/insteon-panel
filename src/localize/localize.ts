import IntlMessageFormat from "intl-messageformat";
import * as en from "./languages/en.json";

const languages = {
  en,
};
const DEFAULT_LANGUAGE = "en";

const warnings: { language: string[]; sting: Record<string, string[]> } = {
  language: [],
  sting: {},
};

const _localizationCache = {};

export function localize(
  language: string,
  key: string,
  replace?: Record<string, any>,
): string {
  let lang = (
    language ||
    localStorage.getItem("selectedLanguage") ||
    DEFAULT_LANGUAGE
  )
    .replace(/['"]+/g, "")
    .replace("-", "_");

  if (!languages[lang]) {
    if (!warnings.language?.includes(lang)) {
      warnings.language.push(lang);
    }
    lang = DEFAULT_LANGUAGE;
  }

  const translatedValue =
    languages[lang]?.[key] || languages[DEFAULT_LANGUAGE][key];

  if (!translatedValue) {
    return "";
  }

  const messageKey = key + translatedValue;

  let translatedMessage = _localizationCache[messageKey] as
    | IntlMessageFormat
    | undefined;

  if (!translatedMessage) {
    try {
      translatedMessage = new IntlMessageFormat(translatedValue, language);
    } catch (err: any) {
      return "";
    }
    _localizationCache[messageKey] = translatedMessage;
  }

  try {
    return translatedMessage.format<string>(replace) as string;
  } catch (err: any) {
    return "";
  }
}
