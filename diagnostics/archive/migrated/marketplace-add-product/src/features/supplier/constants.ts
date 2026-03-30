/**
 * Supplier Module Constants
 * Extracted from supplier.tsx for better modularity
 */

export const UNITS = {
    product: ['шт', 'кг', 'тонна', 'м', 'м²', 'м³', 'мешок', 'упак'],
    service: ['час', 'смена', 'работа', 'рейс', 'м²'],
} as const;

export const KYRGYZSTAN_CITIES = [
    'Бишкек',
    'Ош',
    'Джалал-Абад',
    'Каракол',
    'Токмок',
    'Нарын',
    'Талас',
    'Баткен',
    'Кызыл-Кия',
    'Узген',
    'Балыкчы',
    'Кара-Балта',
    'Кант',
    'Другой',
] as const;

export const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&q=80';

/** Supplier theme colors (green accent) */
export const supplierTheme = {
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    sub: '#64748b',
    accent: '#16A34A',
    border: '#e2e8f0',
} as const;

/** City coordinates for geolocation */
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    'Бишкек': { lat: 42.8746, lng: 74.5698 },
    'Ош': { lat: 40.5283, lng: 72.8035 },
    'Джалал-Абад': { lat: 40.9332, lng: 73.0017 },
    'Каракол': { lat: 42.4907, lng: 78.3936 },
    'Токмок': { lat: 42.8425, lng: 75.2892 },
    'Нарын': { lat: 41.4287, lng: 75.9911 },
    'Талас': { lat: 42.5183, lng: 72.2436 },
    'Баткен': { lat: 40.0550, lng: 70.8194 },
};
