// bond-dashboard/script.js

// Real-time fetched data (Mocked from previous python/search step)
const currentData = {
  US: { y2: 3.385, y10: 3.952, y30: 4.628, delta_1d_bps: -4, curve: "Normal" },
  UK: { y2: 3.522, y10: 4.292, y30: 5.032, delta_1d_bps: -4, curve: "Normal" },
  EU: { y2: 2.027, y10: 2.658, y30: 3.341, delta_1d_bps: -1, curve: "Normal" },
  JP: { y2: 1.232, y10: 2.126, y30: 3.347, delta_1d_bps: -2, curve: "Normal" }
};

// UI Elements
const els = {
  usVal: document.getElementById('us-val'),
  ukVal: document.getElementById('uk-val'),
  euVal: document.getElementById('eu-val'),
  jpVal: document.getElementById('jp-val'),
  chartTitle: document.getElementById('chart-title')
};

// State
let state = {
  maturity: 'y10', // 'y2', 'y10', 'y30'
  timeframe: '1D'  // '1D', '1W', '1M', '1Y'
};

// Chart Instance
let yieldChart = null;

// Initialize
function init() {
  updateMetricCards();
  initChart();
  setupEventListeners();
}

function updateMetricCards() {
  const m = state.maturity;

  // Update Values
  els.usVal.innerText = currentData.US[m].toFixed(3);
  els.ukVal.innerText = currentData.UK[m].toFixed(3);
  els.euVal.innerText = currentData.EU[m].toFixed(3);
  els.jpVal.innerText = currentData.JP[m].toFixed(3);

  // Format Chart Title
  const mLabel = m === 'y2' ? '2Y' : m === 'y10' ? '10Y' : '30Y';
  els.chartTitle.innerText = `${mLabel} Sovereign Yields`;
}

function setupEventListeners() {
  // Maturity Toggles
  document.querySelectorAll('#maturity-toggles .toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#maturity-toggles .toggle-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.maturity = e.target.dataset.val;
      updateMetricCards();
      updateChartData();
    });
  });

  // Timeframe Toggles
  document.querySelectorAll('#timeframe-toggles .toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('#timeframe-toggles .toggle-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.timeframe = e.target.dataset.val;
      updateChartData();
    });
  });

  // Legend Toggles
  document.querySelectorAll('.legend-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const legendItem = e.currentTarget;
      const datasetIndex = legendItem.dataset.dataset;

      const meta = yieldChart.getDatasetMeta(datasetIndex);

      // Toggle visibility in Chart.js
      meta.hidden = meta.hidden === null ? !yieldChart.data.datasets[datasetIndex].hidden : null;

      // Toggle CSS class
      legendItem.classList.toggle('hidden');

      yieldChart.update();
    });
  });
}

// Data Mocking Engine for historical chart data
function generateChartData(maturity, timeframe) {
  const dataPoints = { '1D': 24, '1W': 7, '1M': 30, '1Y': 12 };
  const numPoints = dataPoints[timeframe];

  // The current value is the anchor
  const labels = [];
  const datasets = {
    US: [], UK: [], EU: [], JP: []
  };

  // Generate labels
  const now = new Date();
  for (let i = numPoints - 1; i >= 0; i--) {
    let d = new Date(now);
    if (timeframe === '1D') {
      d.setHours(d.getHours() - i);
      labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else if (timeframe === '1W') {
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString([], { weekday: 'short' }));
    } else if (timeframe === '1M') {
      d.setDate(d.getDate() - i);
      if (i % 5 === 0 || i === 0) labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
      else labels.push(''); // Hide some labels for clean axis
    } else if (timeframe === '1Y') {
      d.setMonth(d.getMonth() - i);
      labels.push(d.toLocaleDateString([], { month: 'short' }));
    }
  }

  // Generate mock prices walking backward from current
  const regions = ['US', 'UK', 'EU', 'JP'];
  const volatility = { '1D': 0.05, '1W': 0.1, '1M': 0.4, '1Y': 1.0 };
  const v = volatility[timeframe];

  regions.forEach(r => {
    const currentVal = currentData[r][maturity];
    let val = currentVal;

    // We want the LAST array item to be the CURRENT value.
    // So we generate backwards, then reverse.
    const tempArr = [currentVal];
    for (let i = 1; i < numPoints; i++) {
      // Random walk
      let change = (Math.random() - 0.5) * v;
      val = val + change;
      tempArr.push(val);
    }

    datasets[r] = tempArr.reverse();
  });

  return { labels, datasets };
}

function initChart() {
  const ctx = document.getElementById('yieldChart').getContext('2d');

  // Custom globals
  Chart.defaults.color = '#9ba0be';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

  const chartData = generateChartData(state.maturity, state.timeframe);

  yieldChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'US',
          data: chartData.datasets.US,
          borderColor: '#00d2ff',
          backgroundColor: 'rgba(0, 210, 255, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10
        },
        {
          label: 'UK',
          data: chartData.datasets.UK,
          borderColor: '#ffbd2e',
          backgroundColor: 'rgba(255, 189, 46, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10
        },
        {
          label: 'EU',
          data: chartData.datasets.EU,
          borderColor: '#ff5e99',
          backgroundColor: 'rgba(255, 94, 153, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10
        },
        {
          label: 'JP',
          data: chartData.datasets.JP,
          borderColor: '#a06bd8',
          backgroundColor: 'rgba(160, 107, 216, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // We use custom HTML legend
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(30, 31, 53, 0.9)',
          titleColor: '#fff',
          bodyColor: '#9ba0be',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: false,
          border: { display: false },
          ticks: {
            callback: function (value) {
              return value.toFixed(2) + '%';
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

function updateChartData() {
  const chartData = generateChartData(state.maturity, state.timeframe);

  yieldChart.data.labels = chartData.labels;
  yieldChart.data.datasets[0].data = chartData.datasets.US;
  yieldChart.data.datasets[1].data = chartData.datasets.UK;
  yieldChart.data.datasets[2].data = chartData.datasets.EU;
  yieldChart.data.datasets[3].data = chartData.datasets.JP;

  yieldChart.update();
}

// Run
document.addEventListener('DOMContentLoaded', init);
