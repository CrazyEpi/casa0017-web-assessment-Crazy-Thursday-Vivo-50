This is the GitHub README file generated in **English** and **Markdown** format, based on your uploaded web content and report.

-----

# 🏙️ Chicago Crime Data Visualization Platform

[](https://github.com/CrazyEpi/casa0017-web-assessment-Crazy-Thursday-Vivo-50)

> This project designs and implements a Web platform to visually display recent Chicago crime statistics, including crime type, time trends, and spatial distribution, using an interactive map and statistical charts. The goal is to enhance public awareness of urban safety and risk.

## 🔗 Project Links

  * **GitHub Repository:** `https://github.com/CrazyEpi/casa0017-web-assessment-Crazy-Thursday-Vivo-50`
  * **Website Demo (Internal IP):** `10.129.111.11:3000`

## ✨ Key Features

The platform consists of two main sections: **Home** (Map) and **Data** (Statistics).

### 📍 Home Page - Interactive Crime Map

The Home page features a dynamic map centered on Chicago (`[41.8781, -87.6298]`) for spatial crime visualization.

  * **Map Visualization Modes:**
      * **Marker Cluster View:** Uses `leaflet.markercluster` to group nearby crime incidents into clusters, providing an uncluttered overview of density at different zoom levels.
      * **Heatmap View:** Utilizes `leaflet.heat` to show a continuous intensity surface, clearly highlighting crime hot spots across the city.
  * **Data Filtering and Control:**
      * **Real-time Filtering:** Users can filter the displayed crime data on the map by **Crime Type (Category)** and **Date Range (From / To dates)**.
  * **ZIP Code Search:**
      * A search box in the navigation bar allows users to input a ZIP code to automatically pan the map to the location and place a marker.
  * **Crime News Section:**
      * A list of selected Chicago crime-related news articles is displayed below the map (currently static content).

### 📊 Data Page - Statistical Analysis

The Data page provides analytical charts using Chart.js to help users understand crime patterns.

  * **Time Trend Analysis:** Visualizes crime counts by **Month** and **Day of the Week** to identify temporal patterns.
  * **Crime Type Distribution:** Displays the **Top 10** most frequent crime types, aggregating the rest into an "Other" category for clarity.
  * **Binary Outcome Analysis:** Presents the proportion of crimes resulting in **Arrest** (typically low, under 15%) and the distribution of **Domestic Incidents** (approx. 15%-20% of total crimes).
  * **Filter Consistency:** All statistical charts are dynamically updated based on the date and category filters applied on the Home page, ensuring data view continuity.

## ⚙️ Technology Stack

| Area | Technology/Tool | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML, CSS, JavaScript | Structure, style, and client-side logic. |
| **Mapping** | Leaflet.js, OpenStreetMap | Core interactive map library and base map tiles. |
| **Mapping Plugins** | `leaflet.markercluster`, `leaflet.heat` | Implementations for point aggregation and hot spot visualization. |
| **Charting** | Chart.js | Library for rendering statistical bar and pie charts on the Data page. |
| **Backend** | Node.js (Express) | Lightweight server for handling API requests and serving static files. |
| **Database** | SQLite3 (`better-sqlite3`) | Stores over 170,000 crime records (e.g., from 2025 data). |
| **Optimization** | Database Indexing | Indexes on Lat/Lng, Primary Type, and Date fields for query efficiency. |
| **Deployment** | Raspberry Pi | The website is hosted and run on a Raspberry Pi device. |

## 👥 Group Members

This project was completed as the Final Report for the CASA0017 Web Architecture course.

  * Wu Yitong (25041013)
  * Hu Haoyu (25037784)
  * He Jiahua (25086119)
  * Wang Ziyi (25044289)
