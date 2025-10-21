const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { parse } = require("csv-parse");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));

let features = [];
const CSV_PATH = "./data/mock_points.csv";

function loadCsvToMemory() {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(CSV_PATH)
      .pipe(parse({ columns: true, trim: true }))
      .on("data", (row) => rows.push(row))
      .on("end", () => {
        features = rows
          .map((r) => {
            const lat = parseFloat(r.lat);
            const lng = parseFloat(r.lng);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              return {
                type: "Feature",
                properties: {
                  id: r.id,
                  name: r.name,
                  category: r.category,
                  datetime: r.datetime,
                },
                geometry: { type: "Point", coordinates: [lng, lat] },
              };
            }
            return null;
          })
          .filter(Boolean);
        console.log(`Loaded ${features.length} points from CSV`);
        resolve();
      })
      .on("error", reject);
  });
}

function inBBox([minLng, minLat, maxLng, maxLat], [lng, lat]) {
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

// /api/points?category=Theft&dateFrom=2025-09-10&dateTo=2025-10-05&bbox=minLng,minLat,maxLng,maxLat
app.get("/api/points", (req, res) => {
  const { category, dateFrom, dateTo, bbox } = req.query;
  let data = features;

  if (category && category !== "All") {
    data = data.filter(
      (f) =>
        (f.properties.category || "").toLowerCase() ===
        category.toLowerCase()
    );
  }
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!isNaN(from)) {
      data = data.filter((f) => new Date(f.properties.datetime) >= from);
    }
  }
  if (dateTo) {
    const to = new Date(dateTo);
    if (!isNaN(to)) {
      data = data.filter((f) => new Date(f.properties.datetime) <= to);
    }
  }
  if (bbox) {
    const parts = bbox.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      data = data.filter((f) => inBBox(parts, f.geometry.coordinates));
    }
  }

  res.json({ type: "FeatureCollection", features: data });
});

loadCsvToMemory()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`Server running at http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("Failed to load CSV:", err);
    process.exit(1);
  });
