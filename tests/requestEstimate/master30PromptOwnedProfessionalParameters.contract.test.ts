import {
  buildCanonicalBaselinePlan,
  extractPromptOwnedProfessionalParameters,
} from
  "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from
  "../../src/lib/estimate/backendPlatform/contracts";
import {
  FILTRATION_STATION_CATALOG_ID,
  FILTRATION_STATION_SHORT_INPUT,
} from "../../src/lib/estimate/v4/filtrationStationR1";
import {
  CHLORINATION_STATION_CATALOG_ID,
  CHLORINATION_STATION_SHORT_INPUT,
} from "../../src/lib/estimate/v4/chlorinationStationR1";
import {
  FLUSHING_DISINFECTION_CATALOG_ID,
  FLUSHING_DISINFECTION_SHORT_INPUT,
} from "../../src/lib/estimate/v4/flushingDisinfectionR1";

function schema(parameterIds: readonly string[]): CanonicalEstimateCatalogItem["parameterSchema"] {
  return parameterIds.map((parameterId, ordinal) => ({
    parameterId,
    ordinal,
    valueType: "text",
    unitId: null,
    titleRu: parameterId,
    required: false,
    defaultValue: null,
    constraints: {},
    semanticParameterKey: parameterId,
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_DOCUMENTATION",
    normativeLinks: [],
    formulaConsumers: [],
    resourceBranchConsumers: [],
    validationRules: [],
    provenance: {},
  })) as CanonicalEstimateCatalogItem["parameterSchema"];
}

describe("MASTER-30 shared prompt-owned professional parameter ingress", () => {
  test("adapts the explicit drainage route length to the selected successor schema", () => {
    const parameterSchema = schema(["length_m", "load_class"]).map((parameter, ordinal) => ({
      ...parameter,
      ordinal,
      valueType: ordinal === 0 ? "decimal" as const : "text" as const,
      unitId: ordinal === 0 ? "m" : null,
      formulaConsumers: ordinal === 0 ? ["drainage_channel_install_length_v1"] : [],
    }));
    const catalog = {
      catalogId: "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area",
      workKey: "surface_drainage_channel",
      parameterSchema,
    } as unknown as CanonicalEstimateCatalogItem;

    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "Монтаж водоотводного лотка с решёткой, длина 80 м, класс нагрузки D400",
    })).toMatchObject({
      parameters: { length_m: "80", load_class: "D400" },
      primaryMeasureParameterId: "length_m",
    });
  });

  test("extracts the explicitly stated total installed steel mass", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema(["element_count_piece", "total_installed_mass_t"]),
      "Монтаж и выверка стальных колонн и балок, количество 30 шт., общая масса 30 т",
    )).toEqual({ element_count_piece: "30", total_installed_mass_t: "30" });
  });

  test("extracts named pile geometry without inventing absent concrete or reinforcement grades", () => {
    const result = extractPromptOwnedProfessionalParameters(
      schema([
        "pile_count", "pile_diameter_mm", "pile_length_m", "concrete_class",
        "watertightness", "frost_resistance", "mobility", "reinforcement_class",
      ]),
      "Устройство буронабивных железобетонных свай, количество 12 шт., диаметр 600 мм, длина 12 м",
    );

    expect(result).toEqual({ pile_count: "12", pile_diameter_mm: "600", pile_length_m: "12" });
  });

  test("preserves explicit concrete specification and pump method over a visible baseline", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema(["concrete_class", "watertightness", "frost_resistance", "mobility", "placement_method"]),
      "Бетонирование 24 м³, бетон B25 W8 F150 П4, подача бетононасосом",
    )).toEqual({
      concrete_class: "B25",
      watertightness: "W8",
      frost_resistance: "F150",
      mobility: "P4",
      placement_method: "pump",
    });
  });

  test("extracts pipe identity, route geometry and filter facts only when named", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "length_m", "pipe_material_grade", "ring_stiffness_class", "pipe_outside_diameter_mm",
        "slope_m_per_m", "geotextile_areal_density_g_m2", "aggregate_fraction", "perforation_type",
      ]),
      "Укладка перфорированной трубы ПВХ SN8 Ø160 мм, длина 100 м, уклон 0,008, геотекстиль 300 г/м², щебень 20–40 мм",
    )).toMatchObject({
      pipe_material_grade: "PVC-U",
      ring_stiffness_class: "SN8",
      pipe_outside_diameter_mm: "160",
      slope_m_per_m: "0.008",
      geotextile_areal_density_g_m2: "300",
      aggregate_fraction: "20–40 мм",
      perforation_type: "перфорированная",
    });
  });

  test("extracts visible radiator, sprinkler, cable and luminaire specifications", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema(["radiator_count", "radiator_type", "radiator_height_mm", "radiator_length_mm", "connection_type"]),
      "Монтаж радиаторов тип 22, 500×1000 мм, количество 8 шт., нижнее подключение",
    )).toMatchObject({
      radiator_count: "8",
      radiator_type: "22",
      radiator_height_mm: "500",
      radiator_length_mm: "1000",
      connection_type: "нижнее подключение",
    });
    expect(extractPromptOwnedProfessionalParameters(
      schema(["sprinkler_count", "k_factor", "temperature_rating_c", "thread_size_inch"]),
      "Спринклеры K80, 68 °C, резьба 1/2 дюйма, количество 40 шт.",
    )).toMatchObject({ sprinkler_count: "40", k_factor: "80", temperature_rating_c: "68", thread_size_inch: "1/2" });
    expect(extractPromptOwnedProfessionalParameters(
      schema(["core_count", "conductor_area_mm2", "cable_mark"]),
      "Кабель ВВГнг(А)-LS 5×6 мм²",
    )).toMatchObject({ core_count: "5", conductor_area_mm2: "6", cable_mark: "ВВГнг(А)-LS" });
    expect(extractPromptOwnedProfessionalParameters(
      schema(["luminaire_count", "rated_power", "ingress_protection", "mounting_type"]),
      "Светильники 36 Вт, IP40, количество 30 шт., накладной монтаж",
    )).toMatchObject({ luminaire_count: "30", rated_power: "36_W", ingress_protection: "IP40", mounting_type: "SURFACE" });
  });

  test("extracts explicit plant and data-center quantities without adding project-only configuration", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema(["pump_count", "design_flow_m3_h", "design_head_m", "pump_configuration"]),
      "Насосные агрегаты 45 м³/ч, напор 55 м, количество 2 шт.",
    )).toEqual({ pump_count: "2", design_flow_m3_h: "45", design_head_m: "55" });
    expect(extractPromptOwnedProfessionalParameters(
      schema(["boiler_count", "thermal_power_kw", "fuel_type", "burner_configuration"]),
      "Водогрейный котёл 500 кВт на природном газе, количество 1 шт.",
    )).toEqual({ boiler_count: "1", thermal_power_kw: "500", fuel_type: "NATURAL_GAS" });
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "rack_count", "rack_height_u", "rack_width_designation", "rack_depth_mm",
        "rack_designation",
      ]),
      "Смонтировать и заземлить серверные шкафы 42U, модель шкафа RACK-42U-600X1200, ширина 600 мм, глубина 1200 мм, количество 6 шт.",
    )).toEqual({
      rack_count: "6",
      rack_height_u: "42",
      rack_width_designation: "600 мм",
      rack_depth_mm: "1200",
      rack_designation: "RACK-42U-600X1200",
    });
  });

  test("extracts explicit BMS identity without area-derived resource assumptions", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "bms_system_count", "bms_controller_count", "bms_controller_designation",
        "bms_physical_point_count", "bms_operator_workstation_count",
        "bms_operator_workstation_designation", "bms_integration_protocol",
      ]),
      "Монтаж 1 системы BMS: 2 контроллера модели DDC-24IO, 120 физических точек, 1 АРМ оператора модели WS-BMS-01, протокол BACnet/IP.",
    )).toEqual({
      bms_system_count: "1",
      bms_controller_count: "2",
      bms_controller_designation: "DDC-24IO",
      bms_physical_point_count: "120",
      bms_operator_workstation_count: "1",
      bms_operator_workstation_designation: "WS-BMS-01",
      bms_integration_protocol: "BACnet/IP",
    });
  });

  test("extracts explicit CCTV identity without inventing network or archive resources", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "cctv_system_count", "cctv_camera_count", "cctv_camera_designation",
        "cctv_camera_type", "cctv_nvr_count", "cctv_nvr_designation",
        "cctv_archive_retention_days",
      ]),
      "Монтаж 1 системы CCTV: 16 PoE IP-камер модели CAM-IP-4MP-IR 4 Мп с ИК, 1 NVR модели NVR-32CH, архив 30 суток.",
    )).toEqual({
      cctv_system_count: "1",
      cctv_camera_count: "16",
      cctv_camera_designation: "CAM-IP-4MP-IR",
      cctv_camera_type: "IP_POE_4MP_IR",
      cctv_nvr_count: "1",
      cctv_nvr_designation: "NVR-32CH",
      cctv_archive_retention_days: "30",
    });
  });

  test("extracts explicit access-control door and device identity without area assumptions", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "acs_system_count", "acs_controlled_door_count", "acs_controller_count",
        "acs_controller_designation", "acs_reader_count", "acs_reader_designation",
        "acs_lock_count", "acs_lock_designation", "acs_exit_device_count",
        "acs_exit_device_designation",
      ]),
      "Монтаж 1 системы СКУД: 8 контролируемых дверей, 2 контроллера модели ACS-CTRL-4D, 16 считывателей модели READER-MF, 8 электромагнитных замков модели MAGLOCK-300, 8 кнопок выхода модели EXIT-NO.",
    )).toEqual({
      acs_system_count: "1",
      acs_controlled_door_count: "8",
      acs_controller_count: "2",
      acs_controller_designation: "ACS-CTRL-4D",
      acs_reader_count: "16",
      acs_reader_designation: "READER-MF",
      acs_lock_count: "8",
      acs_lock_designation: "MAGLOCK-300",
      acs_exit_device_count: "8",
      acs_exit_device_designation: "EXIT-NO",
    });
  });

  test("extracts explicit UPS identity without inventing batteries or protection", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "ups_system_count", "ups_unit_count", "ups_unit_designation", "ups_topology",
        "ups_rated_power_kva", "ups_autonomy_min",
      ]),
      "Монтаж 1 системы UPS: 2 установки модели UPS-20KVA-3P, online double-conversion, 20 кВА каждая, автономия 30 минут.",
    )).toEqual({
      ups_system_count: "1",
      ups_unit_count: "2",
      ups_unit_designation: "UPS-20KVA-3P",
      ups_topology: "ONLINE_DOUBLE_CONVERSION",
      ups_rated_power_kva: "20",
      ups_autonomy_min: "30",
    });
  });

  test("extracts explicit SCS outlet and patching identity without area assumptions", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "lvs_system_count", "lvs_information_outlet_count", "lvs_outlet_designation",
        "lvs_copper_cable_category", "lvs_patch_panel_count",
        "lvs_patch_panel_designation",
      ]),
      "Монтаж 1 системы СКС: 48 информационных розеток модели JACK-RJ45-CAT6, категория Cat6 LSZH, 2 патч-панели модели PP-24-CAT6.",
    )).toEqual({
      lvs_system_count: "1",
      lvs_information_outlet_count: "48",
      lvs_outlet_designation: "JACK-RJ45-CAT6",
      lvs_copper_cable_category: "CAT6_LSZH",
      lvs_patch_panel_count: "2",
      lvs_patch_panel_designation: "PP-24-CAT6",
    });
  });

  test("extracts explicit gravity-sewer collector identity without generic coefficients", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "gsc_collector_count", "gsc_route_length_m", "gsc_pipe_material_grade",
        "gsc_ring_stiffness_class", "gsc_pipe_outside_diameter_mm",
        "gsc_slope_m_per_m", "gsc_pipe_designation",
      ]),
      "Строительство 1 самотечного канализационного коллектора: трасса 600 м, труба PVC-U SN8 OD 200 мм, уклон 0,007, марка PVC-U-SN8-OD200.",
    )).toEqual({
      gsc_collector_count: "1",
      gsc_route_length_m: "600",
      gsc_pipe_material_grade: "PVC-U",
      gsc_ring_stiffness_class: "SN8",
      gsc_pipe_outside_diameter_mm: "200",
      gsc_slope_m_per_m: "0.007",
      gsc_pipe_designation: "PVC-U-SN8-OD200",
    });
  });

  test("extracts explicit settlement water-network identity without spacing assumptions", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "swn_network_count", "swn_route_length_m", "swn_pipe_material",
        "swn_pipe_grade", "swn_sdr_class", "swn_pipe_outside_diameter_mm",
        "swn_pressure_class", "swn_pipe_designation",
      ]),
      "Строительство 1 поселковой водопроводной сети: трасса 1200 м, труба HDPE PE100-RC SDR17 OD 160 мм PN10, марка PE100-RC-SDR17-OD160-PN10.",
    )).toEqual({
      swn_network_count: "1",
      swn_route_length_m: "1200",
      swn_pipe_material: "HDPE",
      swn_pipe_grade: "PE100-RC",
      swn_sdr_class: "SDR17",
      swn_pipe_outside_diameter_mm: "160",
      swn_pressure_class: "PN10",
      swn_pipe_designation: "PE100-RC-SDR17-OD160-PN10",
    });
  });

  test("extracts only the ordinary distribution-main facts and leaves derived resources to its calculator", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "dpm_main_count", "dpm_route_length_m", "dpm_pipe_material",
        "dpm_pipe_grade", "dpm_sdr_class", "dpm_pipe_outside_diameter_mm",
        "dpm_pressure_class", "dpm_pipe_designation",
        "dpm_trench_excavation_volume_m3", "dpm_earthworks_labor_h",
      ]),
      "Строительство 1 распределительной магистрали: трасса 1800 м, труба HDPE PE100-RC SDR17 OD 225 мм PN10, марка PE100-RC-SDR17-OD225-PN10.",
    )).toEqual({
      dpm_main_count: "1",
      dpm_route_length_m: "1800",
      dpm_pipe_material: "HDPE",
      dpm_pipe_grade: "PE100-RC",
      dpm_sdr_class: "SDR17",
      dpm_pipe_outside_diameter_mm: "225",
      dpm_pressure_class: "PN10",
      dpm_pipe_designation: "PE100-RC-SDR17-OD225-PN10",
    });
  });

  test("extracts only primary house-connection facts and leaves all final quantities to its calculator", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "hcw_connection_count", "hcw_service_route_length_m", "hcw_pipe_material",
        "hcw_pipe_grade", "hcw_sdr_class", "hcw_pipe_outside_diameter_mm",
        "hcw_pressure_class", "hcw_pipe_designation", "hcw_existing_main_material",
        "hcw_existing_main_outside_diameter_mm", "hcw_trench_volume_m3",
        "hcw_total_labor_h", "hcw_delivery_trip_count",
      ]),
      "Устройство 1 ввода воды в дом: трасса 28 м, сервисная труба HDPE PE100-RC SDR11 OD 32 мм PN16, марка PE100-RC-SDR11-OD32-PN16; существующая магистраль HDPE-PE100-RC OD 225 мм.",
    )).toEqual({
      hcw_connection_count: "1",
      hcw_service_route_length_m: "28",
      hcw_pipe_material: "HDPE",
      hcw_pipe_grade: "PE100-RC",
      hcw_sdr_class: "SDR11",
      hcw_pipe_outside_diameter_mm: "32",
      hcw_pressure_class: "PN16",
      hcw_pipe_designation: "PE100-RC-SDR11-OD32-PN16",
      hcw_existing_main_material: "HDPE-PE100-RC",
      hcw_existing_main_outside_diameter_mm: "225",
    });
  });

  test("extracts explicit pressure-sewer identity without generic route rates", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "psp_pipeline_count", "psp_route_length_m", "psp_pipe_material",
        "psp_pipe_grade", "psp_sdr_class", "psp_pipe_outside_diameter_mm",
        "psp_pressure_class", "psp_pipe_designation",
      ]),
      "Строительство 1 напорного канализационного трубопровода: трасса 800 м, труба HDPE PE100-RC SDR17 OD 110 мм PN10, марка PE100-RC-SDR17-OD110-PN10.",
    )).toEqual({
      psp_pipeline_count: "1",
      psp_route_length_m: "800",
      psp_pipe_material: "HDPE",
      psp_pipe_grade: "PE100-RC",
      psp_sdr_class: "SDR17",
      psp_pipe_outside_diameter_mm: "110",
      psp_pressure_class: "PN10",
      psp_pipe_designation: "PE100-RC-SDR17-OD110-PN10",
    });
  });

  test("extracts explicit stormwater-drainage identity without generic spacing assumptions", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "swd_network_count", "swd_route_length_m", "swd_pipe_material",
        "swd_ring_stiffness_class", "swd_pipe_outside_diameter_mm",
        "swd_slope_m_per_m", "swd_design_flow_lps", "swd_pipe_designation",
      ]),
      "Строительство 1 ливневой сети: трасса 900 м, труба PVC-U SN8 OD 315 мм, уклон 0,005, расчётный расход 80 л/с, марка PVC-U-SN8-OD315.",
    )).toEqual({
      swd_network_count: "1",
      swd_route_length_m: "900",
      swd_pipe_material: "PVC-U",
      swd_ring_stiffness_class: "SN8",
      swd_pipe_outside_diameter_mm: "315",
      swd_slope_m_per_m: "0.005",
      swd_design_flow_lps: "80",
      swd_pipe_designation: "PVC-U-SN8-OD315",
    });
  });

  test("extracts explicit open drainage-channel identity without stormwater-template scope", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "dch_channel_count", "dch_route_length_m", "dch_channel_type",
        "dch_channel_material", "dch_internal_width_mm", "dch_internal_depth_mm",
        "dch_slope_m_per_m", "dch_design_flow_lps", "dch_channel_designation",
      ]),
      "Строительство 1 открытого водоотводного канала: трасса 450 м, сборный U-образный канал из железобетона C35/45, внутреннее сечение 600x600 мм, уклон 0,003, расчётный расход 250 л/с, марка U600x600-C35/45.",
    )).toEqual({
      dch_channel_count: "1",
      dch_route_length_m: "450",
      dch_channel_type: "PRECAST_U_CHANNEL",
      dch_channel_material: "RC_C35_45",
      dch_internal_width_mm: "600",
      dch_internal_depth_mm: "600",
      dch_slope_m_per_m: "0.003",
      dch_design_flow_lps: "250",
      dch_channel_designation: "U600x600-C35/45",
    });
  });

  test("extracts explicit rainwater-inlet assembly without inventing network scope", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "rwi_inlet_count", "rwi_body_designation", "rwi_body_material",
        "rwi_grating_material", "rwi_grating_load_class", "rwi_outlet_diameter_mm",
        "rwi_assembly_designation",
      ]),
      "Монтаж 28 дождеприёмников: корпус DB2 из сборного железобетона, решётка чугунная D400, выпуск DN 200 мм, марка DB2-RC-D400-DN200.",
    )).toEqual({
      rwi_inlet_count: "28",
      rwi_body_designation: "DB2",
      rwi_body_material: "PRECAST_RC",
      rwi_grating_material: "DUCTILE_IRON",
      rwi_grating_load_class: "D400",
      rwi_outlet_diameter_mm: "200",
      rwi_assembly_designation: "DB2-RC-D400-DN200",
    });
  });

  test("extracts an explicit inspection-chamber assembly without inventing network scope", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "ich_chamber_count", "ich_chamber_type", "ich_chamber_material",
        "ich_internal_diameter_mm", "ich_depth_m", "ich_cover_load_class",
        "ich_connector_diameter_mm", "ich_chamber_designation",
      ]),
      "Монтаж 12 смотровых камер: сборные железобетонные круглые камеры, внутренний диаметр 1500 мм, глубина 2,5 м, люк D400, присоединения DN 200 мм, марка KS-15-RC-H2.5-D400-DN200.",
    )).toEqual({
      ich_chamber_count: "12",
      ich_chamber_type: "PRECAST_RC_CIRCULAR",
      ich_chamber_material: "PRECAST_RC",
      ich_internal_diameter_mm: "1500",
      ich_depth_m: "2.5",
      ich_cover_load_class: "D400",
      ich_connector_diameter_mm: "200",
      ich_chamber_designation: "KS-15-RC-H2.5-D400-DN200",
    });
  });

  test("extracts a cast-in-place RC manhole without inventing network scope", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "mnh_manhole_count", "mnh_manhole_type", "mnh_manhole_material",
        "mnh_internal_length_mm", "mnh_internal_width_mm", "mnh_depth_m",
        "mnh_concrete_class", "mnh_cover_frame_designation", "mnh_cover_load_class",
        "mnh_connector_diameter_mm", "mnh_manhole_designation",
      ]),
      "Строительство 6 канализационных колодцев: монолитные железобетонные прямоугольные колодцы, внутренний размер 1800×1200 мм, глубина 3,0 м, бетон C30/37, люк TM-D400 класса D400, присоединения DN 300 мм, марка MH-RC-1800x1200-H3.0-C30/37-D400-DN300.",
    )).toEqual({
      mnh_manhole_count: "6",
      mnh_manhole_type: "CAST_IN_PLACE_RC_RECTANGULAR",
      mnh_manhole_material: "CAST_IN_PLACE_RC",
      mnh_internal_length_mm: "1800",
      mnh_internal_width_mm: "1200",
      mnh_depth_m: "3.0",
      mnh_concrete_class: "C30/37",
      mnh_cover_frame_designation: "TM-D400",
      mnh_cover_load_class: "D400",
      mnh_connector_diameter_mm: "300",
      mnh_manhole_designation: "MH-RC-1800x1200-H3.0-C30/37-D400-DN300",
    });
  });

  test("extracts a pipe support-zone scope without inventing adjacent pipeline work", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "pbb_route_length_m", "pbb_pipe_outside_diameter_mm", "pbb_assembly_designation",
        "pbb_geotextile_designation", "pbb_bedding_material", "pbb_bedding_thickness_mm",
        "pbb_surround_cover_above_pipe_mm", "pbb_backfill_material",
        "pbb_compaction_coefficient", "pbb_bedding_surround_installed_volume_m3",
      ]),
      "Устройство основания и обратной засыпки 850 м трубопроводной траншеи: наружный диаметр трубы 315 мм, конструкция BDF-315-GTX300-SAND-PGS-K095, геотекстиль GEOTEXTILE-300-GSM, материал постели WASHED_SAND, толщина постели 150 мм, обсыпка 300 мм над трубой, материал обратной засыпки SAND_GRAVEL_MIX, коэффициент уплотнения 0,95, проектный объём постели и обсыпки 180 м³.",
    )).toEqual({
      pbb_route_length_m: "850",
      pbb_pipe_outside_diameter_mm: "315",
      pbb_assembly_designation: "BDF-315-GTX300-SAND-PGS-K095",
      pbb_geotextile_designation: "GEOTEXTILE-300-GSM",
      pbb_bedding_material: "WASHED_SAND",
      pbb_bedding_thickness_mm: "150",
      pbb_surround_cover_above_pipe_mm: "300",
      pbb_backfill_material: "SAND_GRAVEL_MIX",
      pbb_compaction_coefficient: "0.95",
      pbb_bedding_surround_installed_volume_m3: "180",
    });
  });

  test("extracts an explicit hydraulic-test scope without inventing pipeline construction", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "hyd_tested_length_m", "hyd_pipe_material", "hyd_pipe_sdr",
        "hyd_pipe_outside_diameter_mm", "hyd_pressure_class", "hyd_test_section_count",
        "hyd_temporary_closure_installed_piece", "hyd_closure_designation",
        "hyd_test_pressure_mpa", "hyd_hold_duration_min", "hyd_procedure_designation",
      ]),
      "Гидравлическое испытание 1200 м напорного канализационного трубопровода: PE100 SDR17, наружный диаметр 250 мм, PN10, 4 изолированных испытательных участка, 8 временных заглушек PE250-PN10-TEST-CAP, испытательное давление 1,0 МПа, выдержка 120 мин, процедура HT-PE250-PN10-4S-1.0MPA-120MIN.",
    )).toEqual({
      hyd_tested_length_m: "1200",
      hyd_pipe_material: "PE100",
      hyd_pipe_sdr: "SDR17",
      hyd_pipe_outside_diameter_mm: "250",
      hyd_pressure_class: "PN10",
      hyd_test_section_count: "4",
      hyd_temporary_closure_installed_piece: "8",
      hyd_closure_designation: "PE250-PN10-TEST-CAP",
      hyd_test_pressure_mpa: "1.0",
      hyd_hold_duration_min: "120",
      hyd_procedure_designation: "HT-PE250-PN10-4S-1.0MPA-120MIN",
    });
  });

  test("extracts one explicit river outfall without inventing upstream network scope", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "out_structure_count", "out_structure_type", "out_structure_designation",
        "out_receiving_environment", "out_outlet_pipe_diameter_mm", "out_design_discharge_lps",
        "out_structure_length_m", "out_structure_width_m", "out_structure_height_m",
        "out_concrete_class", "out_watertightness_class", "out_frost_resistance_class",
        "out_structural_concrete_installed_volume_m3",
      ]),
      "Строительство 1 выпускного сооружения: монолитный железобетонный оголовок на берегу реки, выпуск DN 600 мм, расчётный расход 450 л/с, габариты 4,5×3,2×2,4 м, бетон C30/37 W8 F200, марка OF-RC-DN600-Q450-C3037, проектный объём конструкционного бетона 28 м³.",
    )).toEqual({
      out_structure_count: "1",
      out_structure_type: "CAST_IN_PLACE_RC_HEADWALL",
      out_structure_designation: "OF-RC-DN600-Q450-C3037",
      out_receiving_environment: "RIVER_BANK",
      out_outlet_pipe_diameter_mm: "600",
      out_design_discharge_lps: "450",
      out_structure_length_m: "4.5",
      out_structure_width_m: "3.2",
      out_structure_height_m: "2.4",
      out_concrete_class: "C30/37",
      out_watertightness_class: "W8",
      out_frost_resistance_class: "F200",
      out_structural_concrete_installed_volume_m3: "28",
    });
  });

  test("extracts one packaged sewage pumping station without inventing external networks", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "sps_station_count", "sps_station_type", "sps_station_designation",
        "sps_wet_well_material", "sps_wet_well_diameter_mm", "sps_wet_well_depth_mm",
        "sps_design_flow_lps", "sps_design_head_m", "sps_pump_unit_installed_piece",
        "sps_pump_designation", "sps_duty_pump_count", "sps_standby_pump_count",
        "sps_motor_power_kw",
      ]),
      "Монтаж 1 комплектной канализационной насосной станции: подземная стеклопластиковая мокрая камера диаметром 2400 мм и глубиной 6500 мм, расчётный расход 45 л/с, напор 18 м, 3 погружных насоса FLYGT-N-3153-22KW (2 рабочих + 1 резервный), мощность двигателя 22 кВт, марка SPS-GRP-D2400-H6500-Q45-H18-2D1S.",
    )).toEqual({
      sps_station_count: "1",
      sps_station_type: "PREFABRICATED_GRP_WET_WELL",
      sps_station_designation: "SPS-GRP-D2400-H6500-Q45-H18-2D1S",
      sps_wet_well_material: "GRP",
      sps_wet_well_diameter_mm: "2400",
      sps_wet_well_depth_mm: "6500",
      sps_design_flow_lps: "45",
      sps_design_head_m: "18",
      sps_pump_unit_installed_piece: "3",
      sps_pump_designation: "FLYGT-N-3153-22KW",
      sps_duty_pump_count: "2",
      sps_standby_pump_count: "1",
      sps_motor_power_kw: "22",
    });
  });

  test("extracts one explicit two-train MBR treatment plant without inventing process quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "wtp_plant_count", "wtp_plant_designation", "wtp_process_technology",
        "wtp_design_flow_m3_day", "wtp_peak_flow_m3_day", "wtp_process_train_count",
        "wtp_influent_bod5_mg_l", "wtp_influent_tss_mg_l", "wtp_influent_tn_mg_l",
        "wtp_effluent_bod5_mg_l", "wtp_effluent_tss_mg_l", "wtp_effluent_tn_mg_l",
        "wtp_membrane_cassette_installed_piece", "wtp_membrane_cassette_designation",
      ]),
      "Строительство 1 комплекса очистных сооружений WWTP-MBR-1000-2T: технология SCREEN_GRIT_ANOXIC_AEROBIC_MBR_UV, 2 технологические линии, расчётный расход 1000 м³/сут, пиковый расход 1500 м³/сут, вход: БПК5 250 мг/л, взвешенные вещества 300 мг/л, общий азот 45 мг/л; выход: БПК5 10 мг/л, взвешенные вещества 10 мг/л, общий азот 10 мг/л; 8 мембранных кассет MBR-CASSETTE-50M3H.",
    )).toEqual({
      wtp_plant_count: "1",
      wtp_plant_designation: "WWTP-MBR-1000-2T",
      wtp_process_technology: "SCREEN_GRIT_ANOXIC_AEROBIC_MBR_UV",
      wtp_design_flow_m3_day: "1000",
      wtp_peak_flow_m3_day: "1500",
      wtp_process_train_count: "2",
      wtp_influent_bod5_mg_l: "250",
      wtp_influent_tss_mg_l: "300",
      wtp_influent_tn_mg_l: "45",
      wtp_effluent_bod5_mg_l: "10",
      wtp_effluent_tss_mg_l: "10",
      wtp_effluent_tn_mg_l: "10",
      wtp_membrane_cassette_installed_piece: "8",
      wtp_membrane_cassette_designation: "MBR-CASSETTE-50M3H",
    });
  });

  test("extracts explicit fine-bubble aeration tanks without inventing civil quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "aer_tank_count", "aer_tank_designation", "aer_tank_type", "aer_process_duty",
        "aer_process_train_count", "aer_tank_length_m", "aer_tank_width_m",
        "aer_operating_water_depth_m", "aer_design_air_flow_nm3_h",
        "aer_diffuser_installed_piece", "aer_diffuser_designation",
      ]),
      "Строительство 2 аэротенков AT-RC-2X30X8X5-FB: монолитные железобетонные прямоугольные бассейны, 2 технологические линии, размер каждого 30×8 м, рабочая глубина воды 5 м, мелкопузырчатая аэрация активного ила, расчётный расход воздуха 9000 Нм³/ч, 240 аэрационных диффузоров EPDM-FB-9IN.",
    )).toEqual({
      aer_tank_count: "2",
      aer_tank_designation: "AT-RC-2X30X8X5-FB",
      aer_tank_type: "CAST_IN_PLACE_RC_RECTANGULAR",
      aer_process_duty: "ACTIVATED_SLUDGE_FINE_BUBBLE_AERATION",
      aer_process_train_count: "2",
      aer_tank_length_m: "30",
      aer_tank_width_m: "8",
      aer_operating_water_depth_m: "5",
      aer_design_air_flow_nm3_h: "9000",
      aer_diffuser_installed_piece: "240",
      aer_diffuser_designation: "EPDM-FB-9IN",
    });
  });

  test("extracts one explicit screw-press sludge-dewatering package without adjacent treatment scope", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "sdw_system_count", "sdw_system_designation", "sdw_dewatering_technology",
        "sdw_sludge_feed_flow_m3_h", "sdw_inlet_dry_solids_percent",
        "sdw_cake_dry_solids_percent", "sdw_operating_hours_day",
        "sdw_press_unit_installed_piece", "sdw_press_unit_designation",
      ]),
      "Монтаж 1 комплекса обезвоживания осадка SD-MDSP-2X10-D20: технология MULTI_DISC_SCREW_PRESS, подача осадка 10 м³/ч, сухое вещество на входе 2%, сухое вещество кека 20%, работа 8 ч/сут, 2 шнековых пресса MDSP-10M3H.",
    )).toEqual({
      sdw_system_count: "1",
      sdw_system_designation: "SD-MDSP-2X10-D20",
      sdw_dewatering_technology: "MULTI_DISC_SCREW_PRESS",
      sdw_sludge_feed_flow_m3_h: "10",
      sdw_inlet_dry_solids_percent: "2",
      sdw_cake_dry_solids_percent: "20",
      sdw_operating_hours_day: "8",
      sdw_press_unit_installed_piece: "2",
      sdw_press_unit_designation: "MDSP-10M3H",
    });
  });

  test("extracts explicit reinforced-concrete treatment tanks without inventing civil quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "stt_tank_count", "stt_tank_designation", "stt_tank_type", "stt_process_duty",
        "stt_tank_length_m", "stt_tank_width_m", "stt_operating_liquid_depth_m",
        "stt_waterstop_installed_m", "stt_waterstop_designation",
      ]),
      "Строительство 2 резервуаров очистных сооружений STT-RC-2X18X8X5-WT: монолитные железобетонные прямоугольные резервуары, назначение — усреднение и первичное отстаивание, размер каждого 18×8 м, рабочая глубина жидкости 5 м, 260 м гидрошпонки PVC-P-320.",
    )).toEqual({
      stt_tank_count: "2",
      stt_tank_designation: "STT-RC-2X18X8X5-WT",
      stt_tank_type: "CAST_IN_PLACE_RC_RECTANGULAR",
      stt_process_duty: "EQUALIZATION_AND_PRIMARY_SETTLEMENT",
      stt_tank_length_m: "18",
      stt_tank_width_m: "8",
      stt_operating_liquid_depth_m: "5",
      stt_waterstop_installed_m: "260",
      stt_waterstop_designation: "PVC-P-320",
    });
  });

  test("extracts one explicit three-chamber septic facility without inventing construction quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "stf_facility_count", "stf_facility_designation", "stf_treatment_technology",
        "stf_design_flow_m3_day", "stf_working_volume_m3", "stf_chamber_count",
        "stf_ring_installed_piece", "stf_ring_designation",
      ]),
      "Строительство 1 септического очистного сооружения STF-RC-3C-30M3-KS20: технология THREE_CHAMBER_ANAEROBIC_SETTLING, расчётный расход 12 м³/сут, рабочий объём 30 м³, 3 камеры, 18 сборных железобетонных колец KS20.9.",
    )).toEqual({
      stf_facility_count: "1",
      stf_facility_designation: "STF-RC-3C-30M3-KS20",
      stf_treatment_technology: "THREE_CHAMBER_ANAEROBIC_SETTLING",
      stf_design_flow_m3_day: "12",
      stf_working_volume_m3: "30",
      stf_chamber_count: "3",
      stf_ring_installed_piece: "18",
      stf_ring_designation: "KS20.9",
    });
  });

  test("extracts explicit village gravity-sewer segments without deriving trench quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "vsn_network_count", "vsn_network_designation", "vsn_network_type",
        "vsn_design_flow_m3_day", "vsn_main_pipe_installed_m",
        "vsn_main_pipe_designation", "vsn_lateral_pipe_installed_m",
        "vsn_lateral_pipe_designation", "vsn_inspection_manhole_piece",
        "vsn_house_connection_piece",
      ]),
      "Строительство 1 самотечной канализационной сети села VSN-HDPE-SN8-OD200-160-3200: расчётный расход 450 м³/сут, 2400 м главной трубы HDPE-CORRUGATED-SN8-OD200, 800 м труб домовых подключений HDPE-CORRUGATED-SN8-OD160, 64 смотровых колодца, 120 домовых подключений.",
    )).toEqual({
      vsn_network_count: "1",
      vsn_network_designation: "VSN-HDPE-SN8-OD200-160-3200",
      vsn_network_type: "GRAVITY_VILLAGE_SEWER",
      vsn_design_flow_m3_day: "450",
      vsn_main_pipe_installed_m: "2400",
      vsn_main_pipe_designation: "HDPE-CORRUGATED-SN8-OD200",
      vsn_lateral_pipe_installed_m: "800",
      vsn_lateral_pipe_designation: "HDPE-CORRUGATED-SN8-OD160",
      vsn_inspection_manhole_piece: "64",
      vsn_house_connection_piece: "120",
    });
  });

  test("extracts explicit village pressure-water segments without deriving trench quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "vws_network_count", "vws_network_designation", "vws_network_type",
        "vws_design_flow_m3_day", "vws_main_pipe_installed_m",
        "vws_main_pipe_designation", "vws_branch_pipe_installed_m",
        "vws_branch_pipe_designation", "vws_valve_chamber_piece",
        "vws_fire_hydrant_piece", "vws_house_service_connection_piece",
      ]),
      "Строительство 1 напорной водопроводной сети села VWS-HDPE-PE100-RC-OD160-110-4200: расчётный расход 650 м³/сут, 3000 м главной трубы HDPE-PE100-SDR17-OD160, 1200 м труб ответвлений HDPE-PE100-SDR17-OD110, 36 камер запорной арматуры, 18 пожарных гидрантов, 150 домовых вводов.",
    )).toEqual({
      vws_network_count: "1",
      vws_network_designation: "VWS-HDPE-PE100-RC-OD160-110-4200",
      vws_network_type: "PRESSURE_VILLAGE_WATER_SUPPLY",
      vws_design_flow_m3_day: "650",
      vws_main_pipe_installed_m: "3000",
      vws_main_pipe_designation: "HDPE-PE100-SDR17-OD160",
      vws_branch_pipe_installed_m: "1200",
      vws_branch_pipe_designation: "HDPE-PE100-SDR17-OD110",
      vws_valve_chamber_piece: "36",
      vws_fire_hydrant_piece: "18",
      vws_house_service_connection_piece: "150",
    });
  });

  test("extracts explicit riverbank-intake equipment without deriving civil quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "wi_facility_count", "wi_facility_designation", "wi_intake_type",
        "wi_design_capacity_m3_day", "wi_intake_bay_count",
        "wi_coarse_screen_installed_piece", "wi_coarse_screen_designation",
        "wi_raw_water_pump_installed_piece", "wi_raw_water_pump_designation",
      ]),
      "Строительство 1 берегового водозабора WI-RIVERBANK-RC-2B-8000-4P: тип RIVERBANK_SCREENED_PUMP_INTAKE, производительность 8000 м³/сут, 2 водоприёмные камеры, 4 грубые решётки SS316-25MM-2000X3000, 4 насоса исходной воды VTP-250LPS-32M.",
    )).toEqual({
      wi_facility_count: "1",
      wi_facility_designation: "WI-RIVERBANK-RC-2B-8000-4P",
      wi_intake_type: "RIVERBANK_SCREENED_PUMP_INTAKE",
      wi_design_capacity_m3_day: "8000",
      wi_intake_bay_count: "2",
      wi_coarse_screen_installed_piece: "4",
      wi_coarse_screen_designation: "SS316-25MM-2000X3000",
      wi_raw_water_pump_installed_piece: "4",
      wi_raw_water_pump_designation: "VTP-250LPS-32M",
    });
  });

  test("extracts explicit water-meter chambers without deriving project quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "wmc_chamber_count", "wmc_chamber_designation", "wmc_chamber_type",
        "wmc_design_flow_m3_day", "wmc_meter_installed_piece", "wmc_meter_designation",
        "wmc_straight_pipe_installed_m", "wmc_straight_pipe_designation",
        "wmc_bypass_pipe_installed_m", "wmc_bypass_pipe_designation",
      ]),
      "Устройство 4 железобетонных камер водомерных узлов WMC-RC-DN150-4-EMF: тип RC_WATER_METER_CHAMBER_WITH_BYPASS, расчётный расход 1200 м³/сут, 4 электромагнитных счётчика EMF-DN150-PN16, 96 м прямых измерительных участков STEEL-EPOXY-DN150-PN16, 48 м байпасных трубопроводов STEEL-EPOXY-DN150-PN16.",
    )).toEqual({
      wmc_chamber_count: "4",
      wmc_chamber_designation: "WMC-RC-DN150-4-EMF",
      wmc_chamber_type: "RC_WATER_METER_CHAMBER_WITH_BYPASS",
      wmc_design_flow_m3_day: "1200",
      wmc_meter_installed_piece: "4",
      wmc_meter_designation: "EMF-DN150-PN16",
      wmc_straight_pipe_installed_m: "96",
      wmc_straight_pipe_designation: "STEEL-EPOXY-DN150-PN16",
      wmc_bypass_pipe_installed_m: "48",
      wmc_bypass_pipe_designation: "STEEL-EPOXY-DN150-PN16",
    });
  });

  test("extracts explicit clean-water reservoirs without deriving project quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "wr_reservoir_count", "wr_reservoir_designation", "wr_reservoir_type",
        "wr_total_storage_capacity_m3", "wr_unit_capacity_m3",
        "wr_waterstop_installed_m", "wr_waterstop_designation",
        "wr_inlet_pipe_installed_m", "wr_inlet_pipe_designation",
        "wr_outlet_pipe_installed_m", "wr_outlet_pipe_designation",
      ]),
      "Строительство 2 подземных железобетонных резервуаров чистой воды WR-RC-BURIED-2X1000-CW: тип BURIED_RC_CLEAN_WATER_RESERVOIR, общая ёмкость 2000 м³, ёмкость каждого 1000 м³, 420 м гидрошпонки PVC-WATERSTOP-250MM, 64 м входных трубопроводов SS304-DN300-PN10, 64 м выходных трубопроводов SS304-DN300-PN10.",
    )).toEqual({
      wr_reservoir_count: "2",
      wr_reservoir_designation: "WR-RC-BURIED-2X1000-CW",
      wr_reservoir_type: "BURIED_RC_CLEAN_WATER_RESERVOIR",
      wr_total_storage_capacity_m3: "2000",
      wr_unit_capacity_m3: "1000",
      wr_waterstop_installed_m: "420",
      wr_waterstop_designation: "PVC-WATERSTOP-250MM",
      wr_inlet_pipe_installed_m: "64",
      wr_inlet_pipe_designation: "SS304-DN300-PN10",
      wr_outlet_pipe_installed_m: "64",
      wr_outlet_pipe_designation: "SS304-DN300-PN10",
    });
  });

  test("extracts an explicit Rozhnovsky water tower without inventing network scope", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "wt_tower_count", "wt_tower_designation", "wt_tower_type",
        "wt_tank_capacity_m3", "wt_support_height_m",
        "wt_coating_installed_area_m2", "wt_coating_designation",
        "wt_riser_pipe_installed_m", "wt_riser_pipe_designation",
        "wt_overflow_pipe_installed_m", "wt_overflow_pipe_designation",
      ]),
      "Строительство 1 стальной водонапорной башни Рожновского WT-ROZHNOVSKY-VBR50-18: тип STEEL_ROZHNOVSKY_WATER_TOWER, бак 50 м³, высота опоры 18 м, 620 м² покрытия JOTUN-TANKGUARD-DW-SYSTEM, 38 м стояка STEEL-EPOXY-DN150-PN16, 22 м переливного трубопровода STEEL-GALV-DN100.",
    )).toEqual({
      wt_tower_count: "1",
      wt_tower_designation: "WT-ROZHNOVSKY-VBR50-18",
      wt_tower_type: "STEEL_ROZHNOVSKY_WATER_TOWER",
      wt_tank_capacity_m3: "50",
      wt_support_height_m: "18",
      wt_coating_installed_area_m2: "620",
      wt_coating_designation: "JOTUN-TANKGUARD-DW-SYSTEM",
      wt_riser_pipe_installed_m: "38",
      wt_riser_pipe_designation: "STEEL-EPOXY-DN150-PN16",
      wt_overflow_pipe_installed_m: "22",
      wt_overflow_pipe_designation: "STEEL-GALV-DN100",
    });
  });

  test("extracts an explicit potable-water treatment process without deriving resources", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "wtp_facility_count", "wtp_facility_designation", "wtp_process_type",
        "wtp_design_capacity_m3_day", "wtp_filter_train_count",
        "wtp_filter_media_installed_t", "wtp_filter_media_designation",
        "wtp_raw_water_pump_installed_piece", "wtp_raw_water_pump_designation",
        "wtp_treated_water_pump_installed_piece", "wtp_treated_water_pump_designation",
      ]),
      "Строительство 1 водоочистной станции WTP-RGF-5000-4F: схема COAGULATION_FLOCCULATION_SEDIMENTATION_RAPID_GRAVITY_FILTRATION_CHLORINATION, производительность 5000 м³/сут, 4 скорых гравитационных фильтра, 80 т антрацитовой загрузки ANTHRACITE-0.8-1.6MM-POTABLE, 4 насоса исходной воды HSC-80LPS-28M, 4 насоса очищенной воды HSC-75LPS-42M.",
    )).toEqual({
      wtp_facility_count: "1",
      wtp_facility_designation: "WTP-RGF-5000-4F",
      wtp_process_type: "COAGULATION_FLOCCULATION_SEDIMENTATION_RAPID_GRAVITY_FILTRATION_CHLORINATION",
      wtp_design_capacity_m3_day: "5000",
      wtp_filter_train_count: "4",
      wtp_filter_media_installed_t: "80",
      wtp_filter_media_designation: "ANTHRACITE-0.8-1.6MM-POTABLE",
      wtp_raw_water_pump_installed_piece: "4",
      wtp_raw_water_pump_designation: "HSC-80LPS-28M",
      wtp_treated_water_pump_installed_piece: "4",
      wtp_treated_water_pump_designation: "HSC-75LPS-42M",
    });
  });

  test("extracts one explicit production borehole without deriving civil quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "bh_borehole_count", "bh_borehole_designation", "bh_purpose",
        "bh_drilled_depth_m", "bh_final_bore_diameter_mm",
        "bh_casing_installed_m", "bh_casing_designation",
        "bh_screen_installed_m", "bh_screen_designation",
        "bh_pump_installed_piece", "bh_pump_designation",
        "bh_rising_main_installed_m", "bh_rising_main_designation",
        "bh_wellhead_installed_set", "bh_wellhead_designation",
      ]),
      "Устройство 1 эксплуатационной скважины BH-PW-180-DN250: назначение POTABLE_WATER_PRODUCTION, глубина 180 м, конечный диаметр ствола 311 мм, 180 м обсадной колонны STEEL-CASING-DN250-EN10217, 36 м фильтровой колонны SS316L-VWIRE-DN200-0.75MM, 1 погружной насос SUBMERSIBLE-45M3H-120M, 160 м водоподъёмной колонны SS304-DN80-PN16, 1 санитарный оголовок SANITARY-WELLHEAD-DN250-DN80.",
    )).toEqual({
      bh_borehole_count: "1",
      bh_borehole_designation: "BH-PW-180-DN250",
      bh_purpose: "POTABLE_WATER_PRODUCTION",
      bh_drilled_depth_m: "180",
      bh_final_bore_diameter_mm: "311",
      bh_casing_installed_m: "180",
      bh_casing_designation: "STEEL-CASING-DN250-EN10217",
      bh_screen_installed_m: "36",
      bh_screen_designation: "SS316L-VWIRE-DN200-0.75MM",
      bh_pump_installed_piece: "1",
      bh_pump_designation: "SUBMERSIBLE-45M3H-120M",
      bh_rising_main_installed_m: "160",
      bh_rising_main_designation: "SS304-DN80-PN16",
      bh_wellhead_installed_set: "1",
      bh_wellhead_designation: "SANITARY-WELLHEAD-DN250-DN80",
    });
  });

  test("extracts one explicit shallow shaft well without deriving construction quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "wiw_well_count", "wiw_well_designation", "wiw_well_type", "wiw_purpose",
        "wiw_shaft_depth_m", "wiw_internal_diameter_mm",
        "wiw_lining_ring_installed_piece", "wiw_lining_ring_designation",
        "wiw_joint_seal_installed_m", "wiw_joint_seal_designation",
        "wiw_pump_installed_piece", "wiw_pump_designation",
        "wiw_discharge_pipe_installed_m", "wiw_discharge_pipe_designation",
        "wiw_cover_slab_installed_piece", "wiw_cover_slab_designation",
      ]),
      "Строительство 1 шахтного водозаборного колодца WIW-RC-DN2000-18M: тип SHALLOW_RC_SHAFT_INFILTRATION_WELL, назначение POTABLE_WATER_INTAKE, глубина шахты 18 м, внутренний диаметр 2000 мм, 20 железобетонных колец RC-WELL-RING-KS20.9, 65 м уплотнения стыков BENTONITE-JOINT-SEAL-20X25, 2 погружных насоса SUBMERSIBLE-15M3H-35M, 30 м напорной трубы HDPE-PE100-SDR17-OD63, 1 плита покрытия RC-WELL-COVER-PP20-2.",
    )).toEqual({
      wiw_well_count: "1",
      wiw_well_designation: "WIW-RC-DN2000-18M",
      wiw_well_type: "SHALLOW_RC_SHAFT_INFILTRATION_WELL",
      wiw_purpose: "POTABLE_WATER_INTAKE",
      wiw_shaft_depth_m: "18",
      wiw_internal_diameter_mm: "2000",
      wiw_lining_ring_installed_piece: "20",
      wiw_lining_ring_designation: "RC-WELL-RING-KS20.9",
      wiw_joint_seal_installed_m: "65",
      wiw_joint_seal_designation: "BENTONITE-JOINT-SEAL-20X25",
      wiw_pump_installed_piece: "2",
      wiw_pump_designation: "SUBMERSIBLE-15M3H-35M",
      wiw_discharge_pipe_installed_m: "30",
      wiw_discharge_pipe_designation: "HDPE-PE100-SDR17-OD63",
      wiw_cover_slab_installed_piece: "1",
      wiw_cover_slab_designation: "RC-WELL-COVER-PP20-2",
    });
  });

  test("extracts one explicit potable-water booster station without deriving project quantities", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "wps_station_count", "wps_station_designation", "wps_station_type", "wps_duty",
        "wps_design_flow_lps", "wps_design_head_m", "wps_pump_installed_piece",
        "wps_pump_designation", "wps_duty_pump_count", "wps_standby_pump_count",
        "wps_motor_power_kw", "wps_suction_manifold_installed_m",
        "wps_suction_manifold_designation", "wps_discharge_manifold_installed_m",
        "wps_discharge_manifold_designation", "wps_power_cable_installed_m",
        "wps_power_cable_designation",
      ]),
      "Строительство 1 станции повышения давления питьевой воды WPS-RC-Q120-H55-2D1S: тип RC_DRY_WELL_POTABLE_WATER_BOOSTER_STATION, назначение POTABLE_WATER_BOOSTING, расчётная подача 120 л/с, расчётный напор 55 м, 3 горизонтальных насосных агрегата HSC-60LPS-55M-75KW, схема 2 рабочих + 1 резервный, мощность двигателя 75 кВт, 18 м всасывающего коллектора SS304-DN400-PN16, 22 м напорного коллектора SS304-DN300-PN16, 240 м силового кабеля N2XH-4X120-0.6/1KV.",
    )).toEqual({
      wps_station_count: "1",
      wps_station_designation: "WPS-RC-Q120-H55-2D1S",
      wps_station_type: "RC_DRY_WELL_POTABLE_WATER_BOOSTER_STATION",
      wps_duty: "POTABLE_WATER_BOOSTING",
      wps_design_flow_lps: "120",
      wps_design_head_m: "55",
      wps_pump_installed_piece: "3",
      wps_pump_designation: "HSC-60LPS-55M-75KW",
      wps_duty_pump_count: "2",
      wps_standby_pump_count: "1",
      wps_motor_power_kw: "75",
      wps_suction_manifold_installed_m: "18",
      wps_suction_manifold_designation: "SS304-DN400-PN16",
      wps_discharge_manifold_installed_m: "22",
      wps_discharge_manifold_designation: "SS304-DN300-PN16",
      wps_power_cable_installed_m: "240",
      wps_power_cable_designation: "N2XH-4X120-0.6/1KV",
    });
  });

  test("extracts one factory booster skid without deriving accessories or room work", () => {
    expect(extractPromptOwnedProfessionalParameters(
      schema([
        "bps_skid_count", "bps_skid_designation", "bps_skid_type", "bps_duty",
        "bps_design_flow_m3_h", "bps_design_head_m", "bps_pump_installed_piece",
        "bps_pump_designation", "bps_duty_pump_count", "bps_standby_pump_count",
        "bps_motor_power_kw", "bps_suction_manifold_installed_m",
        "bps_suction_manifold_designation", "bps_discharge_manifold_installed_m",
        "bps_discharge_manifold_designation", "bps_pressure_vessel_installed_piece",
        "bps_pressure_vessel_designation", "bps_power_cable_installed_m",
        "bps_power_cable_designation",
      ]),
      "Монтаж 1 заводской повысительной насосной установки BPS-SKID-Q90-H45-2D1S в существующем насосном помещении: тип FACTORY_ASSEMBLED_VARIABLE_SPEED_BOOSTER_SKID, назначение POTABLE_WATER_PRESSURE_BOOSTING_EXISTING_ROOM, расчётная подача 90 м³/ч, расчётный напор 45 м, 3 вертикальных насосных агрегата VM-45M3H-45M-30KW, схема 2 рабочих + 1 резервный, мощность двигателя 30 кВт, 6 м всасывающего коллектора SS304-DN200-PN16, 8 м напорного коллектора SS304-DN150-PN16, 2 гидропневматических бака VESSEL-1000L-PN10, 160 м силового кабеля N2XH-4X70-0.6/1KV.",
    )).toEqual({
      bps_skid_count: "1",
      bps_skid_designation: "BPS-SKID-Q90-H45-2D1S",
      bps_skid_type: "FACTORY_ASSEMBLED_VARIABLE_SPEED_BOOSTER_SKID",
      bps_duty: "POTABLE_WATER_PRESSURE_BOOSTING_EXISTING_ROOM",
      bps_design_flow_m3_h: "90",
      bps_design_head_m: "45",
      bps_pump_installed_piece: "3",
      bps_pump_designation: "VM-45M3H-45M-30KW",
      bps_duty_pump_count: "2",
      bps_standby_pump_count: "1",
      bps_motor_power_kw: "30",
      bps_suction_manifold_installed_m: "6",
      bps_suction_manifold_designation: "SS304-DN200-PN16",
      bps_discharge_manifold_installed_m: "8",
      bps_discharge_manifold_designation: "SS304-DN150-PN16",
      bps_pressure_vessel_installed_piece: "2",
      bps_pressure_vessel_designation: "VESSEL-1000L-PN10",
      bps_power_cable_installed_m: "160",
      bps_power_cable_designation: "N2XH-4X70-0.6/1KV",
    });
  });

  test("does not select a disconnected context parameter as the compile primary measure", () => {
    const parameterSchema = schema(["structure_volume_m3", "rebar_d12_mass_kg"])
      .map((parameter, ordinal) => ({
        ...parameter,
        ordinal,
        valueType: "decimal" as const,
        unitId: ordinal === 0 ? "m3" : "kg",
        formulaConsumers: ordinal === 0 ? [] : ["rebar_d12_mass_v1"],
      }));
    const catalog = {
      catalogId: "canonical-work:base:reinforcement-frame",
      workKey: "reinforcement-frame",
      parameterSchema,
    } as unknown as CanonicalEstimateCatalogItem;

    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "Монтаж каркаса, объём конструкции 20 м³, BBS подтверждена",
    }).primaryMeasureParameterId).toBe("rebar_d12_mass_kg");
  });

  test("collects only the eight genuinely unknown filtration facts before compile", () => {
    const textParameters = new Set([
      "flt_station_designation",
      "flt_filter_media_designation",
      "flt_underdrain_designation",
      "flt_backwash_package_designation",
    ]);
    const parameterSchema = [
      ...Object.keys(FILTRATION_STATION_SHORT_INPUT).map((parameterId, ordinal) => ({
        parameterId,
        ordinal,
        valueType: textParameters.has(parameterId)
          ? "text" as const
          : parameterId.endsWith("_count") ? "integer" as const : "decimal" as const,
        unitId: null,
        titleRu: parameterId,
        required: true,
        preliminaryCompilationAllowed: false,
        defaultValue: null,
        constraints: {},
        semanticParameterKey: `filtration-station:${parameterId}`,
        visibilityRole: "USER_INPUT" as const,
        valueSourceRole: "USER_INPUT" as const,
        guide: {
          guideKind: "MEASUREMENT_RULE" as const,
          guideShortRu: parameterId,
          guideValidationPolicy: "MANDATORY_BLOCK" as const,
          sourceRole: "USER_SUPPLIED_PRIMARY_FACT",
        },
        normativeLinks: [],
        formulaConsumers: [`${parameterId}_formula`],
        resourceBranchConsumers: [],
        validationRules: [],
        provenance: {},
      })),
      {
        parameterId: "flt_wall_thickness_m",
        ordinal: 10,
        valueType: "decimal" as const,
        unitId: "m",
        titleRu: "Видимая профильная толщина",
        required: true,
        preliminaryCompilationAllowed: true,
        defaultValue: null,
        constraints: {},
        semanticParameterKey: "filtration-station:flt_wall_thickness_m",
        visibilityRole: "USER_INPUT" as const,
        valueSourceRole: "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" as const,
        guide: {
          guideKind: "PROJECT_DEFINED" as const,
          guideShortRu: "Видимый профиль",
          guideValidationPolicy: "ADVISORY_REASON_REQUIRED" as const,
          sourceRole: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
        },
        normativeLinks: [],
        formulaConsumers: ["flt_wall_formula"],
        resourceBranchConsumers: [],
        validationRules: [],
        provenance: {},
      },
    ] as unknown as CanonicalEstimateCatalogItem["parameterSchema"];
    const catalog = {
      catalogId: FILTRATION_STATION_CATALOG_ID,
      workKey: "filtration_station",
      parameterSchema,
    } as unknown as CanonicalEstimateCatalogItem;

    let errorMessage = "";
    try {
      buildCanonicalBaselinePlan({
        catalog,
        prompt: "смета на фильтровальную станцию производительностью 1000 м3 в сутки",
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    expect(errorMessage).toContain("CANONICAL_BASELINE_CONTRACT_MISSING");
    expect(errorMessage).not.toContain("flt_station_count");
    expect(errorMessage).not.toContain("flt_design_capacity_m3_day");
    expect(errorMessage).not.toContain("flt_wall_thickness_m");
    expect(Object.keys(FILTRATION_STATION_SHORT_INPUT)
      .filter((parameterId) => ![
        "flt_station_count", "flt_design_capacity_m3_day",
      ].includes(parameterId))
      .every((parameterId) => errorMessage.includes(parameterId))).toBe(true);

    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "Строительство 1 фильтровальной станции FS-RGF-5000-4C производительностью 5000 м3/сут: 4 фильтровальные ячейки внутренним размером 8 x 5 м; загрузка DUAL-MEDIA-ANTHRACITE-SAND-POTABLE глубиной 0.8 м; дренаж HDPE-BLOCK-UNDERDRAIN-AIR-WATER; промывочный пакет BW-2P2B-AIR-WATER-5000.",
    })).toMatchObject({
      parameters: Object.fromEntries(Object.entries(FILTRATION_STATION_SHORT_INPUT)
        .map(([key, value]) => [key, String(value)])),
      primaryMeasureParameterId: "flt_station_count",
    });
  });

  test("collects only six genuinely unknown chlorination facts after a short request", () => {
    const textParameters = new Set([
      "chl_station_designation",
      "chl_dosing_package_designation",
    ]);
    const integerParameters = new Set([
      "chl_station_count",
      "chl_injection_point_count",
    ]);
    const parameterSchema = [
      ...Object.keys(CHLORINATION_STATION_SHORT_INPUT).map((parameterId, ordinal) => ({
        parameterId,
        ordinal,
        valueType: textParameters.has(parameterId)
          ? "text" as const
          : parameterId === "chl_disinfectant_technology"
            ? "enum" as const
            : integerParameters.has(parameterId) ? "integer" as const : "decimal" as const,
        unitId: null,
        titleRu: parameterId,
        required: true,
        preliminaryCompilationAllowed: false,
        defaultValue: null,
        constraints: parameterId === "chl_disinfectant_technology"
          ? { values: ["SODIUM_HYPOCHLORITE"] }
          : {},
        semanticParameterKey: `chlorination-station:${parameterId}`,
        visibilityRole: "USER_INPUT" as const,
        valueSourceRole: "USER_INPUT" as const,
        guide: {
          guideKind: "MEASUREMENT_RULE" as const,
          guideShortRu: parameterId,
          guideValidationPolicy: "MANDATORY_BLOCK" as const,
          sourceRole: "USER_SUPPLIED_PRIMARY_FACT",
        },
        normativeLinks: [],
        formulaConsumers: [`${parameterId}_formula`],
        resourceBranchConsumers: [],
        validationRules: [],
        provenance: {},
      })),
      {
        parameterId: "chl_building_length_m",
        ordinal: 8,
        valueType: "decimal" as const,
        unitId: "m",
        titleRu: "Видимая профильная длина здания",
        required: true,
        preliminaryCompilationAllowed: true,
        defaultValue: null,
        constraints: {},
        semanticParameterKey: "chlorination-station:chl_building_length_m",
        visibilityRole: "USER_INPUT" as const,
        valueSourceRole: "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" as const,
        guide: {
          guideKind: "PROJECT_DEFINED" as const,
          guideShortRu: "Видимый профиль",
          guideValidationPolicy: "ADVISORY_REASON_REQUIRED" as const,
          sourceRole: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
        },
        normativeLinks: [],
        formulaConsumers: ["chl_building_formula"],
        resourceBranchConsumers: [],
        validationRules: [],
        provenance: {},
      },
    ] as unknown as CanonicalEstimateCatalogItem["parameterSchema"];
    const catalog = {
      catalogId: CHLORINATION_STATION_CATALOG_ID,
      workKey: "chlorination_station",
      parameterSchema,
    } as unknown as CanonicalEstimateCatalogItem;

    let errorMessage = "";
    try {
      buildCanonicalBaselinePlan({
        catalog,
        prompt: "смета на станцию хлорирования производительностью 1000 м3 в сутки",
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    expect(errorMessage).toContain("CANONICAL_BASELINE_CONTRACT_MISSING");
    expect(errorMessage).not.toContain("chl_station_count");
    expect(errorMessage).not.toContain("chl_design_flow_m3_day");
    expect(errorMessage).not.toContain("chl_building_length_m");
    expect(Object.keys(CHLORINATION_STATION_SHORT_INPUT)
      .filter((parameterId) => ![
        "chl_station_count", "chl_design_flow_m3_day",
      ].includes(parameterId))
      .every((parameterId) => errorMessage.includes(parameterId))).toBe(true);

    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "Строительство 1 станции хлорирования CHL-NAOCL-1000-1IP производительностью 1000 м3/сут, технология гипохлорит натрия, расчётная доза 2 мг/л, раствор концентрацией 12.5%, дозирующий пакет DS-NAOCL-2X15LPH-PVC, 1 точка ввода.",
    })).toMatchObject({
      parameters: Object.fromEntries(Object.entries(CHLORINATION_STATION_SHORT_INPUT)
        .map(([key, value]) => [key, String(value)])),
      primaryMeasureParameterId: "chl_station_count",
    });
  });

  test("collects only six unknown flushing-method facts after geometry is stated", () => {
    const textParameters = new Set(["fld_pipeline_designation"]);
    const parameterSchema = [
      ...Object.keys(FLUSHING_DISINFECTION_SHORT_INPUT).map((parameterId, ordinal) => ({
        parameterId,
        ordinal,
        valueType: textParameters.has(parameterId)
          ? "text" as const
          : parameterId === "fld_disinfectant_technology"
            ? "enum" as const
            : parameterId === "fld_isolated_section_count"
              ? "integer" as const : "decimal" as const,
        unitId: null,
        titleRu: parameterId,
        required: true,
        preliminaryCompilationAllowed: false,
        defaultValue: null,
        constraints: parameterId === "fld_disinfectant_technology"
          ? { values: ["SODIUM_HYPOCHLORITE"] }
          : {},
        semanticParameterKey: `flushing-disinfection:${parameterId}`,
        visibilityRole: "USER_INPUT" as const,
        valueSourceRole: "USER_INPUT" as const,
        guide: {
          guideKind: "MEASUREMENT_RULE" as const,
          guideShortRu: parameterId,
          guideValidationPolicy: "MANDATORY_BLOCK" as const,
          sourceRole: "USER_SUPPLIED_PRIMARY_FACT",
        },
        normativeLinks: [],
        formulaConsumers: [`${parameterId}_formula`],
        resourceBranchConsumers: [],
        validationRules: [],
        provenance: {},
      })),
      {
        parameterId: "fld_flushing_turnovers",
        ordinal: 8,
        valueType: "decimal" as const,
        unitId: "ratio",
        titleRu: "Видимая профильная кратность промывки",
        required: true,
        preliminaryCompilationAllowed: true,
        defaultValue: null,
        constraints: {},
        semanticParameterKey: "flushing-disinfection:fld_flushing_turnovers",
        visibilityRole: "USER_INPUT" as const,
        valueSourceRole: "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" as const,
        guide: {
          guideKind: "PROJECT_DEFINED" as const,
          guideShortRu: "Видимый профиль",
          guideValidationPolicy: "ADVISORY_REASON_REQUIRED" as const,
          sourceRole: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
        },
        normativeLinks: [],
        formulaConsumers: ["fld_flush_water_formula"],
        resourceBranchConsumers: [],
        validationRules: [],
        provenance: {},
      },
    ] as unknown as CanonicalEstimateCatalogItem["parameterSchema"];
    const catalog = {
      catalogId: FLUSHING_DISINFECTION_CATALOG_ID,
      workKey: "flushing_disinfection",
      parameterSchema,
    } as unknown as CanonicalEstimateCatalogItem;

    let errorMessage = "";
    try {
      buildCanonicalBaselinePlan({
        catalog,
        prompt: "промыть и дезинфицировать 1000 м трубопровода, внутренний диаметр 100 мм",
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    expect(errorMessage).toContain("CANONICAL_BASELINE_CONTRACT_MISSING");
    expect(errorMessage).not.toContain("fld_pipeline_length_m");
    expect(errorMessage).not.toContain("fld_pipeline_internal_diameter_mm");
    expect(errorMessage).not.toContain("fld_flushing_turnovers");
    expect(Object.keys(FLUSHING_DISINFECTION_SHORT_INPUT)
      .filter((parameterId) => ![
        "fld_pipeline_length_m", "fld_pipeline_internal_diameter_mm",
      ].includes(parameterId))
      .every((parameterId) => errorMessage.includes(parameterId))).toBe(true);

    expect(buildCanonicalBaselinePlan({
      catalog,
      prompt: "Промывка и дезинфекция трубопровода PE100-RC-SDR17-OD110-ID100 длиной 1000 м, внутренний диаметр 100 мм, 2 изолированных участка, гипохлорит натрия, активный хлор 50 мг/л, раствор концентрацией 12.5%, выдержка 24 ч.",
    })).toMatchObject({
      parameters: Object.fromEntries(Object.entries(FLUSHING_DISINFECTION_SHORT_INPUT)
        .map(([key, value]) => [key, String(value)])),
      primaryMeasureParameterId: "fld_pipeline_length_m",
    });
  });
});
