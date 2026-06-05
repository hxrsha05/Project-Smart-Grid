import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 5050);

app.use(express.json());
app.use(express.static(publicDir));

const latest = {
  deviceId: 'demo-device',
  kind: 'temperature',
  value: 0,
  unit: '°C',
  source: 'boot',
  timestamp: Date.now(),
};

const history = [];

function pushReading(reading) {
  latest.deviceId = reading.deviceId || latest.deviceId;
  latest.kind = reading.kind || latest.kind;
  latest.value = Number(reading.value ?? latest.value);
  latest.unit = reading.unit || latest.unit;
  latest.source = reading.source || 'hardware';
  latest.timestamp = Date.now();

  history.unshift({ ...latest });
  history.splice(20);
}

app.get('/api/hardware/latest', (_req, res) => {
  res.json({ ok: true, latest, history });
});

app.post('/api/hardware/input', (req, res) => {
  const { deviceId, kind, value, unit, source } = req.body || {};

  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return res.status(400).json({ ok: false, error: 'value must be a number' });
  }

  pushReading({ deviceId, kind, value, unit, source });
  res.json({ ok: true, latest });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Hardware sample bridge running on http://localhost:${port}`);
});
