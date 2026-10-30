(() => {
  const keys = ['temperature', 'ph', 'oxygen'];
  const labels = {
    temperature: 'Temperature',
    ph: 'pH',
    oxygen: 'O₂',
  };

  const windowMilliseconds = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  let allMeasurements = [];
  let tooltip = null;
  let selectedWindow = '24h';

  function parseTimestamp(timestamp) {
    if (!timestamp) return NaN;
    const normalized = timestamp.includes('T') ? timestamp : `${timestamp.replace(' ', 'T')}Z`;
    return Date.parse(normalized);
  }

  function getConfig() {
    return window.dashboardConfig || {};
  }

  function windowTitle() {
    const titles = {
      '1h': 'last hour',
      '6h': 'last 6 hours',
      '24h': 'last 24 hours',
      '7d': 'last 7 days',
      '30d': 'last 30 days',
      all: 'all recorded data',
    };
    return titles[selectedWindow] || 'last 24 hours';
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function drawChart(canvas, rows) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');

    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const width = rect.width;
    const height = rect.height;
    const key = canvas.dataset.key || 'temperature';
    const color = canvas.dataset.color || '#4f46e5';
    const field = key === 'temperature' ? 'temperature' : key;
    const padding = {left: 31, right: 6, top: 12, bottom: 22};

    const points = rows
      .map(row => ({
        row,
        value: Number(row[field]),
        time: parseTimestamp(row.timestamp),
      }))
      .filter(point => Number.isFinite(point.value) && Number.isFinite(point.time));

    if (!points.length) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#8a96a9';
      ctx.textAlign = 'center';
      ctx.font = '9px DM Sans, Arial';
      ctx.textBaseline = 'middle';
      ctx.fillText('Waiting for measurements', width / 2, height / 2);
      return;
    }

    const values = points.map(point => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const now = Date.now();
    const period = windowMilliseconds[selectedWindow];
    const firstPointTime = points[0].time;
    const lastPointTime = points[points.length - 1].time;
    const startTime = period ? now - period : firstPointTime;
    const endTime = period ? now : Math.max(lastPointTime, startTime + 1000);
    const xForPoint = time => {
      const span = endTime - startTime || 1;
      return padding.left + plotWidth * clamp((time - startTime) / span, 0, 1);
    };
    const yForValue = value => {
      const span = max === min ? 1 : max - min;
      return padding.top + plotHeight * (max === min ? 0.5 : (max - value) / span);
    };

    ctx.clearRect(0, 0, width, height);
    ctx.font = '9px DM Sans, Arial';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + plotHeight * (i / 4);
      const value = max === min ? max : max - (max - min) * (i / 4);
      ctx.strokeStyle = '#edf1f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#8592a5';
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(key === 'temperature' ? 0 : 1), padding.left - 6, y);
    }

    for (let i = 0; i < 5; i += 1) {
      const fraction = i / 4;
      const x = padding.left + plotWidth * fraction;
      const tickTime = startTime + (endTime - startTime) * fraction;
      let tickLabel;

      if (period && period <= 24 * 60 * 60 * 1000) {
        const agoMinutes = Math.round((endTime - tickTime) / 60000);
        tickLabel = agoMinutes === 0
          ? 'Now'
          : agoMinutes >= 60
            ? `${Math.round(agoMinutes / 60)}h ago`
            : `${agoMinutes}m ago`;
      } else if (i === 4 && period) {
        tickLabel = 'Now';
      } else {
        tickLabel = new Date(tickTime).toLocaleDateString([], {month: 'short', day: 'numeric'});
      }

      ctx.fillStyle = '#8592a5';
      ctx.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center';
      ctx.fillText(tickLabel, x, height - 8);
    }

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
    gradient.addColorStop(0, `${color}36`);
    gradient.addColorStop(1, `${color}04`);

    ctx.beginPath();
    points.forEach((point, index) => {
      const x = xForPoint(point.time);
      const y = yForValue(point.value);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(xForPoint(points[points.length - 1].time), padding.top + plotHeight);
    ctx.lineTo(xForPoint(points[0].time), padding.top + plotHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    points.forEach((point, index) => {
      const x = xForPoint(point.time);
      const y = yForValue(point.value);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    canvas.__chartPoints = points;
    canvas.__chartGeometry = {
      positions: points.map((point, index) => ({x: xForPoint(point.time), i: index})),
    };

    const hoverIndex = canvas.__hoverIndex;
    if (hoverIndex != null && points[hoverIndex]) {
      ctx.beginPath();
      const hoverPoint = points[hoverIndex];
      ctx.arc(xForPoint(hoverPoint.time), yForValue(hoverPoint.value), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function attachChartHover(canvas) {
    if (!canvas || canvas.__hoverAttached) return;
    canvas.__hoverAttached = true;

    canvas.addEventListener('pointermove', event => {
      const points = canvas.__chartPoints || [];
      const geometry = canvas.__chartGeometry;
      if (!points.length || !geometry) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const index = geometry.positions.reduce((closestIndex, point) => (
        Math.abs(point.x - x) < Math.abs(geometry.positions[closestIndex].x - x) ? point.i : closestIndex
      ), 0);

      canvas.__hoverIndex = index;
      drawChart(canvas, allMeasurements);

      const point = points[index];
      if (!point) return;

      const decimals = canvas.dataset.key === 'ph' ? 2 : 1;
      tooltip.textContent = `${point.row.timestamp}  ·  ${Number(point.value).toFixed(decimals)} ${canvas.dataset.unit}`;
      tooltip.style.display = 'block';

      const tipRect = tooltip.getBoundingClientRect();
      tooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - tipRect.width - 10)}px`;
      tooltip.style.top = `${Math.max(8, event.clientY - tipRect.height - 12)}px`;
    });

    canvas.addEventListener('pointerleave', () => {
      canvas.__hoverIndex = null;
      drawChart(canvas, allMeasurements);
      if (tooltip) tooltip.style.display = 'none';
    });
  }

  function updateStatuses(reading, config) {
    keys.forEach(key => {
      const badge = document.getElementById(`status-${key}`);
      if (!badge || !reading || reading[key] == null) return;

      const limits = config[key];
      if (!limits) return;

      const alarm = reading[key] < limits.alarm_low || reading[key] > limits.alarm_high;
      badge.classList.toggle('alert', alarm);
      const statusText = badge.querySelector('span');
      if (statusText) statusText.textContent = alarm ? 'Warning' : 'Normal';
    });
  }

  function updateMetricCards(reading, config) {
    if (!reading) return;

    keys.forEach(key => {
      const value = reading[key];
      const valueElement = document.getElementById(`value-${key}`);
      if (valueElement && value != null) {
        const decimals = key === 'temperature' ? 1 : 2;
        const unit = valueElement.dataset.unit;
        valueElement.innerHTML = `${Number(value).toFixed(decimals)}${unit ? ` <small>${unit}</small>` : ''}`;
      }

      const rangeElement = document.getElementById(`range-${key}`);
      if (rangeElement && config && config[key]) {
        const unit = valueElement ? valueElement.dataset.unit : '';
        rangeElement.textContent = `Range ${config[key].min}-${config[key].max}${unit ? ` ${unit}` : ''}`;
      }
    });
  }

  function render(data) {
    selectedWindow = data.window || selectedWindow;
    const selector = document.getElementById('chart-window');
    if (selector) selector.value = selectedWindow;

    allMeasurements = data.measurements || [];
    const config = data.config || getConfig();
    if (data.config) window.dashboardConfig = data.config;

    const latest = allMeasurements[allMeasurements.length - 1];
    const latestTime = document.getElementById('latest-time');
    if (latestTime) latestTime.textContent = latest ? latest.timestamp : 'No readings yet';

    updateMetricCards(latest, config);
    document.querySelectorAll('.chart-panel canvas').forEach(canvas => {
      attachChartHover(canvas);
      drawChart(canvas, allMeasurements);
    });

    const chartDialog = document.getElementById('chart-dialog');
    const expandedChart = document.getElementById('expanded-chart');
    if (chartDialog && chartDialog.open && expandedChart) drawChart(expandedChart, allMeasurements);
    if (latest && config) updateStatuses(latest, config);

    const rows = document.getElementById('measurement-rows');
    if (!rows) return;

    const reversedMeasurements = [...allMeasurements].reverse();
    const visible = document.body.dataset.showAll === 'true'
      ? reversedMeasurements
      : reversedMeasurements.slice(0, 20);

    rows.innerHTML = visible.length
      ? visible.map(row => (
        `<tr><td>${row.timestamp}</td><td>${Number(row.temperature).toFixed(1)} °C</td><td>${Number(row.ph).toFixed(2)}</td><td>${Number(row.oxygen).toFixed(1)}</td></tr>`
      )).join('')
      : '<tr><td colspan="4" class="empty">No measurements recorded yet.</td></tr>';
  }

  async function refresh() {
    const response = await fetch(`/api/dashboard?window=${encodeURIComponent(selectedWindow)}`);
    if (!response.ok) throw new Error('Could not load dashboard data');
    render(await response.json());
  }

  const refreshButton = document.getElementById('refresh');
  if (refreshButton) {
    refreshButton.addEventListener('click', async () => {
      refreshButton.classList.add('loading');
      try {
        await refresh();
      } catch (error) {
        alert(error.message);
      } finally {
        refreshButton.classList.remove('loading');
      }
    });
  }

  const chartDialog = document.getElementById('chart-dialog');
  const expandedChart = document.getElementById('expanded-chart');
  tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.setAttribute('role', 'status');
  document.body.appendChild(tooltip);

  if (expandedChart) attachChartHover(expandedChart);
  document.querySelectorAll('.expand-chart').forEach(button => {
    button.addEventListener('click', () => {
      const source = document.getElementById(button.dataset.chart);
      if (!source || !expandedChart || !chartDialog) return;

      expandedChart.dataset.key = source.dataset.key;
      expandedChart.dataset.unit = source.dataset.unit;
      expandedChart.dataset.color = source.dataset.color;
      document.getElementById('dialog-title').textContent = `${labels[source.dataset.key]} - ${windowTitle()}`;
      chartDialog.showModal();
      chartDialog.appendChild(tooltip);
      requestAnimationFrame(() => drawChart(expandedChart, allMeasurements));
    });
  });

  const closeChartButton = document.getElementById('close-chart');
  if (closeChartButton && chartDialog) {
    closeChartButton.addEventListener('click', () => chartDialog.close());
  }

  const chartWindowSelector = document.getElementById('chart-window');
  if (chartWindowSelector) {
    chartWindowSelector.addEventListener('change', async event => {
      selectedWindow = event.target.value;
      document.getElementById('dialog-title').textContent = `${labels[expandedChart.dataset.key]} - ${windowTitle()}`;
      try {
        await refresh();
        if (chartDialog && chartDialog.open) drawChart(expandedChart, allMeasurements);
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (chartDialog) {
    chartDialog.addEventListener('close', () => {
      tooltip.style.display = 'none';
      document.body.appendChild(tooltip);
    });

    chartDialog.addEventListener('click', event => {
      if (event.target === chartDialog) chartDialog.close();
    });
  }

  const showReadingsButton = document.getElementById('show-readings');
  if (showReadingsButton) {
    showReadingsButton.addEventListener('click', event => {
      const showAll = document.body.dataset.showAll !== 'true';
      document.body.dataset.showAll = String(showAll);
      event.currentTarget.innerHTML = showAll ? 'Show less <span>↑</span>' : 'Show all <span>→</span>';
      render({measurements: allMeasurements, config: getConfig()});
    });
  }

  const configForm = document.getElementById('config-form');
  if (configForm) {
    configForm.addEventListener('submit', async event => {
      event.preventDefault();
      const message = document.getElementById('save-message');
      const payload = Object.fromEntries(new FormData(event.currentTarget));
      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not save settings');
        window.dashboardConfig = result.config;
        message.textContent = 'Settings saved';
        await refresh();
      } catch (error) {
        message.textContent = error.message;
        message.style.color = '#b54734';
      }
    });
  }

  const alarmForm = document.getElementById('alarm-form');
  if (alarmForm) {
    alarmForm.addEventListener('submit', async event => {
      event.preventDefault();
      const message = document.getElementById('alarm-save-message');
      const payload = Object.fromEntries(new FormData(event.currentTarget));
      try {
        const response = await fetch('/api/alarms', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not save alarm limits');
        window.dashboardConfig = result.config;
        message.textContent = 'Alarm limits saved';
        message.style.color = '';
        await refresh();
      } catch (error) {
        message.textContent = error.message;
        message.style.color = '#b54734';
      }
    });
  }

  const readSensorsButton = document.getElementById('read-sensors');
  if (readSensorsButton) {
    readSensorsButton.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Reading sensors…';
      try {
        const response = await fetch('/api/measure', {method: 'POST'});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Sensor read failed');
        await refresh();
      } catch (error) {
        alert(error.message);
      } finally {
        button.disabled = false;
        button.innerHTML = '↻ &nbsp;Read sensors now';
      }
    });
  }

  window.addEventListener('resize', () => {
    document.querySelectorAll('.chart-panel canvas').forEach(canvas => drawChart(canvas, allMeasurements));
    if (chartDialog && chartDialog.open && expandedChart) drawChart(expandedChart, allMeasurements);
  });

  window.dashboardConfig = window.dashboardConfig || {};
  refresh().catch(() => {});
  window.setInterval(() => refresh().catch(() => {}), 5_000);
})();
