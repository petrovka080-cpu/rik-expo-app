# Professional Estimate Passport V4

Each authoritative `catalogWorkId` owns exactly one `passportId`. The passport is the
semantic owner of revisions and BOQ rows.

Calculation code may be shared through `calculationStrategyId`, formula primitives,
assemblies, validators and BOQ components. Shared code never owns the estimate.

Scope presets and search synonyms are not catalog works and do not receive passports.
Legacy synthetic IDs remain readable through a compatibility map; historical revisions
are immutable.

The current `10,000 + 1,610` template corpus is an implementation inventory, not yet
proof of 11,610 distinct real construction works.
