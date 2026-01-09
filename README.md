# CETMaps

Progressive Web App for navigating the College of Engineering Trivandrum campus fully offline.

## Highlights
- Leaflet.js + OpenStreetMap base map tailored for outdoor/mobile use, locked to the CET boundary perimeter
- Local GeoJSON layers for buildings, hostels, landmarks, and pedestrian paths
- Alias-based search ("EEE block", "LH", "Ground") with instant map focus
- On-device routing entirely within campus paths — no external APIs
- GPS location display plus installable PWA experience that works offline (app shell, data, tiles cached)

## Getting Started
1. Install dependencies (none beyond a static server) and run any static host, e.g. `npx serve .` from the repo root.
2. Open http://localhost:3000 (or the reported URL) on mobile/desktop.
3. Allow location access for live positioning, pick start/destination, and tap **Route**.

## Offline & PWA
- A service worker (`sw.js`) precaches the UI, data, icons, and Leaflet assets, plus runtime-caches GeoJSON + OSM tiles.
- `manifest.webmanifest` enables installation with maskable icons.
- Use Chrome/Edge's "Install app" prompt or add to home screen on Android/iOS Safari.

## Data
- GeoJSON lives in `/data`. Update or extend feature collections to cover more campus assets.
- Route graph auto-builds from `paths.geojson`, so keep path segments continuous for accurate routing.

## Contributing
Feel free to open issues for new data layers, improved styling, or additional offline tiles. 
