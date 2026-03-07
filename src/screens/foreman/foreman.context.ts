/**
 * CONSTRUCTION CONTEXT ENGINE (CCE) v2.0 - ARCHITECTURAL CONTRACT
 * 
 * IMPORTANT ARCHITECTURAL PRINCIPLES:
 * 1. SEMANTICS ONLY: This contract defines rules for interpretation, UI behavior, 
 *    and reporting logic. It DOES NOT store actual object geometry (e.g., number 
 *    of floors, list of sections).
 * 2. DATA DECOUPLED: CCE defines WHAT a field means (e.g., "Picket"), but the 
 *    actual values ("PK 20+40") must come from the database/dictionaries.
 * 3. NO DB CHANGES: This is a virtual semantic layer that maps existing 
 *    'level_code' and 'system_code' fields to building-specific logic.
 */

/** 
 * LocatorEntityKind defines the semantic 'nature' of the data in level_code.
 * Essential for correct grouping in BI and AI analysis.
 */
export type LocatorEntityKind =
    | 'floor'         // Vertical levels (Floor 1, 2...)
    | 'section'       // Horizontal blocks (Block A, Section 1...)
    | 'area'          // Territorial zones (Sector 4, Yard Zone...)
    | 'route_segment' // Linear segments (Well K1-K5, Branch B...)
    | 'picket'        // Linear marks (PK 20+40, KM 1.2...)
    | 'room'          // Enclosed units (Room 101, Apt 45...)
    | 'node'          // Connection points (Well K-1, Cabinet E-1...)
    | 'none';         // Whole object scope (No sub-localization)

export type ObjectClass =
    | 'multilevel_building'  // e.g. Office block, Residential tower
    | 'lowrise_building'     // e.g. Warehouse, Small office
    | 'technical_facility'   // e.g. Hangar, Greenhouse, Pump station
    | 'external_site'        // e.g. Yard, Landscaping, Roads within site
    | 'external_networks'    // e.g. Water, Heating, Power lines
    | 'linear_object'        // e.g. Highway, Long distance pipe, Fence
    | 'parking_object'       // e.g. Multilevel parking, Underground lot
    | 'generic_object';      // Fallback for everything else

/**
 * ContextConfig defines the rules for a specific object class or instance.
 */
export interface ContextConfig {
    objectClass: ObjectClass;
    localizationMode: 'floor_based' | 'section_based' | 'area_based' | 'route_based' | 'none';

    // Semantic Core
    locatorEntityKind: LocatorEntityKind;

    // UI & Labels
    locatorLabel: string;       // Input label (e.g. "Picket", "Floor", "Block")
    locatorUnit?: string;       // Optional unit for reports/PDF (e.g. "ПК", "этаж")
    wholeObjectAllowed: boolean;
    wholeObjectLabel: string;   // Label for "No selection" (e.g. "Whole Route")
    zoneLabel: string;          // Label for the 4th field (e.g. "Room", "Joint")

    // Behavior & Filtering Rules
    // Sections are filtered by priority to help the user, not to strictly block them.
    prioritySections?: string[];
    secondarySections?: string[];
    hardExcludedSections?: string[];

    locatorRequired?: boolean;
    zoneRequired?: boolean;

    // Analytics Key (Tells the AI/BI how to group these heterogeneous rows)
    analyticsGroupingKey:
    | 'by_floor'
    | 'by_section'
    | 'by_area'
    | 'by_route'
    | 'by_room'
    | 'by_node'
    | 'whole_object';
}

/**
 * ContextResolutionResult is the final output of the Resolver.
 * Includes metadata about how the context was determined.
 */
export type ContextResolutionResult = {
    config: ContextConfig;
    resolvedBy: 'object_id' | 'object_type' | 'name_fallback' | 'default';
    confidence: 'high' | 'medium' | 'low';
    warnings?: string[]; // e.g., "Guessed class by keyword 'hangar'", "No specific rules found"
};

/**
 * CLASS_TEMPLATES: Base logic definitions for major building classes.
 */
export const CLASS_TEMPLATES: Record<ObjectClass, Partial<ContextConfig>> = {
    multilevel_building: {
        localizationMode: 'floor_based',
        locatorEntityKind: 'floor',
        locatorLabel: 'Этаж / Уровень',
        wholeObjectLabel: '— По всему зданию —',
        zoneLabel: 'Детальное место (Зона)',
        analyticsGroupingKey: 'by_floor',
        locatorUnit: 'эт.',
    },
    technical_facility: {
        localizationMode: 'section_based',
        locatorEntityKind: 'section',
        locatorLabel: 'Секция / Блок',
        wholeObjectLabel: '— Весь корпус —',
        zoneLabel: 'Участок внутри секции',
        analyticsGroupingKey: 'by_section',
    },
    external_site: {
        localizationMode: 'area_based',
        locatorEntityKind: 'area',
        locatorLabel: 'Участок / Сектор',
        wholeObjectLabel: '— По всей территории —',
        zoneLabel: 'Детализация участка',
        analyticsGroupingKey: 'by_area',
    },
    external_networks: {
        localizationMode: 'route_based',
        locatorEntityKind: 'route_segment',
        locatorLabel: 'Участок трассы',
        wholeObjectLabel: '— По всей трассе —',
        zoneLabel: 'Узел / Колодец',
        analyticsGroupingKey: 'by_route',
    },
    linear_object: {
        localizationMode: 'route_based',
        locatorEntityKind: 'picket',
        locatorLabel: 'Пикет (ПК)',
        wholeObjectLabel: '— Весь объект —',
        zoneLabel: 'Участок',
        analyticsGroupingKey: 'by_route',
        locatorUnit: 'ПК',
    },
    // Default fallback
    generic_object: {
        localizationMode: 'none',
        locatorEntityKind: 'none',
        locatorLabel: 'Локация',
        wholeObjectLabel: '— По всему объекту —',
        zoneLabel: 'Участок',
        analyticsGroupingKey: 'whole_object',
    },
    lowrise_building: {
        localizationMode: 'section_based',
        locatorEntityKind: 'section',
        locatorLabel: 'Секция / Блок',
        wholeObjectLabel: '— Весь объект —',
        zoneLabel: 'Детальное место',
        analyticsGroupingKey: 'by_section',
    },
    parking_object: {
        localizationMode: 'floor_based',
        locatorEntityKind: 'floor',
        locatorLabel: 'Уровень паркинга',
        wholeObjectLabel: '— Весь паркинг —',
        zoneLabel: 'Сектор / Место',
        analyticsGroupingKey: 'by_floor',
        locatorUnit: 'ур.',
    }
};
