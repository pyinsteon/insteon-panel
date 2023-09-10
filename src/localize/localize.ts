import { InsteonLogger } from "../tools/insteon-logger";
import IntlMessageFormat from "intl-messageformat";
import * as en from "./languages/en.json";

const languages = {
  en,
};
const DEFAULT_LANGUAGE = "en";
const logger = new InsteonLogger("localize");
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
      logger.warn(
        `Language '${lang.replace(
          "_",
          "-",
        )}' is not added to insteon, using '${DEFAULT_LANGUAGE}' instead.`,
      );
    }
    lang = DEFAULT_LANGUAGE;
  }
  const keys = key.split(".");

  const translatedValue =
    get_lang_value(keys, languages[lang]) ||
    get_lang_value(keys, languages[DEFAULT_LANGUAGE]);

  if (!translatedValue) {
    logger.error(`Translation problem with '${key}' for '${lang}'`);
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
      logger.warn(`Translation problem with '${key}' for '${lang}'`);
      return "";
    }
    _localizationCache[messageKey] = translatedMessage;
  }

  try {
    return translatedMessage.format<string>(replace) as string;
  } catch (err: any) {
    logger.warn(`Translation problem with '${key}' for '${lang}'`);
    return "";
  }
}
