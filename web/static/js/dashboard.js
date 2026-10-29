(() => {
  const keys = ['temperature', 'ph', 'oxygen'];
  const labels = {temperature: 'Temperature', ph: 'pH', oxygen: 'O₂'};
  let allMeasurements = [];
  let tooltip = null;

  function drawChart(canvas, rows) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, rect.width * ratio);
    canvas.height = Math.max(1, rect.height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const w = rect.width, h = rect.height;
    const key = canvas.dataset.key, color = canvas.dataset.color;
    const field = key === 'temperature' ? 'temperature' : key;
    const points = rows.map(row => ({row, value: Number(row[field])})).filter(point => Number.isFinite(point.value));
    const values = points.map(point => point.value);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const padding = {left: 31, right: 6, top: 12, bottom: 22};
    const plotW = w - padding.left - padding.right, plotH = h - padding.top - padding.bottom;
    ctx.font = '9px DM Sans, Arial';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + plotH * i / 4;
      const value = max === min ? max : max - (max - min) * i / 4;
      ctx.strokeStyle = '#edf1f6'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
      ctx.fillStyle = '#8592a5'; ctx.textAlign = 'right'; ctx.fillText(value.toFixed(key === 'temperature' ? 0 : 1), padding.left - 6, y);
    }
    for (let i = 0; i < 5; i++) {
      const x = padding.left + plotW * i / 4;
      ctx.fillStyle = '#8592a5'; ctx.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center';
      ctx.fillText(['24h ago', '18h', '12h', '6h', 'Now'][i], x, h - 8);
    }
    if (!points.length) { ctx.fillStyle = '#8a96a9'; ctx.textAlign = 'center'; ctx.fillText('Waiting for measurements', w / 2, h / 2); return; }
    const xAt = i => padding.left + plotW * (points.length === 1 ? .5 : i / (points.length - 1));
    const yAt = value => padding.top + plotH * (max === min ? .5 : (max - value) / (max - min));
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
    gradient.addColorStop(0, color + '36'); gradient.addColorStop(1, color + '04');
    ctx.beginPath(); points.forEach((point, i) => i ? ctx.lineTo(xAt(i), yAt(point.value)) : ctx.moveTo(xAt(i), yAt(point.value)));
    ctx.lineTo(xAt(points.length - 1), padding.top + plotH); ctx.lineTo(xAt(0), padding.top + plotH); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath(); points.forEach((point, i) => i ? ctx.lineTo(xAt(i), yAt(point.value)) : ctx.moveTo(xAt(i), yAt(point.value)));
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    canvas.__chartPoints = points;
    canvas.__chartGeometry = {xAt, yAt, padding, plotW};
    const hoverIndex = canvas.__hoverIndex;
    if (hoverIndex != null && points[hoverIndex]) {
      ctx.beginPath(); ctx.arc(xAt(hoverIndex), yAt(points[hoverIndex].value), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  function attachChartHover(canvas) {
    if (canvas.__hoverAttached) return;
    canvas.__hoverAttached = true;
    canvas.addEventListener('pointermove', event => {
      const points = canvas.__chartPoints || [];
      const geometry = canvas.__chartGeometry;
      if (!points.length || !geometry) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, (x - geometry.padding.left) / geometry.plotW));
      const index = points.length === 1 ? 0 : Math.round(ratio * (points.length - 1));
      canvas.__hoverIndex = index;
      drawChart(canvas, allMeasurements);
      const point = points[index];
      const key = canvas.dataset.key;
      const decimals = key === 'ph' ? 2 : 1;
      tooltip.textContent = `${point.row.timestamp}  ·  ${point.value.toFixed(decimals)} ${canvas.dataset.unit}`;
      tooltip.style.display = 'block';
      const tipRect = tooltip.getBoundingClientRect();
      tooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - tipRect.width - 10)}px`;
      tooltip.style.top = `${Math.max(8, event.clientY - tipRect.height - 12)}px`;
    });
    canvas.addEventListener('pointerleave', () => {
      canvas.__hoverIndex = null;
      drawChart(canvas, allMeasurements);
      tooltip.style.display = 'none';
    });
  }

  function updateStatuses(reading, config) {
    keys.forEach(key => {
      const badge = document.getElementById(`status-${key}`);
      if (!badge || reading[key] == null) return;
      const limits = config[key];
      const alarm = reading[key] < limits.alarm_low || reading[key] > limits.alarm_high;
      badge.classList.toggle('alert', alarm);
      badge.querySelector('span').textContent = alarm ? 'Warning' : 'Normal';
    });
  }

  function render(data) {
    allMeasurements = data.measurements || [];
    if (data.config) window.dashboardConfig = data.config;
    const latest = allMeasurements[allMeasurements.length - 1];
    document.getElementById('latest-time').textContent = latest ? latest.timestamp : 'No readings yet';
    document.querySelectorAll('.chart-panel canvas').forEach(canvas => { attachChartHover(canvas); drawChart(canvas, allMeasurements); });
    if (latest && (data.config || window.dashboardConfig)) updateStatuses(latest, data.config || window.dashboardConfig);
    const rows = document.getElementById('measurement-rows');
    const visible = document.body.dataset.showAll === 'true' ? [...allMeasurements].reverse() : [...allMeasurements].reverse().slice(0, 8);
    rows.innerHTML = visible.length ? visible.map(row => `<tr><td>${row.timestamp}</td><td>${Number(row.temperature).toFixed(1)} °C</td><td>${Number(row.ph).toFixed(2)}</td><td>${Number(row.oxygen).toFixed(1)}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No measurements recorded yet.</td></tr>';
  }

  async function refresh() {
    const response = await fetch('/api/dashboard');
    if (!response.ok) throw new Error('Could not load dashboard data');
    render(await response.json());
  }

  document.getElementById('refresh').addEventListener('click', async () => {
    const button = document.getElementById('refresh'); button.classList.add('loading');
    try { await refresh(); } catch (error) { alert(error.message); } finally { button.classList.remove('loading'); }
  });

  const chartDialog = document.getElementById('chart-dialog');
  const expandedChart = document.getElementById('expanded-chart');
  tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.setAttribute('role', 'status');
  document.body.appendChild(tooltip);
  attachChartHover(expandedChart);
  document.querySelectorAll('.expand-chart').forEach(button => {
    button.addEventListener('click', () => {
      const source = document.getElementById(button.dataset.chart);
      expandedChart.dataset.key = source.dataset.key;
      expandedChart.dataset.unit = source.dataset.unit;
      expandedChart.dataset.color = source.dataset.color;
      document.getElementById('dialog-title').textContent = `${labels[source.dataset.key]} - last 24 hours`;
      chartDialog.showModal();
      requestAnimationFrame(() => drawChart(expandedChart, allMeasurements));
    });
  });
  document.getElementById('close-chart').addEventListener('click', () => chartDialog.close());
  chartDialog.addEventListener('click', event => {
    if (event.target === chartDialog) chartDialog.close();
  });

  document.getElementById('show-readings').addEventListener('click', event => {
    const showAll = document.body.dataset.showAll !== 'true';
    document.body.dataset.showAll = String(showAll);
    event.currentTarget.innerHTML = showAll ? 'Show less <span>↑</span>' : 'Show all <span>→</span>';
    render({measurements: allMeasurements, config: window.dashboardConfig});
  });

  document.getElementById('config-form').addEventListener('submit', async event => {
    event.preventDefault();
    const message = document.getElementById('save-message');
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/config', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save settings');
      window.dashboardConfig = result.config;
      message.textContent = 'Settings saved';
      await refresh();
    } catch (error) { message.textContent = error.message; message.style.color = '#b54734'; }
  });

  document.getElementById('read-sensors').addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true; button.textContent = 'Reading sensors…';
    try {
      const response = await fetch('/api/measure', {method: 'POST'});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sensor read failed');
      await refresh();
    } catch (error) { alert(error.message); }
    finally { button.disabled = false; button.innerHTML = '↻ &nbsp;Read sensors now'; }
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.chart-panel canvas').forEach(canvas => drawChart(canvas, allMeasurements));
    if (chartDialog.open) drawChart(expandedChart, allMeasurements);
  });
  window.dashboardConfig = window.dashboardConfig || {};
  refresh().catch(() => {});
})();
