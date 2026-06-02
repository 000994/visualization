/* Michelin Star Restaurants — Chart Module
   Dependencies: Chart.js, data.js, main.js (state, getFiltered, refreshAll) */

var CUISINE_COLORS = ["#BD162C","#C9A96E","#A8A9AD","#B87333","#8B1A2B","#D4AF37","#6B7B8D","#C27A3A","#4A6FA5","#7BA05B","#C44D56","#5B8DB8","#E8A87C","#3C6478"];
var REGION_COLORS  = ["#BD162C","#C9A96E","#4A6FA5","#7BA05B","#B87333","#C44D56","#5B8DB8","#A8A9AD","#E8A87C","#6B7B8D","#8B1A2B","#D4AF37","#3C6478","#C27A3A"];

var chartCuisine, chartRegion;

function initCharts() {
  chartCuisine = new Chart(document.getElementById("chart-cuisine"), {
    type: "bar",
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderRadius: 4, barThickness: 12 }] },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      onClick: function(e) {
        var el = this.getElementsAtEventForMode(e, "nearest", { intersect: true }, false);
        if (el.length > 0) {
          var idx = el[0].index;
          var label = this.data.labels[idx];
          toggleCuisineFilter(label);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: function(ctx) { return "Click to filter"; }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });

  chartRegion = new Chart(document.getElementById("chart-region"), {
    type: "doughnut",
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "55%",
      onClick: function(e) {
        var el = this.getElementsAtEventForMode(e, "nearest", { intersect: true }, false);
        if (el.length > 0) {
          var idx = el[0].index;
          var label = this.data.labels[idx];
          toggleRegionFilter(label);
        }
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 10, font: { size: 10 }, usePointStyle: true, pointStyleWidth: 8 }
        },
        tooltip: {
          callbacks: {
            afterLabel: function(ctx) { return "Click to filter"; }
          }
        }
      }
    }
  });

  updateCharts();
}

function toggleCuisineFilter(label) {
  if (state.cuisineFilter === label) {
    state.cuisineFilter = null;
  } else {
    state.cuisineFilter = label;
  }
  refreshAll();
  highlightChartFilters();
}

function toggleRegionFilter(label) {
  if (label === "Other") return;
  if (state.regionFilter === label) {
    state.regionFilter = null;
  } else {
    state.regionFilter = label;
  }
  refreshAll();
  highlightChartFilters();
}

function highlightChartFilters() {
  // Highlight cuisine chart bar if filter active
  if (state.cuisineFilter && chartCuisine) {
    var chart = chartCuisine;
    var idx = chart.data.labels.indexOf(state.cuisineFilter);
    if (idx >= 0) {
      chart.data.datasets[0].backgroundColor = chart.data.datasets[0].backgroundColor.map(function(c, i) {
        return i === idx ? c : c + "44";
      });
      chart.update();
    }
  }
  // Highlight region chart segment if filter active
  if (state.regionFilter && chartRegion) {
    var chart = chartRegion;
    var idx = chart.data.labels.indexOf(state.regionFilter);
    if (idx >= 0) {
      chart.data.datasets[0].backgroundColor = chart.data.datasets[0].backgroundColor.map(function(c, i) {
        return i === idx ? c : c + "44";
      });
      chart.update();
    }
  }
}

function updateCharts() {
  var filtered = getFiltered();

  // --- Cuisine bar chart ---
  var cc = {};
  for (var i = 0; i < filtered.length; i++) {
    var g = filtered[i].cuisineGroup;
    cc[g] = (cc[g] || 0) + 1;
  }
  var cs = Object.entries(cc).sort(function(a, b) { return b[1] - a[1]; });
  chartCuisine.data.labels = cs.map(function(e) { return e[0]; });
  chartCuisine.data.datasets[0].data = cs.map(function(e) { return e[1]; });
  var cColors = cs.map(function(_, i) { return CUISINE_COLORS[i % CUISINE_COLORS.length]; });
  // Highlight filtered cuisine
  if (state.cuisineFilter) {
    var fIdx = cs.findIndex(function(e) { return e[0] === state.cuisineFilter; });
    if (fIdx >= 0) {
      cColors = cColors.map(function(c, i) { return i === fIdx ? c : c + "44"; });
    }
  }
  chartCuisine.data.datasets[0].backgroundColor = cColors;
  chartCuisine.update();

  // --- Region doughnut chart ---
  var rc = {};
  for (var i = 0; i < filtered.length; i++) {
    var r = filtered[i].region;
    rc[r] = (rc[r] || 0) + 1;
  }
  var rs = Object.entries(rc).sort(function(a, b) { return b[1] - a[1]; });
  var top8 = rs.slice(0, 8);
  var other = 0;
  for (var i = 8; i < rs.length; i++) other += rs[i][1];
  var rl = top8.map(function(e) { return e[0]; });
  var rd = top8.map(function(e) { return e[1]; });
  if (other > 0) { rl.push("Other"); rd.push(other); }
  chartRegion.data.labels = rl;
  chartRegion.data.datasets[0].data = rd;
  var rColors = rl.map(function(_, i) { return REGION_COLORS[i % REGION_COLORS.length]; });
  // Highlight filtered region
  if (state.regionFilter) {
    var rIdx = rl.indexOf(state.regionFilter);
    if (rIdx >= 0) {
      rColors = rColors.map(function(c, i) { return i === rIdx ? c : c + "44"; });
    }
  }
  chartRegion.data.datasets[0].backgroundColor = rColors;
  chartRegion.update();
}
