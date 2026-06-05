function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function renderLatest(reading) {
  setText('#deviceId', reading.deviceId);
  setText('#kind', reading.kind);
  setText('#value', `${reading.value} ${reading.unit}`.trim());
  setText('#source', reading.source);
  setText('#timestamp', formatTime(reading.timestamp));
}

function renderHistory(items) {
  const list = $('#history');
  if (!list) return;

  list.innerHTML = items
    .map(item => `<li><strong>${escapeHtml(item.kind)}</strong> · ${escapeHtml(item.value)} ${escapeHtml(item.unit)} <span>${escapeHtml(formatTime(item.timestamp))}</span></li>`)
    .join('');
}

async function getLatestReading() {
  const response = await fetch('/api/hardware/latest');
  if (!response.ok) {
    throw new Error(`Failed to load latest reading (${response.status})`);
  }
  return response.json();
}

async function postReading(payload) {
  const response = await fetch('/api/hardware/input', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to send reading');
  }

  return response.json();
}
