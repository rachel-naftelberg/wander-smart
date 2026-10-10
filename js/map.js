// Interactive Map & Transit Routing Engine - WanderSmart
// Styled faithfully to Wanderlog's Coral/Purple aesthetic with Google Maps direct navigation.

const MapManager = {
  map: null,
  markersLayer: null,
  routeLayer: null,
  hotelMarker: null,
  markersMap: {}, // id -> L.Marker
  currentAttractions: [],
  currentHotel: null,
  isInitialized: false,

  // Haversine distance in kilometers
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;
    // Add real city routing coefficient (~1.25x for Vienna's street grid)
    return straightDistance * 1.25;
  },

  // Calculate travel time and text based on transit mode
  getTravelEstimate(distanceKm, mode = 'transit') {
    let minutes = 0;
    let modeTextHe = '';
    let icon = '';

    if (mode === 'walk') {
      // 4.8 km/h walking speed
      minutes = Math.max(2, Math.round((distanceKm / 4.8) * 60));
      modeTextHe = 'ברגל';
      icon = '🚶';
    } else if (mode === 'drive') {
      // 25 km/h urban speed + 3 min parking/traffic buffer
      minutes = Math.max(3, Math.round((distanceKm / 25) * 60) + 3);
      modeTextHe = 'ברכב / מונית';
      icon = '🚗';
    } else {
      // Public transit: U-Bahn / Tram - ~18 km/h + 5 min wait/station access
      minutes = Math.max(4, Math.round((distanceKm / 18) * 60) + 5);
      modeTextHe = 'בתחבורה ציבורית';
      icon = '🚇';
    }

    const distFormatted = distanceKm < 1 
      ? `${Math.round(distanceKm * 1000)} מטרים` 
      : `${distanceKm.toFixed(1)} ק\"מ`;

    return {
      minutes,
      timeText: `${minutes} דק'`,
      distanceFormatted: distFormatted,
      modeText: modeTextHe,
      icon,
      distanceKm
    };
  },

  // Initialize the Leaflet Map
  init(containerId = 'map-container', hotel = null) {
    if (this.isInitialized && this.map) return;

    this.currentHotel = hotel;
    const startLat = hotel ? hotel.lat : 48.2082;
    const startLng = hotel ? hotel.lng : 16.3738;

    this.map = L.map(containerId, {
      zoomControl: false,
      attributionControl: false
    }).setView([startLat, startLng], 13);

    // Modern clean tile layer (Voyager style - crisp, light, Wanderlog/Google-like)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.routeLayer = L.layerGroup().addTo(this.map);

    this.isInitialized = true;

    // Render hotel marker if provided
    if (hotel) {
      this.renderHotel(hotel);
    }
  },

  renderHotel(hotel) {
    if (!this.map) return;
    this.currentHotel = hotel;

    const gMapsHotelNav = `https://www.google.com/maps/dir/?api=1&destination=${hotel.lat},${hotel.lng}`;

    const hotelIcon = L.divIcon({
      className: 'custom-map-icon hotel-map-icon',
      html: `
        <div class="hotel-pin-bubble wanderlog-hotel-pin">
          <span class="hotel-pin-emoji">🏨</span>
          <span class="pin-tooltip">המלון: ${hotel.name}</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    this.hotelMarker = L.marker([hotel.lat, hotel.lng], { icon: hotelIcon, zIndexOffset: 500 })
      .bindPopup(`
        <div class="map-popup-card wanderlog-popup hotel-popup" dir="rtl">
          <div class="popup-badge hotel-badge">🏨 מלון הבסיס שלכם</div>
          <h4 class="popup-title">${hotel.name}</h4>
          <p class="popup-address">${hotel.address}</p>
          <p class="popup-transit">🚇 ${hotel.nearestTransit}</p>
          <div class="popup-buttons">
            <a href="${gMapsHotelNav}" target="_blank" class="popup-btn gmaps-nav-btn">
              🧭 נווט למלון ב-Google Maps ↗
            </a>
          </div>
        </div>
      `)
      .addTo(this.map);
  },

  // Update map view with attractions for the chosen day
  renderDayRoute(attractions, transitMode = 'transit', hotel = null) {
    if (!this.map) return;

    this.currentAttractions = attractions || [];
    if (hotel) this.currentHotel = hotel;

    this.markersLayer.clearLayers();
    this.routeLayer.clearLayers();
    this.markersMap = {};

    if (!attractions || attractions.length === 0) {
      if (hotel) {
        this.map.setView([hotel.lat, hotel.lng], 13);
      }
      return;
    }

    const latlngs = [];

    // Add attractions markers
    attractions.forEach((att, index) => {
      const orderNum = index + 1;
      const isVisited = att.isVisited;
      const isPostponed = att.isPostponed;

      let statusClass = '';
      let pinSymbol = orderNum;
      if (isVisited) {
        statusClass = 'visited-pin';
        pinSymbol = '✓';
      } else if (isPostponed) {
        statusClass = 'postponed-pin';
      }

      // Wanderlog Coral Pin
      const pinIcon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="attraction-pin-bubble wanderlog-pin ${statusClass}" title="${att.nameHe}">
            <span class="pin-number">${pinSymbol}</span>
            <div class="pin-tip-shadow"></div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 36],
        popupAnchor: [0, -36]
      });

      const marker = L.marker([att.lat, att.lng], { icon: pinIcon });
      this.markersMap[att.id] = marker;
      latlngs.push([att.lat, att.lng]);

      const directGmapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${att.lat},${att.lng}`;
      const hotelNavUrl = hotel 
        ? `https://www.google.com/maps/dir/?api=1&origin=${hotel.lat},${hotel.lng}&destination=${att.lat},${att.lng}`
        : directGmapsNavUrl;

      // Rich Wanderlog Popup Card
      marker.bindPopup(`
        <div class="map-popup-card wanderlog-popup" dir="rtl">
          <div class="popup-header">
            <span class="popup-number-badge">#${orderNum}</span>
            <span class="popup-verified-tag">${att.officialHoursVerified ? '✅ שעות רשמיות' : 'ℹ️ שעות משוערות'}</span>
          </div>
          <h4 class="popup-title">${att.nameHe}</h4>
          ${att.name && att.name !== att.nameHe ? `<p class="popup-name-en">${att.name}</p>` : ''}
          <div class="popup-hours-snippet">
            <span>🕒 ${att.effectiveHours || att.officialHours || 'פתוח למבקרים'}</span>
          </div>
          
          <div class="popup-actions-wrapper">
            <!-- HERO GOOGLE MAPS DIRECT BUTTON -->
            <a href="${directGmapsNavUrl}" target="_blank" class="popup-btn gmaps-nav-btn">
              🧭 נווט ליעד ב-Google Maps ↗
            </a>
            ${hotel ? `
              <a href="${hotelNavUrl}" target="_blank" class="popup-btn hotel-nav-btn">
                🏨 מסלול מהמלון ב-Google Maps
              </a>
            ` : ''}
          </div>
        </div>
      `);

      // Two-way synchronization: Click marker -> Highlight & scroll to timeline card
      marker.on('click', () => {
        const cardEl = document.getElementById(`card-${att.id}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cardEl.classList.add('highlight-pulse');
          setTimeout(() => cardEl.classList.remove('highlight-pulse'), 2500);
        }
      });

      this.markersLayer.addLayer(marker);
    });

    // Draw Wanderlog Signature Coral Polyline between consecutive stops
    if (latlngs.length > 1) {
      const polyline = L.polyline(latlngs, {
        color: '#ff5a5f', // Wanderlog Coral
        weight: 4.5,
        opacity: 0.9,
        dashArray: transitMode === 'walk' ? '7, 8' : null,
        lineCap: 'round',
        lineJoin: 'round'
      });
      this.routeLayer.addLayer(polyline);
    }

    // Fit bounds smoothly to show all stops
    if (latlngs.length > 0) {
      this.fitDayBounds();
    }
  },

  // Fit bounds to show current attractions and hotel
  fitDayBounds() {
    if (!this.map) return;
    const points = this.currentAttractions.map(a => [a.lat, a.lng]);
    if (this.currentHotel) {
      points.push([this.currentHotel.lat, this.currentHotel.lng]);
    }
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      this.map.fitBounds(bounds, { padding: [55, 55], maxZoom: 15 });
    }
  },

  // Focus on hotel marker
  focusOnHotel() {
    if (!this.map || !this.currentHotel) return;
    this.map.flyTo([this.currentHotel.lat, this.currentHotel.lng], 15, { duration: 1.2 });
    if (this.hotelMarker) {
      this.hotelMarker.openPopup();
    }
  },

  // Render Live User Location Marker with glowing pulse
  userMarker: null,
  renderUserLocation(userLat, userLng, nextAttraction = null) {
    if (!this.map) return;

    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }

    const gMapsUserNav = nextAttraction 
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${nextAttraction.lat},${nextAttraction.lng}`
      : `https://www.google.com/maps/@${userLat},${userLng},17z`;

    const userIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="user-live-pin-bubble">
          <span class="pulse-ring"></span>
          <span class="user-dot">📍</span>
          <span class="pin-tooltip">את כאן כרגע</span>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    this.userMarker = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 })
      .bindPopup(`
        <div class="map-popup-card wanderlog-popup" dir="rtl">
          <div class="popup-badge user-badge">📍 המיקום הנוכחי שלך</div>
          <h4>את כאן בשטח בוינה</h4>
          <p>האפליקציה זיהתה את מיקומך ב-GPS וממשיכה את הטיול מהנקודה הקרובה.</p>
          ${nextAttraction ? `
            <p style="margin: 8px 0;"><strong>היעד הבא:</strong> ${nextAttraction.nameHe}</p>
            <a href="${gMapsUserNav}" target="_blank" class="popup-btn gmaps-nav-btn">
              🧭 נווט ליעד הבא ב-Google Maps ↗
            </a>
          ` : ''}
        </div>
      `)
      .addTo(this.map);

    // If there is a next attraction, draw a dashed route to it
    if (nextAttraction) {
      const connectionLine = L.polyline([[userLat, userLng], [nextAttraction.lat, nextAttraction.lng]], {
        color: '#10b981',
        weight: 3.5,
        dashArray: '6, 8',
        opacity: 0.95
      });
      this.routeLayer.addLayer(connectionLine);
    }

    this.map.flyTo([userLat, userLng], 15, { duration: 1.2 });
  },

  // Focus on a specific attraction marker and open its popup
  focusOnLocation(lat, lng, zoom = 16, attractionId = null) {
    if (!this.map) return;
    this.map.flyTo([lat, lng], zoom, {
      duration: 1.2
    });

    if (attractionId && this.markersMap[attractionId]) {
      setTimeout(() => {
        this.markersMap[attractionId].openPopup();
      }, 700);
    }
  }
};

if (typeof window !== 'undefined') {
  window.MapManager = MapManager;
}
