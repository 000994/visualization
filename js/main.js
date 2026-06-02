/* Michelin Star Restaurants — Main Module
   Dependencies: data.js, map.js, chart.js
   Handles: state, filters, list, detail panel, theme, initialization */

// --- State ---
var state = {
  stars: new Set([1, 2, 3]),
  prices: new Set(['$', '$$', '$$$', '$$$$', '$$$$$', 'N/A']),
  year: 'all',
  search: ''
};

function getFiltered() {
  return allRestaurants.filter(function(r) {
    if (!state.stars.has(r.stars)) return false;
    if (!state.prices.has(r.price)) return false;
    if (state.year !== 'all' && r.year !== parseInt(state.year)) return false;
    if (state.search && r.name.toLowerCase().indexOf(state.search.toLowerCase()) === -1) return false;
    return true;
  });
}

// --- Restaurant List ---
function updateList() {
  var list = document.getElementById('restaurant-list');
  var filtered = getFiltered();
  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-results"><span class="no-results-icon">🔍</span>No restaurants match your filters</div>';
    return;
  }
  var sorted = filtered.slice().sort(function(a, b) { return a.name.localeCompare(b.name); });
  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var r = sorted[i];
    var sc = r.stars === 3 ? 'var(--color-star-3)' : r.stars === 2 ? 'var(--color-star-2)' : 'var(--color-star-1)';
    html +=
      '<div class="restaurant-item" data-idx="' + i + '">' +
      '<span class="item-stars" style="color:' + sc + '">' + '★'.repeat(r.stars) + '</span>' +
      '<div class="item-info"><div class="item-name">' + r.name + '</div><div class="item-meta">' + r.cuisine + ' · ' + r.city + '</div></div>' +
      '<span class="item-price">' + (r.price === 'N/A' ? '—' : r.price) + '</span></div>';
  }
  list.innerHTML = html;

  var items = list.querySelectorAll('.restaurant-item');
  items.forEach(function(item) {
    item.addEventListener('click', function() {
      var r = sorted[parseInt(item.dataset.idx)];
      flyToRestaurant(r);
      openDetail(r);
    });
  });
}

// --- Stats ---
function updateStats() {
  var f = getFiltered();
  document.getElementById('stat-total').textContent = f.length;
  document.getElementById('stat-1').textContent = f.filter(function(r) { return r.stars === 1; }).length;
  document.getElementById('stat-2').textContent = f.filter(function(r) { return r.stars === 2; }).length;
  document.getElementById('stat-3').textContent = f.filter(function(r) { return r.stars === 3; }).length;
}

// --- Refresh all views ---
function refreshAll() {
  updateMap();
  updateCharts();
  updateList();
  updateStats();
}

// --- Detail Panel ---
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
  document.getElementById('detail-overlay').classList.add('open');
}

function closeDetail() {
  document.getElementById('detail-overlay').classList.remove('open');
}

document.getElementById('detail-close').addEventListener('click', closeDetail);
document.getElementById('detail-bg').addEventListener('click', closeDetail);
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeDetail();
});

// --- Filter Event Bindings ---
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
  document.getElementById('search-input').value = '';
  document.querySelectorAll('.filter-chip[data-type="star"], .filter-chip[data-type="price"]').forEach(function(b) { b.classList.add('active'); });
  document.querySelectorAll('.header-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelector('.header-btn[data-year="all"]').classList.add('active');
  document.querySelectorAll('.stat-card').forEach(function(c) { c.classList.remove('active'); });
  document.querySelector('.stat-card.total').classList.add('active');
  refreshAll();
});

// --- Year Buttons ---
document.querySelectorAll('.header-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.header-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    state.year = btn.dataset.year;
    refreshAll();
  });
});

// --- Stat Card Clicks ---
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

// --- Theme Toggle ---
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

// --- Init ---
updateList();
updateStats();
initCharts();
updateMap();
map.invalidateSize();
console.log('Michelin Guide — ' + allRestaurants.length + ' restaurants');
