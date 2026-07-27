-- Codes only need to be unique among siblings (same parent), not globally, so the same
-- short code (e.g. "01") can be reused under different parents and still form distinct
-- concatenated full codes (e.g. LR-01-01 vs LR-02-01).
DROP INDEX "locations_code_key";

CREATE UNIQUE INDEX "locations_parent_location_id_code_key" ON "locations"("parent_location_id", "code");
