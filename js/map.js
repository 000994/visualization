/* Michelin Star Restaurants — Map Module
   Dependencies: Leaflet, Leaflet.markercluster, data.js, main.js (state, getFiltered, refreshAll) */

var map = L.map('map', { zoomControl: true, preferCanvas: true }).setView([30, 10], 2.5);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href=\"https://www.openstreetmap.org/copyright\">OSM</a> &copy; <a href=\"https://carto.com/\">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

var starIcons = {
  1: L.divIcon({ className: 'custom-marker marker-1', html: '★',   iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12] }),
  2: L.divIcon({ className: 'custom-marker marker-2', html: '★★',  iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] }),
  3: L.divIcon({ className: 'custom-marker marker-3', html: '★★★', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16] })
};

var markerGroup = L.markerClusterGroup({
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  iconCreateFunction: function(cluster) {
    var count = cluster.getChildCount();
    var cls = 'marker-cluster';
    if (count < 20) cls += ' marker-cluster-small';
    else if (count < 80) cls += ' marker-cluster-medium';
    else cls += ' marker-cluster-large';
    return L.divIcon({ html: '<div><span>' + count + '</span></div>', className: cls, iconSize: L.point(40, 40) });
  }
});

// Store: restaurant -> marker for quick lookup
var markersMap = new Map();
// Store: marker ref for highlight effect
var highlightedMarker = null;
var originalIcon = null;

// ============================================================
// UPDATE MAP — called on any filter change
// ============================================================
function updateMap() {
  markerGroup.clearLayers();
  markersMap.clear();
  var filtered = getFiltered();

  for (var i = 0; i < filtered.length; i++) {
    var r = filtered[i];
    var marker = L.marker([r.lat, r.lng], { icon: starIcons[r.stars] });
    marker.bindPopup(
      '<div class=\"popup-stars\">' + '★'.repeat(r.stars) + '</div>' +
      '<div class=\"popup-name\">' + r.name + '</div>' +
      '<div class=\"popup-meta\">' + r.cuisine + ' · ' + (r.price === 'N/A' ? 'Price not listed' : r.price) + '</div>' +
      '<div class=\"popup-meta\">' + r.city + ', ' + r.region + '</div>'
    );
    marker.r = r; // attach data for later lookup
    markersMap.set(r, marker);
    markerGroup.addLayer(marker);
  }
  map.addLayer(markerGroup);
  document.getElementById('result-count').textContent = filtered.length + ' restaurants';

  // Auto-zoom to filtered results (only when filtering down)
  if (filtered.length > 0 && filtered.length < allRestaurants.length && filtered.length < 200) {
    try {
      var bounds = L.latLngBounds(filtered.map(function(r) { return [r.lat, r.lng]; }));
      if (bounds.isValid()) map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 11, duration: 0.8 });
    } catch(e) {}
  }
}

// ============================================================
// LIST HOVER → MAP HIGHLIGHT
// ============================================================
function highlightMarker(lat, lng) {
  // Find marker by lat/lng
  var target = null;
  for (var _r of markersMap) {
    var r = _r[0], m = _r[1];
    if (Math.abs(r.lat - lat) < 0.0001 && Math.abs(r.lng - lng) < 0.0001) {
      target = m;
      break;
    }
  }
  if (!target || target === highlightedMarker) return;
  
  // Restore previous
  if (highlightedMarker) {
    highlightedMarker.setZIndexOffset(0);
    var oldR = highlightedMarker.r;
    if (oldR) {
      highlightedMarker.setIcon(starIcons[oldR.stars]);
    }
  }
  
  // Highlight new
  target.setZIndexOffset(10000);
  target.setIcon(L.divIcon({
    className: 'custom-marker marker-' + target.r.stars + ' marker-highlighted',
    html: '★'.repeat(target.r.stars > 3 ? 3 : target.r.stars),
    iconSize: target.r.stars === 3 ? [40, 40] : target.r.stars === 2 ? [34, 34] : [30, 30],
    iconAnchor: target.r.stars === 3 ? [20, 20] : target.r.stars === 2 ? [17, 17] : [15, 15],
    popupAnchor: [0, -20]
  }));
  highlightedMarker = target;
}

function unhighlightMarker() {
  if (!highlightedMarker) return;
  highlightedMarker.setZIndexOffset(0);
  var r = highlightedMarker.r;
  if (r) {
    highlightedMarker.setIcon(starIcons[r.stars]);
  }
  highlightedMarker = null;
}

// ============================================================
// FLY TO & OPEN POPUP
// ============================================================
function flyToRestaurant(r) {
  map.flyTo([r.lat, r.lng], 16, { duration: 1 });
  setTimeout(function() {
    var marker = markersMap.get(r);
    if (marker) marker.openPopup();
  }, 1100);
}

// ============================================================
// MAP ↔ CHART: When user pans/zooms, update charts & stats
//   Only if the map is at a reasonable zoom level
// ============================================================
var _mapMoveTimer = null;
map.on('moveend', function() {
  clearTimeout(_mapMoveTimer);
  _mapMoveTimer = setTimeout(function() {
    var zoom = map.getZoom();
    if (zoom >= 4) {
      // Update viewport stats display
      var bounds = map.getBounds();
      var inView = allRestaurants.filter(function(r) {
        return bounds.contains([r.lat, r.lng]);
      });
      var el = document.getElementById('viewport-stats');
      if (el) {
        el.innerHTML = 'In view: <strong>' + inView.length + '</strong> restaurants';
        el.classList.add('visible');
        clearTimeout(el._hideTimer);
        el._hideTimer = setTimeout(function() { el.classList.remove('visible'); }, 5000);
      }
    }
  }, 400);
});

// ============================================================
// CHART CLICK → MAP FOCUS: called from chart.js
// ============================================================
function focusMapOnCuisine(cuisineGroup) {
  var targets = allRestaurants.filter(function(r) { return r.cuisineGroup === cuisineGroup; });
  if (targets.length === 0) return;
  try {
    var bounds = L.latLngBounds(targets.map(function(r) { return [r.lat, r.lng]; }));
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 10, duration: 1 });
  } catch(e) {}
}

function focusMapOnRegion(region) {
  var targets = allRestaurants.filter(function(r) { return r.region === region; });
  if (targets.length === 0) return;
  try {
    var bounds = L.latLngBounds(targets.map(function(r) { return [r.lat, r.lng]; }));
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 8, duration: 1 });
  } catch(e) {}
}

// ============================================================
// UPDATE MAP WHEN CHART FILTER CHANGES (override updateMap to zoom)
// Store original updateMap
var _origUpdateMap = updateMap;
updateMap = function() {
  _origUpdateMap();
  // If chart filters active, also focus map
  if (state.cuisineFilter) {
    focusMapOnCuisine(state.cuisineFilter);
  } else if (state.regionFilter) {
    focusMapOnRegion(state.regionFilter);
  }
};

// ============================================================
// INIT
// ============================================================
document.getElementById('loader').classList.add('hidden');
