# Deterministic source ingestion

`Raw source → adapter → normalized records → classification mapping → candidate → collision audit → domain review → approved work`.

Every run records source ID, version, checksum, license decision and a deterministic output hash. Imports never overwrite an approved version silently. Added, changed, removed and collided records are reported. Rollback selects an earlier immutable source version. Fixtures without authoritative data remain test-only and never increase `professionalWorkCount`.

Assemblies are reusable preparation, material, labor, equipment, transport, quality-control and documentation components. A work passport selects and configures them; the passport remains the semantic owner.
