#  IN DEVELOPMENT. THE GPS MARGINS ARE AROUND 20-50M APPROX. USE IT FOR BUILDING IDENTIFICATIONS FOR NOW AS LOCATION TRACKING CAN BE A BIT INACCURATE. REST ASSURED, IT'LL BE FIXED WHEN I FIND A WAY TO REDUCE THE MARGINS TO ATLEAST 10-15M. IF THATS NOT POSSIBLE, I'LL TRY TO PREDICT THE NEXT USER ROUTE BASED ON DATA OF PREVIOUS USERS AND INCREASE THE ACCURACY. THANKS A LOT FOR TRYING IT OUT!!

# 🗺️ CET Campus Maps

<div align="center">

<img width="1273" height="687" alt="image" src="https://github.com/user-attachments/assets/3d989d19-d689-42ee-9197-6165b94b6778" />


**Navigate College of Engineering Trivandrum with style** ✨

[![Live Demo](https://img.shields.io/badge/🌐-Live%20Demo-blue?style=for-the-badge)](https://cetmaps.vercel.app)
[![PWA](https://img.shields.io/badge/📱-PWA%20Ready-success?style=for-the-badge)](#)
[![Offline](https://img.shields.io/badge/⚡-Works%20Offline-orange?style=for-the-badge)](#)

*An interactive, offline-first Progressive Web App for exploring CET campus*

</div>

---

## ✨ Features

### 🎯 **Core Navigation**
- 📍 **GPS Location Tracking** - Real-time positioning on campus
- 🛣️ **Smart Routing** - Walking directions between any two points
- 🔍 **Intelligent Search** - Find buildings, hostels, labs with aliases (e.g., "LH", "Ground")
- 🏷️ **Building Labels** - Permanent labels on all campus structures

### 🎨 **Visual Experience**
- 🌓 **Dark Mode** - Beautiful dark theme with matching map tiles
- 🔄 **360° Rotation** - Rotate the map with touch gestures or controls
- 🎭 **Label-Free Basemap** - Clean CartoDB tiles (light & dark variants)
- 🎨 **Color-Coded Layers** - Buildings, hostels, landmarks with distinct colors

### 📱 **Modern PWA**
- ⚡ **Fully Offline** - Works without internet after first load
- 📲 **Installable** - Add to home screen like a native app
- 🚀 **Fast Loading** - Service worker caches everything
- 📊 **Real-time Updates** - Live GPS positioning

### 🎮 **User Interface**
- 🔘 **Quick Filters** - Food courts, Labs, Hostels, Ground, Exam halls
- 🎛️ **Layer Toggles** - Show/hide buildings, landmarks, hostels, paths
- 📏 **Distance Display** - Walking time and distance estimates
- 🎯 **Focus Mode** - Click any building or marker to focus

---

## 🚀 Quick Start

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (optional, for local development)

### Installation

```bash
# Clone the repository
git clone https://github.com/rohankishore/CETMaps.git
cd CETMaps

# Serve locally (choose one)
npx serve .
# OR
python -m http.server 8000
# OR
php -S localhost:8000
```

Visit `http://localhost:8000` in your browser! 🎉

---

## 🏗️ Architecture

### Tech Stack
- **Map Engine**: Leaflet.js + leaflet-rotate
- **Data Format**: GeoJSON
- **Basemap**: CartoDB (light & dark, no labels)
- **Offline**: Service Worker + Cache API
- **Routing**: Custom A* pathfinding algorithm
- **UI**: Vanilla JavaScript + CSS Variables

### File Structure
```
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
```

---

## 🎨 Key Features Explained

### 🗺️ Single Data Source
All campus data (buildings, paths, landmarks) comes from **one GeoJSON file** (`cet.geojson`):
- **Polygons** → Buildings with labels
- **LineStrings** → Walkable paths
- **Points** → Landmarks and hostels

### 🌓 Smart Dark Mode
- Automatically switches basemap tiles
- Updates all UI colors using CSS variables
- Saves preference in localStorage
- Adjusts building label colors for contrast

### 🧭 Rotation Controls
- **Touch**: Two-finger rotation gesture
- **Keyboard**: Shift+Alt+Drag
- **Button**: Rotation control in bottom-right corner
- Powered by leaflet-rotate plugin

### 🎯 Intelligent Search
Search accepts:
- Full names: "Main Building"
- Aliases: "LH", "Ground", "CGPU"
- Partial matches: "dept", "lab"
- Categories: "canteen", "hostel"

---

## 📊 Data Format

The `cet.geojson` file uses a simple property structure:

```json
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
```

**Property key** = Feature name (displayed on map)
**Property value** = Can be empty or contain description

---

## 🛠️ Development

### Adding New Features
1. **Buildings**: Add polygon features to `cet.geojson`
2. **Paths**: Add LineString features for routing
3. **Markers**: Add Point features for landmarks

### Customizing Colors
Edit the `COLORS` object in `src/app.js`:
```javascript
const COLORS = {
  building: "#0b8a5d",
  landmark: "#f18f01",
  hostel: "#1768ac",
  path: "#05603c",
  default: "#666666"
};
```

### Theme Customization
Modify CSS variables in `src/styles.css`:
```css
:root {
  --accent: #0d74ff;
  --panel: rgba(255, 255, 255, 0.96);
  /* ... more variables */
}
```

---

## 📱 PWA Installation

### Android
1. Open the site in Chrome
2. Tap "Add to Home Screen"
3. Launch from home screen like any app

### iOS
1. Open in Safari
2. Tap Share → "Add to Home Screen"
3. Access from home screen

### Desktop
1. Open in Chrome/Edge
2. Click install icon in address bar
3. Use as standalone app

---

## 🎯 Roadmap

- [ ] Indoor navigation for multi-floor buildings
- [ ] AR navigation mode
- [ ] User-contributed photos and reviews
- [ ] Events and notices overlay
- [ ] Multi-language support
- [ ] Accessibility improvements

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Areas for Contribution
- 🗺️ More accurate campus data
- 🎨 UI/UX improvements
- 🐛 Bug fixes
- 📚 Documentation
- 🌐 Translations

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Leaflet.js** - Amazing open-source mapping library
- **CartoDB** - Beautiful basemap tiles
- **leaflet-rotate** - Rotation capabilities
- **CET Community** - For campus data and feedback

---

<div align="center">

**Made with ❤️ for the CET community**

[Report Bug](https://github.com/rohankishore/CETMaps/issues) · [Request Feature](https://github.com/rohankishore/CETMaps/issues)

</div> 
