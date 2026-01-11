const MAP_CENTER = [8.54589, 76.90585];
const DEFAULT_ZOOM = 18;
const WALKING_SPEED_MPS = 1.4;
const CET_DATA_URL = "./data/cet.geojson";

const COLORS = {
  building: "#0b8a5d",
  landmark: "#f18f01",
  hostel: "#1768ac",
  path: "#05603c",
  default: "#666666"
};

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const quickChips = document.querySelectorAll("[data-alias]");
const resultsList = document.getElementById("results");
const resultTemplate = document.getElementById("resultTemplate");
const routeSummary = document.getElementById("routeSummary");
const locationStatus = document.getElementById("locationStatus");
const startSelect = document.getElementById("startSelect");
const endSelect = document.getElementById("endSelect");
const routeButton = document.getElementById("routeButton");
const cursorCoords = document.getElementById("cursorCoords");
const toggleRefs = {
  buildings: document.getElementById("buildingsToggle"),
  landmarks: document.getElementById("landmarksToggle"),
  hostels: document.getElementById("hostelsToggle"),
  paths: document.getElementById("pathsToggle")
};

let currentLocation = null;
let locationMarker;
let accuracyCircle;
let focusMarker;
let routeLine;
let graphNodes = null;
let boundaryLayer;
let campusBounds;
let maskLayer;
let boundaryRings = [];
let boundaryPolygons = [];
let locationWarningShown = false;

const layerStore = new Map();
const featureIndex = [];
const featureById = new Map();

const map = L.map("map", {
  center: MAP_CENTER,
  zoom: DEFAULT_ZOOM,
  zoomControl: false,
  preferCanvas: true,
  minZoom: 17,
  maxZoom: 20,
  maxBoundsViscosity: 1.0,
  rotate: true,
  touchRotate: true,
  rotateControl: {
    closeOnZeroBearing: false,
    position: 'bottomright'
  }
});

L.control.zoom({ position: "bottomright" }).addTo(map);
L.control.scale({ position: "bottomleft" }).addTo(map);

const lightTiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: "&copy; OpenStreetMap contributors, &copy; CARTO",
  tileSize: 256
});

const darkTiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: "&copy; OpenStreetMap contributors, &copy; CARTO",
  tileSize: 256
});

let currentTiles = lightTiles;
currentTiles.addTo(map);

initialize();

async function initialize() {
  registerServiceWorker();
  wireSearch();
  wireQuickFilters();
  wireToggles();
  wireDarkMode();
  wireCursorTracker();
  watchLocation();
  try {
    await loadGeoJsonLayers();
    refreshSelectOptions();
    renderResults(featureIndex.slice(0, 5));
  } catch (error) {
    console.error("Failed to load campus data", error);
    routeSummary.textContent = "Unable to load campus data offline cache yet.";
  }
}

function wireCursorTracker() {
  if (!cursorCoords) return;
  map.on("mousemove", (event) => {
    const lat = event.latlng.lat.toFixed(6);
    const lng = event.latlng.lng.toFixed(6);
    cursorCoords.textContent = `${lat}, ${lng}`;
    cursorCoords.style.opacity = "1";
  });
  map.on("mouseout", () => {
    cursorCoords.style.opacity = "0";
  });
}

function wireDarkMode() {
  const darkModeToggle = document.getElementById("darkModeToggle");
  if (!darkModeToggle) return;

  // Check for saved preference or default to light mode
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    enableDarkMode();
  }

  darkModeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "dark") {
      disableDarkMode();
    } else {
      enableDarkMode();
    }
  });
}

function enableDarkMode() {
  document.documentElement.setAttribute("data-theme", "dark");
  localStorage.setItem("theme", "dark");
  if (currentTiles === lightTiles) {
    map.removeLayer(lightTiles);
    darkTiles.addTo(map);
    currentTiles = darkTiles;
  }
}

function disableDarkMode() {
  document.documentElement.setAttribute("data-theme", "light");
  localStorage.setItem("theme", "light");
  if (currentTiles === darkTiles) {
    map.removeLayer(darkTiles);
    lightTiles.addTo(map);
    currentTiles = lightTiles;
  }
}

function showBoundaryPopup(lat, lng, message) {
  L.popup().setLatLng([lat, lng]).setContent(message).openOn(map);
}

function isInsideCampus(lat, lng) {
  if (!boundaryPolygons.length) return true;
  return boundaryPolygons.some((ring) => pointInRing(lat, lng, ring));
}

function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0];
    const xi = ring[i][1];
    const yj = ring[j][0];
    const xj = ring[j][1];
    const denom = yj - yi;
    const slope = denom === 0 ? 0 : ((xj - xi) * (lat - yi)) / denom;
    const intersect = yi > lat !== yj > lat && lng < slope + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function wireQuickFilters() {
  quickChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      searchInput.value = chip.dataset.alias || "";
      performSearch();
    });
  });
}

function wireSearch() {
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      performSearch();
    }
  });
  searchButton.addEventListener("click", performSearch);
}

function performSearch() {
  const query = searchInput.value.trim().toLowerCase();
  const matches = query ? featureIndex.filter((place) => matchesQuery(place, query)) : featureIndex.slice(0, 6);
  if (!matches.length) {
    routeSummary.textContent = "No matches yet. Try nicknames like LH or Ground.";
  }
  renderResults(matches.slice(0, 6));
}

function matchesQuery(place, query) {
  return (
    place.name.toLowerCase().includes(query) ||
    place.description.toLowerCase().includes(query) ||
    place.aliases.some((alias) => alias.includes(query))
  );
}

function renderResults(list) {
  resultsList.innerHTML = "";
  const fragment = document.createDocumentFragment();
  list.forEach((place) => {
    const clone = resultTemplate.content.cloneNode(true);
    clone.querySelector("[data-name]").textContent = place.name;
    clone.querySelector("[data-type]").textContent = place.typeLabel;
    clone.querySelector("[data-desc]").textContent = place.description;
    clone.querySelector("button[data-focus]").addEventListener("click", () => focusOnPlace(place.id));
    fragment.appendChild(clone);
  });
  resultsList.appendChild(fragment);
}

function wireToggles() {
  Object.entries(toggleRefs).forEach(([id, input]) => {
    input.addEventListener("change", () => {
      const layerGroup = layerStore.get(id);
      if (!layerGroup) return;
      if (input.checked) {
        layerGroup.addTo(map);
      } else {
        layerGroup.remove();
      }
    });
  });
}

async function loadGeoJsonLayers() {
  const response = await fetch(CET_DATA_URL);
  if (!response.ok) throw new Error(`Failed to load ${CET_DATA_URL}`);
  const geojson = await response.json();

  // Separate features by geometry type
  const pathFeatures = [];
  const pointFeatures = [];
  const polygonFeatures = [];

  geojson.features.forEach((feature) => {
    const geomType = feature.geometry?.type;
    if (geomType === "LineString" || geomType === "MultiLineString") {
      pathFeatures.push(feature);
    } else if (geomType === "Point") {
      pointFeatures.push(feature);
    } else if (geomType === "Polygon" || geomType === "MultiPolygon") {
      polygonFeatures.push(feature);
    }
  });

  // Load paths (LineStrings)
  if (pathFeatures.length > 0) {
    const pathLayer = L.geoJSON(pathFeatures, {
      style: {
        color: COLORS.path,
        weight: 4,
        opacity: 0.95
      }
    });
    pathLayer.addTo(map);
    layerStore.set("paths", pathLayer);
    graphNodes = buildGraph(pathFeatures);
  }

  // Load polygons (buildings)
  if (polygonFeatures.length > 0) {
    const polygonLayer = L.geoJSON(polygonFeatures, {
      style: (feature) => {
        const props = feature.properties || {};
        const type = getFeatureType(props);
        return {
          color: COLORS[type] || COLORS.building,
          weight: 2,
          opacity: 0.9,
          fillColor: COLORS[type] || COLORS.building,
          fillOpacity: 0.3
        };
      },
      onEachFeature: (feature, layerRef) => {
        const props = feature.properties || {};
        const name = getFeatureName(props);
        if (name) {
          const type = getFeatureType(props);
          // Add permanent tooltip with building name
          layerRef.bindTooltip(name, {
            permanent: true,
            direction: 'center',
            className: 'building-label'
          });
          layerRef.bindPopup(`<strong>${name}</strong><br><em>${type}</em>`);
          layerRef.on('click', () => {
            layerRef.openPopup();
          });
          registerPlace(feature);
        }
      }
    });
    polygonLayer.addTo(map);
    layerStore.set("buildings", polygonLayer);
  }

  // Load points (landmarks, hostels, etc.)
  if (pointFeatures.length > 0) {
    const pointLayer = L.geoJSON(pointFeatures, {
      pointToLayer: (feature, latlng) => {
        const props = feature.properties || {};
        const type = getFeatureType(props);
        return L.circleMarker(latlng, {
          radius: 9,
          color: COLORS[type] || COLORS.landmark,
          fillColor: "#ffffff",
          fillOpacity: 0.95,
          weight: 2
        });
      },
      onEachFeature: (feature, layerRef) => {
        const props = feature.properties || {};
        const name = getFeatureName(props);
        if (name) {
          layerRef.bindPopup(`<strong>${name}</strong>`);
          registerPlace(feature);
        }
      }
    });
    pointLayer.addTo(map);
    layerStore.set("landmarks", pointLayer);
  }
}

function getFeatureName(props) {
  // In cet.geojson, the name is the property KEY, not the value
  // e.g., {"Ground": ""} or {"ECE Dept": ""}
  const keys = Object.keys(props);
  if (keys.length === 0) return null;
  
  // Return the first property key as the name
  const name = keys[0];
  if (name && name.trim()) {
    return name.trim();
  }
  
  return null;
}

function getFeatureType(props) {
  const name = getFeatureName(props);
  if (!name) return 'default';
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('hostel') || nameLower.includes('lh') || nameLower.includes('mh')) {
    return 'hostel';
  }
  if (nameLower.includes('lab') || nameLower.includes('dept') || nameLower.includes('block')) {
    return 'building';
  }
  return 'landmark';
}

function registerPlace(feature) {
  const props = feature.properties || {};
  const name = getFeatureName(props);
  if (!name) return;
  
  let lat, lng;
  const geomType = feature.geometry.type;
  
  if (geomType === 'Point') {
    [lng, lat] = feature.geometry.coordinates;
  } else if (geomType === 'Polygon') {
    // Calculate centroid of polygon
    const coords = feature.geometry.coordinates[0];
    let sumLat = 0, sumLng = 0;
    coords.forEach(([lon, la]) => {
      sumLng += lon;
      sumLat += la;
    });
    lng = sumLng / coords.length;
    lat = sumLat / coords.length;
  } else if (geomType === 'MultiPolygon') {
    // Use first polygon's centroid
    const coords = feature.geometry.coordinates[0][0];
    let sumLat = 0, sumLng = 0;
    coords.forEach(([lon, la]) => {
      sumLng += lon;
      sumLat += la;
    });
    lng = sumLng / coords.length;
    lat = sumLat / coords.length;
  } else {
    return; // Skip other geometry types
  }
  
  const type = getFeatureType(props);
  const entry = {
    id: props.id || featureIndex.length,
    name: name,
    type: type,
    typeLabel: type,
    aliases: [name].map((alias) => alias.toLowerCase()),
    description: props.description || "",
    lat,
    lng
  };
  featureIndex.push(entry);
  featureById.set(entry.id, entry);
}

function refreshSelectOptions() {
  const sorted = [...featureIndex].sort((a, b) => a.name.localeCompare(b.name));
  populateSelect(startSelect, sorted, true);
  populateSelect(endSelect, sorted, false);
}

function populateSelect(selectEl, list, includeLocationShortcut) {
  selectEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = includeLocationShortcut ? "Use GPS or pick a start" : "Pick a destination";
  placeholder.disabled = true;
  placeholder.selected = true;
  selectEl.appendChild(placeholder);

  if (includeLocationShortcut) {
    const locationOption = document.createElement("option");
    locationOption.value = "my-location";
    locationOption.textContent = "📍 My current location";
    selectEl.appendChild(locationOption);
  }

  list.forEach((place) => {
    const option = document.createElement("option");
    option.value = place.id;
    option.textContent = `${place.name} (${place.typeLabel})`;
    selectEl.appendChild(option);
  });
}

function focusOnPlace(placeId) {
  const place = featureById.get(placeId);
  if (!place) return;
  if (!isInsideCampus(place.lat, place.lng)) {
    showBoundaryPopup(place.lat, place.lng, "This location lies outside the CET boundary.");
    return;
  }
  if (focusMarker) {
    focusMarker.remove();
  }
  focusMarker = L.circleMarker([place.lat, place.lng], {
    radius: 14,
    color: "#f18f01",
    weight: 3,
    fillOpacity: 0.3,
    pane: "markerPane"
  }).addTo(map);
  map.flyTo([place.lat, place.lng], 18, { animate: true, duration: 0.7 });
}

routeButton.addEventListener("click", () => {
  const startValue = startSelect.value;
  const endValue = endSelect.value;
  if (!startValue || !endValue) {
    routeSummary.textContent = "Select both start and destination.";
    return;
  }
  if (startValue === endValue) {
    routeSummary.textContent = "Start and destination match.";
    return;
  }
  const startPoint = startValue === "my-location" ? currentLocation : featureById.get(startValue);
  const endPoint = featureById.get(endValue);
  if (!startPoint) {
    routeSummary.textContent = "Waiting for GPS fix. Step outdoors or choose a start.";
    return;
  }
  if (!endPoint) {
    routeSummary.textContent = "Destination unavailable.";
    return;
  }
  
  if (!graphNodes) {
    routeSummary.textContent = "Paths are still caching. Try again.";
    return;
  }
  
  const route = computeRoute(graphNodes, getLatLng(startPoint), getLatLng(endPoint));
  if (!route) {
    routeSummary.textContent = "No walking path found between the points.";
    return;
  }
  
  drawRoute(route.path);
  const minutes = Math.max(1, Math.round(route.distance / (WALKING_SPEED_MPS * 60)));
  routeSummary.textContent = `Route ready: ${(route.distance / 1000).toFixed(2)} km · ~${minutes} min walk.`;
});

function getLatLng(place) {
  return { lat: place.lat, lng: place.lng };
}

function drawRoute(latlngs) {
  if (routeLine) {
    routeLine.remove();
    routeLine = null;
  }
  
  // Draw the route line on the map
  routeLine = L.polyline(latlngs, {
    color: '#0d74ff',
    weight: 6,
    opacity: 0.8,
    lineJoin: 'round',
    lineCap: 'round'
  }).addTo(map);
  
  // Add animated dashes for visual effect
  const dashLine = L.polyline(latlngs, {
    color: '#ffffff',
    weight: 2,
    opacity: 0.9,
    dashArray: '10, 10',
    dashOffset: '0',
    className: 'route-dash-line'
  }).addTo(map);
  
  // Store both lines so we can remove them together
  const originalRemove = routeLine.remove.bind(routeLine);
  routeLine.remove = function() {
    dashLine.remove();
    return originalRemove();
  };
  
  const bounds = L.latLngBounds(latlngs);
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }
}

function buildGraph(features) {
  const nodes = new Map();
  const keyFor = (lat, lng) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

  const addNode = (lat, lng) => {
    const key = keyFor(lat, lng);
    if (!nodes.has(key)) {
      nodes.set(key, { lat, lng, edges: new Map() });
    }
    return key;
  };

  const addEdge = (from, to, weight) => {
    nodes.get(from).edges.set(to, weight);
    nodes.get(to).edges.set(from, weight);
  };

  features.forEach((feature) => {
    const coords = feature.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i += 1) {
      const [lng1, lat1] = coords[i];
      const [lng2, lat2] = coords[i + 1];
      const keyA = addNode(lat1, lng1);
      const keyB = addNode(lat2, lng2);
      const distance = haversine(lat1, lng1, lat2, lng2);
      addEdge(keyA, keyB, distance);
    }
  });

  return nodes;
}

function computeRoute(nodes, startLatLng, endLatLng) {
  const startKey = findNearestNode(nodes, startLatLng);
  const endKey = findNearestNode(nodes, endLatLng);
  if (!startKey || !endKey) return null;
  const distances = new Map();
  const previous = new Map();
  const queue = new Set();
  nodes.forEach((_, key) => {
    distances.set(key, Infinity);
    queue.add(key);
  });
  distances.set(startKey, 0);

  while (queue.size) {
    let currentKey = null;
    let minDistance = Infinity;
    queue.forEach((key) => {
      const dist = distances.get(key);
      if (dist < minDistance) {
        minDistance = dist;
        currentKey = key;
      }
    });
    if (currentKey === null) break;
    queue.delete(currentKey);
    if (currentKey === endKey) break;

    const node = nodes.get(currentKey);
    node.edges.forEach((weight, neighbourKey) => {
      if (!queue.has(neighbourKey)) return;
      const candidate = distances.get(currentKey) + weight;
      if (candidate < distances.get(neighbourKey)) {
        distances.set(neighbourKey, candidate);
        previous.set(neighbourKey, currentKey);
      }
    });
  }

  if (!previous.has(endKey) && startKey !== endKey) {
    return null;
  }

  const pathKeys = [];
  let nodeKey = endKey;
  pathKeys.unshift(nodeKey);
  while (nodeKey !== startKey) {
    nodeKey = previous.get(nodeKey);
    if (!nodeKey) break;
    pathKeys.unshift(nodeKey);
  }

  const latlngs = pathKeys.map((key) => {
    const node = nodes.get(key);
    return [node.lat, node.lng];
  });

  return {
    distance: distances.get(endKey),
    path: latlngs
  };
}

function findNearestNode(nodes, latlng) {
  let bestKey = null;
  let bestDistance = Infinity;
  nodes.forEach((node, key) => {
    const dist = haversine(latlng.lat, latlng.lng, node.lat, node.lng);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestKey = key;
    }
  });
  return bestKey;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function watchLocation() {
  if (!navigator.geolocation) {
    locationStatus.textContent = "GPS not supported on this device.";
    return;
  }
  navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      currentLocation = { lat: latitude, lng: longitude };
      locationStatus.textContent = `GPS lock ±${Math.round(accuracy)} m`;
      updateLocationMarker(currentLocation, accuracy);
    },
    (error) => {
      locationStatus.textContent = error.code === error.PERMISSION_DENIED ? "Location blocked. Enable GPS or choose start manually." : "Trying to lock GPS…";
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000
    }
  );
}

function updateLocationMarker(latlng, accuracy) {
  if (!locationMarker) {
    locationMarker = L.marker(latlng, {
      icon: L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
      })
    }).addTo(map);
  } else {
    locationMarker.setLatLng(latlng);
  }
  if (!accuracyCircle) {
    accuracyCircle = L.circle(latlng, {
      radius: accuracy,
      color: "#0b8a5d",
      fillColor: "#0b8a5d",
      fillOpacity: 0.15,
      weight: 1
    }).addTo(map);
  } else {
    accuracyCircle.setLatLng(latlng);
    accuracyCircle.setRadius(accuracy);
  }

  if (isInsideCampus(latlng.lat, latlng.lng)) {
    locationWarningShown = false;
  } else if (!locationWarningShown) {
    showBoundaryPopup(latlng.lat, latlng.lng, "You are currently outside the CET boundary.");
    locationWarningShown = true;
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((err) => console.error("SW registration failed", err));
    });
  }
}
