> Although the accuracy sometimes reaches around 15m, its still not (as of Feb 13 2026) fully reliable for path tracking. I recommend using this to get an overall idea of where the buildings are standing, and also their hindsight internal structure by clicking on an building.

# CETMaps

Navigate College of Engineering Trivandrum with a modern web app.

Live demo: [cetmaps.vercel.app](https://cetmaps.vercel.app)

---

## Features

- GPS location tracking
- Walking directions between any two points
- Search for buildings, hostels, labs, and aliases (e.g., "LH", "Ground")
- Permanent labels on all campus structures
- Dark mode with matching map tiles
- Map rotation (touch, keyboard, button)
- Clean CartoDB basemap (light & dark)
- Color-coded layers for buildings, hostels, landmarks
- Works offline after first load
- Installable as a PWA
- Fast loading with service worker

---

## Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (optional, for local development)

### Installation

Clone the repository:

    git clone https://github.com/rohankishore/CETMaps.git
    cd CETMaps

Serve locally (choose one):

    npx serve .
    # OR
    python -m http.server 8000
    # OR
    php -S localhost:8000

Visit `http://localhost:8000` in your browser.

---

## Architecture

### Tech Stack
- Map Engine: Leaflet.js + leaflet-rotate
- Data Format: GeoJSON
- Basemap: CartoDB (light & dark, no labels)
- Offline: Service Worker + Cache API
- Routing: Custom A* pathfinding algorithm
- UI: Vanilla JavaScript + CSS Variables

### File Structure

    CETMaps/
    ├── index.html          # Main application
    ├── src/
    │   ├── app.js         # Core logic & map initialization
    │   └── styles.css     # Theming & responsive design
    ├── cet.geojson        # Campus data (buildings, paths, POIs)
    ├── sw.js              # Service worker for offline support
    ├── manifest.webmanifest  # PWA configuration
    └── public/
        └── icons/         # App icons (192x192, 512x512)

---

## Data Format

The `cet.geojson` file uses a simple property structure:

    {
      "type": "Feature",
      "properties": {
        "Building Name": ""
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }

Property key = Feature name (displayed on map)
Property value = Can be empty or contain description

---

## Development

### Adding New Features
- Buildings: Add polygon features to `cet.geojson`
- Paths: Add LineString features for routing
- Markers: Add Point features for landmarks

### Customizing Colors
Edit the `COLORS` object in `src/app.js`:

    const COLORS = {
      building: "#0b8a5d",
      landmark: "#f18f01",
      hostel: "#1768ac",
      path: "#05603c",
      default: "#666666"
    };

### Theme Customization
Modify CSS variables in `src/styles.css`:

    :root {
      --accent: #0d74ff;
      --panel: rgba(255, 255, 255, 0.96);
      /* ... more variables */
    }

---

## PWA Installation

### Android
1. Open the site in Chrome
2. Tap "Add to Home Screen"
3. Launch from home screen

### iOS
1. Open in Safari
2. Tap Share → "Add to Home Screen"
3. Access from home screen

### Desktop
1. Open in Chrome/Edge
2. Click install icon in address bar
3. Use as standalone app

---

## Roadmap

- Indoor navigation for multi-floor buildings
- AR navigation mode
- User-contributed photos and reviews
- Events and notices overlay
- Multi-language support
- Accessibility improvements

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Leaflet.js
- CartoDB
- leaflet-rotate
- CET Community
