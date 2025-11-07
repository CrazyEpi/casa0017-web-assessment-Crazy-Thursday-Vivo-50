DROP TABLE IF EXISTS Crimes_real;
CREATE TABLE Crimes_real AS
SELECT
  "ID",
  "Case Number",
  "Date",
  "Block",
  "Primary Type",
  "Description",
  "Arrest",
  "District",
  "Ward",
  CAST("Latitude"  AS REAL) AS "Latitude",
  CAST("Longitude" AS REAL) AS "Longitude"
FROM "Crimes";

-- 索引
CREATE INDEX IF NOT EXISTS idx_crimes_real_lat ON Crimes_real("Latitude");
CREATE INDEX IF NOT EXISTS idx_crimes_real_lng ON Crimes_real("Longitude");
CREATE INDEX IF NOT EXISTS idx_crimes_real_primary ON Crimes_real("Primary Type");

ANALYZE;
