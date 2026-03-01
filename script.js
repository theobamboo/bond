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
      if (leg) leg.classList.add('legend-dimmed');
    });

    // If it was hidden, show it. If it was already showing, leave it hidden (toggle off behavior)
    if (isCurrentlyHidden) {
      meta.hidden = false;
      const legendItem = document.querySelector(`.legend-item[data-dataset="${index}"]`);
      if (legendItem) legendItem.classList.remove('legend-dimmed');
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
        legendItem.classList.add('legend-dimmed');
      } else {
        legendItem.classList.remove('legend-dimmed');
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

/* -------------------------------------------
   Global App Tab Switching
------------------------------------------- */
function switchAppTab(tabId, btnElement) {
  // Hide all app views
  document.querySelectorAll('.app-view').forEach(t => t.classList.remove('active', 'hidden'));
  document.querySelectorAll('.app-view').forEach(t => {
    if (t.id !== tabId) t.classList.add('hidden');
  });
  document.getElementById(tabId).classList.add('active');

  // Update nav buttons
  document.querySelectorAll('.app-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (btnElement) {
    btnElement.classList.add('active');
  }
}

/* -------------------------------------------
   Plumbing Simulator JS Logic
------------------------------------------- */
// tab system within simulator
function showSimTab(tabId, btnElement) {
  document.querySelectorAll('.sim-tab-content').forEach(t => {
    t.classList.remove('active');
    t.classList.add('hidden');
  });

  document.querySelectorAll('.sim-inner-tab').forEach(btn => {
    btn.classList.remove('text-blue-400', 'border-b-2', 'border-blue-500');
    btn.classList.add('text-slate-400');
  });

  document.getElementById(tabId).classList.remove('hidden');
  document.getElementById(tabId).classList.add('active');

  if (btnElement) {
    btnElement.classList.add('text-blue-400', 'border-b-2', 'border-blue-500');
    btnElement.classList.remove('text-slate-400');
  }
}

// set traffic light by id
function setLight(id, color) {
  const el = document.getElementById(id);
  if (el) {
    el.className = `indicator-light light-${color}`;
  }
}

// main simulation logic
function runSimulation() {
  const dxy = document.getElementById('dxy-input').value;
  const yieldVal = document.getElementById('yield-input').value;
  const vix = document.getElementById('vix-input').value;

  // elements
  const forecast = document.getElementById('forecast-text');
  const status = document.getElementById('system-status');
  const priceTag = document.getElementById('price-tag');
  const vixWarn = document.getElementById('vix-warning');
  const vixBody = document.getElementById('vix-alert-body');
  const vixTitle = document.getElementById('vix-alert-title');
  const rVal = document.getElementById('risk-val');
  const lVal = document.getElementById('liq-val');
  const pStat = document.getElementById('pricing-status');
  const mmStat = document.getElementById('mm-status');

  // ----- VIX logic + market maker status -----
  if (vix === 'high') {
    vixWarn.classList.remove('hidden');
    vixWarn.className = "mt-5 p-3 bg-red-900/20 border border-red-500/40 rounded-xl text-xs text-red-400 flex items-start gap-2 transition-all duration-250";
    vixTitle.innerText = "🚨 VIX PANIC:";
    vixBody.innerText = "Market makers stepping back. Spreads blown out, liquidity holes.";
    mmStat.innerText = "STEPPING BACK";
    mmStat.className = "text-2xl font-bold text-red-500 transition-colors duration-200";
  } else if (vix === 'mid') {
    vixWarn.classList.remove('hidden');
    vixWarn.className = "mt-5 p-3 bg-yellow-900/20 border border-yellow-500/40 rounded-xl text-xs text-yellow-400 flex items-start gap-2 transition-all duration-250";
    vixTitle.innerText = "⚠️ VIX ELEVATED:";
    vixBody.innerText = "Spreads widening, liquidity thinning out.";
    mmStat.innerText = "CAUTIOUS";
    mmStat.className = "text-2xl font-bold text-yellow-500 transition-colors duration-200";
  } else {
    vixWarn.classList.add('hidden');
    mmStat.innerText = "PROVIDING";
    mmStat.className = "text-2xl font-bold text-blue-400 transition-colors duration-200";
  }

  // ----- bond price tag & status -----
  if (yieldVal === 'up') {
    priceTag.innerText = "🔥 DISCOUNT";
    priceTag.className = "text-[0.7rem] font-black uppercase bg-red-900/60 text-red-300 px-3 py-1.5 rounded-full border border-red-500/40 tracking-wide";
    pStat.innerText = "DISCOUNT";
    pStat.className = "text-2xl font-bold text-red-400 transition-colors duration-200";
  } else if (yieldVal === 'down') {
    priceTag.innerText = "✨ PREMIUM";
    priceTag.className = "text-[0.7rem] font-black uppercase bg-green-900/60 text-green-300 px-3 py-1.5 rounded-full border border-green-500/40 tracking-wide";
    pStat.innerText = "PREMIUM";
    pStat.className = "text-2xl font-bold text-green-400 transition-colors duration-200";
  } else {
    priceTag.innerText = "⚪ PAR";
    priceTag.className = "text-[0.7rem] font-black uppercase bg-slate-700/80 text-slate-300 px-3 py-1.5 rounded-full tracking-wide";
    pStat.innerText = "AT PAR";
    pStat.className = "text-2xl font-bold text-blue-400 transition-colors duration-200";
  }

  // base light colors
  let crypto = 'green', tech = 'green', indices = 'green', futures = 'green', options = 'green', commodities = 'green';

  // --- SCENARIO MATRIX ---
  if (dxy === 'up' && yieldVal === 'up') {
    forecast.innerHTML = "<span class='text-red-400 font-bold'>💧 LIQUIDITY VACUUM.</span> Bonds at discount. DXY sucking cash + spiking yields → systemic stress. Leveraged loops unwinding.";
    status.innerHTML = '<span class="relative flex h-2 w-2 mr-1"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span></span> pipes clogged';
    status.className = "pill bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1.5";
    rVal.innerText = vix === 'high' ? 'EXTREME' : 'CRITICAL';
    rVal.className = "text-2xl font-bold text-red-500 transition-colors duration-200";
    lVal.innerText = "DRY";
    lVal.className = "text-2xl font-bold text-red-500 transition-colors duration-200";
    crypto = 'red'; tech = 'red'; indices = 'red'; futures = 'red'; options = 'red'; commodities = 'red';
  }
  else if (dxy === 'down' && yieldVal === 'down') {
    if (vix === 'high' || vix === 'mid') {
      forecast.innerHTML = "<span class='text-yellow-400 font-bold'>🏛️ FLIGHT TO SAFETY (fear).</span> Money flees stocks → bonds. DXY down, but risk assets under pressure. Gold bid.";
      status.innerHTML = '<span class="relative flex h-2 w-2 mr-1"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span></span> caution';
      status.className = "pill bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1.5";
      rVal.innerText = "HIGH";
      rVal.className = "text-2xl font-bold text-yellow-500 transition-colors duration-200";
      lVal.innerText = "STABLE";
      lVal.className = "text-2xl font-bold text-slate-200 transition-colors duration-200";
      crypto = 'yellow'; tech = 'yellow'; indices = 'red'; futures = 'yellow'; options = 'red'; commodities = 'green';
    } else {
      forecast.innerHTML = "<span class='text-green-400 font-bold'>✨ GOLDILOCKS ZONE.</span> Risk-on, liquidity returning. Bonds at premium, yields settle. Bullish for equities and crypto.";
      status.innerHTML = '<span class="relative flex h-2 w-2 mr-1"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span></span> flowing';
      status.className = "pill bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5";
      rVal.innerText = "LOW";
      rVal.className = "text-2xl font-bold text-green-500 transition-colors duration-200";
      lVal.innerText = "PLENTIFUL";
      lVal.className = "text-2xl font-bold text-green-500 transition-colors duration-200";
      crypto = 'green'; tech = 'green'; indices = 'green'; futures = 'green'; options = 'green'; commodities = 'green';
    }
  }
  else if (dxy === 'up' && yieldVal === 'down') {
    forecast.innerHTML = "<strong>🛡️ DEFENSIVE FLIGHT.</strong> Bonds at premium, investors buy bonds + hold cash (DXY up). Caution in risk assets.";
    status.innerHTML = '<span class="relative flex h-2 w-2 mr-1"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span></span> caution';
    status.className = "pill bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1.5";
    rVal.innerText = "HIGH";
    rVal.className = "text-2xl font-bold text-yellow-500 transition-colors duration-200";
    lVal.innerText = "TIGHT";
    lVal.className = "text-2xl font-bold text-yellow-500 transition-colors duration-200";
    crypto = 'yellow'; tech = 'yellow'; indices = 'yellow'; futures = 'yellow'; options = 'yellow'; commodities = 'yellow';
  }
  else {  // neutral mix
    forecast.innerHTML = "📡 Markets searching for direction. Monitor DXY & VIX. Plumbing holds stable for now.";
    status.innerHTML = '<span class="relative flex h-2 w-2 mr-1"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span></span> pipes clear';
    status.className = "pill bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5";
    rVal.innerText = vix === 'mid' ? 'ELEVATED' : 'MODERATE';
    rVal.className = "text-2xl font-bold text-slate-200 transition-colors duration-200";
    lVal.innerText = "STABLE";
    lVal.className = "text-2xl font-bold text-slate-200 transition-colors duration-200";
    crypto = 'yellow'; tech = 'yellow'; indices = 'yellow'; futures = 'yellow'; options = 'yellow'; commodities = 'yellow';
  }

  // set all lights
  setLight('light-crypto', crypto);
  setLight('light-tech', tech);
  setLight('light-indices', indices);
  setLight('light-futures', futures);
  setLight('light-options', options);
  setLight('light-commodities', commodities);
}

// Ensure simulation initializes on fresh DOM load when the tab opens
document.addEventListener('DOMContentLoaded', () => {
  // wait for DOM to fully render, then run initially so right values appear
  setTimeout(runSimulation, 50);
  // Start live data fetch loop
  fetchLiveData();
});

/* -------------------------------------------
   Live Data Integration
------------------------------------------- */
let liveMode = true;
let livePollInterval = null;
const LIVE_POLL_MS = 60000; // every 60 seconds

const BUCKET_LABELS = {
  dxy: { up: '⬆️ RISING', down: '⬇️ DUMPING', neutral: '➡️ STABLE' },
  us10y: { up: '🔥 SPIKING', down: '❄️ FALLING', neutral: '➡️ FLAT' },
  vix: { high: '😱 PANIC', mid: '😐 ELEVATED', low: '😌 CALM' }
};

const BUCKET_COLORS = {
  up: 'text-red-400', down: 'text-green-400', neutral: 'text-slate-300',
  high: 'text-red-400', mid: 'text-yellow-400', low: 'text-green-400'
};

function fetchLiveData() {
  fetch('live_data.json?t=' + Date.now())
    .then(r => r.json())
    .then(data => {
      updateLiveBanner(data);
      if (liveMode) applyLiveDataToSim(data);
    })
    .catch(() => {
      const el = document.getElementById('live-timestamp');
      if (el) el.textContent = '⚠️ No live data found — run fetch_live_data.py to enable';
    });
}

function updateLiveBanner(data) {
  // DXY
  setText('live-dxy-val', data.dxy.value?.toFixed(3) ?? '--');
  setText('live-dxy-chg', (data.dxy.change_pct >= 0 ? '+' : '') + data.dxy.change_pct?.toFixed(2) + '%');
  setBucketBadge('live-dxy-bucket', 'dxy', data.dxy.bucket);
  setColor('live-dxy-chg', data.dxy.change_pct >= 0 ? 'text-red-400' : 'text-green-400');

  // US10Y
  setText('live-10y-val', data.us10y.value?.toFixed(3) + '%' ?? '--');
  setText('live-10y-chg', (data.us10y.change_pct >= 0 ? '+' : '') + data.us10y.change_pct?.toFixed(2) + '%');
  setBucketBadge('live-10y-bucket', 'us10y', data.us10y.bucket);
  setColor('live-10y-chg', data.us10y.change_pct >= 0 ? 'text-red-400' : 'text-green-400');

  // VIX
  setText('live-vix-val', data.vix.value?.toFixed(2) ?? '--');
  setText('live-vix-chg', (data.vix.change_pct >= 0 ? '+' : '') + data.vix.change_pct?.toFixed(2) + '%');
  setBucketBadge('live-vix-bucket', 'vix', data.vix.bucket);
  setColor('live-vix-chg', data.vix.change_pct >= 0 ? 'text-orange-400' : 'text-green-400');

  // Timestamp
  const ts = data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '--';
  setText('live-timestamp', '🟢 Last updated: ' + ts + ' UTC');
}

function applyLiveDataToSim(data) {
  const dxyEl = document.getElementById('dxy-input');
  const yieldEl = document.getElementById('yield-input');
  const vixEl = document.getElementById('vix-input');
  if (dxyEl) dxyEl.value = data.dxy.bucket;
  if (yieldEl) yieldEl.value = data.us10y.bucket;
  if (vixEl) vixEl.value = data.vix.bucket;
  runSimulation();
}

function toggleLiveMode() {
  liveMode = !liveMode;
  const btn = document.getElementById('live-mode-btn');
  if (liveMode) {
    btn.textContent = '🔴 Live Mode ON';
    btn.className = 'text-xs px-3 py-1.5 rounded-full border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 transition';
    fetchLiveData(); // immediate refresh
    livePollInterval = setInterval(fetchLiveData, LIVE_POLL_MS);
  } else {
    btn.textContent = '⚪ Live Mode OFF';
    btn.className = 'text-xs px-3 py-1.5 rounded-full border border-slate-600 text-slate-400 hover:bg-slate-700 transition';
    clearInterval(livePollInterval);
  }
}

// helpers
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setColor(id, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = el.className.replace(/text-\S+/g, '') + ' ' + cls;
}
function setBucketBadge(id, type, bucket) {
  const el = document.getElementById(id);
  if (!el) return;
  const label = (BUCKET_LABELS[type] || {})[bucket] || bucket.toUpperCase();
  const color = BUCKET_COLORS[bucket] || 'text-slate-300';
  el.textContent = label;
  el.className = `text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-semibold bg-slate-800 ${color}`;
}

// Start polling every 60s
livePollInterval = setInterval(fetchLiveData, LIVE_POLL_MS);

