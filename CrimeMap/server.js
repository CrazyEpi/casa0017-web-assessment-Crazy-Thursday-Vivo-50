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
  path.join(__dirname, "data", "Crimes_2023-2025_20251002.db");

const db = new Database(DB_PATH, { readonly: true });

// select table with REAL and indexed latitude / longitude columns
function pickTable() {
  const exists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get("Crimes_real");
  if (exists) return "Crimes_real";

  // fallback: auto-detect a table that has lat/lng columns
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
    .all()
    .map(r => r.name);

  for (const t of tables) {
    const cols = db.prepare(`PRAGMA table_info("${t}")`).all();
    const names = cols.map(c => c.name.toLowerCase());
    if (names.includes("latitude") && names.includes("longitude")) return t;
  }
  throw new Error("failed to find table with Latitude/Longitude");
}

const TABLE = pickTable();
console.log(`Using table: ${TABLE}`);

// map front-end "category" (UI terms) to Chicago "Primary Type"
function normalizePrimaryType(query) {
  // accept either ?primaryType= or ?category=
  const raw = (query.primaryType || query.category || "").trim();

  if (!raw || raw.toLowerCase() === "all") return null;

  // ui → dataset primary type (case-insensitive)
  const ui = raw.toLowerCase();
  const mapUIToCPD = {
    // "Theft" | "Vandalism" | "Traffic" | "Noise" | "Other"
    theft: "THEFT",
    vandalism: "CRIMINAL DAMAGE",
    traffic: "TRAFFIC VIOLATION",
    noise: "PUBLIC PEACE VIOLATION",
    other: "OTHER OFFENSE"
  };

  const mapped = mapUIToCPD[ui];

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
    
    const z = Number(req.query.z) || 11;
    const cap = maxLimitByZoom(z);
    const lim = Math.min(Number(limit) || cap, cap);
    const off = Math.max(Number(offset) || 0, 0);

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
        "Latitude"  as lat,
        "Longitude" as lng
      FROM "${TABLE}"
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY "Date" DESC
      LIMIT ? OFFSET ?
    `;

    // const lim = Math.min(Number(limit) || 50000, 100000);
    // const off = Number(offset) || 0;

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

// dynamic max limit based on zoom level
function maxLimitByZoom(z) {
  if (z >= 15) return 15000;
  if (z >= 13) return 10000;
  if (z >= 11) return  8000;
  return 5000; 
}


// API: count points
// SUPPORT: used by front-end to get total number of filtered points
app.get("/api/points", (req, res) => {
  try {
    const resolvedPrimary = normalizePrimaryType(req.query);
    const { bbox, dateFrom, dateTo, limit, offset } = req.query;

    // read zoom level
    const z = Number(req.query.z) || 11;

    // calculate limit cap based on zoom
    const cap = maxLimitByZoom(z);
    const lim = Math.min(Number(limit) || cap, cap);
    const off = Math.max(Number(offset) || 0, 0);

    // generate WHERE clause
    const { where, params } = buildWhere({
      primaryType: resolvedPrimary,
      dateFrom,
      dateTo,
      bbox
    });

    // sql query
    const sql = `
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
        "Latitude"  as lat,
        "Longitude" as lng
      FROM "${TABLE}"
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY "Date" DESC
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(sql).all(...params, lim, off);

    // date filter with JS
    let filtered = rows;
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to   = dateTo   ? new Date(dateTo)   : null;
      filtered = rows.filter((r) => {
        const d = new Date(r.date);
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      });
    }

    // return GeoJSON
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

// start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Database loaded from: ${DB_PATH}`);
});
