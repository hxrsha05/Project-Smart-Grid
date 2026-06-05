async function refreshDashboard() {
  const statusEl = document.querySelector('#status');
  try {
    const data = await getLatestReading();
    renderLatest(data.latest);
    renderHistory(data.history);
    if (statusEl) {
      statusEl.textContent = `Connected · ${data.latest.source}`;
      statusEl.className = 'status ok';
    }
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = 'Disconnected';
      statusEl.className = 'status bad';
    }
    console.error(error);
  }
}

async function handleSendReading(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = {
    deviceId: formData.get('deviceId'),
    kind: formData.get('kind'),
    value: Number(formData.get('value')),
    unit: formData.get('unit'),
    source: 'manual-test',
  };

  try {
    await postReading(payload);
    await refreshDashboard();
    form.reset();
  } catch (error) {
    console.error(error);
    alert('Could not send reading');
  }
}

function startHardwareBridge() {
  const form = document.querySelector('#readingForm');
  if (form) {
    form.addEventListener('submit', handleSendReading);
  }

  refreshDashboard();
  setInterval(refreshDashboard, 1000);
}

document.addEventListener('DOMContentLoaded', startHardwareBridge);
