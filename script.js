// bond-dashboard/script.js

// Real-time fetched data (Mocked from previous python/search step)
const currentData = {
  US: { y2: 3.385, y10: 3.952, y30: 4.628, delta_1d_bps: -4, curve: "Normal", type: 'yield' },
  UK: { y2: 3.522, y10: 4.292, y30: 5.032, delta_1d_bps: -4, curve: "Normal", type: 'yield' },
  EU: { y2: 2.027, y10: 2.658, y30: 3.341, delta_1d_bps: -1, curve: "Normal", type: 'yield' },
  JP: { y2: 1.232, y10: 2.126, y30: 3.347, delta_1d_bps: -2, curve: "Normal", type: 'yield' },
  BTC: { price: 65120.50, delta_1d_pct: 1.5, type: 'price' },
  SPX: { price: 5100.20, delta_1d_pct: 0.8, type: 'price' },
  NDAQ: { price: 18100.50, delta_1d_pct: 1.2, type: 'price' }
};

// UI Elements
const els = {
  usVal: document.getElementById('us-val'),
  ukVal: document.getElementById('uk-val'),
  euVal: document.getElementById('eu-val'),
  jpVal: document.getElementById('jp-val'),
  btcVal: document.getElementById('btc-val'),
  spxVal: document.getElementById('spx-val'),
  ndaqVal: document.getElementById('ndaq-val'),
  btcDelta: document.getElementById('btc-delta'),
  spxDelta: document.getElementById('spx-delta'),
  ndaqDelta: document.getElementById('ndaq-delta'),
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

  // Update Non-maturity Assets
  els.btcVal.innerText = currentData.BTC.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  els.btcDelta.innerText = (currentData.BTC.delta_1d_pct > 0 ? '+' : '') + currentData.BTC.delta_1d_pct + '%';
  els.btcDelta.className = 'val delta ' + (currentData.BTC.delta_1d_pct >= 0 ? 'up' : 'down');

  els.spxVal.innerText = currentData.SPX.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  els.spxDelta.innerText = (currentData.SPX.delta_1d_pct > 0 ? '+' : '') + currentData.SPX.delta_1d_pct + '%';
  els.spxDelta.className = 'val delta ' + (currentData.SPX.delta_1d_pct >= 0 ? 'up' : 'down');

  els.ndaqVal.innerText = currentData.NDAQ.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  els.ndaqDelta.innerText = (currentData.NDAQ.delta_1d_pct > 0 ? '+' : '') + currentData.NDAQ.delta_1d_pct + '%';
  els.ndaqDelta.className = 'val delta ' + (currentData.NDAQ.delta_1d_pct >= 0 ? 'up' : 'down');

  // Format Chart Title
  const mLabel = m === 'y2' ? '2Y' : m === 'y10' ? '10Y' : '30Y';
  els.chartTitle.innerText = `Markets & ${mLabel} Yields`;
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
      toggleDataset(e.currentTarget.dataset.dataset);
    });
  });

  // Card click to toggle layout (Option C)
  const metricCards = [
    { id: 'card-us', index: 0 },
    { id: 'card-uk', index: 1 },
    { id: 'card-eu', index: 2 },
    { id: 'card-jp', index: 3 },
    { id: 'card-btc', index: 4 },
    { id: 'card-spx', index: 5 },
    { id: 'card-ndaq', index: 6 }
  ];

  metricCards.forEach(card => {
    const el = document.getElementById(card.id);
    if (!el) return;
    el.addEventListener('click', () => {
      toggleDataset(card.index);
    });
    el.style.cursor = 'pointer';
  });
}

function toggleDataset(index) {
  const meta = yieldChart.getDatasetMeta(index);

  // Is this a non-bond asset? (index 4, 5, 6 are BTC, SPX, NDAQ)
  const isNonBond = index >= 4;

  if (isNonBond) {
    // Single-select logic for non-bonds
    const isCurrentlyHidden = meta.hidden === null ? yieldChart.data.datasets[index].hidden : meta.hidden;

    // Hide all non-bonds first
    [4, 5, 6].forEach(i => {
      yieldChart.getDatasetMeta(i).hidden = true;
      const leg = document.querySelector(`.legend-item[data-dataset="${i}"]`);
      if (leg) leg.classList.add('hidden');
    });

    // If it was hidden, show it. If it was already showing, leave it hidden (toggle off behavior)
    if (isCurrentlyHidden) {
      meta.hidden = false;
      const legendItem = document.querySelector(`.legend-item[data-dataset="${index}"]`);
      if (legendItem) legendItem.classList.remove('hidden');
    }

    // Check if any non-bond is visible to determine if right Y-axis should show
    const anyNonBondVisible = [4, 5, 6].some(i => {
      const m = yieldChart.getDatasetMeta(i);
      return (m.hidden === null ? yieldChart.data.datasets[i].hidden : m.hidden) === false;
    });

    yieldChart.options.scales['y-price'].display = anyNonBondVisible;

  } else {
    // Normal toggle logic for bonds (indexes 0, 1, 2, 3)
    meta.hidden = meta.hidden === null ? !yieldChart.data.datasets[index].hidden : null;

    // Toggle CSS class
    const legendItem = document.querySelector(`.legend-item[data-dataset="${index}"]`);
    if (legendItem) {
      if (meta.hidden) {
        legendItem.classList.add('hidden');
      } else {
        legendItem.classList.remove('hidden');
      }
    }
  }

  yieldChart.update();
}

// Data Mocking Engine for historical chart data
function generateChartData(maturity, timeframe) {
  const dataPoints = { '1D': 24, '1W': 7, '1M': 30, '1Y': 12 };
  const numPoints = dataPoints[timeframe];

  const labels = [];
  const datasets = {
    US: [], UK: [], EU: [], JP: [], BTC: [], SPX: [], NDAQ: []
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
      else labels.push('');
    } else if (timeframe === '1Y') {
      d.setMonth(d.getMonth() - i);
      labels.push(d.toLocaleDateString([], { month: 'short' }));
    }
  }

  // Generate mock prices walking backward from current
  const regions = ['US', 'UK', 'EU', 'JP', 'BTC', 'SPX', 'NDAQ'];
  const volatility = { '1D': 0.05, '1W': 0.1, '1M': 0.4, '1Y': 1.0 };
  const assetVol = { 'US': 1, 'UK': 1, 'EU': 1, 'JP': 1, 'BTC': 200, 'SPX': 20, 'NDAQ': 50 };
  const v = volatility[timeframe];

  regions.forEach(r => {
    const isYield = currentData[r].type === 'yield';
    const currentVal = isYield ? currentData[r][maturity] : currentData[r].price;
    let val = currentVal;

    const tempArr = [currentVal];
    for (let i = 1; i < numPoints; i++) {
      let change = (Math.random() - 0.5) * (isYield ? v : (v * assetVol[r]));
      val = val + change;
      tempArr.push(val);
    }
    datasets[r] = tempArr.reverse();
  });

  return { labels, datasets };
}

function initChart() {
  const ctx = document.getElementById('yieldChart').getContext('2d');

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
        },
        {
          label: 'BTC',
          data: chartData.datasets.BTC,
          borderColor: '#f7931a',
          backgroundColor: 'rgba(247, 147, 26, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10,
          yAxisID: 'y-price',
          hidden: true
        },
        {
          label: 'SPX',
          data: chartData.datasets.SPX,
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10,
          yAxisID: 'y-price',
          hidden: true
        },
        {
          label: 'NDAQ',
          data: chartData.datasets.NDAQ,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHitRadius: 10,
          yAxisID: 'y-price',
          hidden: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(30, 31, 53, 0.9)',
          titleColor: '#fff',
          bodyColor: '#9ba0be',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function (context) {
              let val = context.parsed.y;
              return context.dataset.label + ': ' + (val > 100 ? '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val.toFixed(3) + '%');
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: false,
          border: { display: false },
          ticks: {
            callback: function (value) {
              return value.toFixed(2) + '%';
            }
          }
        },
        'y-price': {
          type: 'linear',
          display: false, // Hidden by default until an asset is selected
          position: 'right',
          beginAtZero: false,
          border: { display: false },
          grid: {
            drawOnChartArea: false, // only want the grid lines for one axis to show up
          },
          ticks: {
            callback: function (value) {
              return '$' + value.toLocaleString();
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
  for (let i = 0; i < 7; i++) {
    const keys = ['US', 'UK', 'EU', 'JP', 'BTC', 'SPX', 'NDAQ'];
    yieldChart.data.datasets[i].data = chartData.datasets[keys[i]];
  }

  yieldChart.update();
}

// Run
document.addEventListener('DOMContentLoaded', init);
