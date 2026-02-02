const statsRefreshMs = 10000;
const mapRefreshMs = 15000;

const totalDevicesEl = document.getElementById('total-devices');
const activeCurrentEl = document.getElementById('active-current');
const active24hEl = document.getElementById('active-24h');
const active7dEl = document.getElementById('active-7d');
const active30dEl = document.getElementById('active-30d');
const active365dEl = document.getElementById('active-365d');
const activeWindowEl = document.getElementById('active-window');
const updatesHourEl = document.getElementById('updates-hour');
const uniqueTodayEl = document.getElementById('unique-today');
const lastUpdatedEl = document.getElementById('last-updated');
const mapWindowSelect = document.getElementById('map-window');
const mapMetaEl = document.getElementById('map-meta');
const wsStatusEl = document.getElementById('ws-status');

const map = L.map('map', { zoomControl: true }).setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const markersLayer = L.layerGroup().addTo(map);
const markerByDevice = new Map();

let ws;
let wsConnected = false;
let wsToken = null;

function formatNumber(value) {
  if (value === null || value === undefined) {
    return '–';
  }
  return Number(value).toLocaleString();
}

function updateStatsUI(stats) {
  totalDevicesEl.textContent = formatNumber(stats.totalKnownDevices);
  activeCurrentEl.textContent = formatNumber(stats.activeDevices.current);
  active24hEl.textContent = formatNumber(stats.activeDevices.last24h);
  active7dEl.textContent = formatNumber(stats.activeDevices.last7d);
  active30dEl.textContent = formatNumber(stats.activeDevices.last30d);
  active365dEl.textContent = formatNumber(stats.activeDevices.last365d);
  updatesHourEl.textContent = formatNumber(stats.updates.lastHour);
  uniqueTodayEl.textContent = formatNumber(stats.uniqueDevicesToday);
  activeWindowEl.textContent = `Last ${stats.activeDevices.currentWindowMinutes} min`;

  if (stats.generatedAt) {
    lastUpdatedEl.textContent = `Last updated: ${new Date(stats.generatedAt).toLocaleString()}`;
  }
}

function upsertMarker(device) {
  if (!Number.isFinite(device.latitude) || !Number.isFinite(device.longitude)) {
    return;
  }

  const existing = markerByDevice.get(device.deviceId);
  if (existing) {
    existing.setLatLng([device.latitude, device.longitude]);
    existing.setPopupContent(
      `
        <strong>${device.deviceId}</strong><br />
        ${new Date(device.timestampMs).toLocaleString()}<br />
        Accuracy: ${device.accuracy || 'n/a'}m
      `.trim()
    );
    return;
  }

  const marker = L.circleMarker([device.latitude, device.longitude], {
    radius: 5,
    color: '#1f5fbf',
    fillColor: '#1f5fbf',
    fillOpacity: 0.8
  });

  const popupContent = `
    <strong>${device.deviceId}</strong><br />
    ${new Date(device.timestampMs).toLocaleString()}<br />
    Accuracy: ${device.accuracy || 'n/a'}m
  `;
  marker.bindPopup(popupContent.trim());
  marker.addTo(markersLayer);
  markerByDevice.set(device.deviceId, marker);
}

function updateMapUI(mapSnapshot) {
  markersLayer.clearLayers();
  markerByDevice.clear();
  const devices = mapSnapshot.devices || [];

  devices.forEach((device) => {
    upsertMarker(device);
  });

  mapMetaEl.textContent = `${devices.length} devices shown`;
}

function updateWsStatus(status, detail) {
  if (!wsStatusEl) {
    return;
  }
  wsStatusEl.textContent = detail ? `${status} (${detail})` : status;
}

async function fetchStats() {
  const response = await fetch('/api/stats');
  if (!response.ok) {
    throw new Error('Failed to load stats');
  }
  return response.json();
}

async function fetchMap(windowValue) {
  const response = await fetch(`/api/map?window=${windowValue}`);
  if (!response.ok) {
    throw new Error('Failed to load map');
  }
  return response.json();
}

async function fetchWsToken() {
  const response = await fetch('/api/ws-token');
  if (!response.ok) {
    throw new Error('Failed to load WS token');
  }
  const payload = await response.json();
  return payload.token;
}

async function refreshStats() {
  try {
    const stats = await fetchStats();
    updateStatsUI(stats);
  } catch (error) {
    console.error(error);
  }
}

async function refreshMap() {
  try {
    const windowValue = mapWindowSelect.value;
    const snapshot = await fetchMap(windowValue);
    updateMapUI(snapshot);
  } catch (error) {
    console.error(error);
  }
}

function applyWsMessage(message) {
  if (!message || !message.type) {
    return;
  }

  if (message.type === 'stats') {
    updateStatsUI(message.payload);
  }

  if (message.type === 'map') {
    if (message.window === mapWindowSelect.value) {
      updateMapUI(message.payload);
    }
  }

  if (message.type === 'location') {
    upsertMarker({
      deviceId: message.deviceId,
      latitude: message.latitude,
      longitude: message.longitude,
      accuracy: message.accuracy,
      timestampMs: message.timestampMs
    });
  }
}

function connectWebSocket() {
  if (!wsToken) {
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${protocol}://${window.location.host}/ws?token=${wsToken}`);

  ws.addEventListener('open', () => {
    wsConnected = true;
    updateWsStatus('live');
  });

  ws.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      applyWsMessage(message);
    } catch (error) {
      console.error('Invalid WS message', error);
    }
  });

  ws.addEventListener('close', () => {
    wsConnected = false;
    updateWsStatus('polling', 'reconnecting');
    setTimeout(connectWebSocket, 3000);
  });

  ws.addEventListener('error', () => {
    wsConnected = false;
    updateWsStatus('polling');
  });
}

mapWindowSelect.addEventListener('change', () => {
  refreshMap();
});

refreshStats();
refreshMap();

setInterval(() => {
  refreshStats();
}, statsRefreshMs);

setInterval(() => {
  if (!wsConnected) {
    refreshMap();
  }
}, mapRefreshMs);

fetchWsToken()
  .then((token) => {
    wsToken = token;
    connectWebSocket();
  })
  .catch((error) => {
    console.warn('WebSocket token unavailable, falling back to polling.', error);
    updateWsStatus('polling');
  });
