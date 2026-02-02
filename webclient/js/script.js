// Karte initialisieren
const map = L.map('map').setView([51.1657, 10.4515], 6); // Zentrum von Deutschland

// OpenStreetMap Layer hinzufügen
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let currentMarker = null;
let intervalId = null;
let defaultIntervalId = null;  // Neuer Timer für Default Device
let currentDeviceToSave = null;
let deviceToDelete = null;
let liveUpdateTimeout = null;
let liveUpdateLayers = [];
let liveTrail = null;
let liveTrailLatLngs = [];
let liveTrailDeviceId = null;

// Neue globale Variable für den Auto-Center Status
let autoCenterEnabled = true;

// Neue globale Variable für manuellen Zoom-Status
let userHasZoomed = false;

// Konstanten
const DEFAULT_DEVICE_ID = 'BF0160F5-4138-402C-A5F0-DEB1AA1F4216';

// Konstanten und Hilfsfunktionen für Device-Management
const STORED_DEVICES_KEY = 'miataruDevices';

// Konstanten für Tooltip-Stile
const TOOLTIP_STYLE_KEY = 'miataruTooltipStyle';
const TOOLTIP_STYLE = {
    SIMPLE: 'simple',
    FULL: 'full'
};

// Globale Variable für den Genauigkeitskreis
let accuracyCircle = null;

// Globale Variable für den History-Status
let historyModeActive = false;

// Globale Variable für die aktuelle DeviceHistory-Instanz
let currentDeviceHistory = null;

// Konstanten für Settings
const SETTINGS_KEY = 'miataruSettings';
const DEFAULT_SETTINGS = {
    updateInterval: 5,    // in Sekunden
    historyAmount: 100,   // Anzahl der History-Einträge
    requestMiataruDeviceID: 'webclient'  // Default RequestMiataruDeviceID
};

const MAX_LIVE_TRAIL_POINTS = 50;

// Funktion zum Laden der gespeicherten Devices
function loadStoredDevices() {
    const stored = localStorage.getItem(STORED_DEVICES_KEY);
    return stored ? JSON.parse(stored) : {};
}

// Funktion zum Speichern eines Devices
function saveDevice(deviceId, name) {
    const devices = loadStoredDevices();
    devices[deviceId] = name;
    localStorage.setItem(STORED_DEVICES_KEY, JSON.stringify(devices));
    updateDevicesDropdown();
}

// Funktion zum Aktualisieren des Dropdowns
function updateDevicesDropdown() {
    const select = document.getElementById('savedDevices');
    const devices = loadStoredDevices();
    
    // Dropdown leeren bis auf den ersten Eintrag
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Gespeicherte Devices hinzufügen
    Object.entries(devices).forEach(([deviceId, name]) => {
        const option = new Option(`${name} (${deviceId})`, deviceId);
        select.add(option);
    });
}

// Benutzerdefiniertes Pin-Icon erstellen
const pinIcon = L.divIcon({
    className: 'custom-pin',
    html: `<svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"
        fill="#007bff" 
        stroke="#ffffff"
        stroke-width="1"/>
    </svg>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36]
});

function clearLiveUpdateHighlight() {
    liveUpdateLayers.forEach(layer => layer.remove());
    liveUpdateLayers = [];
    if (liveUpdateTimeout) {
        clearTimeout(liveUpdateTimeout);
        liveUpdateTimeout = null;
    }
    if (currentMarker) {
        const markerElement = currentMarker.getElement();
        if (markerElement) {
            markerElement.classList.remove('live-update-marker');
        }
        currentMarker.setZIndexOffset(0);
    }
}

function showLiveUpdateHighlight(latLng) {
    clearLiveUpdateHighlight();

    const highlightCircle = L.circleMarker(latLng, {
        radius: 10,
        color: '#ff9800',
        fillColor: '#ff9800',
        fillOpacity: 0.25,
        weight: 3,
        className: 'live-update-highlight'
    }).addTo(map);

    const pulseCircle = L.circleMarker(latLng, {
        radius: 18,
        color: '#ff9800',
        fillColor: '#ff9800',
        fillOpacity: 0.15,
        weight: 2,
        className: 'live-update-pulse'
    }).addTo(map);

    highlightCircle.bringToFront();
    pulseCircle.bringToFront();

    liveUpdateLayers = [highlightCircle, pulseCircle];

    if (currentMarker) {
        const markerElement = currentMarker.getElement();
        if (markerElement) {
            markerElement.classList.add('live-update-marker');
        }
        currentMarker.setZIndexOffset(1000);
    }

    liveUpdateTimeout = setTimeout(() => {
        clearLiveUpdateHighlight();
    }, 5000);
}

function resetLiveTrail() {
    if (liveTrail) {
        liveTrail.remove();
    }
    liveTrail = null;
    liveTrailLatLngs = [];
    liveTrailDeviceId = null;
}

function updateLiveTrail(deviceId, latLng) {
    if (liveTrailDeviceId && liveTrailDeviceId !== deviceId) {
        resetLiveTrail();
    }

    liveTrailDeviceId = deviceId;
    liveTrailLatLngs.push(latLng);

    if (liveTrailLatLngs.length > MAX_LIVE_TRAIL_POINTS) {
        liveTrailLatLngs.shift();
    }

    if (!liveTrail) {
        liveTrail = L.polyline(liveTrailLatLngs, {
            color: '#ff9800',
            weight: 3,
            opacity: 0.6
        }).addTo(map);
    } else {
        liveTrail.setLatLngs(liveTrailLatLngs);
    }
}

// Funktion zum Löschen eines Devices
function deleteDevice(deviceId) {
    const devices = loadStoredDevices();
    delete devices[deviceId];
    localStorage.setItem(STORED_DEVICES_KEY, JSON.stringify(devices));
    updateDevicesDropdown();
    
    // Pin und Popup aktualisieren
    if (currentMarker) {
        fetchDeviceLocation(deviceId);
    }
}

// Funktion für relative Zeitangaben
function getRelativeTimeString(timestamp) {
    const now = new Date().getTime();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (hours > 0) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (minutes > 0) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
        return `${seconds} ${seconds === 1 ? 'second' : 'seconds'} ago`;
    }
}

// Funktion zum Erstellen und Hinzufügen des Auto-Center Buttons
function addAutoCenterButton() {
    // Erstelle einen benutzerdefinierten Leaflet Control
    const AutoCenterControl = L.Control.extend({
        options: {
            position: 'topleft'
        },

        onAdd: function() {
            const button = L.DomUtil.create('button', 'auto-center-button');
            button.innerHTML = '🎯';
            button.title = 'Toggle Auto-Center';
            button.type = 'button';
            
            // Initial aktiv
            button.classList.add('active');
            
            L.DomEvent.disableClickPropagation(button);
            
            button.addEventListener('click', () => {
                autoCenterEnabled = !autoCenterEnabled;
                button.classList.toggle('active');
            });
            
            return button;
        }
    });

    // Füge den Control zur Karte hinzu
    map.addControl(new AutoCenterControl());
}

// Button nach der Karten-Initialisierung hinzufügen
addAutoCenterButton();
addTooltipStyleControl();  // Tooltip Style Control hinzufügen

// Funktion zum Laden des Tooltip-Stils anpassen
function getTooltipStyle() {
    const stored = localStorage.getItem(TOOLTIP_STYLE_KEY);
    // Standardmäßig SIMPLE statt FULL zurückgeben
    return stored || TOOLTIP_STYLE.SIMPLE;
}

// Funktion zum Speichern des Tooltip-Stils anpassen
function setTooltipStyle(style) {
    localStorage.setItem(TOOLTIP_STYLE_KEY, style);
    // Aktuellen Device-ID holen und URL aktualisieren
    const { deviceId } = getUrlParameters();
    setUrlParameters(deviceId, style);
}

// Funktion zum Setzen der Parameter in der URL
function setUrlParameters(deviceId, style) {
    const currentStyle = style || getTooltipStyle();
    window.location.hash = `${deviceId}${currentStyle === TOOLTIP_STYLE.SIMPLE ? '?simple' : ''}`;
}

// Funktion zum Lesen der Parameter aus der URL
function getUrlParameters() {
    const hash = window.location.hash.slice(1);
    const [devicePart, stylePart] = hash.split('?');
    return {
        deviceId: devicePart || DEFAULT_DEVICE_ID,
        style: stylePart === 'simple' ? TOOLTIP_STYLE.SIMPLE : TOOLTIP_STYLE.FULL
    };
}

// Tooltip Control anpassen
function addTooltipStyleControl() {
    const TooltipControl = L.Control.extend({
        options: {
            position: 'topleft'
        },

        onAdd: function() {
            const button = L.DomUtil.create('button', 'tooltip-style-button');
            button.innerHTML = '💬';
            button.title = 'Toggle Tooltip Style';
            button.type = 'button';
            
            // Initial Style setzen - Button sollte standardmäßig simple sein
            button.classList.add('simple');
            
            L.DomEvent.disableClickPropagation(button);
            
            button.addEventListener('click', () => {
                const currentStyle = getTooltipStyle();
                const newStyle = currentStyle === TOOLTIP_STYLE.FULL ? TOOLTIP_STYLE.SIMPLE : TOOLTIP_STYLE.FULL;
                setTooltipStyle(newStyle);
                button.classList.toggle('simple');
                
                // Aktuellen Marker aktualisieren
                if (currentMarker) {
                    currentMarker.getPopup().setContent(createPopupContent(
                        currentDeviceId,
                        currentDeviceName,
                        currentLocation
                    ));
                }
            });
            
            return button;
        }
    });

    map.addControl(new TooltipControl());
}

// Funktion zum Erstellen des Popup-Inhalts
function createPopupContent(deviceId, storedName, location) {
    const displayName = storedName ? `${storedName} (${deviceId})` : deviceId;
    const simpleName = storedName || deviceId;
    const timestamp = new Date(parseFloat(location.Timestamp) * 1000);
    
    // Buttons basierend auf Speicherstatus
    let actionButtons;
    if (storedName) {
        actionButtons = `
            <div class="popup-buttons">
                <button onclick="showSaveDeviceModal('${deviceId}', '${storedName}')" class="rename-btn">Rename</button>
                <button onclick="showDeleteDeviceModal('${deviceId}')" class="delete-btn">×</button>
                <button onclick="toggleHistory('${deviceId}', this)" class="history-device">History</button>
            </div>`;
    } else {
        actionButtons = `
            <div class="popup-buttons">
                <button onclick="showSaveDeviceModal('${deviceId}')" class="save-device-btn">Save Device</button>
                <button onclick="toggleHistory('${deviceId}', this)" class="history-device">History</button>
            </div>`;
    }
    
    // Popup-Inhalt basierend auf Stil
    if (getTooltipStyle() === TOOLTIP_STYLE.SIMPLE) {
        return `
            <strong>${simpleName}</strong><br>
            ${getRelativeTimeString(timestamp)}
        `;
    } else {
        let additionalInfo = '';
        
        // Add BatteryLevel if available
        if (location.BatteryLevel !== undefined && location.BatteryLevel !== null) {
            additionalInfo += `<strong>Battery Level:</strong> ${location.BatteryLevel}%<br>`;
        }
        
        // Add Altitude if available
        if (location.Altitude !== undefined && location.Altitude !== null) {
            additionalInfo += `<strong>Altitude:</strong> ${parseFloat(location.Altitude).toFixed(1)}m<br>`;
        }
        
        return `
            <strong>DeviceID:</strong> ${displayName}<br>
            <strong>Coordinates:</strong> ${parseFloat(location.Latitude).toFixed(6)}, ${parseFloat(location.Longitude).toFixed(6)}<br>
            <strong>Accuracy:</strong> ${parseFloat(location.HorizontalAccuracy).toFixed(1)}m<br>
            ${additionalInfo}
            <strong>Last Update:</strong> ${getRelativeTimeString(timestamp)} (${timestamp.toLocaleString()})<br>
            ${actionButtons}
        `;
    }
}

// Globale Variablen für aktuelle Marker-Informationen
let currentDeviceId = null;
let currentDeviceName = null;
let currentLocation = null;

// Event-Listener für Zoom-Änderungen
map.on('zoomend', (e) => {
    if (!e.target._animatingZoom) { // Nur bei manuellem Zoom
        userHasZoomed = true;
    }
});

// Funktion zum Vergleichen von Locations (ohne Timestamp)
function hasLocationChanged(oldLocation, newLocation) {
    if (!oldLocation || !newLocation) return true;
    
    return oldLocation.Latitude !== newLocation.Latitude ||
           oldLocation.Longitude !== newLocation.Longitude ||
           oldLocation.HorizontalAccuracy !== newLocation.HorizontalAccuracy ||
           oldLocation.BatteryLevel !== newLocation.BatteryLevel ||
           oldLocation.Altitude !== newLocation.Altitude;
}

// Funktion zum Aktualisieren der relativen Zeit im Popup
function updateRelativeTime() {
    if (currentMarker && currentLocation) {
        const timestamp = new Date(parseFloat(currentLocation.Timestamp) * 1000);
        const popupContent = createPopupContent(currentDeviceId, currentDeviceName, currentLocation);
        currentMarker.getPopup().setContent(popupContent);
        
        // Popup neu öffnen wenn es bereits offen war
        if (currentMarker.isPopupOpen()) {
            currentMarker.openPopup();
        }
    }
}

// Neue globale Funktion für History Toggle
async function toggleHistory(deviceId, button) {
    if (!currentDeviceHistory) {
        currentDeviceHistory = new DeviceHistory(deviceId, map);
    }

    if (!historyModeActive) {
        // History aktivieren
        historyModeActive = true;
        if (intervalId) clearInterval(intervalId);
        if (defaultIntervalId) clearInterval(defaultIntervalId);
        
        await currentDeviceHistory.loadHistory();
        currentDeviceHistory.isTracking = true;
        button.textContent = 'Hide History';
        
        // Timestamp-Update weiterlaufen lassen
        startTimestampUpdate();
    } else {
        // History deaktivieren
        historyModeActive = false;
        if (currentDeviceHistory) {
            currentDeviceHistory.clearHistory();
            currentDeviceHistory.isTracking = false;
        }
        currentDeviceHistory = null;
        button.textContent = 'History';
        
        // Tracking neu starten
        startTracking(deviceId, false);
        
        // Timestamp-Update fortsetzen
        startTimestampUpdate();
    }
}

// Funktion zum Abrufen der Position anpassen
async function fetchDeviceLocation(deviceId) {
    try {
        const settings = loadSettings();
        const requestBody = {
            "MiataruConfig": {
                "RequestMiataruDeviceID": settings.requestMiataruDeviceID
            },
            "MiataruGetLocation": [
                {
                    "Device": deviceId
                }
            ]
        };
        
        // Debug: log request body to verify it includes RequestMiataruDeviceID
        console.log('GetLocation request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch('https://service.miataru.com/v1/GetLocation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data && data.MiataruLocation && data.MiataruLocation[0]) {
            const location = data.MiataruLocation[0];
            const storedDevices = loadStoredDevices();
            const storedName = storedDevices[deviceId];
            
            // Prüfen ob sich nur die Zeit geändert hat
            if (!hasLocationChanged(currentLocation, location) && 
                currentDeviceId === deviceId && 
                currentDeviceName === storedName) {
                // Nur die relative Zeit aktualisieren
                currentLocation = location;  // Timestamp aktualisieren
                updateRelativeTime();
                if (currentLocation) {
                    const latitude = parseFloat(currentLocation.Latitude);
                    const longitude = parseFloat(currentLocation.Longitude);
                    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                        showLiveUpdateHighlight([latitude, longitude]);
                    }
                }
                return;
            }
            
            // Aktuelle Informationen speichern
            currentDeviceId = deviceId;
            currentDeviceName = storedName;
            currentLocation = location;
            
            const latitude = parseFloat(location.Latitude);
            const longitude = parseFloat(location.Longitude);
            const accuracy = parseFloat(location.HorizontalAccuracy);
            const targetLatLng = [latitude, longitude];
            
            // Bestehenden Marker und Kreis entfernen
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            if (accuracyCircle) {
                map.removeLayer(accuracyCircle);
            }
            
            // Genauigkeitskreis hinzufügen
            accuracyCircle = L.circle([latitude, longitude], {
                radius: accuracy,
                color: '#007bff',
                fillColor: '#007bff',
                fillOpacity: 0.1,
                weight: 1
            }).addTo(map);
            
            // Marker erstellen und hinzufügen
            currentMarker = L.marker([latitude, longitude], {
                icon: pinIcon,
                title: storedName || deviceId
            });
            
            currentMarker.addTo(map);

            updateLiveTrail(deviceId, targetLatLng);
            showLiveUpdateHighlight(targetLatLng);
            
            const popupContent = createPopupContent(deviceId, storedName, location);
            currentMarker.bindPopup(popupContent);
            
            // Popup Event-Handler entfernen, da wir jetzt onclick im Button verwenden
            
            if (autoCenterEnabled) {
                currentMarker.openPopup();
                
                // Nur Zoom anpassen wenn der Nutzer noch nicht manuell gezoomt hat
                const targetPos = [latitude, longitude];
                if (!userHasZoomed) {
                    const zoomLevel = Math.min(
                        18, // maximales Zoom-Level
                        Math.max(
                            13, // minimales Zoom-Level
                            19 - Math.log2(accuracy / 10) // Zoom basierend auf Genauigkeit
                        )
                    );
                    map.flyTo(targetPos, zoomLevel, {
                        duration: 1.5
                    });
                } else {
                    // Nur Position ändern, Zoom-Level beibehalten
                    map.panTo(targetPos, {
                        duration: 1.5
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error fetching position:', error);
    }
}

// Modal-Funktionen anpassen
function showSaveDeviceModal(deviceId, existingName = '') {
    currentDeviceToSave = deviceId;
    const modal = document.getElementById('saveDeviceModal');
    const input = document.getElementById('deviceNameInput');
    const title = document.querySelector('#saveDeviceModal h3');
    const saveButton = document.getElementById('saveDeviceButton');
    
    // UI an Aktion anpassen
    if (existingName) {
        title.textContent = 'Rename Device';
        saveButton.textContent = 'Rename';
        input.value = existingName;
    } else {
        title.textContent = 'Save Device';
        saveButton.textContent = 'Save';
        input.value = '';
    }
    
    modal.style.display = 'flex';
    input.focus();
}

function hideSaveDeviceModal() {
    const modal = document.getElementById('saveDeviceModal');
    modal.style.display = 'none';
    currentDeviceToSave = null;
}

// Event-Listener für Modal-Buttons
document.getElementById('saveDeviceButton').addEventListener('click', () => {
    const name = document.getElementById('deviceNameInput').value.trim();
    if (name && currentDeviceToSave) {
        saveDevice(currentDeviceToSave, name);
        hideSaveDeviceModal();
    }
});

document.getElementById('cancelSaveButton').addEventListener('click', hideSaveDeviceModal);

// Schließen mit Escape-Taste
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideSaveDeviceModal();
    }
});

// Klick außerhalb des Modals schließt es
document.getElementById('saveDeviceModal').addEventListener('click', (e) => {
    if (e.target.id === 'saveDeviceModal') {
        hideSaveDeviceModal();
    }
});

// Event-Listener für das Dropdown
document.getElementById('savedDevices').addEventListener('change', (e) => {
    const selectedDeviceId = e.target.value;
    if (selectedDeviceId) {
        document.getElementById('searchInput').value = selectedDeviceId;
        startTracking(selectedDeviceId, false);
    }
});

// Initial die gespeicherten Devices laden
updateDevicesDropdown();

// Funktion zum Starten der Aktualisierung anpassen
function startTracking(deviceId, isDefault = false) {
    // Wenn History Mode aktiv ist, keine neue Aktualisierung starten
    if (historyModeActive) {
        return;
    }

    // Bestehende Timer stoppen
    if (intervalId) clearInterval(intervalId);
    if (defaultIntervalId) clearInterval(defaultIntervalId);
    
    // DeviceID und aktuellen Stil in URL setzen
    const currentStyle = getTooltipStyle();
    setUrlParameters(deviceId, currentStyle);
    
    // Bei neuem Device den Zoom-Status zurücksetzen
    userHasZoomed = false;
    resetLiveTrail();
    clearLiveUpdateHighlight();
    
    // Sofort erste Abfrage durchführen
    fetchDeviceLocation(deviceId);
    
    // Einstellungen laden
    const settings = loadSettings();
    
    // Timer für regelmäßige Aktualisierung setzen
    const newInterval = setInterval(() => {
        fetchDeviceLocation(deviceId);
    }, settings.updateInterval * 1000);
    
    // Timer im entsprechenden Intervall-Handler speichern
    if (isDefault) {
        defaultIntervalId = newInterval;
    } else {
        intervalId = newInterval;
    }
}

// Event-Listener für URL-Änderungen
window.addEventListener('hashchange', () => {
    const { deviceId, style } = getUrlParameters();
    document.getElementById('searchInput').value = deviceId;
    setTooltipStyle(style);
    document.querySelector('.tooltip-style-button')?.classList.toggle('simple', style === TOOLTIP_STYLE.SIMPLE);
    startTracking(deviceId, deviceId === DEFAULT_DEVICE_ID);
});

// Initialisierung anpassen
const { deviceId, style } = getUrlParameters();
if (deviceId !== DEFAULT_DEVICE_ID) {
    document.getElementById('searchInput').value = deviceId;
}
setTooltipStyle(style);
startTracking(deviceId, deviceId === DEFAULT_DEVICE_ID);

// Event-Listener für den Such-Button
document.getElementById('searchButton').addEventListener('click', () => {
    const inputDeviceId = document.getElementById('searchInput').value.trim();
    
    if (inputDeviceId) {
        // Wenn eine DeviceID eingegeben wurde, nur diese tracken
        startTracking(inputDeviceId, false);
    } else {
        // Wenn keine DeviceID eingegeben wurde, zurück zum Default
        startTracking(DEFAULT_DEVICE_ID, true);
    }
});

// Funktion zum Anzeigen des Lösch-Dialogs
function showDeleteDeviceModal(deviceId) {
    deviceToDelete = deviceId;
    const modal = document.getElementById('deleteDeviceModal');
    modal.style.display = 'flex';
}

// Funktion zum Ausblenden des Lösch-Dialogs
function hideDeleteDeviceModal() {
    const modal = document.getElementById('deleteDeviceModal');
    modal.style.display = 'none';
    deviceToDelete = null;
}

// Event-Listener für Lösch-Dialog
document.getElementById('confirmDeleteButton').addEventListener('click', () => {
    if (deviceToDelete) {
        deleteDevice(deviceToDelete);
        hideDeleteDeviceModal();
    }
});

document.getElementById('cancelDeleteButton').addEventListener('click', hideDeleteDeviceModal);

// Klick außerhalb des Lösch-Modals schließt es
document.getElementById('deleteDeviceModal').addEventListener('click', (e) => {
    if (e.target.id === 'deleteDeviceModal') {
        hideDeleteDeviceModal();
    }
});

// Escape-Taste schließt auch den Lösch-Dialog
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideDeleteDeviceModal();
        hideSaveDeviceModal();
    }
});

// Help Modal Funktionen
function showHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.style.display = 'flex';
}

function hideHelpModal() {
    const modal = document.getElementById('helpModal');
    modal.style.display = 'none';
}

// Event Listener für Help Button
document.getElementById('helpButton').addEventListener('click', showHelpModal);
document.getElementById('closeHelpButton').addEventListener('click', hideHelpModal);

// Klick außerhalb des Help-Modals schließt es
document.getElementById('helpModal').addEventListener('click', (e) => {
    if (e.target.id === 'helpModal') {
        hideHelpModal();
    }
});

// Escape-Taste schließt auch das Help-Modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideHelpModal();
        hideDeleteDeviceModal();
        hideSaveDeviceModal();
    }
});

// Demo-Link Handler
document.querySelector('.demo-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const demoDeviceId = 'BF0160F5-4138-402C-A5F0-DEB1AA1F4216';
    document.getElementById('searchInput').value = demoDeviceId;
    startTracking(demoDeviceId, false);
    hideHelpModal();
});

// Embed Modal Funktionen
function showEmbedModal() {
    const modal = document.getElementById('embedModal');
    const iframeContainer = document.getElementById('embedIframeContainer');
    
    // iframe dynamisch erstellen und hinzufügen
    const iframe = document.createElement('iframe');
    iframe.width = '320';
    iframe.height = '240';
    iframe.scrolling = 'no';
    iframe.frameBorder = '0';
    iframe.src = 'https://www.miataru.com/client/#BF0160F5-4138-402C-A5F0-DEB1AA1F4216';
    
    // Bestehenden iframe entfernen falls vorhanden
    iframeContainer.innerHTML = '';
    iframeContainer.appendChild(iframe);
    
    modal.style.display = 'flex';
}

function hideEmbedModal() {
    const modal = document.getElementById('embedModal');
    const iframeContainer = document.getElementById('embedIframeContainer');
    
    // iframe entfernen um Ressourcen zu sparen
    iframeContainer.innerHTML = '';
    
    modal.style.display = 'none';
}

// Copy-Funktion für den Embed-Code
function copyEmbedCode() {
    const codeElement = document.querySelector('.code-block code');
    const textArea = document.createElement('textarea');
    textArea.value = codeElement.textContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    // Visuelles Feedback
    const copyButton = document.querySelector('.copy-button');
    const originalText = copyButton.textContent;
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
        copyButton.textContent = originalText;
    }, 2000);
}

// Event Listener für Embed Button
document.getElementById('embedButton').addEventListener('click', showEmbedModal);
document.getElementById('closeEmbedButton').addEventListener('click', hideEmbedModal);

// Klick außerhalb des Embed-Modals schließt es
document.getElementById('embedModal').addEventListener('click', (e) => {
    if (e.target.id === 'embedModal') {
        hideEmbedModal();
    }
});

// Escape-Taste schließt auch das Embed-Modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideEmbedModal();
        hideHelpModal();
        hideDeleteDeviceModal();
        hideSaveDeviceModal();
    }
});

// Nach der Device-Klasse
class DeviceHistory {
    constructor(deviceId, map) {
        this.deviceId = deviceId;
        this.map = map;
        this.historyMarkers = [];
        this.isTracking = false;
    }

    async loadHistory() {
        const settings = loadSettings();
        const payload = {
            MiataruConfig: {
                RequestMiataruDeviceID: settings.requestMiataruDeviceID
            },
            MiataruGetLocationHistory: {
                Device: this.deviceId,
                Amount: settings.historyAmount.toString()
            }
        };

        try {
            const response = await fetch('https://service.miataru.com/v1/GetLocationHistory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            this.displayHistory(data.MiataruLocation);
        } catch (error) {
            console.error('Fehler beim Laden der Historie:', error);
        }
    }

    displayHistory(locations) {
        // Bestehende Marker entfernen
        this.clearHistory();

        // Zeitstempel sortieren für Farbberechnung
        const timestamps = locations.map(loc => parseFloat(loc.Timestamp) * 1000);
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const timeRange = maxTime - minTime;

        locations.forEach(location => {
            // Farbberechnung (rot zu grün)
            const timePosition = ((parseFloat(location.Timestamp) * 1000) - minTime) / timeRange;
            const color = this.getColorForPosition(timePosition);

            const marker = L.circleMarker([location.Latitude, location.Longitude], {
                radius: 5,
                fillColor: color,
                color: color,
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            // Timestamp-Parsing wie beim Device-Tooltip
            const date = new Date(parseFloat(location.Timestamp) * 1000);
            marker.bindTooltip(`Zeitpunkt: ${date.toLocaleString()}`);
            
            marker.addTo(this.map);
            this.historyMarkers.push(marker);
        });
    }

    getColorForPosition(position) {
        // Rot (ältest) zu Grün (neust)
        const red = Math.floor(255 * (1 - position));
        const green = Math.floor(255 * position);
        return `rgb(${red}, ${green}, 0)`;
    }

    clearHistory() {
        this.historyMarkers.forEach(marker => marker.remove());
        this.historyMarkers = [];
    }
}

// Globale Variable für den Timestamp-Update-Timer
let timestampUpdateInterval = null;

// Funktion zum Starten des Timestamp-Updates
function startTimestampUpdate() {
    // Bestehenden Timer stoppen falls vorhanden
    if (timestampUpdateInterval) {
        clearInterval(timestampUpdateInterval);
    }
    
    // Neuen Timer starten
    timestampUpdateInterval = setInterval(updateRelativeTime, 1000);
}

// Funktion zum Stoppen des Timestamp-Updates
function stopTimestampUpdate() {
    if (timestampUpdateInterval) {
        clearInterval(timestampUpdateInterval);
        timestampUpdateInterval = null;
    }
}

// Aktualisieren der relativen Zeit unabhängig vom Tracking-Status
function updateRelativeTime() {
    if (currentMarker && currentLocation) {
        const timestamp = new Date(parseFloat(currentLocation.Timestamp) * 1000);
        const popupContent = createPopupContent(currentDeviceId, currentDeviceName, currentLocation);
        currentMarker.getPopup().setContent(popupContent);
        
        // Popup neu öffnen, wenn es bereits offen war
        if (currentMarker.isPopupOpen()) {
            currentMarker.openPopup();
        }
    }
}

// Funktion zum Laden der Settings
function loadSettings() {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return Object.assign({}, DEFAULT_SETTINGS, parsed);
    }
    return DEFAULT_SETTINGS;
}

// Funktion zum Speichern der Settings
function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Settings Modal Funktionen
function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    const settings = loadSettings();
    
    // Aktuelle Werte in Inputs setzen
    document.getElementById('updateInterval').value = settings.updateInterval;
    document.getElementById('historyAmount').value = settings.historyAmount;
    document.getElementById('requestMiataruDeviceID').value = settings.requestMiataruDeviceID;
    
    modal.style.display = 'flex';
}

function hideSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'none';
}

// Event Listener für Settings
document.getElementById('settingsButton').addEventListener('click', showSettingsModal);
document.getElementById('closeSettingsButton').addEventListener('click', hideSettingsModal);

// Settings speichern
document.getElementById('saveSettingsButton').addEventListener('click', () => {
    const updateInterval = parseInt(document.getElementById('updateInterval').value);
    const historyAmount = parseInt(document.getElementById('historyAmount').value);
    const requestMiataruDeviceID = document.getElementById('requestMiataruDeviceID').value.trim();
    
    // Validierung
    if (updateInterval < 1 || updateInterval > 60) {
        alert('Das Update-Intervall muss zwischen 1 und 60 Sekunden liegen.');
        return;
    }
    if (historyAmount < 10 || historyAmount > 1000) {
        alert('Die Anzahl der History-Einträge muss zwischen 10 und 1000 liegen.');
        return;
    }
    if (!requestMiataruDeviceID || requestMiataruDeviceID.length === 0) {
        alert('RequestMiataruDeviceID darf nicht leer sein.');
        return;
    }
    if (requestMiataruDeviceID.length > 256) {
        alert('RequestMiataruDeviceID darf maximal 256 Zeichen lang sein.');
        return;
    }
    
    // Settings speichern - merge with defaults to ensure all properties exist
    const finalSettings = Object.assign({}, DEFAULT_SETTINGS, {
        updateInterval,
        historyAmount,
        requestMiataruDeviceID: requestMiataruDeviceID || DEFAULT_SETTINGS.requestMiataruDeviceID
    });
    saveSettings(finalSettings);
    
    // Aktuelles Tracking neu starten mit neuem Interval
    if (currentDeviceId) {
        startTracking(currentDeviceId, currentDeviceId === DEFAULT_DEVICE_ID);
    }
    
    hideSettingsModal();
});

// Klick außerhalb des Settings-Modals schließt es
document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') {
        hideSettingsModal();
    }
});

// Initialisierung: Timestamp-Update starten
startTimestampUpdate(); 
