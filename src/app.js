const MAP_CENTER = [8.54589, 76.90585];
const DEFAULT_ZOOM = 24;
const WALKING_SPEED_MPS = 1.4;
const BOUNDARY_URL = "./data/cet_loc_v1.geojson";

const DATASETS = [
  {
    id: "buildings",
    label: "Buildings",
    url: "./data/buildings.geojson",
    color: "#0b8a5d",
    pointRadius: 9
  },
  {
    id: "landmarks",
    label: "Landmarks",
    url: "./data/landmarks.geojson",
    color: "#f18f01",
    pointRadius: 8
  },
  {
    id: "hostels",
    label: "Hostels",
    url: "./data/hostels.geojson",
    color: "#1768ac",
    pointRadius: 9
  },
  {
    id: "paths",
    label: "Paths",
    url: "./data/paths.geojson",
    color: "#05603c"
  }
];

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
  minZoom: 16,
  maxZoom: 20,
  maxBoundsViscosity: 1.0
});

L.control.zoom({ position: "bottomright" }).addTo(map);
L.control.scale({ position: "bottomleft" }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: "&copy; OpenStreetMap contributors",
  tileSize: 256
}).addTo(map);

initialize();

async function initialize() {
  registerServiceWorker();
  wireSearch();
  wireQuickFilters();
  wireToggles();
  watchLocation();
  try {
    await loadCampusBoundary();
    await loadGeoJsonLayers();
    refreshSelectOptions();
    renderResults(featureIndex.slice(0, 5));
  } catch (error) {
    console.error("Failed to load campus data", error);
    routeSummary.textContent = "Unable to load campus data offline cache yet.";
  }
}

async function loadCampusBoundary() {
  const response = await fetch(BOUNDARY_URL);
  if (!response.ok) {
    throw new Error("Unable to fetch campus boundary");
  }
  const geojson = await response.json();
  const polygonFeatures = {
    type: "FeatureCollection",
    features: geojson.features.filter((feature) => {
      const geomType = feature.geometry?.type;
      return geomType === "Polygon" || geomType === "MultiPolygon";
    })
  };
  if (boundaryLayer) {
    boundaryLayer.remove();
  }
  boundaryLayer = L.geoJSON(polygonFeatures, {
    style: {
      color: "transparent",
      weight: 0,
      opacity: 0,
      fillOpacity: 0
    }
  }).addTo(map);
  boundaryRings = collectBoundaryRings(polygonFeatures);
  boundaryPolygons = boundaryRings.map((ring) => ring.map((pair) => [...pair]));
  createMaskLayer();
  campusBounds = boundaryLayer.getBounds();
  if (campusBounds.isValid()) {
    map.setMaxBounds(campusBounds.pad(0.0025));
    map.fitBounds(campusBounds, { padding: [20, 20], maxZoom: DEFAULT_ZOOM });
  }
}

function collectBoundaryRings(geojson) {
  const rings = [];
  geojson.features.forEach((feature) => {
    const geometry = feature.geometry;
    if (!geometry) return;
    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach((ring, index) => {
        if (index === 0) {
          rings.push(ring.map(([lng, lat]) => [lat, lng]));
        }
      });
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => {
        if (polygon[0]) {
          rings.push(polygon[0].map(([lng, lat]) => [lat, lng]));
        }
      });
    }
  });
  return rings;
}

function createMaskLayer() {
  if (!boundaryRings.length) return;
  if (maskLayer) {
    maskLayer.remove();
  }
  const outerRing = [
    [90, -180],
    [90, 180],
    [-90, 180],
    [-90, -180]
  ];
  maskLayer = L.polygon([outerRing, ...boundaryRings], {
    stroke: false,
    fillColor: "#e2efe7",
    fillOpacity: 0.75,
    interactive: false,
    fillRule: "evenodd"
  }).addTo(map);
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
  const responses = await Promise.all(
    DATASETS.map((dataset) => fetch(dataset.url).then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${dataset.url}`);
      return res.json();
    }))
  );

  responses.forEach((geojson, index) => {
    const dataset = DATASETS[index];
    if (dataset.id === "paths") {
      const layer = L.geoJSON(geojson, {
        style: {
          color: dataset.color,
          weight: 4,
          opacity: 0.95
        }
      });
      layer.addTo(map);
      layerStore.set(dataset.id, layer);
      graphNodes = buildGraph(geojson.features);
      return;
    }

    const layer = L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) =>
        L.circleMarker(latlng, {
          radius: dataset.pointRadius,
          color: dataset.color,
          fillColor: "#ffffff",
          fillOpacity: 0.95,
          weight: 2
        }),
      onEachFeature: (feature, layerRef) => {
        const props = feature.properties;
        layerRef.bindPopup(`<strong>${props.name}</strong><br>${props.description || ""}`);
        registerPlace(dataset.id, feature);
      }
    });

    if (dataset.id !== "paths") {
      layer.addTo(map);
    }
    layerStore.set(dataset.id, layer);
  });
}

function registerPlace(datasetId, feature) {
  const props = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const entry = {
    id: props.id,
    name: props.name,
    type: datasetId,
    typeLabel: props.category ? props.category : datasetId.slice(0, -1),
    aliases: [props.name, ...(props.aliases || [])].map((alias) => alias.toLowerCase()),
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
  if (!isInsideCampus(endPoint.lat, endPoint.lng)) {
    routeSummary.textContent = "Destination lies outside CET campus.";
    showBoundaryPopup(endPoint.lat, endPoint.lng, "Destination lies outside the CET boundary.");
    return;
  }
  if (startValue === "my-location" && !isInsideCampus(startPoint.lat, startPoint.lng)) {
    routeSummary.textContent = "Your location is outside CET campus.";
    showBoundaryPopup(startPoint.lat, startPoint.lng, "Starting point lies outside the CET boundary.");
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
