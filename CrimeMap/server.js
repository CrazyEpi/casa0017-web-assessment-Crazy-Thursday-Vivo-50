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

// query
function buildWhere({ primaryType, dateFrom, dateTo, bbox }) {
  const where = [];
  const params = [];

  // bounding box
  if (bbox) {
    const parts = bbox.split(",").map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      const [minLng, minLat, maxLng, maxLat] = parts;
      where.push(`"Latitude" BETWEEN ? AND ? AND "Longitude" BETWEEN ? AND ?`);
      params.push(minLat, maxLat, minLng, maxLng);
    }
  }

  // type filter
  if (primaryType && primaryType !== "All") {
    where.push(`UPPER("Primary Type") = UPPER(?)`);
    params.push(primaryType);
  }

  return { where, params };
}

// API: return GeoJSON points
// SUPPORT: ?primaryType= &dateFrom= &dateTo= &bbox= &limit=
app.get("/api/points", (req, res) => {
  try {
    const { primaryType, dateFrom, dateTo, bbox, limit, offset } = req.query;
    const { where, params } = buildWhere({ primaryType, dateFrom, dateTo, bbox });

    // select required columns
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
        "Latitude" as lat,
        "Longitude" as lng
      FROM "${TABLE}"
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY "Date" DESC
      LIMIT ? OFFSET ?
    `;

    // set limits
    const lim = Math.min(Number(limit) || 3000, 20000);
    const off = Number(offset) || 0;

    // sql query
    const rows = db.prepare(baseSQL).all(...params, lim, off);

    // time filter with js
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

    // return GeoJSON "FeatureCollection"
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
// SUPPORT: count?
app.get("/api/points/count", (req, res) => {
  try {
    const { primaryType, dateFrom, dateTo, bbox } = req.query;
    const { where, params } = buildWhere({ primaryType, dateFrom, dateTo, bbox });

    const sql = `
      SELECT COUNT(*) as count
      FROM "${TABLE}"
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
    `;

    const result = db.prepare(sql).get(...params);
    res.json({ count: result.count });
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
