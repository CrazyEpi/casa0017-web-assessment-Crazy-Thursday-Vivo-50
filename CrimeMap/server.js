const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));

// database path
const DB_PATH =
  process.env.CRIME_DB_PATH ||
  path.join(__dirname, "data", "Crimes_2025_20251002.db");

const db = new Database(DB_PATH, { readonly: true });

// select table with latitude / longitude columns
function detectTable() {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
    .all()
    .map(row => row.name);

  for (const t of tables) {
    const cols = db.prepare(`PRAGMA table_info("${t}")`).all();
    const colNames = cols.map(c => c.name.toLowerCase());
    if (colNames.includes("latitude") && colNames.includes("longitude")) {
      return t;
    }
  }
  throw new Error("failed to fetch Latitude / Longitude columns");
}

const TABLE = detectTable();
console.log(`Using table: ${TABLE}`);

// map front-end "category" (UI terms) to Chicago "Primary Type"
function normalizePrimaryType(query) {
  // accept either ?primaryType= or ?category=
  const raw = (query.primaryType || query.category || "").trim();

  if (!raw || raw.toLowerCase() === "all") return null;

  // ui → dataset primary type (case-insensitive)
  const ui = raw.toLowerCase();
  const mapUIToCPD = {
    // your UI options:
    // "Theft" | "Vandalism" | "Traffic" | "Noise" | "Other"
    theft: "THEFT",
    vandalism: "CRIMINAL DAMAGE",
    traffic: "TRAFFIC VIOLATION",        // 若库中没有此值，将回退到原始传值匹配
    noise: "PUBLIC PEACE VIOLATION",     // 若库中没有此值，将回退到原始传值匹配
    other: "OTHER OFFENSE"
  };

  const mapped = mapUIToCPD[ui];

  // 如果映射不到，直接用用户原值做不区分大小写匹配（兼容真实 Primary Type，如 BATTERY/ASSAULT等）
  return mapped || raw;
}

// query
function buildWhere({ primaryType, dateFrom, dateTo, bbox }) {
  const where = [];
  const params = [];

  // bbox
  if (bbox) {
    const parts = bbox.split(",").map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      const [minLng, minLat, maxLng, maxLat] = parts;
      where.push(`"Latitude" BETWEEN ? AND ? AND "Longitude" BETWEEN ? AND ?`);
      params.push(minLat, maxLat, minLng, maxLng);
    }
  }

  // type filter (case-insensitive)
  if (primaryType && primaryType !== "All") {
    where.push(`UPPER("Primary Type") = UPPER(?)`);
    params.push(primaryType);
  }

  return { where, params };
}

// API: return GeoJSON points
// SUPPORT: ?category= or ?primaryType= &dateFrom= &dateTo= &bbox= &limit=
app.get("/api/points", (req, res) => {
  try {
    // accept both primaryType and category from front-end
    const resolvedPrimary = normalizePrimaryType(req.query);

    const { dateFrom, dateTo, bbox, limit, offset } = req.query;
    const { where, params } = buildWhere({
      primaryType: resolvedPrimary,
      dateFrom,
      dateTo,
      bbox
    });

    // select required columns (cast lat/lng to REAL)
    const baseSQL = `
      SELECT
        "ID" as id,
        "Case Number" as caseNumber,
        "Date" as date,
        "Block" as block,
        "Primary Type" as primaryType,
        "Description" as description,
        "Arrest" as arrest,
        "District" as district,
        "Ward" as ward,
        CAST("Latitude"  AS REAL) as lat,
        CAST("Longitude" AS REAL) as lng
      FROM "${TABLE}"
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY "Date" DESC
      LIMIT ? OFFSET ?
    `;

    const lim = Math.min(Number(limit) || 3000, 20000);
    const off = Number(offset) || 0;

    const rows = db.prepare(baseSQL).all(...params, lim, off);

    // date filter with JS (to be consistent & robust)
    let filtered = rows;
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      filtered = rows.filter((r) => {
        const d = new Date(r.date);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    // GeoJSON
    const geojson = {
      type: "FeatureCollection",
      features: filtered
        .filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng))
        .map(r => ({
          type: "Feature",
          properties: {
            id: r.id,
            caseNumber: r.caseNumber,
            date: r.date,
            block: r.block,
            primaryType: r.primaryType,
            description: r.description,
            arrest: r.arrest,
            district: r.district,
            ward: r.ward,
          },
          geometry: { type: "Point", coordinates: [r.lng, r.lat] },
        })),
    };

    res.json(geojson);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

// API: count points
// SUPPORT: used by front-end to get total number of filtered points
app.get("/api/points/count", (req, res) => {
  try {
    const resolvedPrimary = normalizePrimaryType(req.query);
    const { dateFrom, dateTo, bbox } = req.query;

    const { where, params } = buildWhere({
      primaryType: resolvedPrimary,
      dateFrom,
      dateTo,
      bbox
    });

    // pull only date/coords for lightweight counting, cast to REAL
    const sql = `
      SELECT
        "Date" as date,
        CAST("Latitude"  AS REAL) as lat,
        CAST("Longitude" AS REAL) as lng
      FROM "${TABLE}"
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
    `;

    const rows = db.prepare(sql).all(...params);

    // JS-side date filter & coordinate sanity (same logic as /api/points)
    let filtered = rows.filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to   = dateTo   ? new Date(dateTo)   : null;
      filtered = filtered.filter(r => {
        const d = new Date(r.date);
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      });
    }

    res.json({ count: filtered.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

// start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Database loaded from: ${DB_PATH}`);
});
