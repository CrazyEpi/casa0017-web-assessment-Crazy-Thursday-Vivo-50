const map = L.map("map", { zoomControl: true }).setView([41.8781, -87.6298], 11);


L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let clusterGroup = L.markerClusterGroup({
  chunkedLoading: true, //enable chunked loading
  chunkInterval: 50,
  chunkDelay: 25,
  removeOutsideVisibleBounds: true,
  spiderfyOnMaxZoom: false,
  disableClusteringAtZoom: 17
});
map.addLayer(clusterGroup);

// Heatmap layer
let heatLayer = L.heatLayer([], {
  radius: 20,
  blur: 15,
  maxZoom: 17,
  // gradient: {0.2:'#00461bff', 0.4:'#67b600ff', 0.6:'#ffff00', 0.8:'#ff8800', 1:'#ff0000'} // 可选自定义配色
});

const $category = document.getElementById("category");
const $dateFrom = document.getElementById("dateFrom");
const $dateTo = document.getElementById("dateTo");
const $apply = document.getElementById("apply");
const $reset = document.getElementById("reset");
const $toggleHeat = document.getElementById("toggleHeat");
if ($toggleHeat) $toggleHeat.checked = false;

function getBboxParam() {
  const b = map.getBounds();
  return `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
}

async function fetchPoints({ useBbox = true } = {}) {
  const p = new URLSearchParams();
  if ($category.value && $category.value !== "All") p.set("primaryType", $category.value);
  if ($dateFrom.value) p.set("dateFrom", $dateFrom.value);
  if ($dateTo.value) p.set("dateTo", $dateTo.value);
  if (useBbox) p.set("bbox", getBboxParam());
  p.set("z", map.getZoom());
  const res = await fetch(`/api/points?${p.toString()}`);
  return res.json();
}

// Convert GeoJSON to heat points
function toHeatPoints(geojson) {
  return geojson.features.map(f => {
    const [lng, lat] = f.geometry.coordinates;
    return [lat, lng, 1];
  });
} 

function renderPoints(geojson) {
  clusterGroup.clearLayers();
  geojson.features.forEach((f) => {
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties || {};
    const marker = L.marker([lat, lng]).bindPopup(
      `<b>${p.primaryType || "Unknown"}</b><br/>
       Description: ${p.description || "N/A"}<br/>
       Block: ${p.block || "N/A"}<br/>
       Date: ${p.date || "N/A"}<br/>
       Arrest: ${p.arrest || "N/A"}<br/>
       Case: ${p.caseNumber || p.id || "N/A"}`
    );
    clusterGroup.addLayer(marker);
  });

  const heatPoints = toHeatPoints(geojson);
  heatLayer.setLatLngs(heatPoints);

  if ($toggleHeat && $toggleHeat.checked) {
    if (!map.hasLayer(heatLayer)) map.addLayer(heatLayer);
    if (map.hasLayer(clusterGroup)) map.removeLayer(clusterGroup);
  } else {
    if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    if (!map.hasLayer(clusterGroup)) map.addLayer(clusterGroup);
  }
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

// Heatmap toggle
if ($toggleHeat) {
  $toggleHeat.addEventListener("change", () => {
    if ($toggleHeat.checked) {
      if (!map.hasLayer(heatLayer)) map.addLayer(heatLayer);
      if (map.hasLayer(clusterGroup)) map.removeLayer(clusterGroup);
    } else {
      if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
      if (!map.hasLayer(clusterGroup)) map.addLayer(clusterGroup);
    }
  });
}

let timer;
map.on("moveend", () => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const data = await fetchPoints({ useBbox: true });
    renderPoints(data);
  }, 200);
});


// -----------------------------
// Chicago Crime Articles Section
// -----------------------------

const sampleArticles = [
  {
    title: "Chicago crime: Group beats up man on CTA train, police say",
    url: "https://www.fox32chicago.com/news/cta-train-beating-10-26",
    excerpt: "A man was beaten up by a group of offenders on a CTA train on Chicago's South Side late Saturday night.",
    time: "October 26, 2025 8:10 AM CDT",
    thumb: "https://images.foxtv.com/static.fox32chicago.com/www.fox32chicago.com/content/uploads/2021/01/568/320/eddf8a2e-cta20red20line20train_1475030696822_2083861_ver1.0_640_360.jpg?ve=1&tl=1"
  },
  {
    title: "1 dead, 6 injured after mass shooting at Lincoln University Homecoming event",
    url: "https://www.fox32chicago.com/news/french-officials-arrest-multiple-suspects-louvre-crown-jewel-heist",
    excerpt: "A Homecoming celebration turned deadly when gunfire erupted on campus Saturday night.",
    time: "October 26, 2025 7:20 AM CDT",
    thumb: "https://images.foxtv.com/static.livenowfox.com/www.livenowfox.com/content/uploads/2025/10/568/320/gettyimages-2241715643.jpg?ve=1&tl=1"
  },
  {
    title: "Three men hospitalized after South Lawndale shooting, police say",
    url: "https://www.fox32chicago.com/news/1-dead-6-injured-after-mass-shooting-lincoln-university-homecoming-event",
    excerpt: "Three men have been hospitalized after a shooting in South Lawndale on Saturday, according to police.",
    time: "October 25, 2025 4:06 PM CDT",
    thumb: "https://images.foxtv.com/c107833-mcdn.mp.lura.live/expiretime=2082787200/f6617ab47c7155e7646afbe432adab47990784e034494a4c01a3d5daaacbc5b2/iupl/EF4/2F7/568/320/EF42F74116A7611ECA94465AC6DDC4CE.jpg?ve=1&tl=1"
  },
  {
    title: "Three men hospitalized after South Lawndale shooting, police say",
    url: "https://www.fox32chicago.com/news/three-men-hospitalized-after-south-lawndale-shooting-police-say",
    excerpt: "Three men have been hospitalized after a shooting in South Lawndale on Saturday, according to Chicago police.",
    time: "October 25, 2025 4:06 PM CDT",
    thumb: "https://images.foxtv.com/static.fox32chicago.com/www.fox32chicago.com/content/uploads/2023/01/568/320/GettyImages-1201958221-1.jpg?ve=1&tl=1"
  },
  {
    title: "1 arrested, 1 injured in shooting at Austin Central Library",
    url: "https://www.fox32chicago.com/news/austin-police-search-suspect-critical-incident-downtowng",
    excerpt: "Austin police said one person has been transported to the hospital after what they are calling a ‘critical incident’ in downtown Austin Saturday.",
    time: "October 25, 2025 4:03 PM CDT",
    thumb: "https://images.foxtv.com/c107833-mcdn.mp.lura.live/expiretime=2082787200/c785d03a6952f02fb874399cdae585c8f8a6c516782ecd221bc226daa7d645d2/iupl/A41/75A/568/320/A4175AC8791F4ED2C9B6179AB244B63A.jpg?ve=1&tl=1"
  },
  {
    title: "4 children kidnapped in Chicago's south suburbs found as police look for offender",
    url: "https://www.fox32chicago.com/news/riverdale-amber-alert",
    excerpt: "Police are searching for a man who allegedly kidnapped four children out of south suburban Riverdale early Saturday morning.",
    time: "October 25, 2025 3:58 PM CDT",
    thumb: "https://images.foxtv.com/static.fox32chicago.com/www.fox32chicago.com/content/uploads/2025/10/568/320/riverdale-amber-alert.jpg?ve=1&tl=1"
  },
  {
    title: "Chicago crime: 1 killed, another hurt in shooting that led to NW Side crash, CPD says",
    url: "https://www.fox32chicago.com/news/nw-side-shooting-crash",
    excerpt: "A shooting early Saturday morning in Chicago’s Northwest Side led to a crash and left one person dead and another in critical condition, according to police.",
    time: "October 25, 2025 3:40 PM CDT",
    thumb: "https://images.foxtv.com/static.fox32chicago.com/www.fox32chicago.com/content/uploads/2022/10/568/320/fd314c0b-ambulance.jpg?ve=1&tl=1"
  },
  {
    title: "Antisemitic attack on kids in Skokie park was a hate crime, police say",
    url: "https://www.fox32chicago.com/news/skokie-park-antisemitic-hate-crime-police",
    excerpt: "An antisemitic attack on a group of kids at a Skokie park after a faith class is being considered a hate crime, police say.",
    time: "October 25, 2025 3:28 PM CDT",
    thumb: "https://images.foxtv.com/static.fox32chicago.com/www.fox32chicago.com/content/uploads/2022/02/568/320/gettyimages-1177914929-1.jpg?ve=1&tl=1"
  },
  {
    title: "Eight Americans arrested in Bahamas after authorities discover high-powered weapons cache, ammunition",
    url: "https://www.fox32chicago.com/news/americans-arrested-bahamas-weapons-cache-ammunition",
    excerpt: "Authorities said Americans were arrested in Bimini, Bahamas, after police discovered high-powered weapons, ammunition and cash on board a vessel.",
    time: "October 25, 2025 3:02 PM CDT",
    thumb: "https://images.foxtv.com/static.livenowfox.com/www.livenowfox.com/content/uploads/2025/10/568/320/bahamas.jpg?ve=1&tl=1g"
  },
  {
    title: "Chicago crime: Multiple garage burglaries reported in Bronzeville, police say",
    url: "https://www.fox32chicago.com/news/bronzeville-garage-burglaries-alert",
    excerpt: "Chicago police are warning of multiple garage burglaries in the Bronzeville neighborhood over the past week.",
    time: "October 25, 2025 2:54 PM CDT",
    thumb: "https://images.foxtv.com/static.fox32chicago.com/www.fox32chicago.com/content/uploads/2019/10/568/320/police-lights_1491141822423_3037080_ver1.0_640_360.jpg?ve=1&tl=1"
  },
  {
    title: "2 in custody after 5 shot near Howard University during homecoming event: police",
    url: "https://www.fox32chicago.com/news/4-people-shot-near-howard-university-homecoming-events-take-place",
    excerpt: "Two suspects are in custody after a shooting near Howard University Friday night left five people wounded.",
    time: "October 25, 2025 2:35 PM CDT",
    thumb: "https://images.foxtv.com/c107833-mcdn.mp.lura.live/expiretime=2082787200/01582c38b55993939b5521b38b115a5ab1d75668af2bd2dbd3ae419317d2e358/iupl/261/16C/568/320/26116CA791289B4777236A967C7095F5.jpg?ve=1&tl=1"
  },
  {
    title: "Ex-deputy escalated deadly encounter with Sonya Massey, report says",
    url: "https://www.fox32chicago.com/video/1729779",
    excerpt: "A report has revealed new details about a deadly police encounter that left Sonya Massey dead, showing the former Illinois deputy escalated the situation.",
    time: "October 25, 2025 2:10 PM CDT",
    thumb: "https://images.foxtv.com/c107833-mcdn.mp.lura.live/expiretime=2082787200/c12007fd5d0f8d598c7a960cc59f8e4b8e53aa3f9ea1f58524069ca2eb00fc35/iupl/A78/1FE/568/320/A781FE2846EA80613380C8A70986B143.jpg?ve=1&tl=1"
  },
  {
    title: "Wisconsin child sex assault suspect arrested in Blue Island",
    url: "https://www.fox32chicago.com/news/wisconsin-child-sex-assault-suspect-arrested-blue-island",
    excerpt: "A man wanted in Wisconsin for child sexual assault was taken into custody in Blue Island, Illinois, police said Saturday morning.",
    time: "October 25, 2025 1:55 PM CDT",
    thumb: "https://images.foxtv.com/static.fox32chicago.com/www.fox32chicago.com/content/uploads/2025/10/568/320/michael-blackwell.jpg?ve=1&tl=1"
  }
];

function renderArticles(articles, containerId = "article-list") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  articles.forEach((a) => {
    const item = document.createElement("article");
    item.className = "article-item";

    const thumb = document.createElement("a");
    thumb.className = "article-thumb";
    thumb.href = a.url;
    thumb.target = "_blank";
    thumb.rel = "noopener";
    thumb.style.backgroundImage = `url(${a.thumb})`;

    const meta = document.createElement("div");
    meta.className = "article-meta";

    const title = document.createElement("a");
    title.className = "article-title";
    title.href = a.url;
    title.target = "_blank";
    title.rel = "noopener";
    title.textContent = a.title;

    const excerpt = document.createElement("p");
    excerpt.className = "article-excerpt";
    excerpt.textContent = a.excerpt;

    const time = document.createElement("div");
    time.className = "article-time";
    time.textContent = a.time;

    meta.appendChild(title);
    meta.appendChild(excerpt);
    meta.appendChild(time);

    item.appendChild(thumb);
    item.appendChild(meta);
    container.appendChild(item);
  });
}


window.addEventListener("DOMContentLoaded", () => {
  renderArticles(sampleArticles);
});

// ZIP Code Search Function

// Get the search box element
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

// Clicking the search button event
searchBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) {
    alert("Please enter a ZIP code to search.");
    return;
  }

  try {
    // Use the OpenStreetMap Nominatim API to obtain the postal code, latitude and longitude
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${query}&country=United+States&format=json&limit=1`
    );
    const data = await res.json();

    if (data.length === 0) {
      alert("ZIP code not found. Please try another one.");
      return;
    }

    // Obtain the first matching result
    const { lat, lon, display_name } = data[0];

    // The map jumps to this location.
    map.setView([parseFloat(lat), parseFloat(lon)], 13);

    // Add a marker to indicate the position
    L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`<b>${display_name}</b><br>ZIP Code: ${query}`)
      .openPopup();
  } catch (err) {
    console.error("Search error:", err);
    alert("Error searching ZIP code. Please try again later.");
  }
});

// Press the Enter key to trigger the search
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchBtn.click();
  }
});
