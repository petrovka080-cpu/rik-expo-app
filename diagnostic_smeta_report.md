# Аудит справочников: Смета (Правила) vs Каталог (catalog_items)

**Итоги сканирования:**
- Всего видов работ с правилами: 173
- Всего уникальных кодов (`rik_code`) в правилах сметы: 1191
- Всего элементов в базе `catalog_items`: 38455
- Уникальных кодов в смете, **отсутствующих** в каталоге: 699
- Разночтений в названиях (код есть, названия разные): 138

## 1. Отсутствуют в Каталоге (699)

| Код (rik_code) | Название в Смете (Правилах) | Используется в ВР |
| --- | --- | --- |
| `GENERIC-BLOCK` | Кладка блоков — площадь | WT-BLOCK |
| `GENERIC-BLOCK-U__LENGTH` | Блоки (унив.) — длина | WT-BLOCK |
| `GENERIC-BLOCK-U__PERIM` | Блоки (унив.) — периметр | WT-BLOCK |
| `GENERIC-BRICK` | Кладка кирпича — площадь | WT-MASONRY-BRICK |
| `GENERIC-BRICK__LENGTH` | Кладка кирпича — длина | WT-MASONRY-BRICK |
| `GENERIC-BRICK__PERIM` | Кладка кирпича — периметр | WT-MASONRY-BRICK |
| `GENERIC-BRICK__POINTS` | Кладка кирпича — точки | WT-MASONRY-BRICK |
| `GENERIC-BRICK-CLINKER` | Клинкер — площадь | WT-MASONRY-BRICK-CLINKER |
| `GENERIC-BRICK-CLINKER__LENGTH` | Клинкер — длина | WT-MASONRY-BRICK-CLINKER |
| `GENERIC-BRICK-CLINKER__POINTS` | Клинкер — точки | WT-MASONRY-BRICK-CLINKER |
| `MAT-AC-BRACKETS` | Кронштейны наружного блока | WT-HVAC |
| `MAT-ANCHOR` | MAT-ANCHOR | WT-DOOR |
| `MAT-ANCHOR-M10` | Анкер М10 | WT-RF-CARPET, WT-RF-HPL, WT-RF-PVC, WT-MASONRY-BRICK, WT-MASONRY-BLOCK, WT-RF-PORCELAIN, WT-BLOCK |
| `MAT-ANCHOR-M12` | Анкер М12 | WT-STEEL-GATE-SWING, WT-STEEL-STAIR |
| `MAT-ANGLE-50X50` | Уголок равнополочный 50×50 | WT-MASONRY-BLOCK, WT-BLOCK |
| `MAT-ANGLE-63X63` | Уголок равнополочный 63×63 | WT-MASONRY-BRICK |
| `MAT-ANGLE-BEAD` | Уголок перфорированный | WT-PLASTER-WALL-PRO, WT-PLASTER |
| `MAT-ANTISPATTER-400` | Антиспаттер 400 мл | WT-STEEL-WELD-MIG-A4 |
| `MAT-ARM-ANGLE` | Пристенный уголок L | WT-CEIL-ARMSTRONG-600 |
| `MAT-ARM-DOWEL` | Анкера/дюбели для подвесов | WT-CEIL-ARMSTRONG-600 |
| `MAT-ARM-HANGER` | Подвесы с тягой | WT-CEIL-ARMSTRONG-600 |
| `MAT-ARM-MEMBRANE` | Плёнка/мембрана (опц.) | WT-CEIL-ARMSTRONG-600 |
| `MAT-ARM-MISC` | MAT-ARM-MISC | WT-CEIL-ARMSTRONG-600 |
| `MAT-ARM-PANEL-600-PCS` | Плиты 600×600 (мин. фибра) | WT-CEIL-ARMSTRONG-600 |
| `MAT-ARM-SCREW` | Саморезы/клипсы системы | WT-CEIL-ARMSTRONG-600 |
| `MAT-ARM-T24-CROSS` | Поперечные T24 (600/1200) | WT-CEIL-ARMSTRONG-600 |
| `MAT-ARM-T24-MAIN` | Несущие профили T24 | WT-CEIL-ARMSTRONG-600 |
| `MAT-ARM-WOOL-50` | MAT-ARM-WOOL-50 | WT-CEIL-ARMSTRONG-600 |
| `MAT-BACKDRAFT-GRILLE` | Клапаны/решётки обратные | WT-HVAC |
| `MAT-BACKFILL-SAND` | MAT-BACKFILL-SAND | WT-FND-MKD |
| `MAT-BACKFILL-SOIL` | MAT-BACKFILL-SOIL | WT-FND-MKD |
| `MAT-BALL-VALVE-1-2` | Кран шаровый 1/2\" | WT-PLMB |
| `MAT-BEACON-10` | Маяк штукатурный 10 мм | WT-PLASTER-WALL-PRO, WT-PLASTER, WT-PLASTER-INT |
| `MAT-BITS` | Биты (износ) | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-BLOCK-AAC-100` | Газоблок D500 100 мм | WT-BLOCK |
| `MAT-BOX-PODROZ` | Подрозетник 68 мм | res_electrica, WT-ELEC, WT-ELEC-LIGHT, WT-ELEC-OUTLET, WT-ELEC-SWITCH |
| `MAT-BRACKET-STEEL` | Кронштейн стальной | WT-MASONRY-BRICK, WT-MASONRY-BLOCK, WT-BLOCK |
| `MAT-BRICK-1NF` | Кирпич 1NF | WT-MASONRY-BRICK |
| `MAT-BRICK-CLINKER-1NF` | Кирпич клинкерный 1NF | WT-MASONRY-BRICK-CLINKER |
| `MAT-BRICK-CLINKER-CORNER` | Кирпич клинкерный угловой | WT-MASONRY-BRICK-CLINKER |
| `MAT-BRUSHES` | Кисти | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-CABLE-3X2.5` | Кабель 3×2.5 | res_electrica, WT-HVAC, WT-ELEC-CABLE, WT-ELEC |
| `MAT-CABLE-TRAY` | Кабель-канал/лоток (магистраль) | WT-ELEC-TRAY |
| `MAT-CANOPY-ANCHOR-M12` | Анкерный болт М12 (навес) | WT-STEEL-CANOPY-LEAN, WT-STEEL-CANOPY-GABLE, WT-STEEL-CANOPY-HIP |
| `MAT-CANOPY-BASEPLATE` | Опорная пластина для стойки навеса | WT-STEEL-CANOPY-LEAN, WT-STEEL-CANOPY-GABLE, WT-STEEL-CANOPY-HIP |
| `MAT-CANOPY-PIPE-60X40` | Труба проф. 60×40 (стропила/прогоны) | WT-STEEL-CANOPY-LEAN, WT-STEEL-CANOPY-GABLE, WT-STEEL-CANOPY-HIP |
| `MAT-CANOPY-PIPE-80X40` | Труба проф. 80×40 (каркас навеса) | WT-STEEL-CANOPY-LEAN, WT-STEEL-CANOPY-GABLE, WT-STEEL-CANOPY-HIP |
| `MAT-CANOPY-PRIMER` | Грунтовка по металлу (навес) | WT-STEEL-CANOPY-LEAN, WT-STEEL-CANOPY-GABLE, WT-STEEL-CANOPY-HIP |
| `MAT-CANOPY-PROFSHEET` | Профнастил кровельный (навес) | WT-STEEL-CANOPY-LEAN, WT-STEEL-CANOPY-GABLE, WT-STEEL-CANOPY-HIP |
| `MAT-CASS-KLAMMER` | Кляммер фасадный | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `MAT-CASS-MEMBRANE` | MAT-CASS-MEMBRANE | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CASS-MISC` | Прочий крепёж/мелочёвка | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CASS-PANEL` | Металлокассеты фасадные | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CASS-RAIL` | Направляющие (T/L/Z) | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CASS-RIVET` | Заклёпка/саморез «кассета-профиль» | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CASS-SCREW-BRKT` | MAT-CASS-SCREW-BRKT | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CASS-SEALANT` | MAT-CASS-SEALANT | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CASS-SHIM` | MAT-CASS-SHIM | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CASS-TAPE` | MAT-CASS-TAPE | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CASS-TOUCHUP` | Подкраска/эмаль для торцов | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CASS-WOOL-50` | MAT-CASS-WOOL-50 | WT-FACADE-CASSETTE-INSTALL |
| `MAT-CEIL-GRID-CROSS-T24` | Поперечный профиль Т-24 | WT-CEIL-GRID |
| `MAT-CEIL-GRID-DOWEL` | Дюбель/крепёж для потолка | WT-CEIL-GRID |
| `MAT-CEIL-GRID-HANGER` | Подвес для решётчатого потолка | WT-CEIL-GRID |
| `MAT-CEIL-GRID-MAIN-T24` | Основной профиль Т-24 | WT-CEIL-GRID |
| `MAT-CEIL-GRID-PANEL-600` | Панель кассетная 600×600 | WT-CEIL-GRID |
| `MAT-CEIL-GRID-PERIM` | Периметральный профиль | WT-CEIL-GRID |
| `MAT-CEIL-GRID-T24` | Профиль Т-24 | WT-CEIL-GRID |
| `MAT-CEIL-GRID-T24-CROSS-600` | Т24 поперечина 600 | WT-CEIL-GRID |
| `MAT-CEIL-GRID-T24-MAIN` | Т24 несущая (main runner) | WT-CEIL-GRID |
| `MAT-CEIL-GRID-TILES-600` | Плита потолочная 600×600 | WT-CEIL-GRID |
| `MAT-CEIL-GRID-WALL-ANGLE` | Пристенный угол L | WT-CEIL-GRID |
| `MAT-CEIL-HOOKS` | Крючки/подвесы | WT-CEIL-STRETCH |
| `MAT-CEIL-JOINT-CONNECT` | Соединитель полотен | WT-CEIL-STRETCH |
| `MAT-CEIL-RACK-CARRIER` | Несущая рейка/стрингер | WT-CEIL-RACK |
| `MAT-CEIL-RACK-HANGER` | Подвес для реечного потолка | WT-CEIL-RACK |
| `MAT-CEIL-RACK-PANEL` | Панель реечная | WT-CEIL-RACK |
| `MAT-CEIL-RACK-WALL-ANGLE` | Уголок пристенный (реечный) | WT-CEIL-RACK |
| `MAT-CEIL-REINF-RING` | Усилительное кольцо | WT-CEIL-STRETCH |
| `MAT-CEIL-SPOTLIGHT-BOX` | Площадка под светильник | WT-CEIL-STRETCH |
| `MAT-CEIL-STRETCH-BAGET` | Багет для натяжного потолка | WT-CEIL-STRETCH |
| `MAT-CEIL-STRETCH-CANVAS` | Полотно натяжного потолка | WT-CEIL-STRETCH |
| `MAT-CEIL-STRETCH-INSERT` | Вставка/маскировочная лента | WT-CEIL-STRETCH |
| `MAT-CEIL-THERMO-RING` | Термокольцо | WT-CEIL-STRETCH |
| `MAT-CEMENT` | Цемент ПЦ-400 | WT-SCREED |
| `MAT-CHECK-VALVE-1-2` | Клапан обратный 1/2\" | WT-PLMB |
| `MAT-CLIPIN-ANGLE` | Угловой/пристенный профиль | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `MAT-CLIPIN-CARRIER` | Несущие направляющие/стрингеры | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600, WT-CEIL-CLIPIN |
| `MAT-CLIPIN-CROSS` | Поперечные планки/соединители | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `MAT-CLIPIN-CROSS-1200` | Поперечина 1200 | WT-CEIL-CLIPIN |
| `MAT-CLIPIN-CROSS-600` | Поперечный профиль 600 | WT-CEIL-CLIPIN |
| `MAT-CLIPIN-DOWEL` | MAT-CLIPIN-DOWEL | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `MAT-CLIPIN-HANGER` | Подвесы с тягой | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600, WT-CEIL-CLIPIN |
| `MAT-CLIPIN-MEMBRANE` | Мембрана/плёнка пылезащитная | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `MAT-CLIPIN-PANEL-300X1200-PCS` | Панели Clip-in 300×1200 (шт) | WT-CEIL-CLIPIN-300x1200 |
| `MAT-CLIPIN-PANEL-600` | Панель Clip-in 600×600 | WT-CEIL-CLIPIN |
| `MAT-CLIPIN-PANEL-600-PCS` | Панели Clip-in 600×600 (шт) | WT-CEIL-CLIPIN-600 |
| `MAT-CLIPIN-SCREW` | Саморезы/заклёпки для системы | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `MAT-CLIPIN-WALL-ANGLE` | Профиль пристенный (уголок) | WT-CEIL-CLIPIN |
| `MAT-CLIPIN-WOOL-50` | Минвата акустическая 50 мм | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `MAT-COLLECTOR-1X12-8OUT` | Коллектор 1\"×1/2\" (6–8) | WT-PLMB |
| `MAT-COM-ELEC-BOX` | Коробка/подрозетник (офис, на 1 точку) | com_mep_electrica |
| `MAT-COM-ELEC-CABLE` | Кабель силовой/освещения (офис, на 1 точку) | com_mep_electrica |
| `MAT-COM-FITOUT-PAINT` | Краска интерьерная (коммерческая) | com_fitout |
| `MAT-COM-FITOUT-PRIMER` | Грунтовка под отделку (коммерческая) | com_fitout |
| `MAT-COM-PLMB-PIPE` | Труба/подводка сантехническая (1 точка) | com_plumbing |
| `MAT-COM-PLMB-SEALANT` | Герметик/лен/фум для соединений (1 точка) | com_plumbing |
| `MAT-CONC-B25` | Бетон В25 (М350) для фундамента | WT-FND-MKD, WT-CONCRETE-COLUMN, WT-CONCRETE-SLAB, WT-STEEL-FENCE-PROF, WT-STEEL-FENCE-MESH |
| `MAT-CONC-CHAIR` | Фиксаторы арматуры | ind_concrete, WT-CONC |
| `MAT-CONC-FILM` | Плёнка/укрытие | ind_concrete |
| `MAT-CONC-FORMWORK` | Опалубка (материал/аренда) | ind_concrete, WT-CONC |
| `MAT-CONC-MESH` | Армирующая сетка | ind_concrete |
| `MAT-CONC-PREP-B7` | Бетон В7.5 (подбетонка под фундамент) | WT-FND-MKD |
| `MAT-CONC-READY` | MAT-CONC-READY | ind_concrete, WT-CONC |
| `MAT-COPPER-LINES-1-4_3-8` | Медная трасса 1/4"+3/8" | WT-HVAC |
| `MAT-CORNER-BEAD` | MAT-CORNER-BEAD | WT-PLASTER-WALL-PRO, WT-PLASTER, WT-PLASTER-INT |
| `MAT-CORNER-PERF` | Уголок перфорированный (металлический) | WT-PLASTER-WALL-PRO, WT-PLASTER, WT-PLASTER-INT, WT-CEIL-GKL-BOX |
| `MAT-COVER-FILM` | Плёнка укрывная | WT-DEM-TILE-WALL, WT-DEM-TILE-FLOOR, WT-DEM-SCREED, WT-DEM-PLASTER, WT-DEM-INSUL, WT-DEM-ROOF, WT-DEM-FLOOR, WT-DEM-WALL, WT-DEMO, WT-DEM-CEIL, WT-DEM-GKL |
| `MAT-COVER-FILM-TAPE` | Плёнка+скотч (укрытие) | WT-WALLPAPER |
| `MAT-COVER-TAPE` | Скотч/малярная лента | WT-DEM-TILE-WALL, WT-DEM-TILE-FLOOR, WT-DEM-SCREED, WT-DEM-PLASTER, WT-DEM-INSUL, WT-DEM-ROOF, WT-DEM-WINDOW, WT-DEM-RADIATOR, WT-DEM-LIGHT, WT-DEM-OUTLET, WT-DEM-PLUMB-FIX, WT-DEM-FLOOR, WT-DEM-WALL, WT-DEMO, WT-DEM-CEIL, WT-DEM-GKL, WT-DEM-DOOR |
| `MAT-CRACK-REPAIR` | Ремонт трещин (состав) | WT-PUTTY |
| `MAT-DISC-GRIND` | Круг зачистной | WT-STEEL-FENCE-PROF |
| `MAT-DOOR-CASING` | Наличник | WT-DOOR-SET, WT-DOOR |
| `MAT-DOOR-JAMB-100` | Доборная планка 100 мм | WT-DOOR-SET, WT-DOOR |
| `MAT-DOOR-SEAL` | Уплотнитель | WT-DOOR-SET, WT-DOOR |
| `MAT-DOOR-SET` | Дверной блок (полотно+короб) | WT-DOOR-SET, WT-DOOR |
| `MAT-DOOR-WEDGE-SET` | Клинья/распорки (компл.) | WT-DOOR-SET, WT-DOOR |
| `MAT-DRAIN-CHANNEL` | Лоток водоотводный, шт | WT-EXT-DRAIN-CHANNEL |
| `MAT-DRAIN-CHANNEL-CONC` | Бетон под лотки, м³ | WT-EXT-DRAIN-CHANNEL |
| `MAT-DRAIN-POINT-50` | Точечный трап Ø50 | WT-BATH |
| `MAT-DRAIN-TUBE-16` | Дренажная трубка 16 мм | WT-HVAC |
| `MAT-DRILL-BIT` | Сверло/бур (износ) | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-DUCT-125` | Воздуховод/канал 125 мм | WT-HVAC |
| `MAT-EARTH-BACKFILL` | Обратная засыпка пазух фундамента, м³ | WT-EARTHWORK-PRO |
| `MAT-EARTH-COMPACT` | Уплотнение основания (трамбовка), м² | WT-EARTHWORK-PRO |
| `MAT-EARTH-EXCAV` | Разработка грунта под фундамент, м³ | WT-EARTHWORK-PRO |
| `MAT-EDGE-PROFILE` | Плиточный профиль/уголок | WT-TILE |
| `MAT-ELEC-CLIP` | Клипса/скоба крепления кабеля | res_electrica, WT-ELEC-CABLE, WT-ELEC, WT-ELEC-LIGHT, WT-ELEC-OUTLET, WT-ELEC-SWITCH |
| `MAT-ELEC-GROMMET` | Втулка/громмет вводной | res_electrica, WT-ELEC-CABLE, WT-ELEC |
| `MAT-ELEC-WAGO-3` | Клемма/соединитель 3-конт. | res_electrica, WT-ELEC-CABLE, WT-ELEC, WT-ELEC-LIGHT, WT-ELEC-OUTLET |
| `MAT-ESD-KIT` | ESD grounding kit | WT-RF-PVC |
| `MAT-ESD-TAPE` | ESD copper tape | WT-RF-PVC |
| `MAT-ETICS-DEFORM` | Профили деформационных швов | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `MAT-ETICS-FINISH` | Декоративная штукатурка | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `MAT-ETICS-INSUL` | MAT-ETICS-INSUL | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `MAT-ETICS-MESH` | Сетка стеклоткань фасадная | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `MAT-ETICS-PROTECT` | Защитная плёнка/малярная лента | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `MAT-EXHAUST-FAN-125` | Вытяжной вентилятор 125 мм | WT-HVAC |
| `MAT-EXP-JOINT` | Деформационный профиль для плитки | WT-TILE |
| `MAT-EXT-ASPHALT-GEOTEX` | Геотекстиль под основание, м² | WT-EXT-ASPHALT |
| `MAT-EXT-ASPHALT-MIX` | Асфальтобетонная смесь (АС/ЩМА), т | WT-EXT-ASPHALT |
| `MAT-EXT-ASPHALT-SUBBASE` | ЩПС/щебень под основание, м³ | WT-EXT-ASPHALT |
| `MAT-EXT-CURB-CONC` | Бетон под бордюр (подбетонка), м³ | WT-EXT-CURB |
| `MAT-EXT-CURB-SAND` | Песок под/за бордюр, м³ | WT-EXT-CURB |
| `MAT-EXT-OTMOSTKA-CRUSH` | Щебень под отмостку, м³ | WT-EXT-OTMOSTKA |
| `MAT-EXT-OTMOSTKA-MESH` | Армирующая сетка для отмостки, м² | WT-EXT-OTMOSTKA |
| `MAT-EXT-PAVING-CRUSH` | Щебень для основания под плитку, м³ | WT-EXT-PAVING |
| `MAT-EXT-PAVING-GEOTEX` | MAT-EXT-PAVING-GEOTEX | WT-EXT-PAVING |
| `MAT-EXT-PAVING-SAND` | Песок для основания под плитку, м³ | WT-EXT-PAVING |
| `MAT-FACADE-FIBROCEM-10` | Фиброцементная плита фасадная 10 мм | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `MAT-FACADE-FIBROCEM-12` | Панель фиброцементная фасадная 12 мм | WT-FACADE-FC-RIVET-12, WT-FACADE-FC-H-12 |
| `MAT-FACADE-FIBROCEM-8` | Фиброцементная плита фасадная 8 мм | WT-FACADE-FC-H-8, WT-FACADE-FC-RIVET-8 |
| `MAT-FACADE-PROFILE` | MAT-FACADE-PROFILE | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `MAT-FACADE-RIVET-AL-4_8X16` | Заклёпка фасадная 4.8×16 алюминиевая | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `MAT-FACADE-SUBFRAME-KIT` | Подсистема фасадная (профили/кронштейны/клипсы) | WT-FACADE-CLINKER-VF |
| `MAT-FAST-DOWEL-6X40` | Дюбель 6×40 (для багета) | WT-CEIL-STRETCH |
| `MAT-FIBER` | MAT-FIBER | WT-SCREED |
| `MAT-FIBER-CONC` | MAT-FIBER-CONC | WT-CONCRETE-FLOOR, WT-SCREED |
| `MAT-FILLER-SPOT` | Подмазка дефектов (финиш) | WT-PAINT |
| `MAT-FILM-PE-200` | Плёнка ПЭ 200 мкм | WT-CONCRETE-FLOOR, WT-CONCRETE-MONO, WT-SCREED |
| `MAT-FILM-PE-200-FLOOR` | Плёнка ПЭ 200 мкм (под стяжку) | WT-CONC-FLOOR |
| `MAT-FILTER-ROUGH-1-2` | Фильтр грубой очистки 1/2\" | WT-PLMB |
| `MAT-FIX-UNIV` | Крепёж универсальный (комплект) | WT-PLMB-SINK, WT-BLOCK |
| `MAT-FLEX-HOSE-1-2` | Подводка гибкая 1/2\" | WT-PLMB |
| `MAT-FLR-FIBER-PP-12` | Фибра полипропиленовая 12 мм (кг) | WT-FLR-TOPPING |
| `MAT-FLR-HEAT-ELEC-SENSOR` | Датчик температуры пола, шт | WT-FLR-HEAT-ELEC |
| `MAT-FLR-HEAT-ELEC-THERMO` | Терморегулятор для тёплого пола, шт | WT-FLR-HEAT-ELEC |
| `MAT-FLR-HEAT-WATER-FILM` | Плёнка ПЭ под тёплый пол, м² | WT-FLR-HEAT-WATER |
| `MAT-FLR-PRIMER` | Праймер упрочняющий (л) | WT-FLR-TOPPING |
| `MAT-FLR-TOPPING` | Топпинг упрочняющий (кг) | WT-FLR-TOPPING |
| `MAT-FND-REBAR-A12` | Арматура A500C Ø12 продольная для ленточного фундамента | WT-CONCRETE-STRIP-PRO |
| `MAT-FND-REBAR-A8` | Хомуты A240 Ø8 для ленточного фундамента | WT-CONCRETE-STRIP-PRO |
| `MAT-FND-WIRE` | Проволока вязальная для арматурных каркасов | WT-CONCRETE-STRIP-PRO |
| `MAT-FOAM-PU` | Монтажная пена | WT-DOOR-SET, WT-DOOR |
| `MAT-FORMWORK-LINEAR` | Опалубка линейная | WT-CONCRETE-SLAB |
| `MAT-FORMWORK-OIL` | Опалубочное масло (смазка) | WT-CONCRETE-BEAM |
| `MAT-FORMWORK-PANEL` | Щиты опалубочные | WT-CONCRETE-COLUMN, WT-CONCRETE-MONO |
| `MAT-FORMWORK-PLYWOOD` | Опалубка щитовая (площадь) | WT-CONCRETE-BEAM, WT-CONCRETE-COLUMN |
| `MAT-FORMWORK-STRIP` | Опалубка ленточного фундамента (щиты/стойки/стяжки) | WT-CONCRETE-STRIP-PRO |
| `MAT-FOUND-BACKFILL` | Обратная засыпка пазух фундамента с послойным уплотнением | WT-CONCRETE-STRIP-PRO |
| `MAT-FOUND-SAND` | Песчаная подготовка под фундамент (слой 10–15 см) | WT-CONCRETE-STRIP-PRO |
| `MAT-FOUND-WATERPROOF` | Гидроизоляция ленточного фундамента (рулонная, 2 слоя) | WT-CONCRETE-STRIP-PRO |
| `MAT-FUM-TAPE` | Фум-лента | WT-DEM-RADIATOR, WT-DEM-PLUMB-FIX |
| `MAT-GKL-12-2500X1200` | Листы ГКЛ 12,5 мм 1200×2500 | WT-CEIL-GKL-BOX |
| `MAT-GKL-12-5` | ГКЛ 12.5 мм | WT-GKL-WALL-PRO |
| `MAT-GKL-BOARD-12_5-M2` | Листы ГКЛ 12,5 мм (площадь) | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `MAT-GKL-BOARD-12.5` | Лист ГКЛ 12.5 мм | WT-GKL |
| `MAT-GKL-CEIL-ANGLE` | Уголок потолочный (ГКЛ) | WT-GKL-CEIL-PRO |
| `MAT-GKL-CEIL-CD` | Профиль потолочный (CD/ПП) несущий, м | WT-GKL-CEIL-PRO |
| `MAT-GKL-CEIL-GKL` | Листы ГКЛ для потолка, м² | WT-GKL-CEIL-PRO |
| `MAT-GKL-CEIL-PUTTY` | Шпаклёвка по ГКЛ (потолок), кг | WT-GKL-CEIL-PRO |
| `MAT-GKL-CEIL-SCREW-GKL` | Саморезы по ГКЛ к каркасу (потолок), шт | WT-GKL-CEIL-PRO |
| `MAT-GKL-CEIL-TAPE` | Лента армирующая для швов (потолок), м | WT-GKL-CEIL-PRO |
| `MAT-GKL-CORNER` | Уголок перфорированный (малярный) | WT-CEIL-GKL-2L |
| `MAT-GKL-CRAB` | Соединители/«крабы» для CD | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `MAT-GKL-DOWEL` | Дюбели/анкера к перекрытию | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `MAT-GKL-HANGER` | Подвесы (прямые/пружинные) | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `MAT-GKL-HANGER-EXT` | Подвес удлинённый для профиля ГКЛ | WT-CEIL-GKL-2L |
| `MAT-GKL-JOINT-TAPE` | Лента армирующая для швов | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `MAT-GKL-MISC` | MAT-GKL-MISC | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `MAT-GKL-PROFILE-CD` | Профиль CD | WT-GKL |
| `MAT-GKL-PROFILE-UD` | Профиль UD | WT-GKL |
| `MAT-GKL-PUTTY` | Шпаклёвка базовая+финиш | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `MAT-GKL-SCREW` | Саморезы по ГКЛ | WT-GKL, WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `MAT-GKL-UD-TAPE` | Уплотнительная лента под UD | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `MAT-GKL-WALL-BOARD` | Лист ГКЛ стеновой 12,5 мм | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-GKL-WALL-CONNECTOR` | Соединители/крепёж для профилей (крабы/удлинители) | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-GKL-WALL-DOWEL-UW` | Dowels for UW | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-GKL-WALL-MESH` | Сетка/армирование (по местам) | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-GKL-WALL-PRIMER` | Грунтовка по ГКЛ (стены) | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-GKL-WALL-PROFILE-CW` | Профиль стоечный CW | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-GKL-WALL-PROFILE-UW` | Профиль направляющий UW | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-GKL-WALL-PUTTY` | Шпаклёвка для стен (ГКЛ) | WT-GKL-WALL-PRO |
| `MAT-GKL-WALL-PUTTY-START` | Шпаклёвка стартовая по ГКЛ (стены) | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-GKL-WALL-SCREW-GKL` | Саморезы по ГКЛ к каркасу, шт | WT-GKL-WALL-PRO |
| `MAT-GKL-WALL-TAPE` | Лента армирующая для швов, м | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-GKL-WALL-WOOL` | Минеральная вата в перегородке | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `MAT-GLUE-FACADE` | Клей фасадный | WT-PLASTER-FACADE |
| `MAT-GOGGLES` | Очки защитные | WT-DEM-TILE-WALL, WT-DEM-TILE-FLOOR, WT-DEM-SCREED, WT-DEM-PLASTER, WT-DEM-INSUL, WT-DEM-ROOF, WT-DEM-WINDOW, WT-DEM-RADIATOR, WT-DEM-LIGHT, WT-DEM-OUTLET, WT-DEM-PLUMB-FIX, WT-DEM-FLOOR, WT-DEM-WALL, WT-DEMO, WT-DEM-CEIL, WT-DEM-GKL, WT-DEM-DOOR |
| `MAT-GRILIATO-HANGER` | Подвес для грильято | WT-CEIL-GRILIATO-075, WT-CEIL-GRILIATO-050, WT-CEIL-GRILIATO-100 |
| `MAT-GRILIATO-MODULE-600-050` | Модуль грильято 600×600 (ячейка 50×50) | WT-CEIL-GRILIATO-050 |
| `MAT-GRILIATO-MODULE-600-075` | Модуль грильято 600×600 (ячейка 75×75) | WT-CEIL-GRILIATO-075 |
| `MAT-GRILIATO-MODULE-600-100` | Модуль грильято 600×600 (ячейка 100×100) | WT-CEIL-GRILIATO-100 |
| `MAT-GRILIATO-PYR-CARRIER` | Несущий профиль грильято (пирамидальный) | WT-CEIL-GRILIATO-PYR-075, WT-CEIL-GRILIATO-PYR-050, WT-CEIL-GRILIATO-PYR-100 |
| `MAT-GRILIATO-PYR-MODULE-600-050` | Модуль грильято пирамидальный 600×600 (яч. 50×50) | WT-CEIL-GRILIATO-PYR-050 |
| `MAT-GRILIATO-PYR-MODULE-600-075` | Модуль грильято пирамидальный 600×600 (яч. 75×75) | WT-CEIL-GRILIATO-PYR-075 |
| `MAT-GRILIATO-PYR-MODULE-600-100` | Модуль грильято пирамидальный 600×600 (яч. 100×100) | WT-CEIL-GRILIATO-PYR-100 |
| `MAT-GRILIATO-PYR-WALL-ANGLE` | Уголок пристенный грильято (пирамидальный) | WT-CEIL-GRILIATO-PYR-075, WT-CEIL-GRILIATO-PYR-050, WT-CEIL-GRILIATO-PYR-100 |
| `MAT-GRILIATO-WALL-ANGLE` | Уголок пристенный грильято | WT-CEIL-GRILIATO-075, WT-CEIL-GRILIATO-050, WT-CEIL-GRILIATO-100 |
| `MAT-GROUND-HAUL` | MAT-GROUND-HAUL | WT-FND-MKD |
| `MAT-GROUT-EPOXY` | Затирка эпоксидная | WT-TILE |
| `MAT-HANGER-ANCHOR` | Анкер/дюбель для подвесов | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L, WT-CEIL-GKL-BOX |
| `MAT-HEATFLOOR` | Тёплый пол (кабель/маты) под плитку | WT-TILE |
| `MAT-HOSE-FLEX-1/2-60` | Шланг подводки 1/2" 60 см | WT-PLMB-SINK, WT-PLMB-TOILET |
| `MAT-HPL-ANCHOR` | Анкер | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HPL-BUTYL-TAPE` | Бутил-лента (скотч) | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HPL-EPDM-50` | EPDM-лента 50 мм | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HPL-MEMBRANE` | MAT-HPL-MEMBRANE | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HPL-PANEL` | HPL-панели | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HPL-PROFILE-VERT` | Профиль вертикальный | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HPL-SCREW-BRACKET` | Винт профиль-кронштейн | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HPL-SEALANT-600` | Герметик 600 мл | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HPL-SHIM` | Подкладки/шайбы | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HPL-TILE` | HPL raised floor tile | WT-RF-HPL |
| `MAT-HPL-TRIMS` | Доборы/углы/примыкания | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HPL-VENT-GRILLE` | Вентрешётка (цоколь/карниз) | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `MAT-HYDRO-COAT` | MAT-HYDRO-COAT | WT-BATH |
| `MAT-HYDRO-COATING` | MAT-HYDRO-COATING | WT-HYDRO |
| `MAT-HYDRO-CUFF-110` | Манжета трубная Ø110 | WT-BATH |
| `MAT-HYDRO-PRIMER` | Праймер для гидроизоляции | WT-HYDRO-FOUND-PRO |
| `MAT-HYDRO-ROLL` | Рулонная гидроизоляция фундамента (2 слоя) | WT-FND-MKD, WT-HYDRO-FOUND-PRO |
| `MAT-HYDRO-TAPE` | Лента гидроизоляционная (углы/стыки) | WT-BATH |
| `MAT-IND-STEEL-ANCHORS` | Анкерные болты/анкера химические | ind_steel |
| `MAT-IND-STEEL-FIREPROOF` | Огнезащитный состав для металлоконструкций | ind_steel |
| `MAT-IND-STEEL-PAINT` | Краска по металлу (пром.) | ind_steel |
| `MAT-IND-STEEL-PAINT-PRIM` | Грунт антикоррозийный по металлоконструкциям | ind_steel |
| `MAT-INSUL-CEIL-FRAME` | Каркас (профиль/подвесы) для потолка, м.п. | WT-INSUL-CEIL-PRO |
| `MAT-INSUL-CEIL-PUTTY` | MAT-INSUL-CEIL-PUTTY | WT-INSUL-CEIL-PRO |
| `MAT-INSUL-DOWEL-VF` | MAT-INSUL-DOWEL-VF | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `MAT-INSUL-MINWOOL-50` | Минераловатная плита 50 мм | WT-CEIL-GRID |
| `MAT-INSUL-MW-VF` | MAT-INSUL-MW-VF | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `MAT-INSUL-WALL-ANGLE` | Уголки перфорированные для стен, м | WT-INSUL-WALL-PRO |
| `MAT-INSULATION-LINES` | Теплоизоляция на трассу | WT-HVAC |
| `MAT-INSULATION-TAPE` | Изолента | WT-DEM-LIGHT, WT-DEM-OUTLET |
| `MAT-JOINT-COMPOUND` | Шпаклёвка для швов | WT-CEIL-GKL-BOX |
| `MAT-LAMINATE-BOARD` | Mat Ламинат Board | WT-FLOOR-LAMINATE |
| `MAT-LED-ALU-PROFILE` | Mat LED Алюминий Профиль | WT-CEIL-GKL-BOX |
| `MAT-LED-DIFFUSER` | Mat LED Рассеиватель | WT-CEIL-GKL-BOX |
| `MAT-LEVELER` | Наливной пол (самонивелир) | ind_floor_epoxy, WT-LEVEL |
| `MAT-LOCK-SET` | Замок/ручка/ответка (компл.) | WT-DOOR-SET, WT-DOOR |
| `MAT-LSTK-FACADE-ACP-CASSETTE` | Кассета фасадная из ACP (шт/м²) | WT-FACADE-ACP |
| `MAT-LSTK-FACADE-FCB-10-3050X1300` | ФЦП 10 мм, 3050x1300 мм (м²) | WT-FACADE-FCB |
| `MAT-LSTK-FACADE-HPL-8-3050X1300` | HPL фасад 8 мм, 3050x1300 мм (м²) | WT-FACADE-HPL-LSTK |
| `MAT-LSTK-FACADE-KLAMMER-HIDDEN` | Кляммер скрытый (HPL/керамогр.) | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-HPL-LSTK |
| `MAT-LSTK-FACADE-PORCELAIN-10-3000X1500` | Керамогранит 10 мм, 3000x1500 мм (м²) | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `MAT-LSTK-FACADE-WINDBARRIER-140` | Ветро-влагозащита 140 г/м² (1.5×50) | WT-FACADE-FCB, WT-FACADE-HPL-LSTK |
| `MAT-MCB-10-16A` | Автомат 10А/16А | res_electrica, WT-ELEC-OUTLET |
| `MAT-MEMBRANE-WINDPROOF` | Мембрана ветрозащитная фасадная | WT-FACADE-CLINKER-VF |
| `MAT-MESH` | Армирующая сетка / стеклосетка | WT-TILE |
| `MAT-MESH-100X100-4` | Сетка 100×100 Ø4 | WT-CONC-FLOOR, WT-SCREED |
| `MAT-MIXER-SHOWER` | Смеситель душевой | WT-PLMB-SHOWER |
| `MAT-MORTAR-CEMENT` | Раствор цементный | WT-MASONRY-BRICK |
| `MAT-MORTAR-CLINKER-25KG` | Раствор для кладки клинкерного кирпича (25 кг) | WT-MASONRY-BRICK-CLINKER |
| `MAT-OIL-FORMWORK` | Опалубочное масло | WT-CONCRETE-MONO |
| `MAT-OVR-AUTO-KIT` | Комплект автоматики ворот (мотор, блок, пульты) | WT-STEEL-GATE-OVERHEAD |
| `MAT-OVR-HARDWARE-SET` | Комплект фурнитуры ворот (ролики, петли, крепёж) | WT-STEEL-GATE-OVERHEAD |
| `MAT-OVR-SEAL` | Уплотнитель по периметру ворот | WT-STEEL-GATE-OVERHEAD |
| `MAT-OVR-SPRING-SET` | Комплект пружин/балансиров ворот | WT-STEEL-GATE-OVERHEAD |
| `MAT-OVR-TRACK-SET` | Комплект направляющих для подъемных ворот | WT-STEEL-GATE-OVERHEAD |
| `MAT-PAINT-ENAMEL` | Эмаль по металлу | WT-STEEL-GATE-SWING, WT-STEEL-PAINT, WT-STEEL-STAIR, WT-STEEL-FENCE-PROF, WT-STEEL-FENCE-MESH |
| `MAT-PAINT-FACADE` | Mat Краска Facade | WT-PLASTER-FACADE |
| `MAT-PAINT-PRIMER` | Грунт по металлу | WT-STEEL-GATE-SWING, WT-STEEL-PRIME, WT-STEEL-STAIR, WT-STEEL-FENCE-PROF, WT-STEEL-FENCE-MESH |
| `MAT-PAINT-PRIMER-GF021-10L` | Грунт ГФ-021 10 л | WT-STEEL-PRIME, WT-STEEL-PAINT |
| `MAT-PAINT-SOLVENT-646-10L` | MAT-PAINT-SOLVENT-646-10L | WT-STEEL-PRIME, WT-STEEL-PAINT |
| `MAT-PAINT-WALL` | Краска (стены) | WT-PAINT |
| `MAT-PE-FILM` | Плёнка ПЭ | WT-CONCRETE-SLAB, WT-SCREED |
| `MAT-PLASTER-CEM` | Штукатурка цементная (сухая смесь) | WT-TILE |
| `MAT-PLASTER-GYPSUM` | Штукатурка гипсовая | WT-PLASTER-WALL-PRO, WT-PLASTER |
| `MAT-PLASTER-PRIMER` | Грунтовка под штукатурку, л | WT-PLASTER-WALL-PRO |
| `MAT-PLASTICIZER` | Пластификатор | WT-SCREED |
| `MAT-PLATE-MOUNT` | Пластина монтажная | WT-DOOR-SET |
| `MAT-PLINTH` | Плинтус напольный | WT-PLINTH |
| `MAT-PLINTH-CORNER` | Углы внутр./внеш. | WT-PLINTH |
| `MAT-PLINTH-DOWEL-6X40` | Дюбель/шуруп 6×40 | WT-PLINTH |
| `MAT-PLINTH-END` | Заглушки/соединители | WT-PLINTH |
| `MAT-PLINTH-MDF-80` | Плинтус МДФ 80 мм | WT-PLINTH |
| `MAT-PLMB-FITT-PEX16` | Фитинг пресс PEX 16 мм | WT-PLMB |
| `MAT-PLMB-FITT-PP50` | Фитинг ПП канализационный 50 мм | WT-PLMB |
| `MAT-PLMB-FITTINGS` | Фитинги/расходники (на 1 м) | sanitary, ind_piping |
| `MAT-PLMB-PIPE-CLIP` | Крепёж/клипсы для трубы | sanitary, ind_piping |
| `MAT-PLMB-PIPE-PP50` | Труба ПП канализационная 50 мм | WT-PLMB |
| `MAT-PLMB-PIPE-SET` | Труба (комплект на 1 м) | sanitary, ind_piping |
| `MAT-PLMB-SEAL-PASTE` | Паста/герметик для резьбовых соединений | WT-PLMB |
| `MAT-PLMB-SINK-KIT` | Комплект: раковина (материалы) | sanitary |
| `MAT-PORC-ANCHOR` | Анкера в основание | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `MAT-PORC-BRACKET` | Кронштейны фасадные | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `MAT-PORC-CLIP-MAIN` | Кляммеры несущие | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `MAT-PORC-DOWEL` | MAT-PORC-DOWEL | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `MAT-PORC-MEMBRANE` | Мембрана ВВЗ | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `MAT-PORC-RAIL` | MAT-PORC-RAIL | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `MAT-PORC-SEALANT` | Герметик фасадный | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `MAT-PORC-SHIM` | Прокладки/термовставки | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `MAT-PORC-TAPE` | Лента для мембраны (стыки) | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `MAT-PPE-WELD-SET` | СИЗ сварщика (маски/перчатки/очки) | WT-STEEL-FENCE-PROF |
| `MAT-PPR-CLAMPS-SET` | Крепёж/клипсы (набор) | WT-PLMB |
| `MAT-PPR-FIT` | Фитинги PPR | WT-PLMB |
| `MAT-PPR-PIPE-COLD-20` | Труба PPR ХВС 20 | WT-PLMB |
| `MAT-PPR-PIPE-HOT-20` | Труба PPR ГВС 20 | WT-PLMB |
| `MAT-PRIMER` | Грунтовка под керамогранит по фальшполу | WT-RF-PORCELAIN |
| `MAT-PRIMER-ACRYLIC` | Грунтовка акриловая | ind_floor_epoxy |
| `MAT-PRIMER-CONTACT` | Грунтовка адгезионная (бетонконтакт) | WT-TILE |
| `MAT-PRIMER-PAINT` | Грунт под покраску | WT-PAINT |
| `MAT-PRIMER-SILICATE` | Грунт | WT-PLASTER-FACADE |
| `MAT-PUTTY-FINISH` | Шпаклёвка финишная (материал) | res_finish_paint, WT-PAINT-INT, WT-WALLPAPER, WT-PUTTY, finish_paint |
| `MAT-PUTTY-START` | Шпаклёвка стартовая (материал) | WT-PUTTY |
| `MAT-PVC-GLUE` | PVC glue | WT-RF-PVC |
| `MAT-PVC-SEWER-110` | Канализация ПВХ 110 мм | WT-PLMB |
| `MAT-RACK-LENS-PANEL` | Панель реечная линзованная | WT-CEIL-RACK-LENS |
| `MAT-RAGS` | Ветошь | WT-DEM-RADIATOR, WT-DEM-PLUMB-FIX |
| `MAT-RCD` | УЗО/дифавтомат | res_electrica, WT-ELEC-OUTLET |
| `MAT-REBAR-A500-10` | Арматура А500 Ø10 | WT-CONCRETE-SLAB |
| `MAT-REBAR-A500-12` | Арматура A500C Ø12 (общая позиция) | WT-FND-MKD, WT-CONCRETE-COLUMN, WT-CONCRETE-SLAB |
| `MAT-REBAR-A500-8` | Арматура A500 Ø8 (кг) | WT-CONCRETE-COLUMN |
| `MAT-REBAR-CHAIR` | Подставка «лягушка» | WT-CONCRETE-SLAB |
| `MAT-REBAR-FLOOR-STEEL` | Арматура стальная (пол/стяжка) | WT-CONC-FLOOR |
| `MAT-REBAR-MESH` | Армирующая сетка Ø5 Вр-1 | WT-CONCRETE-FLOOR |
| `MAT-REBAR-SLAB` | Арматура/армосетка для фундаментной плиты, кг | WT-CONCRETE-SLAB-PRO |
| `MAT-REBAR-STEEL-12` | Арматура стальная Ø12 | WT-CONCRETE-MONO |
| `MAT-REBAR-STEEL-8` | Арматура стальная Ø8 | WT-MASONRY-BRICK, WT-MASONRY-BLOCK, WT-BLOCK |
| `MAT-REBAR-STIRRUP-10` | Хомут Ø10 (арматура) | WT-CONCRETE-BEAM |
| `MAT-REBAR-STIRRUP-Ø8-KG` | Арматура хомут Ø8 (кг) | WT-CONCRETE-BEAM, WT-CONCRETE-COLUMN, WT-CONCRETE-STRIP |
| `MAT-REBAR-WIRE` | MAT-REBAR-WIRE | WT-FND-MKD |
| `MAT-REBARMESH-150X150-Ø5` | Сетка арматурная 150×150 Ø5 | WT-CONCRETE-SLAB |
| `MAT-REBARMESH-200X200-Ø6` | Сетка арматурная 200×200 Ø6 | WT-CONCRETE-SLAB |
| `MAT-RESPIRATOR` | Респиратор | WT-DEM-TILE-WALL, WT-DEM-TILE-FLOOR, WT-DEM-SCREED, WT-DEM-PLASTER, WT-DEM-INSUL, WT-DEM-ROOF, WT-DEM-WINDOW, WT-DEM-RADIATOR, WT-DEM-LIGHT, WT-DEM-OUTLET, WT-DEM-PLUMB-FIX, WT-DEM-FLOOR, WT-DEM-WALL, WT-DEMO, WT-DEM-CEIL, WT-DEM-GKL, WT-DEM-DOOR |
| `MAT-RF-PANEL-PORC` | Панель фальшпола под керамогранит (усиленная) | WT-RF-PORCELAIN |
| `MAT-RF-PANEL-STD` | Панель фальшпола 600×600 (стандартная) | WT-RF-CARPET, WT-RF-PVC |
| `MAT-RF-PEDESTAL-STD` | Опора регулируемая фальшпола | WT-RF-CARPET, WT-RF-HPL, WT-RF-PVC |
| `MAT-RF-PVC-ESD` | PVC ESD floor covering | WT-RF-PVC |
| `MAT-RF-STRINGER-HEAVY` | Стрингер фальшпола (усиленный) | WT-RF-PORCELAIN |
| `MAT-RF-STRINGER-STD` | Стрингер фальшпола (стандартный) | WT-RF-CARPET, WT-RF-HPL, WT-RF-PVC |
| `MAT-ROAD-ASPHALT-MASTIC` | Мастика/герметик для швов, кг | WT-EXT-ASPHALT-PRO |
| `MAT-ROAD-ASPHALT-SUBBASE` | ЩПС/щебень для основания дороги, м³ | WT-EXT-ASPHALT-PRO |
| `MAT-ROOF-FRAME-CNTRBAT-40X50` | MAT-ROOF-FRAME-CNTRBAT-40x50 | WT-ROOF-FRAME |
| `MAT-ROOF-FRAME-RAFTER-50X150` | MAT-ROOF-FRAME-RAFTER-50x150 | WT-ROOF-FRAME |
| `MAT-ROOF-FRAME-RIGEL-100X100` | Ригель/стойки брус 100×100 | WT-ROOF-FRAME |
| `MAT-ROOF-LATH` | Обрешётка кровли | WT-ROOF-FRAME-SLATE, WT-ROOF-METAL |
| `MAT-ROOF-METAL-TILE` | Металлочерепица | WT-ROOF-METAL |
| `MAT-ROOF-MTL-RIDGE` | Добор: конёк кровельный (металлочерепица) | WT-ROOF-MTL |
| `MAT-ROOF-MTL-SCREW` | Саморезы кровельные для металлочерепицы | WT-ROOF-MTL |
| `MAT-ROOF-MTL-TILE` | Металлочерепица кровельная | WT-ROOF-MTL |
| `MAT-ROOF-MTL-UNDERLAY` | Подкладочный ковёр / плёнка | WT-ROOF-MTL |
| `MAT-ROOF-MTL-VALLEY` | Добор: ендова (металлочерепица) | WT-ROOF-MTL |
| `MAT-ROOF-RIDGE` | Конёк кровельный | WT-ROOF-METAL |
| `MAT-ROOF-ROLLED-INSULATION` | Утеплитель для плоской кровли | WT-ROOF-ROLLED |
| `MAT-ROOF-ROLLED-PRIMER` | Битумный праймер (грунтовка) | WT-ROOF-ROLLED |
| `MAT-ROOF-ROLLED-SCREED` | Стяжка цементно-песчаная (по кровле) | WT-ROOF-ROLLED |
| `MAT-ROOF-SANDWICH-EDGE` | Добор: торцевая/фронтонная планка | WT-ROOF-SANDWICH |
| `MAT-ROOF-SANDWICH-LATH-25X100` | MAT-ROOF-SANDWICH-LATH-25x100 | WT-ROOF-SANDWICH |
| `MAT-ROOF-SANDWICH-PANEL` | Сэндвич-панели кровельные | WT-ROOF-SANDWICH |
| `MAT-ROOF-SANDWICH-RAFTER-50X150` | Стропильная доска 50×150 | WT-ROOF-SANDWICH |
| `MAT-ROOF-SANDWICH-SCREW` | Саморезы для сэндвич-панелей | WT-ROOF-SANDWICH |
| `MAT-ROOF-SANDWICH-TAPE` | Уплотнительная лента под панели | WT-ROOF-SANDWICH |
| `MAT-ROOF-SHEET` | Кровельный лист/покрытие | WT-STEEL-GATE-SWING |
| `MAT-ROOF-SHINGLE-CNTRBAT-40X50` | Контробрешётка 40×50 (ГЧ) | WT-ROOF-SHINGLE |
| `MAT-ROOF-SHINGLE-EDGE` | Карнизная/торцевая планка ГЧ | WT-ROOF-SHINGLE |
| `MAT-ROOF-SHINGLE-LATH-25X100` | Обрешётка доска 25×100 (ГЧ) | WT-ROOF-SHINGLE |
| `MAT-ROOF-SHINGLE-NAIL` | Кровельные гвозди (ГЧ) | WT-ROOF-SHINGLE |
| `MAT-ROOF-SHINGLE-OSB` | Лист ОСБ под ГЧ | WT-ROOF-SHINGLE |
| `MAT-ROOF-SHINGLE-RAFTER-50X150` | Стропильная доска 50×150 (ГЧ) | WT-ROOF-SHINGLE |
| `MAT-ROOF-SHINGLE-RIDGE` | Конёк под ГЧ | WT-ROOF-SHINGLE |
| `MAT-ROOF-SHINGLE-SHEET` | Гибкая черепица (ГЧ) | WT-ROOF-SHINGLE |
| `MAT-ROOF-SHINGLE-UNDERLAY` | Подкладочный ковёр под ГЧ | WT-ROOF-SHINGLE |
| `MAT-ROOF-SHINGLE-VALLEY` | Ендова под ГЧ | WT-ROOF-SHINGLE |
| `MAT-ROOF-SLATE` | Шифер кровельный | WT-ROOF-FRAME-SLATE |
| `MAT-ROOF-SLATE-CNTRBAT-40X50` | Контробрешётка 40×50 (шифер) | WT-ROOF-SLATE |
| `MAT-ROOF-SLATE-SHEET` | Шифер листовой | WT-ROOF-SLATE |
| `MAT-ROOF-SLATE-WATERPROOF` | Гидроизоляционная плёнка под шифер | WT-ROOF-SLATE |
| `MAT-ROOF-TRIM` | Доборные элементы кровли | WT-ROOF-FRAME-SLATE, WT-ROOF-FRAME-SHINGLE |
| `MAT-SAND` | Песок строительный для подготовки и засыпки | ind_concrete, WT-FND-MKD, WT-SCREED |
| `MAT-SAND-SET` | Шлифсетка/наждачка (компл.) | WT-WALLPAPER, WT-PUTTY, WT-LEVEL |
| `MAT-SCREED-SLOPE` | Смесь для формирования уклонов | WT-BATH |
| `MAT-SCREW-25MM` | Саморез 25 мм (ГКЛ→металл) | WT-CEIL-GKL-BOX |
| `MAT-SCREW-ANCHOR` | Саморезы/анкера для коробки | WT-DOOR-SET, WT-DOOR |
| `MAT-SCREW-GKL-25` | Саморез по ГКЛ 25 мм | WT-CEIL-GKL-BOX |
| `MAT-SEALANT-ACR` | Герметик акриловый | WT-DOOR |
| `MAT-SEALANT-SAN` | Герметик санитарный | WT-PLMB-SINK, WT-PLMB-WM, WT-PLMB-SHOWER, WT-PLMB-TOILET |
| `MAT-SEALING-SET` | Герметик, лён/фум, паста | WT-PLMB |
| `MAT-SEAM-SEALANT` | Герметик швов | WT-SCREED |
| `MAT-SELFLEVEL` | Самонивелирующая смесь (наливной пол) | WT-TILE |
| `MAT-SEWER-FITTINGS-SET` | Фитинги канал. (набор) | WT-PLMB |
| `MAT-SHIELDING-GAS-CO2-BAL` | CO2 gas cylinder | WT-STEEL-GATE-SWING, WT-STEEL-RAILING, WT-STEEL-PRIME, WT-STEEL-PAINT, WT-STEEL-DRILL, WT-STEEL-CUT, WT-STEEL-TRUSS-HEAVY, WT-STEEL-STAIR, WT-STEEL-FENCE-PROF, WT-STEEL-GATE-SLIDE, WT-STEEL-WELD-MIG-A4, WT-STEEL-TRUSS-LIGHT, WT-STEEL-FENCE-MESH, WT-STEEL-WELD-MMA |
| `MAT-SILICONE` | Герметик санитарный (силикон) | WT-TILE |
| `MAT-SILICONE-SAN` | Силикон санитарный | WT-HYDRO, WT-BATH |
| `MAT-SIPHON-SET` | Сифоны (комплект) | WT-PLMB |
| `MAT-SLAB-FILM` | Плёнка/гидроизоляция под плиту, м² | WT-CONCRETE-SLAB-PRO |
| `MAT-SPACER` | Дистанционный фиксатор | WT-CONCRETE-FOOTING, WT-CONCRETE-BEAM, WT-CONCRETE-COLUMN, WT-CONCRETE-MONO, WT-CONCRETE-STRIP, WT-CONCRETE-SLAB, WT-CONCRETE-PILE |
| `MAT-SPLIT-12K` | Сплит-система 12k BTU | WT-HVAC |
| `MAT-SPLIT-9K` | Сплит-система 9k BTU | WT-HVAC |
| `MAT-STEEL-ANCHOR-M12-CHEM` | Анкер химический M12 | WT-STEEL-GATE-SWING, WT-STEEL-STAIR, WT-STEEL-GATE-SLIDE |
| `MAT-STEEL-BOLT-M12-SET` | Комплект болтов М12 (болт+гайка+2 шайбы) | WT-STEEL-RAILING, WT-STEEL-TRUSS-HEAVY, WT-STEEL-FENCE-PROF, WT-STEEL-TRUSS-LIGHT, WT-STEEL-FENCE-MESH |
| `MAT-STEEL-ELECTRODE-E46` | Электроды Э46 Ø4 мм | WT-STEEL-WELD-MMA |
| `MAT-STEEL-GAS-ACETYLENE` | Ацетилен технический | WT-STEEL-WELD-MMA |
| `MAT-STEEL-GAS-CO2` | Диоксид углерода (CO₂), м³ | WT-STEEL-WELD-MIG-A4 |
| `MAT-STEEL-GATE-CATCH-TOP` | Ловитель верхний воротный | WT-STEEL-GATE-SLIDE |
| `MAT-STEEL-GATE-GUIDE-L6M` | Направляющая для откатных ворот 6 м | WT-STEEL-GATE-SLIDE |
| `MAT-STEEL-GATE-LATCH` | Защёлка/замок воротный | WT-STEEL-GATE-SWING |
| `MAT-STEEL-HINGE-HEAVY` | Петля усиленная воротная | WT-STEEL-GATE-SWING |
| `MAT-STEEL-MESH-50X50` | Сетка сварная 50×50 | WT-STEEL-FENCE-MESH |
| `MAT-STEEL-ROUND-10` | Кругляк ∅10 | WT-SCREED |
| `MAT-STEEL-ROUND-12` | Кругляк ∅12 | WT-STEEL-GATE-SWING, WT-CONCRETE-SLAB, WT-STEEL-STAIR, WT-STEEL-FENCE-PROF, WT-STEEL-FENCE-MESH |
| `MAT-STEEL-STAIR-STRINGER` | Тетива/косоур (сталь) | WT-STEEL-STAIR |
| `MAT-STEEL-TUBE-100X50X4` | Труба профильная 100×50×4 (пог.м) | WT-STEEL-STAIR |
| `MAT-STEEL-TUBE-40X20X2` | Труба 40×20×2 | WT-STEEL-FENCE-PROF |
| `MAT-STEEL-WIRE-SG2-1MM-15KG` | Проволока сварочная SG2 1.0мм 15кг | WT-STEEL-WELD-MIG-A4 |
| `MAT-STRETCH-BAGUETTE` | Багет пристенный (натяжной) | WT-CEIL-STRETCH |
| `MAT-STRETCH-INSERT` | Вставка/маскировочная лента | WT-CEIL-STRETCH |
| `MAT-STRETCH-PVC` | Полотно ПВХ (натяжной потолок) | WT-CEIL-STRETCH |
| `MAT-STRETCH-THERMORING` | Термокольцо под вырез | WT-CEIL-STRETCH |
| `MAT-SUBBASE-GEOTEXT` | Геотекстиль под подушку, м² | WT-SUBBASE-PRO |
| `MAT-SUBBASE-SAND` | Песчаная подушка под фундамент, м³ | WT-SUBBASE-PRO |
| `MAT-TAPE-SERP` | Серпянка | WT-GKL-WALL-PRO, WT-PUTTY |
| `MAT-TAPE-SERPYANKA` | Серпянка | WT-WALLPAPER, WT-CEIL-GKL-BOX |
| `MAT-TERMINALS` | Клеммы/клеммники | WT-DEM-LIGHT, WT-DEM-OUTLET |
| `MAT-THERMOSTAT` | Терморегулятор с датчиком | WT-TILE |
| `MAT-THRESHOLD` | Порог | WT-DOOR-SET, WT-DOOR, WT-TILE |
| `MAT-THRESHOLD-DOOR` | Mat Порог Door | WT-FLOOR-LAMINATE |
| `MAT-TIE-FACADE-SS` | Гибкая связь фасадная (нерж.) | WT-MASONRY-BRICK-CLINKER |
| `MAT-TIE-WIRE` | Проволока вязальная | WT-CONCRETE-FOOTING, WT-CONCRETE-BEAM, WT-CONCRETE-COLUMN, WT-CONCRETE-MONO, WT-CONCRETE-STRIP, WT-CONCRETE-SLAB, WT-CONCRETE-PILE |
| `MAT-TIE-WIRE-KG` | Проволока вязальная (кг) | WT-CONCRETE-FOOTING, WT-CONCRETE-BEAM, WT-CONCRETE-COLUMN, WT-CONCRETE-MONO, WT-CONCRETE-STRIP, WT-CONCRETE-SLAB, WT-CONCRETE-PILE |
| `MAT-TILE-CROSS` | Крестики для плитки | WT-TILE |
| `MAT-TILE-CROSSES` | Крестики/СНП | WT-BATH |
| `MAT-TILE-SPACERS` | Крестики для плитки | WT-BATH |
| `MAT-TILE-TRIM-ALU` | MAT-TILE-TRIM-ALU | WT-BATH |
| `MAT-TILE-WALL-CERAMIC` | Плитка керамическая (стены) | WT-BATH |
| `MAT-TOOLS-DISC-CUT-125` | Круг отрезной 125 мм | WT-STEEL-CUT |
| `MAT-TOOLS-DRILL-12MM` | Сверло по металлу d=12 мм | WT-STEEL-DRILL |
| `MAT-TRASH-BAGS` | Мешки для мусора | WT-DEM-TILE-WALL, WT-DEM-TILE-FLOOR, WT-DEM-SCREED, WT-DEM-PLASTER, WT-DEM-INSUL, WT-DEM-ROOF, WT-DEM-FLOOR, WT-DEM-WALL, WT-DEMO, WT-DEM-CEIL, WT-DEM-GKL |
| `MAT-TRAY-COUPLER` | Соединитель лотка (комплект) | WT-ELEC-TRAY |
| `MAT-UNDERLAY-3MM` | Mat Подложка 3mm | WT-FLOOR-LAMINATE |
| `MAT-VALVE-ANGLE-1/2` | Кран шаровый угловой 1/2" | WT-PLMB-SINK, WT-PLMB-WM, WT-PLMB-SHOWER, WT-PLMB-TOILET |
| `MAT-WALLPAPER-FLIZ` | Обои флизелиновые | WT-WALLPAPER |
| `MAT-WATERPROOF` | Гидроизоляция обмазочная | WT-TILE |
| `MAT-WATERPROOF-MAN` | Гидроизоляционная манжета для труб/сливов | WT-TILE |
| `MAT-WATERPROOF-TAPE` | Гидроизоляционная лента для примыканий | WT-TILE |
| `MAT-WC-CORR-110` | Гофра унитаза 110 мм | WT-PLMB-TOILET |
| `MAT-WC-FIX` | Крепёж унитаза (комплект) | WT-PLMB-TOILET |
| `MAT-WC-FRAME` | Инсталляция унитаза | WT-PLMB |
| `MAT-WELD-ELECTRODE` | Электроды сварочные | WT-STEEL-GATE-SWING, WT-STEEL-STAIR, WT-STEEL-FENCE-PROF |
| `MAT-WELD-ROD-3MM-KG` | Электроды 3 мм | WT-STEEL-GATE-SWING, WT-STEEL-RAILING, WT-STEEL-PRIME, WT-STEEL-PAINT, WT-STEEL-DRILL, WT-STEEL-CUT, WT-STEEL-TRUSS-HEAVY, WT-STEEL-STAIR, WT-STEEL-FENCE-PROF, WT-STEEL-GATE-SLIDE, WT-STEEL-WELD-MIG-A4, WT-STEEL-TRUSS-LIGHT, WT-STEEL-FENCE-MESH, WT-STEEL-WELD-MMA |
| `MAT-WELD-WIRE-0.8MM-KG` | Проволока сварочная 0.8 мм | WT-STEEL-GATE-SWING, WT-STEEL-RAILING, WT-STEEL-PRIME, WT-STEEL-PAINT, WT-STEEL-DRILL, WT-STEEL-CUT, WT-STEEL-TRUSS-HEAVY, WT-STEEL-STAIR, WT-STEEL-FENCE-PROF, WT-STEEL-GATE-SLIDE, WT-STEEL-WELD-MIG-A4, WT-STEEL-TRUSS-LIGHT, WT-STEEL-FENCE-MESH, WT-STEEL-WELD-MMA |
| `MAT-WINDOW-FOAM` | Монтажная пена для окон | WT-WINDOW-AL, WT-WINDOW-PVC |
| `MAT-WINDOW-PVC-UNIT` | Комплект окна ПВХ, м² | WT-WINDOW-PVC |
| `MAT-WINDOW-REVEAL-ANGLE` | Уголки перфорированные для откосов, м | WT-WINDOW-REVEAL |
| `MAT-WIRE-NUTS/WAGO` | Соединители проводов (набор) | res_electrica, WT-ELEC, WT-ELEC-OUTLET, WT-ELEC-SWITCH |
| `MAT-WM-DRAINHOSE-2M` | Шланг слива стиральной 2 м | WT-PLMB-WM |
| `MAT-WP-CORNER-IN` | Угол внутренний гидроизоляционный | WT-BATH |
| `MAT-WP-MANCHETTE-32` | Манжета гидроизоляционная 32 мм | WT-BATH |
| `MAT-WP-MANCHETTE-50` | Манжета гидроизоляционная 50 мм | WT-BATH |
| `MAT-WP-MASTIC` | Мастика гидроизоляционная | WT-CONC, WT-WP, WT-HYDRO, WT-BATH |
| `MAT-WP-ROLL` | Гидроизоляция рулонная | WT-WP, WT-HYDRO, WT-BATH |
| `MAT-WP-TAPE-120` | Гидроизоляционная лента 120 мм | WT-BATH |
| `MAT-WP-TAPE-200` | Гидроизоляционная лента 200 мм | WT-BATH |
| `SRV-CLEANING-FIN` | Финальная уборка после работ | WT-TILE |
| `SRV-CONC-PUMP` | Подача бетона насосом | ind_concrete, WT-CONC |
| `SRV-CONC-PUMP-SHIFT` | Насос: выезд/смена | ind_concrete |
| `SRV-CRANE-25T-DAY` | Кран 25 т (смена) | WT-STEEL-TRUSS-HEAVY, WT-STEEL-STAIR |
| `SRV-DELIVERY-AND-LIFT` | Доставка и подъём материалов | WT-MASONRY-BLOCK |
| `SRV-LIFT` | Подъём на этаж | WT-DOOR-SET, WT-DOOR |
| `SRV-LIFT-TRUCK` | Автовышка | WT-HVAC |
| `SRV-LOADING-TEAM` | Погрузочная бригада | WT-DELIVERY |
| `SRV-PUMP-DAY` | Бетононасос (смена) | WT-CONCRETE-FOOTING, WT-CONCRETE-BEAM, WT-CONCRETE-COLUMN, WT-CONCRETE-MONO, WT-CONCRETE-STRIP, WT-CONCRETE-SLAB, WT-CONCRETE-PILE |
| `SRV-WASTE` | Вывоз тары/мусора | WT-DOOR-SET, WT-DEM-TILE-WALL, WT-DEM-TILE-FLOOR, WT-DEM-SCREED, WT-DEM-PLASTER, WT-WALLPAPER, WT-DEM-INSUL, WT-DEM-ROOF, WT-DEM-WINDOW, WT-DEM-RADIATOR, WT-DEM-LIGHT, WT-DEM-OUTLET, WT-DEM-PLUMB-FIX, WT-DEM-FLOOR, WT-DEM-WALL, WT-DEMO, WT-DEM-CEIL, WT-DEM-GKL, WT-SCREED, WT-STEEL-FENCE-PROF, WT-DOOR, WT-DEM-DOOR, WT-PLMB |
| `SRV-WASTE-LOADING` | Погрузка строительного мусора | WT-WASTE |
| `SRV-WASTE-REMOVAL` | Вывоз строительного мусора | WT-GKL-WALL-PRO, WT-GKL-WALL, WT-TILE |
| `TOOL-GAS-KEY` | Инструмент: газовый ключ | WT-DEM-RADIATOR, WT-DEM-PLUMB-FIX |
| `TOOL-GRINDER` | Инструмент: болгарка | WT-DEM-TILE-WALL, WT-DEM-TILE-FLOOR, WT-DEM-SCREED, WT-DEM-PLASTER, WT-DEM-INSUL, WT-DEM-ROOF, WT-DEM-WINDOW, WT-DEM-RADIATOR, WT-DEM-LIGHT, WT-DEM-OUTLET, WT-DEM-PLUMB-FIX, WT-DEM-FLOOR, WT-DEM-WALL, WT-DEMO, WT-DEM-CEIL, WT-DEM-GKL, WT-DEM-DOOR |
| `TOOL-HAMMER` | Инструмент: молоток | WT-DEM-TILE-WALL, WT-DEM-TILE-FLOOR, WT-DEM-SCREED, WT-DEM-PLASTER, WT-DEM-INSUL, WT-DEM-ROOF, WT-DEM-WINDOW, WT-DEM-RADIATOR, WT-DEM-LIGHT, WT-DEM-OUTLET, WT-DEM-PLUMB-FIX, WT-DEM-FLOOR, WT-DEM-WALL, WT-DEMO, WT-DEM-CEIL, WT-DEM-GKL, WT-DEM-DOOR |
| `TOOL-KNIFE` | Инструмент: строительный нож | WT-DEM-WINDOW, WT-DEM-CEIL, WT-DEM-DOOR |
| `TOOL-PERFORATOR` | Инструмент: перфоратор | WT-DEM-TILE-WALL, WT-DEM-TILE-FLOOR, WT-DEM-SCREED, WT-DEM-PLASTER, WT-DEM-INSUL, WT-DEM-ROOF, WT-DEM-WINDOW, WT-DEM-RADIATOR, WT-DEM-LIGHT, WT-DEM-OUTLET, WT-DEM-PLUMB-FIX, WT-DEM-FLOOR, WT-DEM-WALL, WT-DEMO, WT-DEM-CEIL, WT-DEM-GKL, WT-DEM-DOOR |
| `TOOL-SCRAPER` | Инструмент: скребок | WT-DEM-FLOOR |
| `TOOL-SHOVEL` | Инструмент: лопата | WT-DEM-SCREED |
| `TOOL-SPATULA` | Инструмент: шпатель | WT-DEM-WALL |
| `WORK-CONC-PILE-REBAR` | Work Conc Pile Арматура | WT-CONCRETE-PILE |
| `WORK-CONC-SCREED` | Стяжка бетонная (работы) | WT-CONCRETE-FLOOR |
| `WORK-DELIVERY-TRIP` | Рейс доставки | WT-DELIVERY |
| `WORK-ELEC-LIGHT-INSTALL` | Монтаж светильников | res_electrica, WT-ELEC-LIGHT |
| `WORK-ELEC-OUTLET-INSTALL` | Монтаж розеток | res_electrica, WT-ELEC-OUTLET |
| `WORK-GEN-EPOXY` | Наливные/эпоксидные полы | ind_floor_epoxy |
| `WORK-GEN-PAINT` | Work Gen Краска | res_finish_paint, finish_paint |
| `WORK-HVAC-DUCT-INSTALL` | Монтаж воздуховодов/каналов | WT-HVAC |
| `WORK-IND-STEEL-NODES` | Изготовление/сборка узлов МК | ind_steel |
| `WORK-IND-STEEL-PAINT` | Окраска металлоконструкций | ind_steel |
| `WORK-PLMB-TOILET-INSTALL` | Установка унитаза | WT-PLMB-TOILET |
| `WORK-ROOF-INSTALL` | WORK-ROOF-INSTALL | WT-ROOF-FRAME-SLATE, WT-ROOF-FRAME-SHINGLE |
| `WORK-SCREED-LAY` | Укладка стяжки | WT-SCREED |
| `WRK-ARM-FRAME` | Монтаж каркаса T24 | WT-CEIL-ARMSTRONG-600 |
| `WRK-ARM-HANGERS` | WRK-ARM-HANGERS | WT-CEIL-ARMSTRONG-600 |
| `WRK-ARM-LAYOUT` | Разметка сетки | WT-CEIL-ARMSTRONG-600 |
| `WRK-ARM-PERIMETER` | Периметр (уголок/отрезки) | WT-CEIL-ARMSTRONG-600 |
| `WRK-ARM-TILES` | Укладка плит | WT-CEIL-ARMSTRONG-600 |
| `WRK-BASE-PREP` | WRK-BASE-PREP | WT-SCREED |
| `WRK-BATH-HYDRO` | Гидроизоляция ванной зоны | WT-BATH |
| `WRK-BATH-SLOPE` | Формирование уклонов к трапу | WT-BATH |
| `WRK-BATH-TILE` | Wrk Bath черепица | WT-BATH |
| `WRK-CANOPY-ROOF-INSTALL` | Монтаж кровли из профнастила (навес) | WT-STEEL-CANOPY-LEAN, WT-STEEL-CANOPY-GABLE, WT-STEEL-CANOPY-HIP |
| `WRK-CANOPY-STEEL-CUT` | Резка профтрубы под навес | WT-STEEL-CANOPY-LEAN, WT-STEEL-CANOPY-GABLE, WT-STEEL-CANOPY-HIP |
| `WRK-CANOPY-STEEL-INSTALL` | Монтаж металлокаркаса навеса | WT-STEEL-CANOPY-LEAN, WT-STEEL-CANOPY-GABLE, WT-STEEL-CANOPY-HIP |
| `WRK-CASS-BRACKETS` | WRK-CASS-BRACKETS | WT-FACADE-CASSETTE-INSTALL |
| `WRK-CASS-DOWEL` | Дюбелирование утеплителя | WT-FACADE-CASSETTE-INSTALL |
| `WRK-CASS-INSTALL` | Монтаж кассет | WT-FACADE-CASSETTE-INSTALL |
| `WRK-CASS-LAYOUT` | Разметка фасада и осей | WT-FACADE-CASSETTE-INSTALL |
| `WRK-CASS-MEMBRANE` | Монтаж мембраны | WT-FACADE-CASSETTE-INSTALL |
| `WRK-CASS-RAILS` | WRK-CASS-RAILS | WT-FACADE-CASSETTE-INSTALL |
| `WRK-CASS-WOOL` | Монтаж утеплителя | WT-FACADE-CASSETTE-INSTALL |
| `WRK-CEIL-CLIPIN-INSTALL` | Монтаж потолка Clip-in | WT-CEIL-CLIPIN |
| `WRK-CEIL-GKL-INSTALL` | Монтаж потолка из ГКЛ | WT-CEIL-GKL-BOX |
| `WRK-CEIL-GRILIATO-INSTALL` | Монтаж потолка грильято | WT-CEIL-GRILIATO-075, WT-CEIL-GRILIATO-050, WT-CEIL-GRILIATO-100 |
| `WRK-CEIL-RACK-INSTALL` | Монтаж потолка реечного | WT-CEIL-RACK |
| `WRK-CEIL-STRETCH-INSTALL` | Монтаж потолка натяжного | WT-CEIL-STRETCH |
| `WRK-CLIPIN-FRAME` | Монтаж несущих/поперечных | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `WRK-CLIPIN-HANGERS` | WRK-CLIPIN-HANGERS | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `WRK-CLIPIN-LAYOUT` | WRK-CLIPIN-LAYOUT | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `WRK-CLIPIN-PANELS` | Укладка/защёлкивание панелей | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `WRK-CLIPIN-PERIMETER` | WRK-CLIPIN-PERIMETER | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600 |
| `WRK-COM-PLMB-ROUGH` | Сантехнический монтаж черновой (1 точка) | com_plumbing |
| `WRK-CONC-CURE` | Уход за бетоном | ind_concrete |
| `WRK-CONC-FORMWORK` | Опалубка: монтаж/демонтаж | ind_concrete, WT-CONC |
| `WRK-CONC-GEO-SETOUT` | Геодезия/разбивка | ind_concrete, WT-CONC |
| `WRK-CONC-MESH` | Монтаж сетки | ind_concrete |
| `WRK-CONC-POUR` | Заливка бетона фундамента | ind_concrete, WT-FND-MKD, WT-CONC |
| `WRK-DEM-CEIL` | Демонтаж потолка (работа) | WT-DEM-CEIL |
| `WRK-DEM-FLOOR` | Демонтаж пола (работа) | WT-DEM-FLOOR |
| `WRK-DEM-LIGHT` | Демонтаж светильников (работа) | WT-DEM-LIGHT |
| `WRK-DEM-PLASTER` | Демонтаж штукатурки (работа) | WT-DEM-PLASTER |
| `WRK-DEM-TILE-FLOOR` | Демонтаж плитки пол (работа) | WT-DEM-TILE-FLOOR |
| `WRK-DEM-WALL` | Демонтаж стен/обоев (работа) | WT-DEM-WALL |
| `WRK-DEM-WINDOW` | Демонтаж окон (работа) | WT-DEM-WINDOW |
| `WRK-DEMO-CORE` | Подрезка/сверление/болгарка (сложные крепежи) | WT-DEM-ROOF |
| `WRK-DEMO-SAVE` | Аккуратный демонтаж с сохранением | WT-DEM-WINDOW, WT-DEM-RADIATOR, WT-DEMO, WT-DEM-DOOR |
| `WRK-DEMOLISH-CEIL` | Wrk Demolish Потолок | WT-DEM-CEIL |
| `WRK-DEMOLISH-DOOR` | Демонтаж конструкций/отделки | WT-DEM-WINDOW, WT-DEM-RADIATOR, WT-DEM-LIGHT, WT-DEM-OUTLET, WT-DEM-PLUMB-FIX, WT-DEM-DOOR |
| `WRK-DEMOLISH-LINO` | WRK-DEMOLISH-LINO | WT-DEM-FLOOR |
| `WRK-DEMOLISH-WALLP` | Демонтаж конструкций/отделки | WT-DEM-WALL |
| `WRK-DOOR-CASING-INSTALL` | Монтаж наличников | WT-DOOR-SET, WT-DOOR |
| `WRK-DOOR-INSTALL` | Установка двери (в сборе) | WT-DOOR-SET, WT-DOOR |
| `WRK-DOOR-JAMB-INSTALL` | Монтаж доборов | WT-DOOR-SET, WT-DOOR |
| `WRK-DOOR-MORTISE` | Врезка замка/петель | WT-DOOR-SET, WT-DOOR |
| `WRK-EARTH-BACKFILL` | Обратная засыпка с трамбовкой | WT-CONC |
| `WRK-EARTHWORK-PRO` | WRK-EARTHWORK-PRO | WT-EARTHWORK-PRO |
| `WRK-ELEC-CHASING` | Штробление/укладка гофры | res_electrica, WT-ELEC-CABLE, WT-ELEC |
| `WRK-ELEC-PULL` | Протяжка кабеля (всего) | res_electrica, WT-ELEC-CABLE, WT-ELEC |
| `WRK-ELEC-TRAY-INSTALL` | Монтаж лотков/каналов | WT-ELEC-TRAY |
| `WRK-ETICS-ADHESIVE` | Приклейка утеплителя | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `WRK-ETICS-BASE` | WRK-ETICS-BASE | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `WRK-ETICS-BASE-MESH` | Базовый слой с сеткой | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `WRK-ETICS-DOWEL` | WRK-ETICS-DOWEL | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `WRK-ETICS-FINISH` | Нанесение декоративной штукатурки | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `WRK-ETICS-PRIMER` | Грунтование под финиш | WT-FACADE-WET-SYSTEM, WT-FACADE-WET |
| `WRK-EXCAV-HAND` | Ручная доработка и зачистка котлована | WT-FND-MKD |
| `WRK-EXCAV-MECH` | WRK-EXCAV-MECH | WT-FND-MKD |
| `WRK-EXT-ASPHALT-PAVE` | Асфальтирование площадки | WT-EXT-ASPHALT |
| `WRK-EXT-CURB-INSTALL` | Устройство дорожного бордюра | WT-EXT-CURB |
| `WRK-EXT-PAVING-BASE` | Основание под тротуарную плитку (подготовка) | WT-EXT-PAVING |
| `WRK-FACADE-FC-H-INSTALL` | Монтаж фиброцементных панелей (H-профиль) | WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-H-12 |
| `WRK-FACADE-HPL-INSTALL` | Монтаж HPL-панелей | WT-FACADE-HPL-INSTALL, WT-FACADE-HPL, WT-FACADE-HPL-LSTK |
| `WRK-FACADE-MOUNT` | WRK-FACADE-MOUNT | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `WRK-FACADE-PAINT` | Окраска фасада | WT-PLASTER-FACADE |
| `WRK-FACADE-PANEL` | WRK-FACADE-PANEL | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `WRK-FACADE-PORCELAIN-INSTALL` | WRK-FACADE-PORCELAIN-INSTALL | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `WRK-FACADE-SUBSYS` | WRK-FACADE-SUBSYS | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `WRK-FACADE-VENT-FRAME` | Монтаж подсистемы вентфасада | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `WRK-FORM-REMOVE` | Демонтаж опалубки фундамента | WT-FND-MKD |
| `WRK-FORMWORK-INSTALL` | Монтаж опалубки | WT-CONCRETE-MONO |
| `WRK-FORMWORK-REMOVE` | Снятие опалубки (работы) | WT-CONCRETE-BEAM |
| `WRK-GKL-CD` | Сборка каркаса CD | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `WRK-GKL-CORNERS` | Углы/ниши, перфоуголок | WT-CEIL-GKL-2L |
| `WRK-GKL-LAYOUT` | Разметка уровня/осей | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `WRK-GKL-PRIMING` | WRK-GKL-PRIMING | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `WRK-GKL-PUTTY` | Шпаклевание/заделка швов | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `WRK-GKL-SHEATH` | Обшивка ГКЛ (2 стороны) | WT-GKL-WALL-PRO |
| `WRK-GKL-SHEATHING` | WRK-GKL-SHEATHING | WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `WRK-GKL-SHEET` | Обшивка ГКЛ | WT-GKL |
| `WRK-GKL-WALL-FRAME` | Монтаж каркаса перегородки из ГКЛ | WT-GKL-WALL-PRO, WT-GKL-WALL |
| `WRK-HVAC-VACUUM-START` | Вакуумирование/пуск | WT-HVAC |
| `WRK-HYDRO-APPLY` | Нанесение/устройство гидроизоляции фундамента | WT-FND-MKD, WT-HYDRO |
| `WRK-IND-STEEL-BOLT` | Сборка болтовых соединений металлоконструкций | ind_steel |
| `WRK-IND-STEEL-FIREPROOF` | Огнезащитная обработка металлоконструкций | ind_steel |
| `WRK-IND-STEEL-PAINT` | Окраска/антикоррозионная защита металлоконструкций | ind_steel |
| `WRK-IND-STEEL-WELD` | Сварка стыков/швов металлоконструкций | ind_steel |
| `WRK-INSUL-DOWEL-VF` | WRK-INSUL-DOWEL-VF | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `WRK-INSUL-VF` | WRK-INSUL-VF | WT-FACADE-FC-RIVET-10, WT-FACADE-FC-RIVET-12, WT-FACADE-HPL-INSTALL, WT-FACADE-FC-H, WT-FACADE-FC-H-8, WT-FACADE-FC-H-10, WT-FACADE-FC-RIVET-8, WT-FACADE-ACP, WT-FACADE-FC-H-12, WT-FACADE-HPL, WT-FACADE-CLINKER-VF, WT-FACADE-STONE, WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT, WT-FACADE-CASSETTE-INSTALL, WT-FACADE-FCB, WT-FACADE-FC-RIVET, WT-FACADE-HPL-LSTK |
| `WRK-INSUL-WALL-PRO-INSTALL` | Устройство утеплённой/звукоизолированной облицовки стен (каркас + вата + ГКЛ) | WT-INSUL-WALL-PRO |
| `WRK-LEVEL-APPLY` | Устройство наливного пола | ind_floor_epoxy, WT-LEVEL |
| `WRK-MASONRY-BLOCK` | Кладка блоков | WT-MASONRY-BLOCK |
| `WRK-MASONRY-CLINKER-BRICKLAY` | Кладка облицовочного клинкерного кирпича | WT-MASONRY-BRICK-CLINKER |
| `WRK-PAINT-PREP` | Подготовка под покраску | res_finish_paint, WT-PAINT-INT, finish_paint, WT-PAINT |
| `WRK-PLASTER-MAIN` | Штукатурка по маякам | WT-PLASTER-WALL-PRO, WT-PLASTER |
| `WRK-PLINTH-INSTALL` | Монтаж плинтуса | WT-PLINTH |
| `WRK-PLINTH-MITER` | Запил/стыковка углов | WT-PLINTH |
| `WRK-PLMB-CHASE` | Штробление под сантехнические трассы | WT-PLMB |
| `WRK-PLMB-POINT-DRAIN` | Устройство точки канализации | WT-PLMB |
| `WRK-PLMB-PRESSURE-TEST` | Оппрессовка/пуск | WT-PLMB |
| `WRK-PLMB-SHOWER-INSTALL` | Установка душа/смесителя | sanitary |
| `WRK-PLMB-SHOWER-POINT` | Устройство душевой точки | WT-PLMB |
| `WRK-PLMB-SINK-CONNECT` | Подключение раковины | WT-PLMB |
| `WRK-PLMB-WC-CONNECT` | Подключение унитаза | WT-PLMB |
| `WRK-PLMB-WM-CONNECT` | WRK-PLMB-WM-CONNECT | WT-PLMB |
| `WRK-PORC-BRACKETS` | Установка кронштейнов | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `WRK-PORC-DOWEL` | WRK-PORC-DOWEL | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `WRK-PORC-LAYOUT` | WRK-PORC-LAYOUT | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `WRK-PORC-MEMBRANE` | WRK-PORC-MEMBRANE | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `WRK-PORC-RAILS` | Монтаж направляющих | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `WRK-PORC-TRIMS` | WRK-PORC-TRIMS | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `WRK-PORC-WOOL` | WRK-PORC-WOOL | WT-FACADE-PORC, WT-FACADE-PORCELAIN-VENT |
| `WRK-PUTTY-PREP` | Подготовка под шпаклёвку | WT-PUTTY |
| `WRK-PUTTY-SAND` | Шлифовка поверхности | WT-PUTTY |
| `WRK-RF-HPL` | Укладка HPL покрытия | WT-RF-HPL |
| `WRK-ROAD-ASPHALT-GRADING` | Планировка и подготовка основания под дорогу | WT-EXT-ASPHALT-PRO |
| `WRK-ROAD-ASPHALT-SANDBASE` | Песчаная подготовка под основание дороги | WT-EXT-ASPHALT-PRO |
| `WRK-ROAD-MARKING-PAINT` | Нанесение дорожной разметки | WT-ROAD-MARKING |
| `WRK-ROOF-FRAME-LATH` | Монтаж обрешётки/контры | WT-ROOF-FRAME |
| `WRK-ROOF-FRAME-MAURLAT` | Монтаж мауэрлата | WT-ROOF-FRAME |
| `WRK-ROOF-MTL-LATH` | Монтаж обрешётки и контробрешётки (металл) | WT-ROOF-MTL |
| `WRK-ROOF-MTL-RAFTER` | Монтаж стропильной системы (металлочерепица) | WT-ROOF-MTL |
| `WRK-ROOF-MTL-SHEET` | Монтаж металлочерепицы | WT-ROOF-MTL |
| `WRK-ROOF-MTL-TRIM` | Монтаж доборных элементов (металлочерепица) | WT-ROOF-MTL |
| `WRK-ROOF-ROLLED-INSULATION` | Укладка утеплителя кровли | WT-ROOF-ROLLED |
| `WRK-ROOF-ROLLED-MASTIC` | Устройство мастичных слоёв/примыканий | WT-ROOF-ROLLED |
| `WRK-ROOF-ROLLED-PRIMER` | Грунтовка основания (праймер) | WT-ROOF-ROLLED |
| `WRK-ROOF-ROLLED-ROLL` | Наплавление рулонных материалов (2 слоя) | WT-ROOF-ROLLED |
| `WRK-ROOF-ROLLED-SCREED` | Устройство стяжки по кровле | WT-ROOF-ROLLED |
| `WRK-ROOF-SANDWICH-INSTALL` | Монтаж сэндвич-панелей | WT-ROOF-SANDWICH |
| `WRK-ROOF-SANDWICH-LATH` | Монтаж обрешётки и контробрешётки | WT-ROOF-SANDWICH |
| `WRK-ROOF-SANDWICH-RAFTER` | Монтаж стропильной системы | WT-ROOF-SANDWICH |
| `WRK-ROOF-SHINGLE-MASTIC` | Нанесение битумной мастики | WT-ROOF-SHINGLE |
| `WRK-ROOF-SHINGLE-OSB` | Монтаж листов ОСБ под ГЧ | WT-ROOF-SHINGLE |
| `WRK-ROOF-SHINGLE-RAFTER` | Монтаж стропильной системы (ГЧ) | WT-ROOF-SHINGLE |
| `WRK-ROOF-SLATE-LATH` | Монтаж обрешётки и контробрешётки (шифер) | WT-ROOF-SLATE |
| `WRK-ROOF-SLATE-RAFTER` | Монтаж стропильной системы (шифер) | WT-ROOF-SLATE |
| `WRK-ROOF-SLATE-SHEET` | Монтаж шиферных листов | WT-ROOF-SLATE |
| `WRK-ROOF-SLATE-WATER` | Монтаж гидроизоляции под шифер | WT-ROOF-SLATE |
| `WRK-SCREED-LAY` | Устройство цементно-песчаной стяжки | WT-SCREED |
| `WRK-SCREED-MARKERS` | Маяки/реперы | WT-SCREED |
| `WRK-SEAMS-CUT` | Нарезка/герметизация швов | WT-SCREED |
| `WRK-SRV-LIFT` | Подъём/доставка | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600, WT-CEIL-ARMSTRONG-600, WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `WRK-SRV-TOWER` | Аренда вышки/лесов | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600, WT-CEIL-ARMSTRONG-600, WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `WRK-SRV-WASTE` | Уборка/вывоз тары | WT-CEIL-CLIPIN-300x1200, WT-CEIL-CLIPIN-600, WT-CEIL-ARMSTRONG-600, WT-CEIL-GKL-2L, WT-CEIL-GKL-1L |
| `WRK-STEEL-CUT` | Резка металла | WT-STEEL-CUT |
| `WRK-STEEL-DRILL` | Сверление отверстий | WT-STEEL-DRILL |
| `WRK-STEEL-FENCE-INSTALL` | Монтаж ограждений (металл) | WT-STEEL-RAILING, WT-STEEL-FENCE-PROF, WT-STEEL-FENCE-MESH |
| `WRK-STEEL-STAIR-INSTALL` | Монтаж лестницы (металл) | WT-STEEL-STAIR |
| `WRK-STEEL-WELD` | Сварка металлоконструкций | WT-STEEL-TRUSS-HEAVY, WT-STEEL-GATE-SLIDE, WT-STEEL-TRUSS-LIGHT |
| `WRK-STEEL-WELD-MIG` | Сварка MIG/MAG | WT-STEEL-WELD-MIG-A4 |
| `WRK-TILE-CLEAN` | Уборка после плиточных работ | WT-TILE |
| `WRK-TILE-CUT-DRILL` | Подрезка и сверление плитки | WT-TILE |
| `WRK-TILE-DECOR` | Укладка декора/бордюров/панно | WT-TILE |
| `WRK-TILE-GROUTING` | Затирка швов плитки | WT-TILE |
| `WRK-TILE-LAYING` | Укладка плитки | WT-TILE |
| `WRK-TILE-PREP` | Подготовка основания под плитку | WT-TILE |
| `WRK-TILE-PRIMING` | Грунтование основания под плитку | WT-TILE |
| `WRK-TILE-WATERPROOF` | Устройство гидроизоляции под плитку | WT-TILE |
| `WRK-WELD-FRAME` | Резка/сварка каркаса | WT-STEEL-GATE-SWING, WT-STEEL-STAIR, WT-STEEL-FENCE-PROF, WT-STEEL-FENCE-MESH |
| `WRK-WINDOW-PVC-INSTALL` | Монтаж окон ПВХ, м² | WT-WINDOW-PVC |
| `WRK-WP-APPLY` | Нанесение гидроизоляции | WT-CONC, WT-WP |
| `WRK-WP-CUT` | Нарезка полотен | WT-WALLPAPER |
| `WRK-WP-CUT-OPENINGS` | Прорезка вокруг розеток/углы | WT-WALLPAPER |
| `WRK-WP-PASTE` | Оклейка | WT-WALLPAPER |
| `WRK-WP-PREP` | Подготовка (шлиф+грунт) | WT-WALLPAPER |

## 2. Разночтения в названиях (138)

| Код (rik_code) | Название в Смете (Правилах) | Название в Каталоге |
| --- | --- | --- |
| `MAT-BLOCK-AAC-600X200X300` | Газоблок 600×200×300 | Mat Газоблок Aac 600x200x300 |
| `MAT-CANOPY-PAINT` | Краска по металлу (навес) | Metal paint for canopy |
| `MAT-CANOPY-PIPE-40X20` | Труба проф. 40×20 (обрешётка/раскосы) | Steel tube 40x20 for canopy battens |
| `MAT-CANOPY-SCREW-ROOF` | Саморез кровельный (навес) | Roofing screw for canopy |
| `MAT-CARPET-GLUE` | Клей для коврового покрытия по фальшполу | Carpet glue |
| `MAT-CARPET-TILE` | Ковровая плитка для фальшпола | Carpet tile |
| `MAT-CEIL-GRID-T24-CROSS-1200` | Т24 поперечина 1200 | T24 cross 1200 |
| `MAT-CONC-REBAR` | Арматура | Rebar |
| `MAT-CONC-WIRE` | Проволока вязальная | Binding wire |
| `MAT-CONDUIT-PVC-20-25` | Гофра ПВХ 20/25 | PVC conduit 20/25 |
| `MAT-CONSUMABLES-CONC` | Расходники (комплект) | Consumables kit |
| `MAT-DISC-METAL` | Диск для болгарки по металлу | Metal cutting disc |
| `MAT-DOWEL-FACADE-10X120` | Дюбель фасадный 10×120 мм | Facade dowel 10x120 mm |
| `MAT-DOWEL-UD` | Дюбель/крепёж для профиля (ПН/ПС) | Dowels |
| `MAT-EARTH-HAUL` | Вывоз лишнего грунта, м³ | Вывоз лишнего грунта на свалку, м³ |
| `MAT-ELEC-CONSUM` | Клеммы/изолента/термоусадка | Electric consumables |
| `MAT-FACADE-CLINKER-TILE` | Плитка клинкерная фасадная | Clinker facade tile |
| `MAT-FACADE-CLINKER-TRIM` | Добор/угол клинкерный | Clinker trim / corner |
| `MAT-FACADE-INSULATION` | Утеплитель фасадный | Facade insulation |
| `MAT-FACADE-VENT-PROFILE-T-3M` | Профиль алюминиевый Т-образный 3 м | Aluminium T-profile 3 m |
| `MAT-FAST-ANCHOR-6X40` | Дюбель/быстрый монтаж 6×40 | Nail anchor 6×40 |
| `MAT-FAST-RIVET-POP` | Заклёпка вытяжная (алюминий) | Pop rivet aluminum |
| `MAT-GKL-CEIL-HANGER` | Подвесы прямые/анкера для потолка, шт | Подвесы для потолка ГКЛ |
| `MAT-GKL-PRIMER` | Грунт под окраску | Грунтовка глубокого проникновения по ГКЛ |
| `MAT-GKL-WALL-ANGLE` | Уголки перфорированные (наружные углы), м | Перфоуголок для внешних углов |
| `MAT-GKL-WALL-FASTENER-MISC` | Мелкий крепёж (комплект) | Misc fasteners set |
| `MAT-GKL-WALL-SANDPAPER` | Шкурка/абразив для шлифовки | Sandpaper |
| `MAT-GKL-WALL-SEALANT` | Герметик/акрил (примыкания) | Acrylic sealant |
| `MAT-GLOVES` | Перчатки | Gloves |
| `MAT-GRAVEL` | Щебень | Gravel |
| `MAT-GRILIATO-CARRIER` | Несущий профиль грильято | Griliato carrier |
| `MAT-GRILIATO-PYR-HANGER` | Подвес для грильято (пирамидальный) | Griliato pyramid hanger |
| `MAT-HINGE-100` | Петли дверные ⌀100–120 | Door hinges |
| `MAT-KNIFE-BLADE` | Лезвия/нож для ГКЛ (износ) | Knife blades |
| `MAT-MASK` | Маска/респиратор | Respirator mask |
| `MAT-MESH-50X50` | Сетка 50×50 | Mat Сетка 50x50 |
| `MAT-MINWOOL-50` | Минвата 50 мм | Mineral wool 50 |
| `MAT-NUT-WASHER-M8` | Гайки+шайбы М8 | Nut+washer M8 |
| `MAT-OVR-FRAME-60X40` | Профиль рамы ворот 60×40 (сталь) | Gate frame profile 60×40 mm |
| `MAT-OVR-PAINT` | Краска по металлу (рама ворот) | Metal finish paint (gate frame) |
| `MAT-OVR-PANEL-40` | Панели секционные 40 мм (ворота) | Sectional panels 40 mm (gate) |
| `MAT-OVR-PRIMER` | Грунтовка по металлу (рама ворот) | Metal primer (gate frame) |
| `MAT-OVR-STIFF-40X20` | Усилители/рёбра жёсткости 40×20 | Internal stiffeners 40×20 mm |
| `MAT-PLASTER-MIX` | Смесь штукатурная | Plaster mix |
| `MAT-PLINTH-CLIP` | Клипсы/саморезы (крепёж) | Clips/screws |
| `MAT-PLMB-SHOWER-KIT` | Комплект: душ/смеситель (материалы) | Shower materials kit |
| `MAT-PLMB-WC-KIT` | Комплект: унитаз (материалы) | WC materials kit |
| `MAT-PLMB-WM-KIT` | Комплект: стиралка/ПММ (подключение) | WM/DW connect kit |
| `MAT-PLUMB-PLUGS` | Заглушки сантехнические | Plumbing plugs |
| `MAT-PUTTY-JOINT` | Шпаклёвка для швов ГКЛ | Joint compound |
| `MAT-PVC-SEWER-50` | Канализация ПВХ 50 мм | PVC 50 |
| `MAT-RACK-LENS-CARRIER` | Стрингер/несущая для линз. рейки | Lens rack carrier |
| `MAT-RACK-LENS-HANGER` | Подвес для линз. реечного | Lens rack hanger |
| `MAT-RACK-LENS-WALL-ANGLE` | Уголок пристенный (лининз.) | Lens rack wall angle |
| `MAT-REBAR-STIRRUP-8` | Хомут Ø8 (арматура) | Stirrup Ø8 rebar |
| `MAT-RF-PAD` | Прокладка резиновая под опору фальшпола | Rubber pad for pedestal |
| `MAT-RF-PEDESTAL-HEAVY` | Опора усиленная фальшпола | Adjustable pedestal (HEAVY) |
| `MAT-SCREW-GKL` | Саморезы по ГКЛ | Drywall screws |
| `MAT-SCREW-METAL` | Саморезы по металлу | Metal screws |
| `MAT-SEALANT-NEUTRAL` | Герметик нейтральный | Neutral sealant |
| `MAT-STRETCH-PLATFORM` | Площадка под светильник | Lamp platform |
| `MAT-TENT-COVER` | Тент/укрытие временное | Temporary tent/cover |
| `MAT-THREADED-ROD-M8` | Шпилька резьбовая М8 | Threaded rod M8 |
| `MAT-TILE-CERAMIC` | Плитка керамическая | Плитка керамическая / керамогранит |
| `MAT-TILE-GLUE` | Клей для керамогранита по фальшполу | Клей плиточный (цементный C1/C2) |
| `MAT-TOOLS-SET` | Инструмент (комплект, износ) | Tools set |
| `MAT-VIBRO-ANCHOR-SET` | Вибровставки/анкерный крепёж | Vibro/anchor set |
| `MAT-WATER-TECH` | Вода техническая | Technical water |
| `MAT-WP-GLUE-FLIZ` | Клей для флизелина | Glue (non-woven) |
| `MAT-WP-MEMBRANE` | Мембрана/геотекстиль (защита) | Waterproof membrane/geotextile |
| `MAT-WP-PRIMER` | Праймер (гидроизоляция) | Waterproof primer |
| `SRV-CONC-DELIVERY` | Доставка бетона (миксер) | Concrete delivery |
| `SRV-DELIVERY` | Доставка | Delivery |
| `SRV-EARTH-HAUL` | Вывоз грунта (самосвал) | Soil haul |
| `TOOL-ADJUSTABLE-KEY` | Инструмент: разводной ключ | Tool: adjustable wrench |
| `TOOL-CHISEL` | Инструмент: пика/лопатка/стамеска | Tool: chisel set |
| `TOOL-CROWBAR` | Инструмент: лом/гвоздодёр | Tool: crowbar |
| `TOOL-JACKHAMMER` | Инструмент: отбойный молоток | Tool: jackhammer |
| `TOOL-SCREWDRIVER` | Инструмент: шуруповёрт | Tool: screwdriver |
| `TOOL-VOLTAGE-TESTER` | Инструмент: индикатор напряжения | Tool: voltage tester |
| `WRK-CANOPY-STEEL-PAINT` | Покраска металлоконструкций навеса | Painting canopy steel frame |
| `WRK-CANOPY-STEEL-WELD` | Сварка каркаса навеса | Welding canopy steel frame |
| `WRK-CEIL-GRID-INSTALL` | Монтаж потолка кассетного (армстронг) | Install grid (Armstrong) ceiling |
| `WRK-CEIL-GRILIATO-PYR-INSTALL` | Монтаж потолка грильято пирамидального | Install griliato pyramid ceiling |
| `WRK-CEIL-RACK-LENS-INSTALL` | Монтаж потолка реечного линзованного | Install lens rack ceiling |
| `WRK-CONC-BASE-PREP` | Подготовка основания (планировка/уплотнение) | Base preparation |
| `WRK-CONC-CLEANUP` | Уборка/демонтаж (комплект) | Cleanup |
| `WRK-CONC-REBAR` | Вязка арматуры | Rebar tying |
| `WRK-CONC-SUBBASE` | Подушка (укладка+трамбовка) | Subbase placing+compaction |
| `WRK-CONC-SUBCONC` | Подбетонка | Lean concrete / blinding |
| `WRK-CONC-VIBRATE` | Вибрирование/уплотнение | Vibration |
| `WRK-CONCRETE-CARE` | Уход за бетоном (работы) | Concrete curing (works) |
| `WRK-CONCRETE-VIBRATE` | Вибрирование бетона (работы) | Concrete vibration (works) |
| `WRK-DEM-DOOR` | Демонтаж дверей (работа) | Demolition: door |
| `WRK-DEM-GKL` | Демонтаж ГКЛ (работа) | Demolition: drywall |
| `WRK-DEM-INSUL` | Демонтаж утеплителя (работа) | Demolition: insulation |
| `WRK-DEM-OUTLET` | Демонтаж розеток/выключателей (работа) | Demolition: outlet |
| `WRK-DEM-PLUMB-FIX` | Демонтаж сантехточек (работа) | Demolition: plumbing |
| `WRK-DEM-RADIATOR` | Демонтаж радиаторов (работа) | Demolition: radiator |
| `WRK-DEM-ROOF` | Демонтаж кровли (работа) | Demolition: roof |
| `WRK-DEM-SCREED` | Демонтаж стяжки (работа) | Demolition: screed |
| `WRK-DEM-TILE-WALL` | Демонтаж плитки стены (работа) | Demolition: tile wall |
| `WRK-DEMO` | Демонтаж общий (работа) | Demolition: general |
| `WRK-DEMO-BOX` | Демонтаж подрозетников | Remove socket box |
| `WRK-DEMO-CARRY` | Сбор+вынос/погрузка мусора | Carry out & loading |
| `WRK-DEMO-DRAIN` | Перекрытие/слив воды (локально) | Drain / shutoff |
| `WRK-DEMO-EBB` | Демонтаж отлива (наружный) | Remove ebb/tide |
| `WRK-DEMO-HEAVY` | Тяжёлый демонтаж (усиленный) | Heavy demolition |
| `WRK-DEMO-SILL` | Демонтаж подоконника | Remove window sill |
| `WRK-DOOR-ADJUST-FOAM` | Пена/регулировка, уборка | Adjust/foam |
| `WRK-EARTH-EXCAVATE` | Разработка грунта (мех.) | Excavation (machine) |
| `WRK-ELEC-PANEL-ASSEMBLY` | Электрика: щит — сборка и монтаж (комплект) | Elec: panel assembly & install (set) |
| `WRK-ELEC-TESTING` | Электрика: прозвон, маркировка, испытания (комплект) | Elec: testing/labeling (set) |
| `WRK-FACADE-CLINKER-VF-INSTALL` | Монтаж фасада навесного из клинкерной плитки | Ventilated clinker facade install |
| `WRK-FACADE-FC-RIVET-INST` | Монтаж фиброцементных плит на заклёпках | Fiber-cement board install (rivet system) |
| `WRK-GKL-FRAME` | Монтаж каркаса перегородки ГКЛ | GKL frame install |
| `WRK-GKL-JOINTS` | Заделка швов ГКЛ | GKL joints |
| `WRK-GKL-PRIME` | Грунтование под финиш | Priming |
| `WRK-GKL-WALL-FINISH` | Финишная шпаклёвка ГКЛ под отделку | Финишная шпаклёвка перегородки |
| `WRK-GKL-WALL-JOINTS` | Заделка швов и мест крепления ГКЛ | Заделка швов и мест крепления ГКЛ (стены) |
| `WRK-GKL-WALL-PRIMING` | Грунтование поверхности ГКЛ | Грунтование перегородки из ГКЛ |
| `WRK-HVAC-BLOCKS-INSTALL` | Монтаж внутр./наруж. блоков | Blocks install |
| `WRK-HVAC-DUCT-GRILLES` | Монтаж воздуховодов/решёток | Ducts & grilles install |
| `WRK-HVAC-FAN-CONNECT` | Подключение вентиляторов | Fan connect |
| `WRK-HVAC-LINES-DRAIN` | Прокладка трасс/дренажа | Lines & drain laying |
| `WRK-LAMINATE-LAY` | Укладка ламината | Wrk Ламинат Lay |
| `WRK-MASONRY-BRICK` | Кладка кирпича | Wrk Masonry Brick |
| `WRK-OVR-ADJUST` | Регулировка и пусконаладка подъемных ворот | Overhead gate adjustment & commissioning |
| `WRK-OVR-AUTO-INSTALL` | Монтаж автоматики подъемных ворот | Overhead gate automation installation |
| `WRK-OVR-FRAME-FAB` | Изготовление рамы подъемных ворот | Overhead gate frame fabrication |
| `WRK-OVR-PANEL-INSTALL` | Монтаж секционных панелей ворот | Overhead gate panel installation |
| `WRK-OVR-TRACK-INSTALL` | Монтаж направляющих подъемных ворот | Overhead gate track installation |
| `WRK-PLMB-PIPE-INSTALL` | Монтаж труб/разводки | Pipe install |
| `WRK-PLMB-SINK-INSTALL` | Установка раковины | Sink install |
| `WRK-PLMB-TESTING` | Сантехника: испытание/опрессовка (комплект) | Plumb testing (set) |
| `WRK-PLMB-WC-INSTALL` | Установка унитаза | WC install |
| `WRK-PLMB-WM-INSTALL` | Подключение стиралки/ПММ | WM/DW connect |
| `WRK-WP-PROTECT` | Защита гидроизоляции | Waterproofing protection |
