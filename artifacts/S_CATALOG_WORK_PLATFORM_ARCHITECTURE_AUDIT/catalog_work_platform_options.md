# Catalog Work Platform Architecture Options

Wave: S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT_BEFORE_MIGRATION_POINT_OF_NO_RETURN
Revision: REV_AFTER_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH

Option A: keep catalog_items as-is and only document gaps. Lowest migration risk, but manual/template gap remains.

Option B: add an additive DB ontology layer for construction work types, classifications, and catalog links. Recommended because it preserves catalog_items as source-of-truth while enabling standards mapping and hybrid retrieval.

Option C: replace catalog_items with a second catalog. Rejected for this roadmap because it would break request, foreman, marketplace, history, and PDF links.

This document does not replace the master roadmap. It is a pre-migration audit handoff for the next additive ontology wave.

Recommended option: B
Planned next wave: S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_POINT_OF_NO_RETURN
fake_green_claimed=false
