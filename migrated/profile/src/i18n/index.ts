import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import ru from './locales/ru';
import en from './locales/en';

const resources = {
    ru: { translation: ru },
    en: { translation: en },
};

try {
    const locales = Localization.getLocales();
    const systemLng = locales && locales.length > 0 ? locales[0].languageCode?.split('-')[0] : 'ru';

    i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: systemLng || 'ru',
            fallbackLng: 'ru',
            interpolation: {
                escapeValue: false,
            },
        });
} catch (e) {
    console.warn('[i18n] Initialization failed, falling back to "ru":', e);
    i18n.use(initReactI18next).init({
        resources,
        lng: 'ru',
        fallbackLng: 'ru',
        interpolation: { escapeValue: false }
    });
}

export default i18n;
