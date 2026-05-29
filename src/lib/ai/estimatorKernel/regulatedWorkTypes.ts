export type RegulatedConstructionWorkKind =
  | "passenger_elevator"
  | "freight_elevator"
  | "escalator"
  | "gas_system"
  | "high_voltage"
  | "boiler"
  | "fire_alarm"
  | "industrial_crane"
  | "hydropower_equipment"
  | "structural_demolition"
  | "hazardous_materials";

export type RegulatedConstructionWorkPolicy = {
  regulated: boolean;
  kind?: RegulatedConstructionWorkKind;
  warnings: string[];
};
