// src/lib/translation_helper.ts
import rikTranslations from './rik_translations.json';

/** 
 * Dictionary of common abbreviations and units 
 */
export const ABBREVIATION_TRANSLATIONS: Record<string, string> = {
    'pcs': 'шт',
    'qty': 'кол-во',
    'uom': 'ед. изм.',
    'm2': 'м²',
    'm3': 'м³',
    'kg': 'кг',
    't': 'т',
    'lm': 'пог. м',
    'set': 'компл',
};

/**
 * Dictionary of common code prefixes/parts to Russian
 */
const CODE_PARTS: Record<string, string> = {
    // === Prefixes ===
    'MAT': 'Материал',
    'WRK': 'Работа',
    'SRV': 'Услуга',
    'COM': 'Общий',
    'LSTK': 'ЛСТК',
    'CONC': 'Бетон',
    'EARTH': 'Земляные',
    'SUBCONC': 'Подбетонка',
    'LEAN': 'Подбетонка',
    'SVC': 'Услуга',

    // === Building Materials - Masonry ===
    'BRICK': 'Кирпич',
    'BLOCK': 'Блок',
    'STONE': 'Камень',
    'CLINKER': 'Клинкерный',
    'CERAMIC': 'Керамический',
    'PORCELAIN': 'Керамогранит',
    'SLAB': 'Плита',
    'PAVER': 'Тротуарная плитка',
    'CURB': 'Бордюр',
    'BORDER': 'Бордюр',
    'COLUMN': 'Колонна',
    'BEAM': 'Балка',
    'LINTEL': 'Перемычка',
    'MARBLE': 'Мрамор',

    // === Tile finish types (from DB: 912 tile items) ===
    'SEMI': 'Полу',
    'GLOSS': 'Глянцевый',
    'GLOSSY': 'Глянцевый',
    'MATTE': 'Матовый',
    'MATT': 'Матовый',
    'POLISHED': 'Полированный',
    'STRUCTURED': 'Структурированный',
    'LAPPATO': 'Лаппатированный',
    'SATIN': 'Сатинированный',
    'HONED': 'Хонингованный',
    'GLAZED': 'Глазурованный',
    'TEXTURED': 'Текстурированный',
    'RUSTIC': 'Рустикальный',
    'DECOR': 'Декор',
    'MOSAIC': 'Мозаика',
    'PATTERN': 'Узор',
    'BORDER_TILE': 'Бордюр',

    // === Colors (from DB: many tile entries) ===
    'BEIGE': 'Бежевый',
    'DARK': 'Тёмный',
    'IVORY': 'Слоновая кость',
    'GRAPHITE': 'Графитовый',
    'CREAM': 'Кремовый',
    'SAND_COLOR': 'Песочный',
    'SILVER': 'Серебристый',
    'GOLD': 'Золотой',
    'BRONZE': 'Бронзовый',
    'COPPER': 'Медный',
    'TERRACOTTA': 'Терракотовый',
    'ANTHRACITE': 'Антрацитовый',
    'CHARCOAL': 'Угольный',
    'TAUPE': 'Серо-коричневый',
    'PEARL': 'Жемчужный',
    'ROSE': 'Розовый',
    'CORAL': 'Коралловый',
    'WALNUT': 'Ореховый',
    'OAK': 'Дубовый',
    'PINE': 'Сосновый',
    'ASH': 'Ясеневый',
    'CHERRY': 'Вишнёвый',
    'TEAK': 'Тиковый',
    'WENGE': 'Венге',

    // === Fasteners (from DB: bolts, screws) ===
    'CSK': 'Потайной',
    'HEX': 'Шестигранный',
    'FLANGED': 'Фланцевый',
    'PZ': 'PZ крестовой',
    'TORX': 'TORX',
    'COUNTERSUNK': 'Потайной',
    'PAN': 'Полукруглый',
    'SOCKET_HEAD': 'Под ключ',
    'STAINLESS': 'Нержавеющий',
    'GALVANIZED': 'Оцинкованный',
    'ZINC': 'Цинковый',
    'PLATED': 'Покрытый',
    'THREADED': 'Резьбовой',
    'SPRING': 'Пружинный',
    'LOCK': 'Стопорный',
    'FLAT_WASHER': 'Плоская',
    'SPLIT': 'Гровер',

    // === Ceiling/Stretch (from DB: stretch ceiling items) ===
    'STRETCH': 'Натяжной',
    'NICHE': 'Ниша',
    'BUILD': 'Устройство',
    'SPOT': 'Точечный',
    'PSU': 'Блок питания',
    'LED': 'Светодиодный',
    'STRIP_LIGHT': 'Лента',
    'SUSPENDED': 'Подвесной',
    'ARMSTRONG': 'Армстронг',
    'BAFFLE': 'Реечный',
    'GRID': 'Решётка',
    'GRILLE': 'Решётка',
    'DIFFUSER': 'Диффузор',

    // === Work action terms (from DB: wrk- items) ===
    'DEMOLISH': 'Демонтаж',
    'WET': 'Мокрый',
    'GEN': 'Общий',
    'QC': 'Контроль качества',
    'WALLP': 'Обои',
    'WM': 'Стиральная машина',
    'WIRING': 'Проводка',
    'LIGHTING': 'Освещение',
    'FIXTURE': 'Сантехприбор',
    'BOXING': 'Короб',
    'SHINGLE': 'Металлочерепица',
    'BORED': 'Буронабивной',
    'EMBED': 'Закладная',
    'FLUSHING': 'Промывка',
    'PROG': 'Пусконаладка',

    // === Technical / Misc (from DB) ===
    'PLATE': 'Пластина',
    'TROWEL': 'Мастерок',
    'SHIM': 'Подкладка',
    'LINE': 'Линия',
    'HPL': 'HPL панель',
    'MON': 'Монолит',
    'MW': 'Минвата',
    'WS': 'Водоснабжение',
    'UGOL': 'Уголок',
    'ABB': 'ABB',
    'ABRAS': 'Абразив',
    'ABRASIVE': 'Абразивный',
    'PORC': 'Керамогранит',
    'ACC': 'Комплектующие',
    'CORNICE': 'Карниз',
    'PPS': 'Пенополистирол',
    'MET': 'Металл',
    'REZKA': 'Резка',
    'PROF': 'Профиль',
    'PROFIL': 'Профиль',
    'TRUBA': 'Труба',
    'SHLIF': 'Шлифовальный',
    'KRUG': 'Круг',
    'OTKOS': 'Откос',
    'PODOK': 'Подоконник',
    'KORONKA': 'Коронка',
    'DISK': 'Диск',
    'LM': 'Пог. м',
    'WORK': 'Работа',
    'WRK_PREFIX': 'Работа',
    'WT': 'Работа',
    'RES': 'Жилой',
    'IND': 'Промышленный',

    // === Materials - Basic ===
    'BETON': 'Бетон',
    'BOLT': 'Болт',
    'NUT': 'Гайка',
    'WASHER': 'Шайба',
    'SCREW': 'Саморез',
    'ANCHOR': 'Анкер',
    'TILE': 'Плитка',
    'CABLE': 'Кабель',
    'PIPE': 'Труба',
    'VENT': 'Вентиляция',
    'STEEL': 'Сталь',
    'FAST': 'Крепёж',
    'DRY': 'Сухая смесь',
    'SETKA': 'Сетка',
    'ROOF': 'Кровля',
    'PPR': 'Полипропилен',
    'PVH': 'ПВХ',
    'REBAR': 'Арматура',
    'FORMWORK': 'Опалубка',
    'CONCRETE': 'Бетон',

    // === Product/Brand terms ===
    'JOINT': 'Шпаклёвка',
    'COMPOUND': 'Смесь',
    'TAPING': 'Заделка швов',
    'PLS': 'Шпаклёвка',
    'SELFDRILL': 'Самосверлящий',
    'ACP': 'Композитная панель',
    'ARM': 'Армированный',
    'BOARDS': 'Доска',
    'DRYWALL': 'Гипсокартон',
    'BOARD': 'Лист',
    'SHEET': 'Лист',
    'CORNER': 'Уголок',
    'TAPE': 'Лента',
    'MESH': 'Сетка',
    'SHEATHING': 'Обшивка',
    'STUD': 'Стойка',
    'TRACK': 'Направляющая',
    'HANGER': 'Подвес',
    'CLIP': 'Зажим',
    'BRACKET': 'Кронштейн',
    'DOWEL': 'Дюбель',
    'RIVET': 'Заклёпка',
    'SELF': 'Само',
    'DRILL': 'Сверлящий',
    'PLYWOOD': 'Фанера',
    'OSB': 'ОСБ',
    'MDF': 'МДФ',
    'CEMENT': 'Цемент',
    'GYPSUM': 'Гипс',
    'FOAM': 'Пена',
    'SILICONE': 'Силикон',
    'RUBBER': 'Резина',
    'METAL': 'Металл',
    'WOOD': 'Дерево',
    'PLASTIC': 'Пластик',
    'GLASS': 'Стекло',
    'MORTAR': 'Раствор',
    'LIME': 'Известь',
    'CALCIUM': 'Кальций',
    'CALCIUM SILICATE': 'Силикатный',
    'AERATED': 'Газобетон',
    'AUTOCLAVED': 'Автоклавный',
    'HOLLOW': 'Пустотелый',
    'SOLID': 'Полнотелый',
    'REINFORCED': 'Армированный',
    'PRECAST': 'Сборный',
    'PREFAB': 'Сборный',

    // === Dimensions & Properties ===
    'LENGTH': 'Длина',
    'WIDTH': 'Ширина',
    'HEIGHT': 'Высота',
    'THICK': 'Толщина',
    'THICKNESS': 'Толщина',
    'DEPTH': 'Глубина',
    'DIAM': 'Диаметр',
    'DIAMETER': 'Диаметр',
    'SIZE': 'Размер',
    'WEIGHT': 'Вес',
    'AREA': 'Площадь',
    'VOLUME': 'Объём',
    'POINTS': 'Точки',
    'UNIT': 'Единица',

    // === Colors ===
    'WHITE': 'Белый',
    'BLACK': 'Чёрный',
    'GREY': 'Серый',
    'GRAY': 'Серый',
    'BROWN': 'Коричневый',
    'YELLOW': 'Жёлтый',
    'GREEN': 'Зелёный',
    'BLUE': 'Синий',
    'COLOR': 'Цвет',

    // === Generic/Modifier terms ===
    'GENERIC': 'Типовой',
    'STANDARD': 'Стандартный',
    'COMMON': 'Обычный',
    'NORMAL': 'Нормальный',
    'SPECIAL': 'Специальный',
    'PREMIUM': 'Премиум',
    'ECONOMY': 'Эконом',
    'TYPE': 'Тип',
    'CLASS': 'Класс',
    'GRADE': 'Марка',
    'MARK': 'Марка',
    'BRAND': 'Бренд',
    'FULL': 'Полный',
    'HALF': 'Половинный',
    'DOUBLE': 'Двойной',
    'SINGLE': 'Одинарный',
    'TRIPLE': 'Тройной',
    'INNER': 'Внутренний',
    'OUTER': 'Наружный',
    'TOP': 'Верхний',
    'BOTTOM': 'Нижний',
    'LEFT': 'Левый',
    'RIGHT': 'Правый',
    'FRONT': 'Передний',
    'BACK': 'Задний',
    'SIDE': 'Боковой',
    'MAIN': 'Основной',

    // === Construction specific ===
    'FACING': 'Облицовочный',
    'BEARING': 'Несущий',
    'LOAD': 'Нагрузка',
    'STRUCTURAL': 'Конструктивный',
    'CLADDING': 'Облицовка',
    'VENEER': 'Облицовка',
    'RENDER': 'Штукатурка',
    'MORTAR_MIX': 'Раствор',
    'ADHESIVE_MIX': 'Клеевой раствор',
    'FILLER': 'Наполнитель',
    'PILE': 'Свая',
    'CAP': 'Оголовок',
    'FOOTING': 'Фундамент',
    'FOUNDATION': 'Фундамент',
    'DOOR': 'Дверь',
    'WINDOW': 'Окно',
    'GATE': 'Ворота',
    'FENCE': 'Забор',
    'STAIR': 'Лестница',
    'RAMP': 'Пандус',
    'MANHOLE': 'Колодец',
    'TRAY': 'Лоток',
    'CHANNEL': 'Канал',
    'GUTTER': 'Желоб',
    'DRAIN': 'Канализация',

    // === Road/Asphalt ===
    'ROAD': 'Дорога',
    'ASPHALT': 'Асфальт',
    'AC': 'Асфальтобетон',
    'MIX': 'Смесь',
    'SUBBASE': 'Основание',
    'BASE': 'База',
    'GRAVEL': 'Гравий',
    'SAND': 'Песок',
    'CRUSHED': 'Щебень',
    'BITUM': 'Битум',

    // === Plumbing ===
    'PLMB': 'Сантехника',
    'WATER': 'Вода',
    'HOT': 'Горячая',
    'COLD': 'Холодная',
    'HW': 'ГВС',
    'CW': 'ХВС',
    'SW': 'Водоснабжение',
    'SEWER': 'Канализация',
    'FITTING': 'Фитинг',
    'VALVE': 'Клапан',
    'TAP': 'Кран',
    'PUMP': 'Насос',
    'TANK': 'Бак',
    'BOILER': 'Котёл',
    'RADIATOR': 'Радиатор',
    'BATH': 'Ванная',

    // === Electrical ===
    'ELEC': 'Электрика',
    'WIRE': 'Провод',
    'SOCKET': 'Розетка',
    'SWITCH': 'Выключатель',
    'LIGHT': 'Светильник',
    'LAMP': 'Лампа',
    'PANEL': 'Щит',
    'BREAKER': 'Автомат',
    'GROUND': 'Заземление',

    // === Work Actions (verbs) ===
    'POUR': 'Укладка',
    'VIBRATE': 'Вибрирование',
    'CURE': 'Уход',
    'EXCAVATE': 'Разработка грунта',
    'BACKFILL': 'Обратная засыпка',
    'COMPACT': 'Уплотнение',
    'LEVEL': 'Планировка',
    'GROUT': 'Затирка швов',
    'SETOUT': 'Разбивка',
    'CLEANUP': 'Уборка',
    'DISMANTLE': 'Демонтаж',
    'PROTECT': 'Защита',
    'PRIMER': 'Грунтовка',
    'MASTIC': 'Мастика',
    'ROLL': 'Рулонная изоляция',
    'GEO': 'Геодезия',
    'APPLY': 'Нанесение',
    'MEMBRANE': 'Мембрана',
    'COAT': 'Покрытие',
    'SEAL': 'Герметизация',
    'CUT': 'Резка',
    'FILL': 'Заполнение',
    'LAY': 'Укладка',
    'SET': 'Установка',
    'FIX': 'Крепление',
    'WRAP': 'Обмотка',
    'STRIP': 'Зачистка',
    'BOND': 'Склеивание',
    'FORM': 'Опалубка',
    'SHORE': 'Подпорка',
    'PAVE': 'Мощение',
    'POLISH': 'Полировка',
    'GRIND': 'Шлифовка',
    'SAND_ACTION': 'Шлифовка',
    'CLEAN': 'Очистка',
    'WASH': 'Мойка',
    'DIG': 'Копание',
    'LIFT': 'Подъём',
    'MOVE': 'Перемещение',
    'LOAD_ACTION': 'Погрузка',
    'UNLOAD': 'Разгрузка',

    // === Works - Types ===
    'STYAZH': 'Стяжка',
    'PAINT': 'Покраска',
    'HYDRO': 'Гидроизоляция',
    'WP': 'Гидроизоляция',
    'MONO': 'Монолит',
    'FOUND': 'Фундамент',
    'FRAME': 'Каркас',
    'FACADE': 'Фасад',
    'FCB': 'FCB панель',
    'LAND': 'Благоустройство',
    'ENG': 'Инженерия',
    'MEP': 'Инженерные сети',
    'INT': 'Внутренние',
    'EXT': 'Наружные',
    'STRUCT': 'Конструкции',
    'MASON': 'Кладка',
    'MASONRY': 'Кладка',
    'PREP': 'Подготовка',
    'SERV': 'Услуги',
    'FITOUT': 'Отделка',
    'FIREPROOF': 'Огнезащита',
    'CORE': 'Закладные',
    'GRILL': 'Ростверк',
    'BASEMENT': 'Подвал',
    'INSTALL': 'Монтаж',
    'DEMO': 'Демонтаж',
    'DEMOLITION': 'Демонтаж',
    'FINISH': 'Отделка',
    'FINISHING': 'Отделочные',
    'ROUGH': 'Черновая',
    'INSTALLATION': 'Монтажные',
    'PROFILE': 'Профиль',
    'LAYOUT': 'Разбивка',
    'MARKING': 'Разметка',

    // === Finishes ===
    'FLR': 'Пол',
    'FLOOR': 'Пол',
    'CEIL': 'Потолок',
    'CEILING': 'Потолок',
    'WALL': 'Стена',
    'PARTITION': 'Перегородка',
    'GKL': 'ГКЛ',
    'SCREED': 'Стяжка',
    'NALIVNOY': 'Наливной',
    'COV': 'Покрытие',
    'PLASTER': 'Штукатурка',
    'PUTTY': 'Шпаклёвка',
    'LAMINATE': 'Ламинат',
    'PARQUET': 'Паркет',
    'LINOLEUM': 'Линолеум',
    'LVT': 'Кварцвинил',
    'UNDERLAY': 'Подложка',
    'PLINTH': 'Плинтус',
    'SEALANT': 'Герметик',
    'GLUE': 'Клей',
    'ADHESIVE': 'Клей',
    'INSUL': 'Утеплитель',
    'INSULATION': 'Утеплитель',
    'MINVATA': 'Минвата',
    'ROCKWOOL': 'Каменная вата',
    'PENOPLEX': 'Пеноплекс',
    'PENOPLAST': 'Пенопласт',
    'EPS': 'Пенополистирол',
    'XPS': 'Экструдированный пенополистирол',

    // === Misc/Modifiers ===
    'ROUND': 'Круглый',
    'RECT': 'Прямоугольный',
    'RED': 'Переход',
    'ELB': 'Отвод',
    'DIN': 'DIN',
    'CHEM': 'Химический',
    'WELD': 'Сварка',
    'NDT': 'Контроль',
    'RENT': 'Аренда',
    'HAUL': 'Транспорт',
    'TEMP': 'Временный',
    'PERM': 'Постоянный',
    'NEW': 'Новый',
    'OLD': 'Старый',
    'SPEC': 'Специальный',
    'STD': 'Стандартный',
    'PRO': 'Профессиональный',
    'READY': 'Готовый',
    'RAW': 'Сырой',
    'MIXED': 'Смешанный',
    'PURE': 'Чистый',
    'FINE': 'Мелкий',
    'COARSE': 'Крупный',

    // === Sizes/Types ===
    'LARGE': 'Большой',
    'SMALL': 'Малый',
    'MEDIUM': 'Средний',
    'HEAVY': 'Тяжёлый',
    'THIN': 'Тонкий',
    'WIDE': 'Широкий',
    'NARROW': 'Узкий',
    'LONG': 'Длинный',
    'SHORT': 'Короткий',
    'FLAT': 'Плоский',

    // === Service-related (for SRV-* auto-translation) ===
    'DELIVERY': 'Доставка',
    'CARGO': 'Груз',
    'MATERIAL': 'Материал',
    'MIXER': 'Миксер',
    'CRANE': 'Кран',
    'EXCAVATOR': 'Экскаватор',
    'LOADER': 'Погрузчик',
    'SCAFFOLDING': 'Леса',
    'EQUIPMENT': 'Оборудование',
    'GENERATOR': 'Генератор',
    'COMPRESSOR': 'Компрессор',
    'WELDING': 'Сварка',
    'TRANSPORT': 'Транспорт',
    'WASTE': 'Мусор',
    'SOIL': 'Грунт',
    'RENTAL': 'Аренда',
    'LAB': 'Лаборатория',
    'TEST': 'Испытание',
    'DESIGN': 'Проектирование',
    'SURVEY': 'Геодезия',
    'GEODESY': 'Геодезия',
    'CLEANING': 'Уборка',
    'SUPERVISION': 'Надзор',
    'CONSULTING': 'Консультация',
    'SECURITY': 'Охрана',
    'SHIFT': 'Смена',
    'DAY': 'Дневная',
    'NIGHT': 'Ночная',
    'HOUR': 'Час',
    'NASOS': 'Насос',

    // === Numbering / Position ===
    'NF': 'НФ',
    '1NF': '1НФ',
    '2NF': '2НФ',
    '1.4NF': '1.4НФ',
    '2.1NF': '2.1НФ',
};

/**
 * Auto-translate code by parsing its parts
 * Example: MAT-BETON-M200-П3-F100-W8 → "Бетон M200 П3 F100 W8"
 * Example: WRK-TILE-FLOOR → "Укладка плитки на пол"
 * Example: WRK-CONC-POUR → "Укладка бетона"
 */
function autoTranslateCode(code: string): string {
    if (!code) return '';

    const parts = code.split(/[-_]/);
    if (parts.length < 2) return code;

    // Special handling for work codes with known patterns
    const upperCode = code.toUpperCase();

    // Check for compound work patterns first
    const WORK_PATTERNS: Record<string, string> = {
        // Tile works
        'TILE-FLOOR': 'Укладка плитки на пол',
        'TILE-WALL': 'Укладка плитки на стены',
        'TILE-GROUT': 'Затирка швов',
        'TILE-PREP': 'Подготовка под плитку',
        // Concrete works
        'CONC-POUR': 'Укладка бетона',
        'CONC-VIBRATE': 'Вибрирование бетона',
        'CONC-CURE': 'Уход за бетоном',
        'CONC-FORMWORK': 'Монтаж опалубки',
        'CONC-REBAR': 'Армирование',
        'CONC-CLEANUP': 'Уборка после бетонирования',
        'CONC-GEO-SETOUT': 'Геодезическая разбивка',
        'CONC-PREP': 'Подготовка к бетонированию',
        'CONC-FORMWORK-DISMANTLE': 'Демонтаж опалубки',
        'CONC-SUBCONC': 'Устройство подбетонки',
        'CONC-PUMP': 'Подача бетона бетононасосом',
        'CONC-LEAN': 'Подбетонка',
        'CONC-GROUT': 'Замоноличивание стыков',
        // Earth works
        'EARTH-EXCAVATE': 'Разработка грунта',
        'EARTH-BACKFILL': 'Обратная засыпка',
        'EARTH-COMPACT': 'Уплотнение грунта',
        'EARTH-LEVEL': 'Планировка участка',
        'EARTH-PILE': 'Устройство свай',
        // Plaster/Paint works
        'PLASTER-WALL': 'Штукатурка стен',
        'PLASTER-CEILING': 'Штукатурка потолка',
        'PAINT-WALL': 'Покраска стен',
        'PAINT-CEILING': 'Покраска потолка',
        'PAINT-FACADE': 'Покраска фасада',
        'PUTTY-WALL': 'Шпаклёвка стен',
        'PUTTY-CEILING': 'Шпаклёвка потолка',
        // Hydro works
        'HYDRO-FLOOR': 'Гидроизоляция пола',
        'HYDRO-WALL': 'Гидроизоляция стен',
        'BATH-HYDRO': 'Гидроизоляция ванной',
        'WP-PRIMER': 'Грунтование (праймер)',
        'WP-MASTIC': 'Нанесение мастики',
        'WP-ROLL': 'Укладка рулонной изоляции',
        'WP-PROTECT': 'Защита гидроизоляции',
        'WP-APPLY': 'Нанесение гидроизоляции',
        'WP-MEMBRANE': 'Укладка гидроизоляционной мембраны',
        'WP-COAT': 'Обмазочная гидроизоляция',
        // Floor works
        'FLOOR-SCREED': 'Устройство стяжки',
        'FLOOR-LAMINATE': 'Укладка ламината',
        'FLOOR-PARQUET': 'Укладка паркета',
        'FLOOR-LINOLEUM': 'Укладка линолеума',
        'FLOOR-LVT': 'Укладка LVT',
        'FLOOR-PLINTH': 'Монтаж плинтуса',
        // GKL works
        'GKL-WALL': 'Монтаж перегородок ГКЛ',
        'GKL-CEILING': 'Монтаж потолка ГКЛ',
        'GKL-BOXING': 'Устройство коробов ГКЛ',
        // Stretch ceiling works (from DB)
        'CEIL-STRETCH-INSTALL': 'Монтаж натяжного потолка',
        'CEIL-STRETCH': 'Натяжной потолок',
        'STRETCH-INSTALL': 'Монтаж натяжного потолка',
        'STRETCH-LED': 'Светодиодная подсветка потолка',
        'STRETCH-SPOT': 'Монтаж точечного светильника',
        'STRETCH-NICHE': 'Устройство ниши в потолке',
        'STRETCH-NICHE-BUILD': 'Устройство ниши',
        'STRETCH-LED-PSU': 'Монтаж блока питания LED',
        // Masonry works (from DB)
        'MASONRY-BRICK': 'Кирпичная кладка',
        'MASONRY-BLOCK': 'Кладка блоков',
        // Demolish works (from DB)
        'DEMOLISH-CEIL': 'Демонтаж потолка',
        'DEMOLISH-WALLP': 'Снятие обоев',
        'DEMOLISH-WALL': 'Демонтаж стен',
        'DEMOLISH-FLOOR': 'Демонтаж пола',
        // General works (from DB)
        'GEN-STEEL': 'Монтаж металлоконструкций',
        'GEN-TILE': 'Укладка плитки',
        'GEN-PAINT': 'Покраска',
        // Bath works
        'BATH-TILE': 'Укладка плитки ванной',
        // Laminate
        'LAMINATE-LAY': 'Укладка ламината',
        // Plaster
        'PLASTER-INT': 'Внутренняя штукатурка',
        'PLASTER-EXT': 'Наружная штукатурка',
        'FACADE-PLASTER': 'Штукатурка фасада',
        'FACADE-WET': 'Мокрый фасад',
        'FACADE-WET-DECOR-COAT': 'Декоративное покрытие фасада',
        // Electrical works
        'ELEC-WIRING': 'Прокладка кабеля',
        'ELEC-SOCKET': 'Монтаж розеток',
        'ELEC-SWITCH': 'Монтаж выключателей',
        'ELEC-PANEL': 'Монтаж электрощита',
        'ELEC-LIGHTING': 'Монтаж освещения',
        // Plumbing works
        'PLUMB-PIPE': 'Прокладка труб',
        'PLUMB-DRAIN': 'Монтаж канализации',
        'PLUMB-FIXTURE': 'Установка сантехники',
        'PLUMB-RADIATOR': 'Монтаж радиаторов',
        'PLMB-CW': 'Монтаж ХВС',
        'PLMB-HW': 'Монтаж ГВС',
        'PLMB-SW': 'Монтаж водоснабжения',
        'PLMB-ROUGH': 'Черновая разводка',
        'PLMB-FINISH': 'Чистовой монтаж сантехники',
        // Facade works
        'FACADE-BRACKET': 'Монтаж кронштейнов',
        'FACADE-INSUL': 'Утепление фасада',
        'FACADE-PANEL': 'Монтаж фасадных панелей',
        // Roof works
        'ROOF-INSUL': 'Утепление кровли',
        'ROOF-MEMBRANE': 'Монтаж кровельной мембраны',
        'ROOF-SHINGLE': 'Монтаж металлочерепицы',
        'ROOF-INSTALL': 'Монтаж кровли',
        // LSTK
        'LSTK-FACADE-FCB-INSTALL': 'Монтаж фасадной панели FCB',
        'LSTK-FACADE-INSTALL': 'Монтаж фасада ЛСТК',
        'LSTK-FRAME': 'Монтаж каркаса ЛСТК',
        'LSTK-PROFILE': 'Монтаж профиля ЛСТК',
        'LSTK-ROOF-BITUM': 'Наплавляемая кровля',
        'LSTK-ROOF-UNDERLAY': 'Укладка подкладочного ковра',
        // Demolition
        'DEMOLITION-WALL': 'Демонтаж стен',
        'DEMOLITION-FLOOR': 'Демонтаж пола',
        // Fitout
        'FITOUT-WALL': 'Отделка стен',
        'FITOUT-CEIL': 'Отделка потолка',
        // External / Landscaping (EXT-)
        'EXT-ASPHALT-PAVE': 'Укладка асфальта',
        'EXT-ASPHALT-SUBBASE': 'Подготовка основания под асфальт',
        'EXT-ASPHALT': 'Асфальтовые работы',
        'EXT-FENCE': 'Монтаж заборов',
        'EXT-FENCE-WOOD': 'Монтаж деревянных заборов',
        'ASPHALT-PAVE': 'Укладка асфальта',
        'ASPHALT-SUBBASE': 'Подготовка основания',
        // Landscaping
        'LAND-RUBTILE': 'Укладка резиновой плитки',
        'LAND-TURF': 'Укладка газона',
        'LAND-GATE': 'Монтаж ворот',
        // Foundation
        'FOUND-BASE-LEAN': 'Подбетонка',
        'FOUND-FOOTING-FORM': 'Опалубка фундамента',
        'FOUND-FOOTING-POUR': 'Бетонирование фундамента',
        'FOUND-SLAB-FORM': 'Опалубка плитного фундамента',
        'FOUND-FOOTING': 'Устройство ленточного фундамента',
        // Frame / Structural
        'FRAME-STEEL-BRACE': 'Монтаж связей жёсткости',
        'FRAME-RC-BEAM-POUR': 'Бетонирование балок',
        'FRAME-RC-SLAB-POUR': 'Бетонирование плиты',
        'FRAME-RC-SHORE': 'Монтаж стоек опалубки',
        // Structures
        'STRUCT-MON-FORM': 'Устройство опалубки стен',
        'STRUCT-MON-KIT': 'Комплект бетонирования',
        'STRUCT-STEEL-WELD': 'Сварка металлоконструкций',
        'STRUCT-STEEL-NDT': 'Контроль качества сварки',
        // Services
        'SERV-RENT': 'Аренда оборудования',
        'SERV-HAUL': 'Транспортировка',
        // MEP / Engineering
        'MEP-WATER': 'Монтаж водоснабжения',
        'MEP-WS-PPR': 'Разводка ВК (PPR)',
        'MEP-WS-TEST': 'Опрессовка системы',
        'MEP-WS-FLUSHING': 'Промывка водопровода',
        'MEP-LV-PROG': 'Пусконаладка',
        'MEP-SYS-CABLE': 'Прокладка кабеля',
        // Misc
        'GRILL-POUR': 'Бетонирование ростверка',
        'STAIR-POUR': 'Бетонирование лестниц',
        'PILE-BORED': 'Буронабивные сваи',
        'CORE-EMBED': 'Монтаж закладных',
        'FORMWORK-INSTALL': 'Монтаж опалубки',
        'PLINTH-INSTALL': 'Монтаж плинтуса',
        // Screed / Floor specific
        'SCREED-APPLY': 'Устройство стяжки',
        'MONO-STYAZH': 'Монолитная стяжка',
        // Waterproofing special
        'BASEMENT-WALL-WATERPROOF': 'Гидроизоляция стены подвала',
        'HYDRO-SPECIAL': 'Специальная гидроизоляция',
        // VODO (water)
        'VODO-PPR': 'Монтаж труб PPR',
        // =============== SERVICES (SRV-*) ===============
        // Delivery services
        'SRV-DELIVERY': 'Доставка',
        'SRV-DELIVERY-CONCRETE': 'Доставка бетона',
        'SRV-DELIVERY-MIXER': 'Доставка бетона (миксер)',
        'SRV-DELIVERY-CARGO': 'Грузоперевозка',
        'SRV-DELIVERY-MATERIAL': 'Доставка материалов',
        'SRV-DELIVERY-SAND': 'Доставка песка',
        'SRV-DELIVERY-GRAVEL': 'Доставка щебня',
        // Rental services
        'SRV-RENT': 'Аренда',
        'SRV-RENT-CRANE': 'Аренда крана',
        'SRV-RENT-EXCAVATOR': 'Аренда экскаватора',
        'SRV-RENT-SCAFFOLDING': 'Аренда лесов',
        'SRV-RENT-FORMWORK': 'Аренда опалубки',
        'SRV-RENT-EQUIPMENT': 'Аренда оборудования',
        'SRV-RENT-PUMP': 'Аренда насоса',
        'SRV-RENT-GENERATOR': 'Аренда генератора',
        'SRV-RENT-COMPRESSOR': 'Аренда компрессора',
        'SRV-RENT-WELDING': 'Аренда сварочного аппарата',
        'SRV-RENT-CONCRETE-PUMP': 'Аренда бетононасоса',
        // Transport services
        'SRV-TRANSPORT': 'Транспортные услуги',
        'SRV-HAUL': 'Транспортировка',
        'SRV-HAUL-WASTE': 'Вывоз мусора',
        'SRV-HAUL-SOIL': 'Вывоз грунта',
        // Concrete pump services
        'SRV-PUMP': 'Услуги бетононасоса',
        'SRV-PUMP-CONCRETE': 'Подача бетона насосом',
        'SRV-PUMP-RENTAL': 'Аренда бетононасоса',
        // Crane services
        'SRV-CRANE': 'Услуги крана',
        'SRV-CRANE-RENTAL': 'Аренда автокрана',
        'SRV-CRANE-HOUR': 'Работа крана (час)',
        // Laboratory / Testing services
        'SRV-LAB': 'Лабораторные услуги',
        'SRV-LAB-CONCRETE': 'Испытание бетона',
        'SRV-LAB-SOIL': 'Испытание грунта',
        'SRV-NDT': 'Неразрушающий контроль',
        'SRV-NDT-WELD': 'Контроль качества сварки',
        // Design / Engineering services
        'SRV-DESIGN': 'Проектирование',
        'SRV-SURVEY': 'Геодезия',
        'SRV-GEODESY': 'Геодезические работы',
        // Misc services
        'SRV-INSTALL': 'Монтаж',
        'SRV-DISMANTLE': 'Демонтаж',
        'SRV-CLEANING': 'Уборка',
        'SRV-SUPERVISION': 'Технадзор',
        'SRV-CONSULTING': 'Консультация',
        'SRV-SECURITY': 'Охрана объекта',
        // Shift-based services  
        'SRV-SHIFT': 'Смена',
        'SRV-SHIFT-DAY': 'Дневная смена',
        'SRV-SHIFT-NIGHT': 'Ночная смена',
        // SVC aliased patterns (same as SRV)
        'SVC-CONC-PUMP': 'Аренда бетононасоса',
        'SVC-PUMP': 'Услуги бетононасоса',
        'SVC-CRANE': 'Аренда крана',
        'SVC-DELIVERY': 'Доставка',
        'SVC-HAUL-WASTE': 'Вывоз мусора',
        'SVC-HAUL-SOIL': 'Вывоз грунта',
        'SVC-RENT': 'Аренда',
    };

    // Check for pattern matches (removing WRK- prefix)
    for (const [pattern, translation] of Object.entries(WORK_PATTERNS)) {
        if (upperCode.includes(pattern)) {
            return translation;
        }
    }

    let result: string[] = [];

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].toUpperCase();

        // Skip common prefixes
        if (i === 0 && ['MAT', 'WRK', 'SRV', 'WT'].includes(part)) {
            continue;
        }

        // Skip secondary category prefixes
        if (i === 1 && ['COM', 'INT', 'EXT', 'RES', 'IND'].includes(part)) {
            continue;
        }

        // Check if we have translation for this part
        const translated = CODE_PARTS[part];
        if (translated) {
            result.push(translated);
        } else {
            // Keep technical specs as-is (sizes, grades, etc.)
            result.push(parts[i]);
        }
    }

    // Join with spaces and clean up
    return result.join(' ').replace(/\s+/g, ' ').trim() || code;
}

/** 
 * Centralized translation function (async - uses DB fallback)
 * Priority: 
 * 1. rik_translations.json (local cache)
 * 2. Auto-translate from code parts
 * 3. Return original code
 */
export async function translateRikCode(code: string | null | undefined): Promise<string> {
    if (!code) return '';

    // 1. Check local JSON
    const localMatch = (rikTranslations as Record<string, string>)[code];
    if (localMatch) return localMatch;

    // 2. Check for abbreviations
    const lowerCode = code.toLowerCase();
    if (ABBREVIATION_TRANSLATIONS[lowerCode]) {
        return ABBREVIATION_TRANSLATIONS[lowerCode];
    }

    // 3. Auto-translate from code parts
    return autoTranslateCode(code);
}

/**
 * Synchronous version for simple lookups (JSON + Auto-translate)
 * Checks both exact case and uppercase for better matching
 */
export function translateRikCodeSync(code: string | null | undefined): string {
    if (!code) return '';

    // Clean up the code
    const cleanCode = code.trim();
    if (!cleanCode) return '';

    // 1. Try exact match first
    const exactMatch = (rikTranslations as Record<string, string>)[cleanCode];
    if (exactMatch) return exactMatch;

    // 2. Try uppercase match (most codes in JSON are uppercase)
    const upperCode = cleanCode.toUpperCase();
    const upperMatch = (rikTranslations as Record<string, string>)[upperCode];
    if (upperMatch) return upperMatch;

    // 3. Try lowercase match
    const lowerCode = cleanCode.toLowerCase();
    const lowerMatch = (rikTranslations as Record<string, string>)[lowerCode];
    if (lowerMatch) return lowerMatch;

    // 4. Try with normalized dashes/underscores
    const normalizedCode = upperCode.replace(/_/g, '-');
    const normalizedMatch = (rikTranslations as Record<string, string>)[normalizedCode];
    if (normalizedMatch) return normalizedMatch;

    // 5. Check abbreviations
    if (ABBREVIATION_TRANSLATIONS[lowerCode]) {
        return ABBREVIATION_TRANSLATIONS[lowerCode];
    }

    // 6. Auto-translate from code parts
    return autoTranslateCode(cleanCode);
}

/**
 * Translates a full name or description by searching for known RIK codes or units within it
 */
export function translateDescription(desc: string): string {
    if (!desc) return '';

    let result = desc;

    // Translate common units in parentheses or at the end
    Object.entries(ABBREVIATION_TRANSLATIONS).forEach(([eng, rus]) => {
        const regex = new RegExp(`\\b${eng}\\b`, 'gi');
        result = result.replace(regex, rus);
    });

    return result;
}
