import IntlMessageFormat from "intl-messageformat";
import * as en from "./languages/en.json";
import { LocalizeFunc } from "@ha/common/translations/localize";

const languages = {
  en,
};
const DEFAULT_LANGUAGE = "en";

const warnings: { language: string[]; sting: Record<string, string[]> } = {
  language: [],
  sting: {},
};

const _localizationCache = {};

function get_lang_value(keys: string[], language) {
  let value = language;
  keys.forEach((key) => {
    value = value[key];
    if (!value) {
      return "";
    }
    return value;
  });
  return value;
}

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
  const keys = key.split(".");

  const translatedValue =
    get_lang_value(keys, languages[lang]) ||
    get_lang_value(keys, languages[DEFAULT_LANGUAGE]);

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
