// THIS IS TEMP FILE FOR TESTING ONLY
const map = L.map("map", { zoomControl: true }).setView([41.88, -87.63], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let clusterGroup = L.markerClusterGroup();
map.addLayer(clusterGroup);

const $category = document.getElementById("category");
const $dateFrom = document.getElementById("dateFrom");
const $dateTo = document.getElementById("dateTo");
const $apply = document.getElementById("apply");
const $reset = document.getElementById("reset");

function getBboxParam() {
  const b = map.getBounds();
  return `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
}

async function fetchPoints({ useBbox = true } = {}) {
  const p = new URLSearchParams();
  if ($category.value && $category.value !== "All") p.set("category", $category.value);
  if ($dateFrom.value) p.set("dateFrom", $dateFrom.value);
  if ($dateTo.value) p.set("dateTo", $dateTo.value);
  if (useBbox) p.set("bbox", getBboxParam());
  const res = await fetch(`/api/points?${p.toString()}`);
  return res.json();
}

function renderPoints(geojson) {
  clusterGroup.clearLayers();
  geojson.features.forEach((f) => {
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties || {};
    const marker = L.marker([lat, lng]).bindPopup(
      `<b>${p.name || "Point"}</b><br/>
       Category: ${p.category || "N/A"}<br/>
       DateTime: ${p.datetime || "N/A"}<br/>
       ID: ${p.id}`
    );
    clusterGroup.addLayer(marker);
  });
}

fetchPoints({ useBbox: true }).then(renderPoints);

$apply.addEventListener("click", async () => {
  const data = await fetchPoints({ useBbox: true });
  renderPoints(data);
});

$reset.addEventListener("click", async () => {
  $category.value = "All";
  $dateFrom.value = "";
  $dateTo.value = "";
  const data = await fetchPoints({ useBbox: true });
  renderPoints(data);
});

let timer;
map.on("moveend", () => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const data = await fetchPoints({ useBbox: true });
    renderPoints(data);
  }, 200);
});
