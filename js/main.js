/* Michelin Star Restaurants — Main Module
   Dependencies: data.js, map.js, chart.js
   Handles: state, filters, list, detail panel, theme, initialization */

// ============================================================
// GLOBAL STATE
// ============================================================
var state = {
  stars: new Set([1, 2, 3]),
  prices: new Set(['$', '$$', '$$$', '$$$$', '$$$$$', 'N/A']),
  year: 'all',
  search: '',
  sortBy: 'name',
  sortDir: 'asc',
  favorites: new Set(JSON.parse(localStorage.getItem('favorites') || '[]')),
  // Chart-driven filters (set by clicking charts)
  cuisineFilter: null,
  regionFilter: null,
  // Map visual bounds (set on map move)
  mapBounds: null,
  // Favorites-only mode
  favMode: false
};

// ============================================================
// CORE FILTER — single unified getFiltered
// ============================================================
function getFiltered() {
  return allRestaurants.filter(function(r) {
    // Favorites-only mode: skip non-favorites
    if (state.favMode && !state.favorites.has(r.url)) return false;
    if (!state.stars.has(r.stars)) return false;
    if (!state.prices.has(r.price)) return false;
    if (state.year !== 'all' && r.year !== parseInt(state.year)) return false;
    if (state.search && r.name.toLowerCase().indexOf(state.search.toLowerCase()) === -1) return false;
    if (state.cuisineFilter && r.cuisineGroup !== state.cuisineFilter) return false;
    if (state.regionFilter && r.region !== state.regionFilter) return false;
    return true;
  });
}

// ============================================================
// SORTING
// ============================================================
function getSorter() {
  var key = state.sortBy;
  var dir = state.sortDir === 'asc' ? 1 : -1;
  var pm = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4, '$$$$$': 5, 'N/A': 0 };
  return function(a, b) {
    var va, vb;
    if (key === 'name')  { va = a.name; vb = b.name; }
    else if (key === 'stars') { va = a.stars; vb = b.stars; }
    else if (key === 'price') { va = pm[a.price] || 0; vb = pm[b.price] || 0; }
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  };
}

// ============================================================
// LIST
// ============================================================
function updateList() {
  var list = document.getElementById('restaurant-list');
  var filtered = getFiltered();
  if (filtered.length === 0) {
    var msg = state.favMode
      ? '<div class="no-results"><span class="no-results-icon">♡</span>No favorites yet — click the <strong>♡</strong> on any restaurant to add it</div>'
      : '<div class="no-results"><span class="no-results-icon">🔍</span>No restaurants match your filters</div>';
    list.innerHTML = msg;
    return;
  }
  var sorted = filtered.slice().sort(getSorter());
  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var r = sorted[i];
    var sc = r.stars === 3 ? 'var(--color-star-3)' : r.stars === 2 ? 'var(--color-star-2)' : 'var(--color-star-1)';
    var isFav = state.favorites.has(r.url) ? 'fav-active' : '';
    html +=
      '<div class="restaurant-item" data-idx="' + i + '" data-url="' + r.url + '" data-lat="' + r.lat + '" data-lng="' + r.lng + '">' +
      '<button class="fav-btn ' + isFav + '" data-url="' + r.url + '" title="Toggle favorite">♡</button>' +
      '<span class="item-stars" style="color:' + sc + '">' + '★'.repeat(r.stars) + '</span>' +
      '<div class="item-info"><div class="item-name">' + r.name + '</div><div class="item-meta">' + r.cuisine + ' · ' + r.city + '</div></div>' +
      '<span class="item-price">' + (r.price === 'N/A' ? '—' : r.price) + '</span></div>';
  }
  list.innerHTML = html;

  // --- LIST ↔ MAP: hover highlight ---
  list.querySelectorAll('.restaurant-item').forEach(function(item) {
    item.addEventListener('mouseenter', function() {
      var lat = parseFloat(item.dataset.lat);
      var lng = parseFloat(item.dataset.lng);
      highlightMarker(lat, lng);
    });
    item.addEventListener('mouseleave', function() {
      unhighlightMarker();
    });
    item.addEventListener('click', function(e) {
      if (e.target.classList.contains('fav-btn')) return;
      var r = sorted[parseInt(item.dataset.idx)];
      flyToRestaurant(r);
      openDetail(r);
    });
  });

  // Favorite buttons
  list.querySelectorAll('.fav-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var url = btn.dataset.url;
      var wasFav = state.favorites.has(url);
      if (wasFav) {
        state.favorites.delete(url);
        btn.classList.remove('fav-active');
      } else {
        state.favorites.add(url);
        btn.classList.add('fav-active');
      }
      localStorage.setItem('favorites', JSON.stringify([...state.favorites]));
      updateFavCount();
      // If in favorites mode and item removed, refresh to hide it
      if (state.favMode && wasFav) refreshAll();
    });
  });
}

function updateFavCount() {
  var el = document.getElementById('fav-count');
  if (el) {
    var count = state.favorites.size;
    el.textContent = count;
    el.style.display = count > 0 ? 'inline' : 'none';
  }
}

// ============================================================
// STATS — also shows map-viewport info when map moves
// ============================================================
function updateStats() {
  var f = getFiltered();
  document.getElementById('stat-total').textContent = f.length;
  document.getElementById('stat-1').textContent = f.filter(function(r) { return r.stars === 1; }).length;
  document.getElementById('stat-2').textContent = f.filter(function(r) { return r.stars === 2; }).length;
  document.getElementById('stat-3').textContent = f.filter(function(r) { return r.stars === 3; }).length;
}

function updatePriceSummary() {
  var el = document.getElementById('price-summary');
  if (!el) return;
  var f = getFiltered();
  var prices = f.map(function(r) { return r.price; }).filter(function(p) { return p !== 'N/A'; });
  if (prices.length === 0) { el.textContent = '—'; return; }
  var pm = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4, '$$$$$': 5 };
  var nums = prices.map(function(p) { return pm[p] || 0; });
  var avg = (nums.reduce(function(a, b) { return a + b; }, 0) / nums.length).toFixed(1);
  var max = Math.max.apply(null, nums);
  var maxLabel = Object.keys(pm).find(function(k) { return pm[k] === max; });
  el.innerHTML = 'Avg: <strong>' + avg + '</strong> / Max: <strong>' + maxLabel + '</strong>';
}

// ============================================================
// REFRESH ALL
// ============================================================
function refreshAll() {
  updateMap();
  updateCharts();
  updateList();
  updateStats();
  updatePriceSummary();
  updateTop10();
  updateFilterSummary();
}

// ============================================================
// TOP 10  (right column, vertical list)
// ============================================================
function updateTop10() {
  var el = document.getElementById('top10-list');
  if (!el) return;
  var filtered = getFiltered();
  var sorted = filtered.slice().sort(function(a, b) {
    if (b.stars !== a.stars) return b.stars - a.stars;
    return a.name.localeCompare(b.name);
  });
  var top10 = sorted.slice(0, 10);
  var html = '';
  var starColors = { 3: 'var(--color-star-3)', 2: 'var(--color-star-2)', 1: 'var(--color-star-1)' };
  for (var i = 0; i < top10.length; i++) {
    var r = top10[i];
    var sc = starColors[r.stars];
    html +=
      '<div class="top10-item" data-lat="' + r.lat + '" data-lng="' + r.lng + '" data-url="' + r.url + '">' +
      '<div class="top10-rank">' + (i + 1) + '</div>' +
      '<div class="top10-name">' + r.name + '</div>' +
      '<div class="top10-stars" style="color:' + sc + '">' + '&#9733;'.repeat(r.stars) + '</div>' +
      '<div class="top10-meta">' + r.city + '</div>' +
      '</div>';
  }
  el.innerHTML = html;
  el.querySelectorAll('.top10-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var r = allRestaurants.find(function(rr) { return rr.url === item.dataset.url; });
      if (r) { flyToRestaurant(r); openDetail(r); }
    });
  });
}

// ============================================================
// FILTER SUMMARY  (statistics text)
// ============================================================
function updateFilterSummary() {
  var el = document.getElementById('filter-summary-text');
  if (!el) return;
  var f = getFiltered();
  var parts = [];

  var s1 = f.filter(function(r) { return r.stars === 1; }).length;
  var s2 = f.filter(function(r) { return r.stars === 2; }).length;
  var s3 = f.filter(function(r) { return r.stars === 3; }).length;
  parts.push('<strong>' + f.length + '</strong> restaurants');
  parts.push('&#9733; ' + s1 + ' &middot; &#9733;&#9733; ' + s2 + ' &middot; &#9733;&#9733;&#9733; ' + s3);

  var prices = f.map(function(r) { return r.price; }).filter(function(p) { return p !== 'N/A'; });
  if (prices.length > 0) {
    var pm = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4, '$$$$$': 5 };
    var nums = prices.map(function(p) { return pm[p] || 0; });
    var avg = (nums.reduce(function(a, b) { return a + b; }, 0) / nums.length).toFixed(1);
    var max = Math.max.apply(null, nums);
    var maxLabel = Object.keys(pm).find(function(k) { return pm[k] === max; });
    parts.push('Avg price: ' + avg + ' / Max: ' + maxLabel);
  }

  var regions = {};
  f.forEach(function(r) { regions[r.region] = (regions[r.region] || 0) + 1; });
  var regionCount = Object.keys(regions).length;
  parts.push(regionCount + ' regions');

  var cuisines = {};
  f.forEach(function(r) { cuisines[r.cuisineGroup] = (cuisines[r.cuisineGroup] || 0) + 1; });
  var topCuisine = Object.entries(cuisines).sort(function(a, b) { return b[1] - a[1]; })[0];
  if (topCuisine) parts.push('Top: ' + topCuisine[0] + ' (' + topCuisine[1] + ')');

  el.innerHTML = parts.join(' &nbsp;&middot; ');
}

// ============================================================
// DETAIL PANEL
// ============================================================
function openDetail(r) {
  var starColors = { 3: 'var(--color-star-3)', 2: 'var(--color-star-2)', 1: 'var(--color-star-1)' };
  document.getElementById('detail-stars').textContent = '★'.repeat(r.stars);
  document.getElementById('detail-stars').style.color = starColors[r.stars];
  document.getElementById('detail-name').textContent = r.name;
  document.getElementById('detail-cuisine').textContent = r.cuisine + ' (' + r.cuisineGroup + ')';
  document.getElementById('detail-price').textContent = r.price === 'N/A' ? 'Price not listed' : r.price;
  document.getElementById('detail-city').textContent = r.city || 'N/A';
  document.getElementById('detail-region').textContent = r.region;
  document.getElementById('detail-year').textContent = r.year;
  document.getElementById('detail-link').href = r.url;
  showSimilarRestaurants(r);

  document.getElementById('detail-overlay').classList.add('open');
  var slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  history.replaceState(null, '', '#' + slug);
}

function closeDetail() {
  document.getElementById('detail-overlay').classList.remove('open');
  history.replaceState(null, '', ' ');
}

function showSimilarRestaurants(r) {
  var el = document.getElementById('detail-similar');
  if (!el) return;
  var similar = allRestaurants.filter(function(ri) {
    return ri.url !== r.url && ri.cuisineGroup === r.cuisineGroup;
  }).slice(0, 5);
  if (similar.length === 0) { el.innerHTML = ''; return; }
  var html = '<h4 style="margin-top:16px;font-size:13px;color:var(--color-text-muted)">Similar Cuisine Nearby</h4>';
  similar.forEach(function(s) {
    var sc = s.stars === 3 ? 'var(--color-star-3)' : s.stars === 2 ? 'var(--color-star-2)' : 'var(--color-star-1)';
    html += '<div class="similar-item" data-lat="' + s.lat + '" data-lng="' + s.lng + '" data-url="' + s.url + '">' +
      '<span style="color:' + sc + ';font-size:11px">★' + s.stars + '</span> ' +
      '<span>' + s.name + '</span> <span style="color:var(--color-text-muted);font-size:10px">' + s.city + '</span></div>';
  });
  el.innerHTML = html;
  el.querySelectorAll('.similar-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var s = allRestaurants.find(function(rr) { return rr.url === item.dataset.url; });
      if (s) { closeDetail(); flyToRestaurant(s); setTimeout(function() { openDetail(s); }, 1200); }
    });
  });
}

document.getElementById('detail-close').addEventListener('click', closeDetail);
document.getElementById('detail-bg').addEventListener('click', closeDetail);
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (document.getElementById('detail-overlay').classList.contains('open')) { closeDetail(); }
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    var list = document.getElementById('restaurant-list');
    var items = list.querySelectorAll('.restaurant-item');
    if (items.length === 0) return;
    var current = list.querySelector('.restaurant-item.highlighted');
    var idx = -1;
    if (current) { idx = Array.from(items).indexOf(current); current.classList.remove('highlighted'); }
    idx = e.key === 'ArrowDown' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
    items[idx].classList.add('highlighted');
    items[idx].scrollIntoView({ block: 'nearest' });
    e.preventDefault();
  }
  if (e.key === 'Enter') {
    var highlighted = document.querySelector('.restaurant-item.highlighted');
    if (highlighted) highlighted.click();
  }
  // '?' for shortcuts
  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    var overlay = document.getElementById('shortcuts-overlay');
    if (overlay) overlay.classList.toggle('open');
  }
});

// ============================================================
// FILTER UI BINDINGS
// ============================================================
document.querySelectorAll('.filter-chip[data-type="star"]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var val = parseInt(btn.dataset.val);
    if (state.stars.has(val)) { state.stars.delete(val); btn.classList.remove('active'); }
    else { state.stars.add(val); btn.classList.add('active'); }
    refreshAll();
  });
});

document.querySelectorAll('.filter-chip[data-type="price"]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var val = btn.dataset.val;
    if (state.prices.has(val)) { state.prices.delete(val); btn.classList.remove('active'); }
    else { state.prices.add(val); btn.classList.add('active'); }
    refreshAll();
  });
});

document.getElementById('search-input').addEventListener('input', function() {
  state.search = this.value;
  refreshAll();
});

document.getElementById('clear-filters').addEventListener('click', function() {
  state.stars = new Set([1, 2, 3]);
  state.prices = new Set(['$', '$$', '$$$', '$$$$', '$$$$$', 'N/A']);
  state.year = 'all';
  state.search = '';
  state.sortBy = 'name';
  state.sortDir = 'asc';
  state.cuisineFilter = null;
  state.regionFilter = null;
  state.favMode = false;
  document.getElementById('search-input').value = '';
  document.querySelectorAll('.filter-chip[data-type="star"], .filter-chip[data-type="price"]').forEach(function(b) { b.classList.add('active'); });
  document.querySelectorAll('.header-btn[data-year]').forEach(function(b) { b.classList.remove('active'); });
  document.querySelector('.header-btn[data-year="all"]').classList.add('active');
  document.querySelectorAll('.stat-card').forEach(function(c) { c.classList.remove('active'); });
  document.querySelector('.stat-card.total').classList.add('active');
  document.getElementById('sort-select').value = 'name-asc';
  // Reset favorites toggle UI
  var favToggle = document.getElementById('fav-toggle');
  if (favToggle) favToggle.classList.remove('fav-mode-active');
  refreshAll();
});

document.querySelectorAll('.header-btn[data-year]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.header-btn[data-year]').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    state.year = btn.dataset.year;
    refreshAll();
  });
});

document.querySelectorAll('.stat-card[data-filter]').forEach(function(card) {
  card.addEventListener('click', function() {
    var f = card.dataset.filter;
    if (f === 'all') {
      state.stars = new Set([1, 2, 3]);
      document.querySelectorAll('.filter-chip[data-type="star"]').forEach(function(b) { b.classList.add('active'); });
    } else {
      state.stars = new Set([parseInt(f)]);
      document.querySelectorAll('.filter-chip[data-type="star"]').forEach(function(b) {
        b.classList.toggle('active', parseInt(b.dataset.val) === parseInt(f));
      });
    }
    document.querySelectorAll('.stat-card').forEach(function(c) { c.classList.remove('active'); });
    card.classList.add('active');
    refreshAll();
  });
});

document.getElementById('sort-select') && document.getElementById('sort-select').addEventListener('change', function() {
  var parts = this.value.split('-');
  state.sortBy = parts[0];
  state.sortDir = parts[1];
  updateList();
});

// ============================================================
// THEME
// ============================================================
function applyTheme(t) {
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
}
var saved = localStorage.getItem('theme');
if (saved) applyTheme(saved);
document.getElementById('theme-toggle').addEventListener('click', function() {
  var cur = document.documentElement.getAttribute('data-theme');
  var next = !cur ? 'dark' : cur === 'dark' ? 'light' : null;
  applyTheme(next);
  localStorage.setItem('theme', next || 'auto');
});

// ============================================================
// FAVORITES TOGGLE
// ============================================================
document.getElementById('fav-toggle').addEventListener('click', function() {
  state.favMode = !state.favMode;
  this.classList.toggle('fav-mode-active');
  refreshAll();
});

// ============================================================
// INIT
// ============================================================
updateList();
updateStats();
initCharts();
updateMap();
updateFavCount();
updatePriceSummary();
updateTop10();
updateFilterSummary();
map.invalidateSize();

// Deep-link from hash
if (window.location.hash && window.location.hash.length > 1) {
  var hashName = decodeURIComponent(window.location.hash.slice(1));
  var target = allRestaurants.find(function(r) {
    var slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return slug === hashName;
  });
  if (target) {
    setTimeout(function() { flyToRestaurant(target); openDetail(target); }, 500);
  }
}

console.log('Michelin Guide — ' + allRestaurants.length + ' restaurants');
