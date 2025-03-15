import i18n from 'i18next'; // version: ^22.4.15
import { initReactI18next } from 'react-i18next'; // version: ^12.2.2
import { format, formatDistance, formatRelative, isDate } from 'date-fns'; // version: ^2.30.0
import { enUS, fr, de, ja, zhCN } from 'date-fns/locale'; // version: ^2.30.0

import enTranslations from '../locales/en.json';
import frTranslations from '../locales/fr.json';
import deTranslations from '../locales/de.json';
import jaTranslations from '../locales/ja.json';
import zhTranslations from '../locales/zh.json';

/**
 * Configuration for i18next, the internationalization library.
 * This setup includes supported languages, translation resources,
 * and formatting utilities for dates and numbers.
 */

/**
 * Array of supported languages in the application. Each object contains
 * the language code and its display name.
 */
export const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '中文' },
];

/**
 * Default language code for the application.
 */
export const defaultLanguage = 'en';

/**
 * Extracts the language code from a locale string.
 * @param locale - The locale string (e.g., 'en-US').
 * @returns The language code (e.g., 'en').
 */
export function getLanguageFromLocale(locale: string): string {
  const [language] = locale.split('-');
  return language;
}

/**
 * Formats a date according to the current locale and specified format.
 * @param date - The date to format (can be a Date object, number, or string).
 * @param formatString - The desired format string (see date-fns documentation).
 * @param options - Additional options for date-fns format function.
 * @returns The formatted date string.
 */
export function formatDate(
  date: Date | number | string,
  formatString: string,
  options: object = {}
): string {
  if (!isDate(date) && typeof date !== 'number' && typeof date !== 'string') {
    return '';
  }

  const currentLanguage = i18n.language;
  let locale;

  switch (currentLanguage) {
    case 'fr':
      locale = fr;
      break;
    case 'de':
      locale = de;
      break;
    case 'ja':
      locale = ja;
      break;
    case 'zh':
      locale = zhCN;
      break;
    default:
      locale = enUS;
  }

  return format(new Date(date), formatString, { ...options, locale });
}

/**
 * Formats a number according to the current locale and specified options.
 * @param value - The number to format.
 * @param options - Options for the NumberFormat constructor.
 * @returns The formatted number string.
 */
export function formatNumber(value: number, options: object = {}): string {
  const currentLanguage = i18n.language;
  const numberFormat = new Intl.NumberFormat(currentLanguage, options);
  return numberFormat.format(value);
}

/**
 * Configuration object for i18next.
 * Defines the fallback language, enables debugging, and sets up
 * interpolation options. Also includes the translation resources
 * for each supported language.
 */
i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    fallbackLng: defaultLanguage, // if detected lng is not available
    debug: false, // set to true for debugging

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: { translation: enTranslations },
      fr: { translation: frTranslations },
      de: { translation: deTranslations },
      ja: { translation: jaTranslations },
      zh: { translation: zhTranslations },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export { i18n };