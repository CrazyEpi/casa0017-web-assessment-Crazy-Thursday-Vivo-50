const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { parse } = require("csv-parse");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static("public"));

let features = [];

//data file path
const CSV_PATH = "./data/crime_data.csv";

function loadCsvToMemory() {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(CSV_PATH)
      .pipe(parse({ columns: true, trim: true }))
      .on("data", (row) => rows.push(row))
      .on("end", () => {
        // convert to GeoJSON features
        features = rows
          .map((r) => {
            // latitude & longitude
            const lat = parseFloat(r["Latitude"]);
            const lng = parseFloat(r["Longitude"]);

            // skip invalid coordinates
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              return null;
            }

            // properties
            const props = {
              id: r["ID"],
              caseNumber: r["Case Number"],
              primaryType: r["Primary Type"],        
              description: r["Description"],         
              block: r["Block"],                     
              date: r["Date"],                       
              arrest: r["Arrest"],                   
              district: r["District"],               
              ward: r["Ward"],                       
            };

            return {
              type: "Feature",
              properties: props,
              geometry: {
                type: "Point",
                coordinates: [lng, lat], // GeoJSON is [lng, lat]
              },
            };
          })
          .filter(Boolean); // skip nulls

        console.log(`Loaded ${features.length} crime records from CSV`);
        resolve();
      })
      .on("error", reject);
  });
}

// in view box or not
function inBBox([minLng, minLat, maxLng, maxLat], [lng, lat]) {
  return (
    lng >= minLng &&
    lng <= maxLng &&
    lat >= minLat &&
    lat <= maxLat
  );
}

// API: return for points
// SUPPORT: ?bbox= &dateFrom= &dateTo= &primaryType=
app.get("/api/points", (req, res) => {
  const { primaryType, dateFrom, dateTo, bbox } = req.query;

  let data = features;

  // type filter
  if (primaryType && primaryType !== "All") {
    data = data.filter((f) => {
      const p = f.properties.primaryType || "";
      return p.toLowerCase() === primaryType.toLowerCase();
    });
  }

  // time filter
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!isNaN(from)) {
      data = data.filter(
        (f) => new Date(f.properties.date) >= from
      );
    }
  }

  if (dateTo) {
    const to = new Date(dateTo);
    if (!isNaN(to)) {
      data = data.filter(
        (f) => new Date(f.properties.date) <= to
      );
    }
  }

  // view box filter
  if (bbox) {
    const parts = bbox.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      data = data.filter((f) =>
        inBBox(parts, f.geometry.coordinates)
      );
    }
  }

  // return
  res.json({
    type: "FeatureCollection",
    features: data,
  });
});

// read CSV and start server
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
