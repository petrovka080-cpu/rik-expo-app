import type { GlobalUnitInput } from "./globalEstimateTypes";

export type ProfessionalWbsMeasurementUnit = GlobalUnitInput["normalizedUnit"] | "shift" | "trip";

export type ProfessionalWbsScopeInput = {
  workKey: string;
  workTitle: string;
  category: string;
  formulaOutputs?: Record<string, number>;
};

export type ProfessionalWbsMeasurementRole =
  | "planning"
  | "materials"
  | "execution"
  | "equipment"
  | "delivery"
  | "quality";

export type ProfessionalWbsMeasurement = {
  unit: ProfessionalWbsMeasurementUnit;
  quantity: number;
  quantityFormula?: string;
  formulaTrace?: string;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isMetalProfessionalWbsScope(input: ProfessionalWbsScopeInput): boolean {
  const text = `${input.category} ${input.workKey} ${input.workTitle}`.toLocaleLowerCase("ru-RU");
  return input.category === "metalworks" ||
    /metal|steel|\u043c\u0435\u0442\u0430\u043b\u043b|\u0441\u0442\u0430\u043b\u044c|\u0444\u0435\u0440\u043c|\u0431\u0430\u043b\u043a|\u043a\u0430\u0440\u043a\u0430\u0441|\u0441\u0432\u0430\u0440\u043d/u.test(text);
}

function metalScopeMassKg(input: {
  baseQuantity: number;
  measuredUnit: GlobalUnitInput["normalizedUnit"];
}): ProfessionalWbsMeasurement {
  if (input.measuredUnit === "kg") {
    return {
      unit: "kg",
      quantity: round2(input.baseQuantity),
      quantityFormula: "base_quantity_kg",
      formulaTrace: `base_quantity=${input.baseQuantity}; unit=kg`,
    };
  }
  if (input.measuredUnit === "ton") {
    return {
      unit: "kg",
      quantity: round2(input.baseQuantity * 1000),
      quantityFormula: "base_quantity_ton * 1000",
      formulaTrace: `base_quantity=${input.baseQuantity}; unit=ton; kg_per_ton=1000`,
    };
  }
  if (input.measuredUnit === "linear_m") {
    return {
      unit: "kg",
      quantity: round2(input.baseQuantity * 18),
      quantityFormula: "linear_m * 18 kg_per_linear_m_structural_steel_allowance",
      formulaTrace: `base_quantity=${input.baseQuantity}; unit=linear_m; structural_steel_kg_per_linear_m=18`,
    };
  }
  if (input.measuredUnit === "pcs") {
    return {
      unit: "kg",
      quantity: round2(input.baseQuantity * 45),
      quantityFormula: "pcs * 45 kg_per_steel_assembly_allowance",
      formulaTrace: `base_quantity=${input.baseQuantity}; unit=pcs; structural_steel_kg_per_assembly=45`,
    };
  }
  if (input.measuredUnit === "m3") {
    return {
      unit: "kg",
      quantity: round2(input.baseQuantity * 7850),
      quantityFormula: "m3 * 7850 kg_per_m3_steel_density",
      formulaTrace: `base_quantity=${input.baseQuantity}; unit=m3; steel_density_kg_per_m3=7850`,
    };
  }
  return {
    unit: "kg",
    quantity: round2(input.baseQuantity * 35),
    quantityFormula: "area_m2 * 35 kg_per_m2_preliminary_structural_steel_allowance",
    formulaTrace: `base_quantity=${input.baseQuantity}; unit=${input.measuredUnit}; structural_steel_kg_per_m2=35`,
  };
}

function defaultProfessionalWbsMeasurement(input: {
  unit: ProfessionalWbsMeasurementUnit;
  quantity: number;
}): ProfessionalWbsMeasurement {
  return {
    unit: input.unit,
    quantity: input.quantity,
  };
}

function firstFiniteFormulaOutput(
  outputs: Record<string, number> | undefined,
  keys: readonly string[],
): { key: string; value: number } | null {
  if (!outputs) return null;
  for (const key of keys) {
    const value = outputs[key];
    if (Number.isFinite(value) && value > 0) return { key, value };
  }
  return null;
}

function isConcreteProfessionalWbsScope(input: ProfessionalWbsScopeInput): boolean {
  const text = `${input.category} ${input.workKey} ${input.workTitle}`.toLocaleLowerCase("ru-RU");
  return input.workKey === "concrete_pedestal_pour" ||
    input.category === "foundation" ||
    /concrete|\u0431\u0435\u0442\u043e\u043d|foundation_concrete|\u0436\u0435\u043b\u0435\u0437\u043e\u0431\u0435\u0442\u043e\u043d/u.test(text);
}

function concreteScopeVolumeM3(input: {
  baseQuantity: number;
  measuredUnit: GlobalUnitInput["normalizedUnit"];
  formulaOutputs?: Record<string, number>;
}): ProfessionalWbsMeasurement | null {
  const formulaVolume = firstFiniteFormulaOutput(input.formulaOutputs, [
    "concreteWithWasteM3",
    "volumeTotalM3",
    "concreteVolumeM3",
  ]);
  if (formulaVolume) {
    return {
      unit: "m3",
      quantity: round2(formulaVolume.value),
      quantityFormula: formulaVolume.key,
      formulaTrace: `${formulaVolume.key}=${formulaVolume.value}; unit=m3`,
    };
  }
  const volumeEach = firstFiniteFormulaOutput(input.formulaOutputs, ["volumeEachM3"]);
  if (volumeEach && input.measuredUnit === "pcs") {
    return {
      unit: "m3",
      quantity: round2(volumeEach.value * input.baseQuantity),
      quantityFormula: "volumeEachM3 * pcs",
      formulaTrace: `volumeEachM3=${volumeEach.value}; base_quantity=${input.baseQuantity}; unit=pcs`,
    };
  }
  if (input.measuredUnit === "m3") {
    return {
      unit: "m3",
      quantity: round2(input.baseQuantity),
      quantityFormula: "base_quantity_m3",
      formulaTrace: `base_quantity=${input.baseQuantity}; unit=m3`,
    };
  }
  return null;
}

function preliminaryConcretePhaseVolumeM3(input: {
  baseQuantity: number;
  measuredUnit: GlobalUnitInput["normalizedUnit"];
}): ProfessionalWbsMeasurement {
  const factor = input.measuredUnit === "pcs" || input.measuredUnit === "set"
    ? 0.5
    : input.measuredUnit === "sq_m"
      ? 0.12
      : input.measuredUnit === "linear_m"
        ? 0.2
        : 1;
  return {
    unit: "m3",
    quantity: round2(Math.max(0.01, input.baseQuantity * factor)),
    quantityFormula: `base_quantity * ${factor} preliminary_concrete_m3_per_${input.measuredUnit}`,
    formulaTrace:
      `base_quantity=${input.baseQuantity}; unit=${input.measuredUnit}; ` +
      `preliminary_concrete_m3_per_${input.measuredUnit}=${factor}`,
  };
}

export function professionalWbsMeasurement(input: ProfessionalWbsScopeInput & {
  baseQuantity: number;
  measuredUnit: GlobalUnitInput["normalizedUnit"];
  defaultUnit: ProfessionalWbsMeasurementUnit;
  defaultQuantity: number;
  role: ProfessionalWbsMeasurementRole;
  specKey: string;
}): ProfessionalWbsMeasurement {
  const liftingEquipmentPhase =
    /^(lifting|crane_operations|heavy_lifting_plan|equipment_mobilization)$/i.test(input.specKey);
  if (liftingEquipmentPhase && input.role === "equipment") {
    return {
      unit: "shift",
      quantity: Math.max(1, Math.ceil(input.baseQuantity)),
      quantityFormula: "ceil(base_quantity_lifting_shifts)",
      formulaTrace:
        `base_quantity=${input.baseQuantity}; wbs_role=equipment; ` +
        `wbs_phase=${input.specKey}; lifting_equipment_unit=shift`,
    };
  }
  const metalPhase = /(?:^|_)(?:steelwork|structural_steel|metalwork)(?:_|$)/i.test(input.specKey);
  if (metalPhase || isMetalProfessionalWbsScope(input)) {
    if (input.role === "materials" || input.role === "execution") {
      const mass = metalScopeMassKg(input);
      return {
        ...mass,
        formulaTrace: `${mass.formulaTrace}; wbs_role=${input.role}; wbs_phase=${input.specKey}`,
      };
    }
    if (input.role === "planning" || input.role === "quality" || input.role === "equipment") {
      return {
        unit: "set",
        quantity: 1,
        quantityFormula: "1",
        formulaTrace: `wbs_role=${input.role}; wbs_phase=${input.specKey}; deliverable_or_equipment_package=set`,
      };
    }
    if (input.role === "delivery") {
      const mass = metalScopeMassKg(input);
      return {
        unit: "trip",
        quantity: Math.max(1, Math.ceil(mass.quantity / 2500)),
        quantityFormula: "ceil(steel_mass_kg / 2500 kg_per_delivery_trip)",
        formulaTrace: `${mass.formulaTrace}; wbs_role=delivery; wbs_phase=${input.specKey}; kg_per_delivery_trip=2500`,
      };
    }
  }
  const concretePhase = /(?:^|_)(?:concrete|foundations?)(?:_|$)/i.test(input.specKey);
  if (concretePhase || isConcreteProfessionalWbsScope(input)) {
    const concrete = concreteScopeVolumeM3(input) ??
      (concretePhase ? preliminaryConcretePhaseVolumeM3(input) : null);
    if (concrete && (input.role === "materials" || input.role === "execution")) {
      return {
        ...concrete,
        formulaTrace: `${concrete.formulaTrace}; wbs_role=${input.role}; wbs_phase=${input.specKey}`,
      };
    }
    if (input.role === "planning" || input.role === "quality" || input.role === "equipment") {
      return {
        unit: "set",
        quantity: 1,
        quantityFormula: "1",
        formulaTrace: `wbs_role=${input.role}; wbs_phase=${input.specKey}; deliverable_or_equipment_package=set`,
      };
    }
    if (concrete && input.role === "delivery") {
      return {
        unit: "trip",
        quantity: Math.max(1, Math.ceil(concrete.quantity / 8)),
        quantityFormula: "ceil(concrete_volume_m3 / 8 m3_per_delivery_trip)",
        formulaTrace: `${concrete.formulaTrace}; wbs_role=delivery; wbs_phase=${input.specKey}; m3_per_delivery_trip=8`,
      };
    }
  }
  return defaultProfessionalWbsMeasurement({
    unit: input.defaultUnit,
    quantity: input.defaultQuantity,
  });
}
