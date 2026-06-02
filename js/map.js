/* Michelin Star Restaurants — Map Module
   Dependencies: Leaflet, Leaflet.markercluster, data.js, main.js (state, getFiltered) */

var map = L.map('map', { zoomControl: true, preferCanvas: true }).setView([30, 10], 2.5);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
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

var markersMap = new Map();

function updateMap() {
  markerGroup.clearLayers();
  markersMap.clear();
  var filtered = getFiltered();
  for (var i = 0; i < filtered.length; i++) {
    var r = filtered[i];
    var marker = L.marker([r.lat, r.lng], { icon: starIcons[r.stars] });
    marker.bindPopup(
      '<div class="popup-stars">' + '★'.repeat(r.stars) + '</div>' +
      '<div class="popup-name">' + r.name + '</div>' +
      '<div class="popup-meta">' + r.cuisine + ' · ' + (r.price === 'N/A' ? 'Price not listed' : r.price) + '</div>' +
      '<div class="popup-meta">' + r.city + ', ' + r.region + '</div>'
    );
    markersMap.set(r, marker);
    markerGroup.addLayer(marker);
  }
  map.addLayer(markerGroup);
  document.getElementById('result-count').textContent = filtered.length + ' restaurants';

  if (filtered.length > 0 && filtered.length < allRestaurants.length && filtered.length < 200) {
    try {
      var bounds = L.latLngBounds(filtered.map(function(r) { return [r.lat, r.lng]; }));
      if (bounds.isValid()) map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 11, duration: 0.8 });
    } catch(e) {}
  }
}

function flyToRestaurant(r) {
  map.flyTo([r.lat, r.lng], 16, { duration: 1 });
  setTimeout(function() {
    var marker = markersMap.get(r);
    if (marker) marker.openPopup();
  }, 1100);
}

document.getElementById('loader').classList.add('hidden');
