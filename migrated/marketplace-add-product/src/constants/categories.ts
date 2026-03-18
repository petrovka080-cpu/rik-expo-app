export const CATEGORY_IMAGES = {
    materials: require('../../assets/market-categories/materials_3d.jpg'),
    works: require('../../assets/market-categories/works_3d.jpg'),
    services: require('../../assets/market-categories/services_3d.jpg'),
    delivery: require('../../assets/market-categories/delivery_3d.jpg'),
    transport: require('../../assets/market-categories/transport_3d.jpg'),
    tools: require('../../assets/market-categories/tools_3d.jpg'),
    misc: require('../../assets/market-categories/misc_3d.jpg'),
};

export const MAIN_CATEGORIES = (t: any) => [
    { key: 'materials', label: t('categories.materials', 'Материалы'), image: CATEGORY_IMAGES.materials, icon: 'layers-outline', color: '#E0F2FE', iconColor: '#0284C7' },
    { key: 'works', label: t('categories.works', 'Работы'), image: CATEGORY_IMAGES.works, icon: 'construct-outline', color: '#F1F5F9', iconColor: '#475569' },
    { key: 'services', label: t('categories.services', 'Услуги'), image: CATEGORY_IMAGES.services, icon: 'briefcase-outline', color: '#F3E8FF', iconColor: '#9333EA' },
    { key: 'delivery', label: t('categories.delivery', 'Доставка'), image: CATEGORY_IMAGES.delivery, icon: 'cube-outline', color: '#DCFCE7', iconColor: '#16A34A' },
    { key: 'transport', label: t('categories.transport', 'Транспорт'), image: CATEGORY_IMAGES.transport, icon: 'bus-outline', color: '#FFEDD5', iconColor: '#EA580C' },
    { key: 'tools', label: t('categories.tools', 'Инструменты'), image: CATEGORY_IMAGES.tools, icon: 'build-outline', color: '#FEE2E2', iconColor: '#DC2626' },
    { key: 'misc', label: t('categories.misc', 'Разное'), image: CATEGORY_IMAGES.misc, icon: 'grid-outline', color: '#F3F4F6', iconColor: '#4B5563' },
];

export const SUB_CATEGORIES = (t: any): Record<string, { key: string; label: string }[]> => ({
    materials: [
        { key: 'MAT-CONCR', label: t('subcategories.materials.concrete', 'Бетон, ЖБИ') },
        { key: 'MAT-BRICK', label: t('subcategories.materials.brick', 'Кирпич, Блоки') },
        { key: 'MAT-FINISH', label: t('subcategories.materials.finishing', 'Отделочные мат.') },
        { key: 'MAT-ROOFMAT', label: t('subcategories.materials.roofing', 'Кровля') },
        { key: 'MAT-TIMBER', label: t('subcategories.materials.timber', 'Пиломатериалы') },
        { key: 'MAT-METAL', label: t('subcategories.materials.metal', 'Металлопрокат') },
        { key: 'MAT-BULK', label: t('subcategories.materials.bulk', 'Сыпучие') },
        { key: 'MAT-ELECT', label: t('subcategories.materials.electrical', 'Электрика') },
        { key: 'MAT-SAN', label: t('subcategories.materials.plumbing', 'Сантехника') },
    ],
    works: [
        { key: 'GEN', label: t('subcategories.works.construction', 'Строительство') },
        { key: 'FIN', label: t('subcategories.works.finishing', 'Отделка') },
        { key: 'PREP', label: t('subcategories.works.earthworks', 'Земляные работы') },
        { key: 'ROOF', label: t('subcategories.works.roofing', 'Кровля') },
        { key: 'FAC', label: t('subcategories.works.facades', 'Фасады') },
        { key: 'MEP', label: t('subcategories.works.engineering', 'Инженерные сети') },
        { key: 'STRUC', label: t('subcategories.works.concrete', 'Бетонные работы') },
    ],
    services: [
        { key: 'PROJ', label: t('subcategories.services.design', 'Проектирование') },
        { key: 'ENG', label: t('subcategories.services.surveys', 'Изыскания') },
        { key: 'RENT', label: t('subcategories.services.rental', 'Аренда спецтехники') },
    ],
    delivery: [
        { key: 'DEL-BULK', label: t('subcategories.delivery.bulk', 'Сыпучие грузы') },
        { key: 'DEL-BUILD', label: t('subcategories.delivery.building', 'Стройматериалы') },
        { key: 'DEL-HEAVY', label: t('subcategories.delivery.heavy', 'Негабаритные грузы') },
        { key: 'DEL-CITY', label: t('subcategories.delivery.city', 'По городу') },
        { key: 'DEL-INTER', label: t('subcategories.delivery.intercity', 'Межгород') },
        { key: 'DEL-EXPRESS', label: t('subcategories.delivery.express', 'Срочная доставка') },
    ],
    transport: [
        { key: 'SPEC-MECH', label: t('subcategories.transport.special', 'Спецтехника') },
        { key: 'TRUCKS', label: t('subcategories.transport.trucks', 'Грузовики') },
    ],
    tools: [
        { key: 'MAT-TOOL', label: t('subcategories.tools.power', 'Электроинструмент') },
        { key: 'SUP-TOOLS', label: t('subcategories.tools.hand', 'Ручной инстр.') },
        { key: 'MEASURE', label: t('subcategories.tools.measuring', 'Измерительный') },
    ],
    misc: [
        { key: 'SUP', label: t('subcategories.misc.household', 'Хозтовары') },
        { key: 'SAFETY', label: t('subcategories.misc.safety', 'Спецодежда') },
    ],
});
