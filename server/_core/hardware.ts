import type { Express } from "express";
import { ENV } from "./env";

export type HardwareReading = {
  deviceId: string;
  kind: string;
  value: number;
  unit: string;
  source: string;
  timestamp: number;
};

const latest: HardwareReading = {
  deviceId: "demo-device",
  kind: "consumption",
  value: 2450,
  unit: "kW",
  source: "boot",
  timestamp: Date.now(),
};

const history: HardwareReading[] = [];

type CurrentWeather = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  cloudCover: number;
  windSpeed: number;
  description: string;
  location: string;
  fetchedAt: number;
  source: "weatherapi" | "fallback";
};

type WeatherForecastItem = {
  timeLabel: string;
  temperature: number;
  humidity: number;
  cloudCover: number;
  windSpeed: number;
  rainChance: number;
  description: string;
};

const DEFAULT_WEATHER: CurrentWeather = {
  temperature: 24,
  feelsLike: 24,
  humidity: 62,
  cloudCover: 15,
  windSpeed: 14,
  description: "Mostly clear",
  location: "Campus",
  fetchedAt: Date.now(),
  source: "fallback",
};

// Telemetry shape from the extracted `voltage_detector` project
type TelemetryUnit = { v: number; c?: number; p?: number };
type Telemetry = {
  solar: TelemetryUnit;
  wind: TelemetryUnit;
  ac: TelemetryUnit;
};

let latestTelemetry: Telemetry = {
  solar: { v: 0, c: 0, p: 0 },
  wind: { v: 0, c: 0, p: 0 },
  ac: { v: 0, p: 0 },
};

function normalizeApiKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Support keys copied as quoted strings in env files.
  return trimmed.replace(/^['"]|['"]$/g, "");
}

async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const apiKey = normalizeApiKey(ENV.weatherApiKey);
  if (!apiKey) {
    return DEFAULT_WEATHER;
  }

  const url = new URL("https://api.weatherapi.com/v1/current.json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", `${lat},${lon}`);
  url.searchParams.set("aqi", "no");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`WeatherAPI current request failed (${response.status})`);
  }

  const data = (await response.json()) as any;

  return {
    temperature: Number(data?.current?.temp_c ?? DEFAULT_WEATHER.temperature),
    feelsLike: Number(data?.current?.feelslike_c ?? DEFAULT_WEATHER.feelsLike),
    humidity: Number(data?.current?.humidity ?? DEFAULT_WEATHER.humidity),
    cloudCover: Number(data?.current?.cloud ?? DEFAULT_WEATHER.cloudCover),
    windSpeed: Number(data?.current?.wind_kph ?? DEFAULT_WEATHER.windSpeed),
    description: String(data?.current?.condition?.text ?? DEFAULT_WEATHER.description),
    location: String(data?.location?.name ?? data?.location?.region ?? DEFAULT_WEATHER.location),
    fetchedAt: Date.now(),
    source: "weatherapi",
  };
}

async function fetchWeatherForecast(lat: number, lon: number, dayIndex = 0): Promise<WeatherForecastItem[]> {
  const apiKey = normalizeApiKey(ENV.weatherApiKey);
  if (!apiKey) {
    return [];
  }

  const url = new URL("https://api.weatherapi.com/v1/forecast.json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", `${lat},${lon}`);
  url.searchParams.set("days", "2");
  url.searchParams.set("aqi", "no");
  url.searchParams.set("alerts", "no");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`WeatherAPI forecast request failed (${response.status})`);
  }

  const data = (await response.json()) as any;
  const forecastDays = Array.isArray(data?.forecast?.forecastday) ? data.forecast.forecastday : [];
  const selectedDay = forecastDays[Math.max(0, Math.min(dayIndex, forecastDays.length - 1))] ?? forecastDays[0];
  const hours = Array.isArray(selectedDay?.hour) ? selectedDay.hour : [];

  return hours.slice(0, 24).map((entry: any) => ({
    timeLabel: new Date(entry?.time_epoch ? Number(entry.time_epoch) * 1000 : Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temperature: Number(entry?.temp_c ?? DEFAULT_WEATHER.temperature),
    humidity: Number(entry?.humidity ?? DEFAULT_WEATHER.humidity),
    cloudCover: Number(entry?.cloud ?? DEFAULT_WEATHER.cloudCover),
    windSpeed: Number(entry?.wind_kph ?? DEFAULT_WEATHER.windSpeed),
    rainChance: Number(entry?.chance_of_rain ?? 0),
    description: String(entry?.condition?.text ?? DEFAULT_WEATHER.description),
  }));
}

function pushReading(reading: Omit<HardwareReading, "timestamp">) {
  const nextReading: HardwareReading = {
    ...latest,
    ...reading,
    timestamp: Date.now(),
  };

  Object.assign(latest, nextReading);
  history.unshift(nextReading);
  history.splice(40);
}

export function getLatestHardwareReading() {
  return {
    latest,
    history,
  };
}

export function registerHardwareRoutes(app: Express) {
  // Compatibility endpoints from the extracted voltage_detector server
  app.post("/api/data", (req, res) => {
    // Accept the full telemetry payload and store as the latest packet
    try {
      const payload = req.body as Telemetry;
      if (payload && typeof payload === "object") {
        latestTelemetry = payload;

        // Also convert key telemetry values into workspace HardwareReading entries
        // Map solar.v, wind.v, ac.v into individual readings so they appear in history
        try {
          const deviceId = "voltage-detector";
          if (payload.solar && Number.isFinite(Number(payload.solar.v))) {
            pushReading({ deviceId, kind: "solar_voltage", value: Number(payload.solar.v), unit: "V", source: "esp32" });
          }
          if (payload.solar && Number.isFinite(Number(payload.solar.p))) {
            pushReading({ deviceId, kind: "solar_power", value: Number(payload.solar.p), unit: "W", source: "esp32" });
          }
          if (payload.wind && Number.isFinite(Number(payload.wind.v))) {
            pushReading({ deviceId, kind: "wind_voltage", value: Number(payload.wind.v), unit: "V", source: "esp32" });
          }
          if (payload.wind && Number.isFinite(Number(payload.wind.p))) {
            pushReading({ deviceId, kind: "wind_power", value: Number(payload.wind.p), unit: "W", source: "esp32" });
          }
          if (payload.ac && Number.isFinite(Number(payload.ac.v))) {
            pushReading({ deviceId, kind: "ac_voltage", value: Number(payload.ac.v), unit: "V", source: "esp32" });
          }
          if (payload.ac && Number.isFinite(Number(payload.ac.p))) {
            pushReading({ deviceId, kind: "ac_power", value: Number(payload.ac.p), unit: "W", source: "esp32" });
          }
        } catch (e) {
          // non-fatal conversion error; continue
          console.warn("/api/data conversion warning:", String(e));
        }

        return res.status(200).json({ status: "success" });
      }
      return res.status(400).json({ status: "error", error: "invalid payload" });
    } catch (err) {
      return res.status(500).json({ status: "error", error: String(err) });
    }
  });

  app.get("/api/data", (_req, res) => {
    // Prevent browsers from caching older sensor packets
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });
    res.json(latestTelemetry);
  });

  app.get("/api/hardware/latest", (_req, res) => {
    res.json({ ok: true, ...getLatestHardwareReading() });
  });

  app.get("/api/weather/current", async (req, res) => {
    const defaultLat = 12.9716;
    const defaultLon = 77.5946;
    const lat = Number(req.query.lat ?? defaultLat);
    const lon = Number(req.query.lon ?? defaultLon);

    try {
      const weather = await fetchCurrentWeather(
        Number.isFinite(lat) ? lat : defaultLat,
        Number.isFinite(lon) ? lon : defaultLon
      );
      res.json({ ok: true, data: weather });
    } catch (error) {
      console.warn("[Weather] Falling back to demo weather data", String(error));
      res.json({ ok: true, data: { ...DEFAULT_WEATHER, fetchedAt: Date.now() } });
    }
  });

  app.get("/api/weather/forecast", async (req, res) => {
    const defaultLat = 12.9716;
    const defaultLon = 77.5946;
    const lat = Number(req.query.lat ?? defaultLat);
    const lon = Number(req.query.lon ?? defaultLon);
    const day = Number(req.query.day ?? 0);

    try {
      const forecast = await fetchWeatherForecast(
        Number.isFinite(lat) ? lat : defaultLat,
        Number.isFinite(lon) ? lon : defaultLon,
        Number.isFinite(day) ? day : 0
      );
      res.json({ ok: true, data: forecast });
    } catch (error) {
      console.warn("[Weather] Falling back to empty forecast", String(error));
      res.json({ ok: true, data: [] });
    }
  });

  app.post("/api/hardware/input", (req, res) => {
    const { deviceId, kind, value, unit, source } = req.body ?? {};
    const numericValue = Number(value);

    if (!deviceId || !kind || !unit || !source) {
      return res.status(400).json({ ok: false, error: "deviceId, kind, value, unit, and source are required" });
    }

    if (!Number.isFinite(numericValue)) {
      return res.status(400).json({ ok: false, error: "value must be a number" });
    }

    pushReading({
      deviceId,
      kind,
      value: numericValue,
      unit,
      source,
    });

    res.json({ ok: true, latest });
  });
}
