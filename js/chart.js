/* Michelin Star Restaurants — Chart Module
   Dependencies: Chart.js, data.js, main.js (getFiltered) */

var CUISINE_COLORS = ['#BD162C','#C9A96E','#A8A9AD','#B87333','#8B1A2B','#D4AF37','#6B7B8D','#C27A3A','#4A6FA5','#7BA05B','#C44D56','#5B8DB8','#E8A87C','#3C6478'];
var REGION_COLORS  = ['#BD162C','#C9A96E','#4A6FA5','#7BA05B','#B87333','#C44D56','#5B8DB8','#A8A9AD','#E8A87C','#6B7B8D','#8B1A2B','#D4AF37','#3C6478','#C27A3A'];

var chartCuisine, chartRegion;

function initCharts() {
  chartCuisine = new Chart(document.getElementById('chart-cuisine'), {
    type: 'bar',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderRadius: 4, barThickness: 12 }] },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });

  chartRegion = new Chart(document.getElementById('chart-region'), {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 10, font: { size: 10 }, usePointStyle: true, pointStyleWidth: 8 }
        }
      }
    }
  });

  updateCharts();
}

function updateCharts() {
  var filtered = getFiltered();

  // Cuisine bar chart
  var cc = {};
  for (var i = 0; i < filtered.length; i++) {
    var g = filtered[i].cuisineGroup;
    cc[g] = (cc[g] || 0) + 1;
  }
  var cs = Object.entries(cc).sort(function(a, b) { return b[1] - a[1]; });
  chartCuisine.data.labels = cs.map(function(e) { return e[0]; });
  chartCuisine.data.datasets[0].data = cs.map(function(e) { return e[1]; });
  chartCuisine.data.datasets[0].backgroundColor = cs.map(function(_, i) { return CUISINE_COLORS[i % CUISINE_COLORS.length]; });
  chartCuisine.update();

  // Region doughnut chart
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
  if (other > 0) { rl.push('Other'); rd.push(other); }
  chartRegion.data.labels = rl;
  chartRegion.data.datasets[0].data = rd;
  chartRegion.data.datasets[0].backgroundColor = rl.map(function(_, i) { return REGION_COLORS[i % REGION_COLORS.length]; });
  chartRegion.update();
}
